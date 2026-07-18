"""
SPY 1DTE backtester (numpy-only).

Uses synthetic GBM sessions by default so the package runs without market data.
Swap `load_bars` / `generate_synthetic_sessions` with real 1-min SPY OHLC + marks
when wiring yfinance / broker history.

Metrics: expectancy, win rate, profit factor, max drawdown, avg winner/loser.
Includes optional adjustment path (convert to debit spread mid-trade).
"""
from __future__ import annotations

import json
import logging
import math
from dataclasses import dataclass, asdict, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from .pricing import black_scholes
from .spy_1dte import SPY1DTEEntryFilter, AdjustmentEngine

logger = logging.getLogger("ota.backtester")


@dataclass
class TradeRecord:
    day: int
    direction: str
    entry_spot: float
    strike: float
    entry_premium: float
    exit_premium: float
    contracts: int
    pnl: float
    adjusted: bool
    adjustment: str
    setup_score: float
    reason: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class BacktestResult:
    trades: List[TradeRecord]
    equity_curve: List[float]
    metrics: Dict[str, float]
    params: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "metrics": self.metrics,
            "params": self.params,
            "n_trades": len(self.trades),
            "trades": [t.to_dict() for t in self.trades],
            "equity_curve": self.equity_curve,
        }


def generate_synthetic_sessions(
    n_days: int = 120,
    S0: float = 500.0,
    daily_sigma: float = 0.012,
    bars_per_day: int = 78,  # ~5-min bars in RTH
    seed: int = 7,
) -> List[Dict[str, np.ndarray]]:
    """Generate n_days of synthetic OHLC paths (GBM with directional days)."""
    rng = np.random.default_rng(seed)
    sessions: List[Dict[str, np.ndarray]] = []
    spot = S0
    for d in range(n_days):
        # Directional open, then possible mid-day fade (realistic chop)
        day_dir = 1.0 if (d % 3 != 2) else -1.0
        if rng.random() < 0.35:
            day_dir *= -1.0
        mu_bar = day_dir * daily_sigma * 0.7 / math.sqrt(bars_per_day)
        rets = rng.normal(mu_bar, daily_sigma / math.sqrt(bars_per_day), bars_per_day)
        # ~45% of days reverse after bar 40 (hurts late directional entries)
        if bars_per_day > 45 and rng.random() < 0.45:
            rets[40:] = rng.normal(
                -day_dir * daily_sigma * 1.1 / math.sqrt(bars_per_day),
                daily_sigma / math.sqrt(bars_per_day),
                bars_per_day - 40,
            )
        gap = day_dir * abs(rng.normal(0, daily_sigma * 0.2))
        prices = np.empty(bars_per_day)
        prices[0] = max(1.0, spot * math.exp(gap))
        for i in range(1, bars_per_day):
            prices[i] = max(1.0, prices[i - 1] * math.exp(rets[i]))
        high = prices * (1 + rng.uniform(0.0002, 0.002, bars_per_day))
        low = prices * (1 - rng.uniform(0.0002, 0.002, bars_per_day))
        open_ = np.concatenate([[prices[0]], prices[:-1]])
        sessions.append(
            {
                "open": open_,
                "high": high,
                "low": low,
                "close": prices,
            }
        )
        spot = float(prices[-1])
    return sessions


def _bs_1dte(
    spot: float,
    strike: float,
    option_type: str,
    sigma: float,
    r: float = 0.05,
    t_years: float = 1.0 / 365.0,
) -> float:
    return black_scholes(spot, strike, t_years, r, sigma, option_type)  # type: ignore[arg-type]


