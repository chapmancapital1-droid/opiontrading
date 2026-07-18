"""
NERDCOMMAND Option Trading Agent (OTA) — orchestrator.

Wires: KnowledgeBase + Ingestion + Pricing + Decision + Portfolio + SPY 1DTE + Backtester.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from .knowledge import KnowledgeBase, KnowledgeIngestion
from .decision import DecisionEngine
from .portfolio import PortfolioManager
from .pricing import black_scholes, monte_carlo_european, black_scholes_greeks
from .spy_1dte import SPY1DTEEntryFilter, AdjustmentEngine
from .backtester import SPY1DTEBacktester, run_demo_backtest, BacktestResult
from .spy_strategy import SPY1DTEStrategy
from .options_chain import RealOptionsChain
from .spy_dashboard import SPY1DTEDashboard
from .genome import BrainGenome
from .self_improve import apply_champion_to_strategy

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ota.agent")


class NERDCOMMAND_OTA:
    """Self-expanding option trading brain for OptionScope / NERDCOMMAND."""

    def __init__(
        self,
        initial_capital: float = 50_000.0,
        risk_tolerance: float = 0.02,
        catalog_path: Optional[Path] = None,
    ):
        self.kb = KnowledgeBase(catalog_path)
        self.ingestion = KnowledgeIngestion(self.kb)
        self.decision = DecisionEngine(self.kb, risk_per_trade=risk_tolerance)
        self.portfolio = PortfolioManager(initial_capital, risk_tolerance)
        # Load evolved champion genome if present (self-improve lab)
        self.genome = apply_champion_to_strategy()
        risk = risk_tolerance if risk_tolerance != 0.02 else self.genome.risk_per_trade
        self.entry_filter = SPY1DTEEntryFilter(min_score=self.genome.min_entry_score)
        self.adjustment = AdjustmentEngine(loss_trigger_pct=self.genome.loss_trigger_pct)
        # Special SPY-only 1DTE strategy + live chain + dashboard hooks
        self.spy_1dte = SPY1DTEStrategy(
            kb=self.kb,
            risk_per_trade=risk,
            min_entry_score=self.genome.min_entry_score,
            min_pop=self.genome.min_pop,
            r=self.genome.r,
        )
        self.options_chain = self.spy_1dte.chain
        self.decision.risk_per_trade = risk
        logger.info(
            "NERDCOMMAND OTA ready | catalog entries=%s rules=%s | SPY_1DTE | genome gen=%s fit=%.2f",
            self.kb.stats()["total_entries"],
            self.kb.stats()["strategy_rules"],
            self.genome.generation,
            self.genome.fitness,
        )

    # ── Knowledge ─────────────────────────────────────────────
    def ingest_new_book(self, path: str | Path, source_name: Optional[str] = None) -> Dict[str, Any]:
        added = self.ingestion.ingest_file(Path(path), source_name)
        return {
            "source": source_name or str(path),
            "entries_added": len(added),
            "keywords": [e.keyword for e in added],
            "brain_stats": self.kb.stats(),
        }

    def ingest_text_blob(self, text: str, source_name: str) -> Dict[str, Any]:
        added = self.ingestion.ingest_text(text, source_name)
        return {"entries_added": len(added), "keywords": [e.keyword for e in added]}

    # ── Pricing ───────────────────────────────────────────────
    def price(
        self,
        S0: float,
        X: float,
        T: float,
        r: float,
        sigma: float,
        option_type: str = "call",
        mc_sims: int = 50_000,
    ) -> Dict[str, Any]:
        bs = black_scholes(S0, X, T, r, sigma, option_type)  # type: ignore[arg-type]
        greeks = black_scholes_greeks(S0, X, T, r, sigma, option_type)  # type: ignore[arg-type]
        mc = monte_carlo_european(
            S0, X, T, r, sigma,
            option_type=option_type,  # type: ignore[arg-type]
            num_simulations=mc_sims,
            num_steps=1,
            antithetic=True,
        )
        return {
            "bs": bs,
            "mc_price": mc.price,
            "mc_std_err": mc.std_err,
            "abs_error": mc.abs_error,
            "greeks": greeks,
            "method": mc.method,
        }

    # ── Decision ──────────────────────────────────────────────
    def recommend(self, **kwargs) -> Dict[str, Any]:
        kwargs.setdefault("cash", self.portfolio.cash)
        rec = self.decision.recommend(**kwargs)
        return rec.to_dict()

    def execute(self, trade_result: Dict[str, Any]) -> bool:
        return self.portfolio.try_open(trade_result)

    # ── SPY 1DTE special strategy ─────────────────────────────
    def analyze_1dte_spy(
        self,
        close,
        high,
        low,
        open_,
        pricing_params: Dict[str, Any],
        iv_rank: Optional[float] = None,
    ) -> Dict[str, Any]:
        import numpy as np

        setup = self.entry_filter.score_setup(
            np.asarray(close, dtype=float),
            np.asarray(high, dtype=float),
            np.asarray(low, dtype=float),
            np.asarray(open_, dtype=float),
            iv_rank=iv_rank,
        )
        if not setup.tradeable:
            return {
                "recommendation": "NO TRADE - Setup score too low",
                "score": setup.to_dict(),
            }
        p = dict(pricing_params)
        p["option_type"] = setup.direction
        rec = self.recommend(**p)
        rec["setup"] = setup.to_dict()
        return rec

    def spy_trade_plan(
        self,
        bias: str = "neutral",
        news_sentiment: float = 0.0,
        current_price: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Special SPY 1DTE plan: ≤4 high-POP strikes + safe/cheap structures."""
        return self.spy_1dte.generate_trade_plan(
            current_price=current_price,
            bias=bias,  # type: ignore[arg-type]
            capital=self.portfolio.cash,
            news_sentiment=news_sentiment,
        )

    def spy_high_pop_strikes(
        self,
        bias: str = "bullish",
        num_strikes: int = 4,
        min_pop: float = 0.55,
    ) -> List[Dict[str, Any]]:
        """Up to 4 high-POP SPY strikes (fewer if market doesn't qualify)."""
        return self.spy_1dte.get_high_pop_strikes(
            bias=bias,  # type: ignore[arg-type]
            num_strikes=num_strikes,
            min_pop=min_pop,
        )

    def spy_dashboard_alert(self, bias: str = "neutral") -> Dict[str, Any]:
        """One-shot standalone dashboard alert (also written to data/)."""
        dash = SPY1DTEDashboard(
            capital=self.portfolio.cash,
            min_pop=self.spy_1dte.min_pop,
        )
        return dash.generate_alert(bias=bias, force=True)

    def suggest_adjustment(self, position: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        return self.adjustment.suggest(position, **kwargs)

    # ── Backtest ──────────────────────────────────────────────
    def backtest_spy_1dte(self, **kwargs) -> Dict[str, Any]:
        bt = SPY1DTEBacktester(
            initial_capital=self.portfolio.initial_capital,
            risk_per_trade=self.portfolio.risk_tolerance,
        )
        result: BacktestResult = bt.run(**kwargs)
        return result.to_dict()

    # ── Demo ──────────────────────────────────────────────────
    def run_demo(self) -> Dict[str, Any]:
        logger.info("Running OTA demo…")
        # Ingest a synthetic knowledge blob (simulates new book)
        sample_book = """
        Chapter on Monte Carlo and Black-Scholes. Implied volatility drives pricing.
        Debit spread conversion is the primary adjustment for losing long 1DTE calls.
        Position sizing with fixed fractional risk. Opening range breakout and VWAP filters.
        Watch for volatility smile and fat tails. Avoid overfitting in backtests.
        Bull put credit spreads and iron condors for safe cheap SPY premium.
        """
        ingest_info = self.ingest_text_blob(sample_book, "DemoBook_SPY1DTE_Notes")

        rec = self.recommend(
            S0=100.0,
            X=100.0,
            T=0.5,
            r=0.05,
            sigma=0.30,
            option_type="call",
            market_price=10.5,
            news_sentiment=0.2,
        )
        self.execute(rec)
        pricing = self.price(100, 100, 0.5, 0.05, 0.30, "call", mc_sims=30_000)
        bt = run_demo_backtest(verbose=False)
        spy_plan = self.spy_trade_plan(bias="bullish", news_sentiment=0.1)

        out = {
            "ingest": ingest_info,
            "recommendation": rec,
            "portfolio": self.portfolio.snapshot(),
            "pricing_check": {
                "bs": pricing["bs"],
                "mc": pricing["mc_price"],
                "err": pricing["abs_error"],
            },
            "backtest_metrics": bt.metrics,
            "spy_1dte_plan": {
                "spy_price": spy_plan.get("spy_price"),
                "bias": spy_plan.get("bias"),
                "strike_count": spy_plan.get("strike_count"),
                "strikes": spy_plan.get("recommended_strikes"),
                "alerts": spy_plan.get("alerts"),
            },
            "brain_stats": self.kb.stats(),
        }
        print(json.dumps(out, indent=2, default=str))
        return out


def main() -> None:
    agent = NERDCOMMAND_OTA(initial_capital=50_000, risk_tolerance=0.02)
    agent.run_demo()


if __name__ == "__main__":
    main()
