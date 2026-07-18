"""
SPY 1DTE Special Strategy for NERDCOMMAND OTA brain.

Safe / cheap focus (research-backed principles):
  - Prefer defined-risk debit/credit spreads over naked longs
  - Size 1–2% of capital max risk
  - Selective entry (score ≥ threshold), not every day
  - High-POP strikes only (up to 4); show fewer if market thin
  - Adjustments: convert long → debit spread, roll, hedge

Standalone from general multi-ticker brain but plugs into NERDCOMMAND_OTA.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np

from .options_chain import RealOptionsChain, Bias, StrikePick
from .spy_1dte import SPY1DTEEntryFilter, AdjustmentEngine
from .pricing import black_scholes, black_scholes_greeks
from .knowledge import KnowledgeBase

logger = logging.getLogger("ota.spy_strategy")


# Seed rules for brain catalog / team handoff
SPY_SAFE_CHEAP_RULES = [
    {
        "id": "spy_bull_put_credit",
        "name": "Bull Put Credit Spread",
        "when": "mildly bullish or neutral, IV not crushed",
        "how": "Sell put ~0.15–0.30 delta; buy lower put $1–5 wide. Max loss = width − credit.",
        "capital": "Often $50–500 risk per spread depending on width",
        "target": "50% of credit; stop ~2× credit or technical break",
    },
    {
        "id": "spy_bear_call_credit",
        "name": "Bear Call Credit Spread",
        "when": "mildly bearish or range day",
        "how": "Sell call ~0.15–0.30 delta; buy higher call $1–5 wide.",
        "capital": "Defined risk = width − credit",
        "target": "50% credit; avoid naked short calls",
    },
    {
        "id": "spy_iron_condor",
        "name": "Iron Condor",
        "when": "low expected move / high IV rank with range bias",
        "how": "Bull put + bear call; short strikes OTM both sides",
        "capital": "Max loss one side width − net credit",
        "target": "25–50% of credit; manage early on break",
    },
    {
        "id": "spy_1dte_debit_adjust",
        "name": "1DTE Long → Debit Spread Adjust",
        "when": "long ATM call/put down ≥40% premium",
        "how": "Sell OTM wing to convert to debit spread; lowers BE and risk",
        "capital": "Net debit reduced by wing credit",
        "target": "Recovery to reduced BE or exit residual risk",
    },
]


class SPY1DTEStrategy:
    """Pluggable SPY-only 1DTE strategy module."""

    name = "SPY_1DTE_HighPOP_Adjustment"

    def __init__(
        self,
        kb: Optional[KnowledgeBase] = None,
        risk_per_trade: float = 0.02,
        min_entry_score: float = 70.0,
        min_pop: float = 0.55,
        r: float = 0.05,
        loss_trigger_pct: float = 0.40,
    ):
        self.kb = kb
        self.risk_per_trade = risk_per_trade
        self.min_pop = min_pop
        self.min_entry_score = min_entry_score
        self.r = r
        self.chain = RealOptionsChain(symbol="SPY", r=r)
        self.entry_filter = SPY1DTEEntryFilter(min_score=min_entry_score)
        self.adjustment = AdjustmentEngine(loss_trigger_pct=loss_trigger_pct)
        self._register_rules()
        logger.info(
            "%s loaded (min_pop=%.0f%% score≥%.0f risk=%.1f%%)",
            self.name,
            min_pop * 100,
            min_entry_score,
            risk_per_trade * 100,
        )

    def _register_rules(self) -> None:
        if not self.kb:
            return
        for rule in SPY_SAFE_CHEAP_RULES:
            self.kb.strategy_rules.setdefault(
                rule["id"],
                {
                    "action": rule["name"],
                    "when": rule["when"],
                    "how": rule["how"],
                    "source": "SPY_SAFE_CHEAP_RESEARCH",
                    "priority": 10,
                },
            )
        # Persist if catalog path writable
        try:
            self.kb.save()
        except Exception:
            pass

    def current_spot(self) -> float:
        try:
            return self.chain.spot()
        except Exception as e:
            logger.warning("spot fetch failed: %s", e)
            return 550.0

    def get_high_pop_strikes(
        self,
        current_price: Optional[float] = None,
        bias: Bias = "bullish",
        num_strikes: int = 4,
        min_pop: Optional[float] = None,
        iv: float = 0.18,
    ) -> List[Dict[str, Any]]:
        """
        Up to 4 high-POP strikes. Returns fewer if market doesn't qualify.
        """
        n = max(1, min(4, int(num_strikes)))
        picks = self.chain.get_high_pop_strikes(
            bias=bias,
            max_strikes=n,
            min_pop=min_pop if min_pop is not None else self.min_pop,
            spot=current_price,
            default_iv=iv,
            prefer_defined_risk=True,
        )
        return [p.to_dict() for p in picks]

    def generate_trade_plan(
        self,
        current_price: Optional[float] = None,
        bias: Bias = "bullish",
        iv: float = 0.18,
        capital: float = 50_000.0,
        news_sentiment: float = 0.0,
        bars: Optional[Dict[str, np.ndarray]] = None,
    ) -> Dict[str, Any]:
        """Full SPY 1DTE plan: entry score, ≤4 strikes, sizing, adjustments, safe structures."""
        spot = float(current_price if current_price is not None else self.current_spot())

        # Optional bar-based filter
        setup = None
        if bars is not None:
            setup = self.entry_filter.score_setup(
                bars["close"],
                bars["high"],
                bars["low"],
                bars["open"],
                iv_rank=55.0,
            )
            if setup.direction == "call":
                bias = "bullish"
            elif setup.direction == "put":
                bias = "bearish"

        # Sentiment tilt
        if news_sentiment > 0.25:
            bias = "bullish"
        elif news_sentiment < -0.25:
            bias = "bearish"

        bull = self.get_high_pop_strikes(spot, "bullish", 4, iv=iv)
        bear = self.get_high_pop_strikes(spot, "bearish", 4, iv=iv)
        primary = bull if bias == "bullish" else bear if bias == "bearish" else (bull[:2] + bear[:2])[:4]

        # Size helper for first pick
        size_note = "1–2% capital risk; prefer $1–5 wide defined-risk spreads"
        contracts = 0
        if primary:
            mid = primary[0].get("mid") or primary[0].get("fair_value_bs") or 1.0
            risk_budget = capital * self.risk_per_trade
            # Assume debit spread max risk ~ mid*100 or $100–300 width proxy
            risk_per = max(50.0, float(mid) * 100.0)
            contracts = max(1, int(risk_budget / risk_per))
            contracts = min(contracts, 10)

        plan = {
            "strategy": self.name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "spy_price": round(spot, 2),
            "bias": bias,
            "news_sentiment": news_sentiment,
            "entry_setup": setup.to_dict() if setup else None,
            "tradeable": True if setup is None else bool(setup.tradeable),
            "recommended_strikes": primary,
            "strike_count": len(primary),
            "note_strike_count": (
                f"{len(primary)} strike(s) met min_pop={self.min_pop:.0%} — "
                "showing fewer when liquidity/POP insufficient"
            ),
            "bullish_book": bull,
            "bearish_book": bear,
            "suggested_contracts": contracts,
            "safe_cheap_structures": SPY_SAFE_CHEAP_RULES,
            "adjustment_rules": [
                "Primary: Convert long → debit spread on ≥40% premium loss",
                "Secondary: Roll forward if thesis intact near expiry",
                "Tertiary: Hedge opposite wing on vol spike",
                "Prefer starting as credit/debit spread (defined risk) when possible",
                "Exit: ~50% of credit target OR time stop last hour of session",
            ],
            "risk_management": {
                "risk_per_trade": self.risk_per_trade,
                "max_risk_pct": f"{self.risk_per_trade * 100:.0f}% of capital",
                "no_naked_short": True,
                "size_note": size_note,
            },
            "alerts": self._build_alert_lines(spot, bias, primary, setup),
        }
        logger.info(
            "SPY plan: bias=%s strikes=%d spot=%.2f",
            bias,
            len(primary),
            spot,
        )
        return plan

    def _build_alert_lines(
        self,
        spot: float,
        bias: str,
        strikes: List[Dict[str, Any]],
        setup,
    ) -> List[str]:
        lines = [f"SPY ${spot:.2f} | bias={bias}"]
        if setup is not None:
            lines.append(
                f"Entry score={setup.score:.0f} tradeable={setup.tradeable} dir={setup.direction}"
            )
        if not strikes:
            lines.append("NO high-POP liquid strikes — stand down")
            return lines
        for i, s in enumerate(strikes, 1):
            lines.append(
                f"#{i} {s.get('option_type')} {s.get('strike')} | "
                f"POP≈{100 * float(s.get('est_pop', 0)):.0f}% | "
                f"mid={s.get('mid')} IV={s.get('iv_pct')}% | {s.get('recommendation')}"
            )
        lines.append("WHEN: trade only if entry score ≥70 (or your gate) + plan adjustment first")
        lines.append("HOW: defined-risk preferred; 1–2% capital; paper first")
        return lines

    def suggest_adjustment_for_position(self, position: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        return self.adjustment.suggest(position, **kwargs)

    def credit_spread_sketch(
        self,
        spot: float,
        bias: Bias = "bullish",
        width: float = 5.0,
        short_offset: float = 5.0,
        iv: float = 0.18,
        t_years: float = 1.0 / 365.0,
    ) -> Dict[str, Any]:
        """
        Cheap defined-risk credit structure sketch (safe SPY style).
        Bull put: short put at spot-short_offset, long put width below.
        Bear call: short call at spot+short_offset, long call width above.
        """
        if bias == "bullish":
            short_k = round(spot - short_offset)
            long_k = short_k - width
            short_px = black_scholes(spot, short_k, t_years, self.r, iv, "put")
            long_px = black_scholes(spot, long_k, t_years, self.r, iv, "put")
            credit = max(0.0, short_px - long_px)
            max_loss = width - credit
            return {
                "structure": "bull_put_credit",
                "short_put": short_k,
                "long_put": long_k,
                "width": width,
                "est_credit": round(credit, 3),
                "est_max_loss": round(max_loss, 3),
                "risk_dollars_per_spread": round(max_loss * 100, 2),
                "note": "Safe/cheap defined risk — verify live bid/ask before entry",
            }
        short_k = round(spot + short_offset)
        long_k = short_k + width
        short_px = black_scholes(spot, short_k, t_years, self.r, iv, "call")
        long_px = black_scholes(spot, long_k, t_years, self.r, iv, "call")
        credit = max(0.0, short_px - long_px)
        max_loss = width - credit
        return {
            "structure": "bear_call_credit",
            "short_call": short_k,
            "long_call": long_k,
            "width": width,
            "est_credit": round(credit, 3),
            "est_max_loss": round(max_loss, 3),
            "risk_dollars_per_spread": round(max_loss * 100, 2),
            "note": "Safe/cheap defined risk — verify live bid/ask before entry",
        }