class SPY1DTEBacktester:
    def __init__(
        self,
        initial_capital: float = 50_000.0,
        risk_per_trade: float = 0.02,
        commission_per_contract: float = 0.65,
        slippage_per_share: float = 0.05,
        entry_bar: int = 40,
        exit_bar: int = -2,
        sigma: float = 0.18,
        use_adjustments: bool = True,
        min_setup_score: float = 55.0,
    ):
        self.initial_capital = initial_capital
        self.risk_per_trade = risk_per_trade
        self.commission = commission_per_contract
        self.slippage = slippage_per_share
        self.entry_bar = entry_bar
        self.exit_bar = exit_bar
        self.sigma = sigma
        self.use_adjustments = use_adjustments
        self.filter = SPY1DTEEntryFilter(min_score=min_setup_score)
        self.adjuster = AdjustmentEngine(loss_trigger_pct=0.40)

    def run(
        self,
        sessions: Optional[List[Dict[str, np.ndarray]]] = None,
        n_days: int = 120,
        seed: int = 7,
    ) -> BacktestResult:
        if sessions is None:
            sessions = generate_synthetic_sessions(n_days=n_days, seed=seed)

        cash = self.initial_capital
        equity = [cash]
        trades: List[TradeRecord] = []

        for day, sess in enumerate(sessions):
            close = sess["close"]
            high = sess["high"]
            low = sess["low"]
            open_ = sess["open"]
            if len(close) <= max(self.entry_bar + 5, 30):
                equity.append(cash)
                continue

            # Score at entry bar using data up to that bar
            end = self.entry_bar + 1
            setup = self.filter.score_setup(
                close[:end], high[:end], low[:end], open_[:end], iv_rank=55.0
            )
            if not setup.tradeable:
                equity.append(cash)
                continue

            direction = setup.direction  # call | put
            entry_spot = float(close[self.entry_bar])
            strike = round(entry_spot)  # ATM
            # Entry mark + slippage (buyer pays up)
            raw_entry = _bs_1dte(entry_spot, strike, direction, self.sigma, t_years=1 / 365)
            entry_px = raw_entry + self.slippage
            cost_per_contract = entry_px * 100.0
            # Skip illiquid / vanishing premiums (prevents insane contract counts)
            if cost_per_contract < 15.0:
                equity.append(cash)
                continue

            max_risk = cash * self.risk_per_trade
            contracts = max(1, int(max_risk / cost_per_contract))
            # Cap size for stable synthetic demos (raise when on real data)
            contracts = min(contracts, 5)
            entry_cost = contracts * cost_per_contract + contracts * self.commission
            if entry_cost > cash or contracts < 1:
                equity.append(cash)
                continue

            cash_before = cash
            cash -= entry_cost
            adjusted = False
            adj_name = "NONE"
            wing_credit = 0.0

            # Mid-session mark for adjustment check
            mid_i = min(len(close) - 3, self.entry_bar + (len(close) - self.entry_bar) // 2)
            mid_spot = float(close[mid_i])
            mid_t = 0.5 / 365.0
            mid_mark = _bs_1dte(mid_spot, strike, direction, self.sigma, t_years=mid_t)

            position = {
                "premium_paid": entry_px,
                "entry_price": entry_px,
                "params": {"type": direction, "X": strike},
            }
            if self.use_adjustments:
                adj = self.adjuster.suggest(
                    position,
                    current_underlying=mid_spot,
                    current_option_mark=mid_mark,
                    time_left_years=mid_t,
                    greeks={"delta": 0.5 if direction == "call" else -0.5},
                )
                if adj["action"] == "CONVERT_TO_DEBIT_SPREAD":
                    wing = strike + 5 if direction == "call" else strike - 5
                    wing_mark = _bs_1dte(mid_spot, wing, direction, self.sigma, t_years=mid_t)
                    wing_credit = max(0.0, wing_mark - self.slippage)
                    cash += contracts * wing_credit * 100.0 - contracts * self.commission
                    adjusted = True
                    adj_name = "CONVERT_TO_DEBIT_SPREAD"

            # Exit near end of day — use intrinsic for ~0DTE
            exit_i = len(close) + self.exit_bar if self.exit_bar < 0 else self.exit_bar
            exit_i = max(self.entry_bar + 1, min(len(close) - 1, exit_i))
            exit_spot = float(close[exit_i])
            if direction == "call":
                intrinsic = max(exit_spot - strike, 0.0)
            else:
                intrinsic = max(strike - exit_spot, 0.0)
            exit_long = max(0.0, intrinsic - self.slippage)

            if adjusted:
                wing = strike + 5 if direction == "call" else strike - 5
                if direction == "call":
                    wing_intr = max(exit_spot - wing, 0.0)
                else:
                    wing_intr = max(wing - exit_spot, 0.0)
                spread_val = max(0.0, exit_long - max(0.0, wing_intr - self.slippage))
                cash += contracts * spread_val * 100.0 - contracts * self.commission
                net_debit = entry_px - wing_credit
                pnl = contracts * (spread_val - net_debit) * 100.0 - 2 * contracts * self.commission
            else:
                proceeds = contracts * exit_long * 100.0 - contracts * self.commission
                cash += proceeds
                pnl = cash - cash_before  # realized day P/L including costs

            # Numerical safety
            if not math.isfinite(cash) or cash < 0:
                cash = max(0.0, cash_before)
                pnl = 0.0
                continue
            if not math.isfinite(pnl):
                pnl = 0.0

            trades.append(
                TradeRecord(
                    day=day,
                    direction=direction,
                    entry_spot=entry_spot,
                    strike=strike,
                    entry_premium=entry_px,
                    exit_premium=exit_long if not adjusted else max(0.0, exit_long - wing_credit),
                    contracts=contracts,
                    pnl=float(pnl),
                    adjusted=adjusted,
                    adjustment=adj_name,
                    setup_score=setup.score,
                    reason="setup_ok",
                )
            )
            # rebuild cash from equity for consistency
            if equity:
                # keep cash as running capital
                pass
            equity.append(cash)

        metrics = self._metrics(trades, equity)
        params = {
            "initial_capital": self.initial_capital,
            "risk_per_trade": self.risk_per_trade,
            "commission": self.commission,
            "slippage": self.slippage,
            "sigma": self.sigma,
            "use_adjustments": self.use_adjustments,
            "n_sessions": len(sessions),
            "note": (
                "Synthetic sessions by default — optimistic plumbing only. "
                "Replace with real SPY bars + option marks before trusting expectancy."
            ),
        }
        return BacktestResult(trades=trades, equity_curve=equity, metrics=metrics, params=params)

    def _metrics(self, trades: List[TradeRecord], equity: List[float]) -> Dict[str, float]:
        if not trades:
            return {
                "n_trades": 0,
                "win_rate": 0.0,
                "expectancy": 0.0,
                "profit_factor": 0.0,
                "avg_winner": 0.0,
                "avg_loser": 0.0,
                "max_drawdown": 0.0,
                "total_pnl": 0.0,
                "ending_equity": float(equity[-1]) if equity else self.initial_capital,
            }
        pnls = np.array([t.pnl for t in trades], dtype=float)
        wins = pnls[pnls > 0]
        losses = pnls[pnls <= 0]
        gross_win = float(wins.sum()) if len(wins) else 0.0
        gross_loss = float(-losses.sum()) if len(losses) else 0.0
        pf = gross_win / gross_loss if gross_loss > 0 else float("inf")

        # max drawdown on equity
        eq = np.array(equity, dtype=float)
        peak = np.maximum.accumulate(eq)
        dd = (peak - eq) / np.maximum(peak, 1e-9)
        max_dd = float(dd.max()) if len(dd) else 0.0

        return {
            "n_trades": float(len(trades)),
            "win_rate": float(len(wins) / len(pnls)),
            "expectancy": float(pnls.mean()),
            "profit_factor": float(pf) if math.isfinite(pf) else 999.0,
            "avg_winner": float(wins.mean()) if len(wins) else 0.0,
            "avg_loser": float(losses.mean()) if len(losses) else 0.0,
            "max_drawdown": max_dd,
            "total_pnl": float(pnls.sum()),
            "ending_equity": float(eq[-1]),
            "pct_adjusted": float(sum(1 for t in trades if t.adjusted) / len(trades)),
        }


def run_demo_backtest(verbose: bool = True) -> BacktestResult:
    bt = SPY1DTEBacktester(use_adjustments=True)
    result = bt.run(n_days=150, seed=11)
    if verbose:
        print("=== SPY 1DTE Backtest (synthetic) ===")
        print(json.dumps(result.metrics, indent=2))
        print("params:", json.dumps(result.params, indent=2))
        if result.trades:
            print("sample trade:", result.trades[0].to_dict())
    return result
