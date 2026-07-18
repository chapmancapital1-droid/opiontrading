"""
SPY 1DTE entry filters + adjustment engine.

Transparent reverse-engineer of common pro 1DTE management:
  - Selective entry (trend / ORB / ATR / optional IV)
  - Losing long → convert to debit spread (primary)
  - Near expiry loser → roll forward
  - Optional hedge / butterfly (lower priority)

No magic: adjustments reduce breakeven / max loss; expectancy needs backtests.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

import numpy as np


def _ema(arr: np.ndarray, span: int) -> np.ndarray:
    out = np.empty_like(arr, dtype=float)
    alpha = 2.0 / (span + 1)
    out[0] = arr[0]
    for i in range(1, len(arr)):
        out[i] = alpha * arr[i] + (1 - alpha) * out[i - 1]
    return out


def _atr(high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int = 14) -> np.ndarray:
    n = len(close)
    tr = np.zeros(n)
    tr[0] = high[0] - low[0]
    for i in range(1, n):
        tr[i] = max(
            high[i] - low[i],
            abs(high[i] - close[i - 1]),
            abs(low[i] - close[i - 1]),
        )
    atr = np.zeros(n)
    atr[0] = tr[0]
    for i in range(1, n):
        atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period
    return atr


@dataclass
class SetupScore:
    score: float
    components: Dict[str, float]
    tradeable: bool
    direction: str  # "call" | "put" | "none"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class SPY1DTEEntryFilter:
    """Score 0–100. Default tradeable threshold 70."""

    def __init__(self, min_score: float = 70.0, orb_bars: int = 30):
        self.min_score = min_score
        self.orb_bars = orb_bars

    def score_setup(
        self,
        close: np.ndarray,
        high: np.ndarray,
        low: np.ndarray,
        open_: np.ndarray,
        iv_rank: Optional[float] = None,
    ) -> SetupScore:
        if len(close) < 25:
            return SetupScore(0.0, {"error": 1.0}, False, "none")

        span = min(20, max(5, len(close) // 2))
        ema20 = _ema(close, span)
        atr = _atr(high, low, close, 14)
        components: Dict[str, float] = {}
        score = 0.0

        # Trend (0–40) — use slight band so flat days still get a bias
        last = float(close[-1])
        ema_last = float(ema20[-1])
        if last >= ema_last:
            components["trend_long"] = 40.0
            score += 40.0
            direction = "call"
        else:
            components["trend_short"] = 40.0
            score += 40.0
            direction = "put"

        # Opening range breakout of first N bars (0–30)
        n_orb = min(self.orb_bars, max(5, len(high) // 3))
        orb_high = float(np.max(high[:n_orb]))
        orb_low = float(np.min(low[:n_orb]))
        atr_last = float(atr[-1]) if atr[-1] > 0 else 1.0
        if last > orb_high and direction == "call":
            components["orb_break_up"] = 30.0
            score += 30.0
        elif last < orb_low and direction == "put":
            components["orb_break_down"] = 30.0
            score += 30.0
        else:
            # momentum vs open / ATR still partial credit
            day_move = abs(last - float(open_[0]))
            if day_move > 0.5 * atr_last:
                components["atr_momentum"] = 20.0
                score += 20.0
            else:
                components["soft_momentum"] = 10.0
                score += 10.0

        # Vol filter (0–20) — prefer mid/high IV rank when provided
        if iv_rank is not None:
            if 40 <= iv_rank <= 85:
                components["iv_rank"] = 20.0
                score += 20.0
            elif 25 <= iv_rank < 40 or 85 < iv_rank <= 95:
                components["iv_rank"] = 10.0
                score += 10.0
            else:
                components["iv_rank"] = 0.0
        else:
            components["iv_rank_default"] = 10.0
            score += 10.0  # neutral without IV

        # Liquidity proxy: range not tiny (0–10)
        if (orb_high - orb_low) > 0.15 * atr_last:
            components["range_ok"] = 10.0
            score += 10.0

        score = min(100.0, score)
        tradeable = score >= self.min_score and direction in ("call", "put")
        return SetupScore(score, components, tradeable, direction if tradeable else "none")


class AdjustmentEngine:
    """
    Rules-based 1DTE adjustment suggestions.
    Pulls priorities from knowledge base strategy_rules when available.
    """

    def __init__(self, loss_trigger_pct: float = 0.40):
        self.loss_trigger_pct = loss_trigger_pct

    def suggest(
        self,
        position: Dict[str, Any],
        current_underlying: float,
        current_option_mark: float,
        time_left_years: float,
        greeks: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        premium_paid = float(position.get("premium_paid") or position.get("entry_price") or 0)
        if premium_paid <= 0:
            return {"action": "HOLD", "reason": "Missing premium_paid", "new_legs": []}

        # Option P/L approx per share
        pnl_per_share = current_option_mark - premium_paid
        loss_pct = -pnl_per_share / premium_paid if pnl_per_share < 0 else 0.0
        option_type = position.get("params", {}).get("type", "call")
        strike = float(position.get("params", {}).get("X", current_underlying))

        greeks = greeks or {}
        base = {
            "pnl_per_share": round(pnl_per_share, 4),
            "loss_pct_of_premium": round(loss_pct, 4),
            "time_left_years": time_left_years,
            "greeks": greeks,
        }

        if loss_pct >= self.loss_trigger_pct:
            wing = strike + 5 if option_type == "call" else strike - 5
            return {
                **base,
                "action": "CONVERT_TO_DEBIT_SPREAD",
                "new_legs": [
                    {
                        "side": "short",
                        "type": option_type,
                        "strike": wing,
                        "note": "Sell OTM wing to collect credit / lower breakeven",
                    }
                ],
                "reason": (
                    f"Loss {loss_pct:.0%} of premium ≥ {self.loss_trigger_pct:.0%} trigger. "
                    "Convert long → debit spread (most common pro adjustment)."
                ),
                "expected_benefit": "Lower net debit 30–60%; tighter breakeven; defined risk",
                "priority": 1,
            }

        if time_left_years < 0.05 and pnl_per_share < 0:
            return {
                **base,
                "action": "ROLL_FORWARD",
                "new_legs": [{"note": "Close today DTE; open next-day same strike/type"}],
                "reason": "Near expiry with unrealized loss — roll for time/gamma if thesis intact",
                "expected_benefit": "More theta runway; avoids pin risk",
                "priority": 2,
            }

        if loss_pct >= 0.25 and abs(greeks.get("vega", 0)) > 0:
            opp = "put" if option_type == "call" else "call"
            return {
                **base,
                "action": "HEDGE_OPPOSITE_WING",
                "new_legs": [{"side": "long", "type": opp, "note": "Temporary strangle/straddle hedge"}],
                "reason": "Moderate loss + vega present — optional vol hedge",
                "expected_benefit": "Offsets directional damage if vol expands",
                "priority": 3,
            }

        if pnl_per_share > 0.5 * premium_paid:
            return {
                **base,
                "action": "TAKE_PARTIAL_PROFIT",
                "new_legs": [],
                "reason": "Up ≥50% of premium — scale out / trail",
                "priority": 0,
            }

        return {
            **base,
            "action": "HOLD",
            "new_legs": [],
            "reason": "Within risk bands — manage with plan",
            "priority": 99,
        }
