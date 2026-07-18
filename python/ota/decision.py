"""Decision engine: fair value edge + news + knowledge-aware confidence."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .pricing import black_scholes, monte_carlo_european, OptionType
from .knowledge import KnowledgeBase


@dataclass
class TradeRecommendation:
    timestamp: str
    params: Dict[str, Any]
    bs_price: float
    mc_price: float
    mc_std_err: float
    fair_value: float
    market_price: Optional[float]
    edge: float
    recommendation: str
    size: int
    confidence: float
    rationale: List[str]
    knowledge_hits: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DecisionEngine:
    def __init__(
        self,
        kb: KnowledgeBase,
        edge_threshold_pct: float = 0.05,
        risk_per_trade: float = 0.02,
    ):
        self.kb = kb
        self.edge_threshold_pct = edge_threshold_pct
        self.risk_per_trade = risk_per_trade

    def recommend(
        self,
        S0: float,
        X: float,
        T: float,
        r: float,
        sigma: float,
        option_type: OptionType = "call",
        market_price: Optional[float] = None,
        news_sentiment: float = 0.0,
        cash: float = 10_000.0,
        mc_sims: int = 40_000,
    ) -> TradeRecommendation:
        bs = black_scholes(S0, X, T, r, sigma, option_type)
        mc = monte_carlo_european(
            S0, X, T, r, sigma,
            option_type=option_type,
            num_simulations=mc_sims,
            num_steps=1,
            antithetic=True,
            seed=42,
        )

        # Blend BS + MC; news_sentiment in [-1, 1] tilts fair value ±10%
        sentiment_adj = 1.0 + 0.1 * max(-1.0, min(1.0, news_sentiment))
        fair = 0.5 * (bs + mc.price) * sentiment_adj
        mkt = market_price if market_price is not None else fair
        edge = fair - mkt

        rationale: List[str] = [
            f"BS={bs:.4f} MC={mc.price:.4f}±{mc.std_err:.4f} (abs err vs BS {mc.abs_error:.4f})",
            f"Fair value after news_sentiment={news_sentiment:+.2f}: {fair:.4f}",
            f"Edge vs market {mkt:.4f}: {edge:+.4f}",
        ]

        hits = self.kb.search("monte carlo black-scholes risk sizing", limit=3)
        knowledge_hits = [h.get("snippet", "")[:120] for h in hits]

        rec = "HOLD"
        size = 0
        thr = self.edge_threshold_pct * max(fair, 1e-6)

        if edge > thr and fair > 0:
            rec = "BUY CALL" if option_type == "call" else "BUY PUT"
            max_risk = cash * self.risk_per_trade
            contract_cost = fair * 100.0
            size = max(1, int(max_risk / max(contract_cost, 1e-6))) if contract_cost > 0 else 0
            rationale.append(
                f"Edge > {self.edge_threshold_pct:.0%} of fair → directional buy; "
                f"size by {self.risk_per_trade:.0%} capital risk."
            )
        elif edge < -thr:
            rec = "SELL / CONSIDER OPPOSITE" if option_type == "call" else "SELL / CONSIDER CALL"
            rationale.append("Market rich vs model fair value → avoid long / consider opposite.")
        else:
            rationale.append("Edge inside threshold → HOLD.")

        confidence = min(1.0, abs(edge) / (mc.std_err + 0.01))

        return TradeRecommendation(
            timestamp=datetime.now(timezone.utc).isoformat(),
            params={
                "S0": S0,
                "X": X,
                "T": T,
                "r": r,
                "sigma": sigma,
                "type": option_type,
                "news_sentiment": news_sentiment,
            },
            bs_price=round(bs, 4),
            mc_price=round(mc.price, 4),
            mc_std_err=round(mc.std_err, 4),
            fair_value=round(fair, 4),
            market_price=market_price,
            edge=round(edge, 4),
            recommendation=rec,
            size=size,
            confidence=round(confidence, 4),
            rationale=rationale,
            knowledge_hits=knowledge_hits,
        )
