"""
Real SPY options chain via yfinance (with offline/demo fallback).

Provides liquid high-POP strike selection for the SPY 1DTE strategy.
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional, Tuple

import numpy as np

from .pricing import black_scholes, black_scholes_greeks, monte_carlo_european

logger = logging.getLogger("ota.options_chain")

Bias = Literal["bullish", "bearish", "neutral"]


@dataclass
class StrikePick:
    strike: float
    option_type: str  # Call | Put
    last_price: Optional[float]
    bid: Optional[float]
    ask: Optional[float]
    mid: Optional[float]
    iv: Optional[float]  # decimal
    iv_pct: Optional[float]
    delta: Optional[float]
    est_pop: float  # 0-1 probability finish ITM (approx)
    volume: int
    open_interest: int
    fair_value_bs: float
    fair_value_mc: Optional[float]
    edge_vs_mid: Optional[float]
    recommendation: str
    structure: str  # long | bull_call_spread | bear_put_spread | credit_note
    source: str  # live_chain | synthetic

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _years_to_exp(exp_str: str) -> float:
    """Yahoo expiration is YYYY-MM-DD; treat as close-of-day ET approx."""
    try:
        exp = datetime.strptime(exp_str, "%Y-%m-%d").date()
    except ValueError:
        return 1.0 / 365.0
    today = datetime.now(timezone.utc).date()
    days = max(0, (exp - today).days)
    # Same-day / next session → ~1 DTE fraction of year
    if days <= 0:
        return max(2.0 / (365 * 24), 1.0 / 365.0)  # hours left floor
    return days / 365.0


def _mid(bid: float, ask: float, last: float) -> Optional[float]:
    if bid and ask and bid > 0 and ask > 0:
        return 0.5 * (bid + ask)
    if last and last > 0:
        return float(last)
    if ask and ask > 0:
        return float(ask)
    return None


class RealOptionsChain:
    """
    Live SPY chain from yfinance.
    Falls back to synthetic BS candidates if network/data fails.
    """

    def __init__(self, symbol: str = "SPY", r: float = 0.05):
        self.symbol = symbol.upper()
        self.r = r
        self._ticker = None

    def _get_ticker(self):
        if self._ticker is None:
            import yfinance as yf

            self._ticker = yf.Ticker(self.symbol)
        return self._ticker

    def spot(self) -> float:
        t = self._get_ticker()
        # fast_info first
        try:
            fi = t.fast_info
            px = float(getattr(fi, "last_price", None) or fi.get("lastPrice") or 0)
            if px > 0:
                return px
        except Exception:
            pass
        hist = t.history(period="5d")
        if hist is None or hist.empty:
            raise RuntimeError(f"No price history for {self.symbol}")
        return float(hist["Close"].iloc[-1])

    def nearest_expirations(self, n: int = 3) -> List[str]:
        t = self._get_ticker()
        exps = list(t.options or [])
        return exps[:n]

    def pick_1dte_expiration(self) -> str:
        """Prefer 0–2 calendar days out; else nearest available."""
        exps = self.nearest_expirations(8)
        if not exps:
            raise RuntimeError("No option expirations returned")
        today = datetime.now(timezone.utc).date()
        best = exps[0]
        best_days = 999
        for e in exps:
            try:
                d = datetime.strptime(e, "%Y-%m-%d").date()
            except ValueError:
                continue
            days = (d - today).days
            if 0 <= days <= 2 and days < best_days:
                best, best_days = e, days
        return best

    def get_chain(self, days_to_exp: int = 1) -> Dict[str, Any]:
        """
        Returns dict with calls/puts as list-of-dicts (numpy-friendly),
        expiration, spot, t_years.
        """
        t = self._get_ticker()
        exp = self.pick_1dte_expiration()
        chain = t.option_chain(exp)
        spot = self.spot()
        t_years = _years_to_exp(exp)

        def _safe_float(v: Any, default: float = 0.0) -> float:
            try:
                if v is None:
                    return default
                f = float(v)
                if math.isnan(f) or math.isinf(f):
                    return default
                return f
            except (TypeError, ValueError):
                return default

        def _safe_int(v: Any, default: int = 0) -> int:
            f = _safe_float(v, float(default))
            try:
                return int(f)
            except (TypeError, ValueError):
                return default

        def frame_to_rows(df) -> List[Dict[str, Any]]:
            rows: List[Dict[str, Any]] = []
            if df is None or len(df) == 0:
                return rows
            for _, row in df.iterrows():
                strike = _safe_float(row.get("strike"), 0.0)
                if strike <= 0:
                    continue
                bid = _safe_float(row.get("bid"), 0.0)
                ask = _safe_float(row.get("ask"), 0.0)
                last = _safe_float(row.get("lastPrice"), 0.0)
                iv = _safe_float(row.get("impliedVolatility"), 0.0)
                vol = _safe_int(row.get("volume"), 0)
                oi = _safe_int(row.get("openInterest"), 0)
                delta_raw = row.get("delta", None)
                delta_f = None
                if delta_raw is not None:
                    d = _safe_float(delta_raw, float("nan"))
                    if not math.isnan(d):
                        delta_f = d
                rows.append(
                    {
                        "strike": strike,
                        "bid": bid,
                        "ask": ask,
                        "last": last,
                        "mid": _mid(bid, ask, last),
                        "iv": iv if iv > 0 else None,
                        "volume": vol,
                        "open_interest": oi,
                        "delta": delta_f,
                    }
                )
            return rows

        return {
            "symbol": self.symbol,
            "spot": spot,
            "expiration": exp,
            "t_years": t_years,
            "calls": frame_to_rows(chain.calls),
            "puts": frame_to_rows(chain.puts),
            "source": "yfinance",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _pop_and_greeks(
        self,
        spot: float,
        strike: float,
        t_years: float,
        sigma: float,
        option_type: str,
        use_mc: bool = True,
    ) -> Tuple[float, float, float, Optional[float]]:
        """Returns est_pop, delta, bs_price, mc_price."""
        g = black_scholes_greeks(spot, strike, t_years, self.r, sigma, option_type)  # type: ignore
        # P(finish ITM) ≈ N(d2) for call, N(-d2) for put under RN
        if t_years <= 0 or sigma <= 0:
            if option_type == "call":
                pop = 1.0 if spot > strike else 0.0
            else:
                pop = 1.0 if spot < strike else 0.0
        else:
            vol = sigma * math.sqrt(t_years)
            d2 = (math.log(spot / strike) + (self.r - 0.5 * sigma * sigma) * t_years) / vol
            from scipy.stats import norm

            pop = float(norm.cdf(d2) if option_type == "call" else norm.cdf(-d2))
        mc_px = None
        if use_mc and t_years > 0:
            mc = monte_carlo_european(
                spot,
                strike,
                t_years,
                self.r,
                sigma,
                option_type=option_type,  # type: ignore
                num_simulations=12_000,
                num_steps=1,
                antithetic=True,
                seed=42,
            )
            mc_px = mc.price
        return pop, float(g["delta"]), float(g["price"]), mc_px

    def get_high_pop_strikes(
        self,
        bias: Bias = "bullish",
        max_strikes: int = 4,
        min_pop: float = 0.55,
        min_volume: int = 50,
        min_oi: int = 100,
        spot: Optional[float] = None,
        default_iv: float = 0.18,
        prefer_defined_risk: bool = True,
    ) -> List[StrikePick]:
        """
        Up to `max_strikes` liquid high-POP candidates from the real chain.
        If fewer qualify, returns fewer (never pads with junk).
        """
        max_strikes = max(1, min(4, int(max_strikes)))
        try:
            chain = self.get_chain()
            spot = float(spot or chain["spot"])
            t_years = float(chain["t_years"])
            rows = chain["calls"] if bias == "bullish" else chain["puts"]
            opt = "call" if bias == "bullish" else "put"
            picks = self._rank_live_rows(
                rows,
                spot=spot,
                t_years=t_years,
                option_type=opt,
                bias=bias,
                min_pop=min_pop,
                min_volume=min_volume,
                min_oi=min_oi,
                default_iv=default_iv,
                prefer_defined_risk=prefer_defined_risk,
                max_strikes=max_strikes,
            )
            if picks:
                return picks
            logger.warning("Live chain filtered empty — synthetic fallback")
        except Exception as e:
            logger.warning("Live chain failed (%s) — synthetic fallback", e)
            if spot is None:
                spot = 550.0

        return self._synthetic_high_pop(
            spot=float(spot),
            bias=bias,
            max_strikes=max_strikes,
            min_pop=min_pop,
            default_iv=default_iv,
            prefer_defined_risk=prefer_defined_risk,
        )

    def _rank_live_rows(
        self,
        rows: List[Dict[str, Any]],
        spot: float,
        t_years: float,
        option_type: str,
        bias: Bias,
        min_pop: float,
        min_volume: int,
        min_oi: int,
        default_iv: float,
        prefer_defined_risk: bool,
        max_strikes: int,
    ) -> List[StrikePick]:
        scored: List[Tuple[float, StrikePick]] = []
        # 1DTE tradable band: slightly ITM through slight OTM (not deep ITM "fake" POP)
        band = 12.0
        for row in rows:
            strike = float(row["strike"])
            mny = strike - spot
            if option_type == "call":
                # Calls: spot-8 .. spot+8 preferred
                if mny < -band or mny > band:
                    continue
            else:
                if mny > band or mny < -band:
                    continue
            vol = int(row.get("volume") or 0)
            oi = int(row.get("open_interest") or 0)
            if vol < min_volume and oi < min_oi:
                continue
            mid = row.get("mid")
            # Skip empty quotes
            if mid is None or mid <= 0.05:
                continue
            # Cap premium for "cheap" preference (still allow slightly ITM)
            if mid > 15.0:
                continue
            iv = float(row["iv"]) if row.get("iv") else default_iv
            iv = max(0.05, min(iv, 2.0))
            pop, delta, bs_px, mc_px = self._pop_and_greeks(
                spot, strike, t_years, iv, option_type, use_mc=True
            )
            if row.get("delta") is not None:
                d = abs(float(row["delta"]))
                pop = 0.55 * pop + 0.45 * d
            if pop < min_pop:
                continue
            edge = (bs_px - mid) if mid else None
            abs_m = abs(mny)
            if prefer_defined_risk and abs_m >= 2:
                structure = (
                    "bull_call_spread"
                    if option_type == "call"
                    else "bear_put_spread"
                )
                rec = f"{bias.title()} debit spread (defined risk / safer)"
            elif abs_m <= 1.5:
                structure = "long"
                rec = f"Buy ATM {option_type} — plan adjust to debit spread on -40%"
            else:
                structure = "long"
                rec = f"Buy {option_type} — high entry score only; prefer spread"

            pick = StrikePick(
                strike=strike,
                option_type="Call" if option_type == "call" else "Put",
                last_price=row.get("last"),
                bid=row.get("bid"),
                ask=row.get("ask"),
                mid=mid,
                iv=iv,
                iv_pct=round(iv * 100, 1),
                delta=delta,
                est_pop=float(pop),
                volume=vol,
                open_interest=oi,
                fair_value_bs=round(bs_px, 4),
                fair_value_mc=round(mc_px, 4) if mc_px is not None else None,
                edge_vs_mid=round(edge, 4) if edge is not None else None,
                recommendation=rec,
                structure=structure,
                source="live_chain",
            )
            # Rank: balanced POP + near-money + liquidity − expensive premium
            liq = math.log1p(vol + oi)
            # Prefer POP in 0.55–0.75 (actionable), not 0.95 deep ITM
            pop_sweet = 1.0 - abs(pop - 0.65) * 1.5
            score = (
                pop * 40
                + pop_sweet * 25
                + 0.4 * liq
                - 1.2 * abs_m
                - 0.3 * float(mid)
            )
            scored.append((score, pick))

        scored.sort(key=lambda x: x[0], reverse=True)
        out: List[StrikePick] = []
        used: List[float] = []
        for _, p in scored:
            if any(abs(p.strike - u) < 0.75 for u in used):
                continue
            out.append(p)
            used.append(p.strike)
            if len(out) >= max_strikes:
                break
        return out

    def _synthetic_high_pop(
        self,
        spot: float,
        bias: Bias,
        max_strikes: int,
        min_pop: float,
        default_iv: float,
        prefer_defined_risk: bool,
    ) -> List[StrikePick]:
        """Offline candidates when chain unavailable."""
        t_years = 1.0 / 365.0
        opt = "call" if bias != "bearish" else "put"
        # Candidate strikes $1 steps around spot
        center = round(spot)
        offsets = [-5, -3, -2, -1, 0, 1, 2, 3, 5] if opt == "call" else [5, 3, 2, 1, 0, -1, -2, -3, -5]
        picks: List[StrikePick] = []
        for off in offsets:
            strike = float(center + off)
            pop, delta, bs_px, mc_px = self._pop_and_greeks(
                spot, strike, t_years, default_iv, opt, use_mc=True
            )
            if pop < min_pop:
                continue
            structure = "long"
            rec = f"Buy {opt} (synthetic chain)"
            if prefer_defined_risk and abs(strike - spot) > 2:
                structure = "bull_call_spread" if opt == "call" else "bear_put_spread"
                rec = "Defined-risk debit spread preferred (safe/cheap)"
            picks.append(
                StrikePick(
                    strike=strike,
                    option_type="Call" if opt == "call" else "Put",
                    last_price=None,
                    bid=None,
                    ask=None,
                    mid=round(bs_px * 1.05, 2),
                    iv=default_iv,
                    iv_pct=round(default_iv * 100, 1),
                    delta=delta,
                    est_pop=pop,
                    volume=0,
                    open_interest=0,
                    fair_value_bs=round(bs_px, 4),
                    fair_value_mc=round(mc_px, 4) if mc_px else None,
                    edge_vs_mid=None,
                    recommendation=rec,
                    structure=structure,
                    source="synthetic",
                )
            )
            if len(picks) >= max_strikes:
                break
        # Sort by POP desc and trim
        picks.sort(key=lambda p: p.est_pop, reverse=True)
        return picks[:max_strikes]
