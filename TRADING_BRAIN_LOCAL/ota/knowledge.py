"""
Knowledge base + auto-ingestion for NERDCOMMAND OTA brain.

New PDFs/books → keyword detect → hierarchical catalog sections → JSON brain.
Dev team: upgrade extract_text_from_pdf with pdfplumber / LLM summarization.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Catalog sections (fixed hierarchy — do not rename without migration)
CATALOG_SECTIONS = [
    "Core Foundations",
    "Numerical Methods",
    "Trading Strategies",
    "Risk Management",
    "Python Automation",
    "ML AI Pipelines",
    "Data Pipelines",
    "Edge Cases",
    "Source References",
    "SPY 1DTE Playbook",
]

# keyword → (section, subsection tags, strategy_rule_ids)
KEYWORD_MAP: List[Tuple[str, str, List[str], List[str]]] = [
    ("black-scholes", "Core Foundations", ["bs_formula", "assumptions"], []),
    ("black scholes", "Core Foundations", ["bs_formula"], []),
    ("geometric brownian", "Core Foundations", ["gbm"], []),
    ("put-call parity", "Core Foundations", ["parity"], ["synthetic_long", "synthetic_short"]),
    ("put call parity", "Core Foundations", ["parity"], []),
    ("implied volatility", "Risk Management", ["iv"], ["iron_condor", "credit_spread"]),
    ("volatility smile", "Risk Management", ["vol_surface"], []),
    ("volatility skew", "Risk Management", ["vol_surface"], []),
    ("monte carlo", "Numerical Methods", ["monte_carlo"], []),
    ("antithetic", "Numerical Methods", ["variance_reduction"], []),
    ("binomial", "Numerical Methods", ["binomial_crr"], ["american_exercise"]),
    ("cox-ross-rubinstein", "Numerical Methods", ["binomial_crr"], []),
    ("longstaff", "Numerical Methods", ["american_ls"], ["american_exercise"]),
    ("finite difference", "Numerical Methods", ["pde_fd"], []),
    ("delta hedging", "Trading Strategies", ["hedging"], ["delta_hedge"]),
    ("covered call", "Trading Strategies", ["income"], ["covered_call"]),
    ("protective put", "Trading Strategies", ["hedging"], ["protective_put"]),
    ("debit spread", "Trading Strategies", ["spreads"], ["debit_spread", "bull_call"]),
    ("credit spread", "Trading Strategies", ["spreads"], ["credit_spread", "bull_put"]),
    ("iron condor", "Trading Strategies", ["defined_risk"], ["iron_condor"]),
    ("straddle", "Trading Strategies", ["volatility"], ["long_straddle"]),
    ("strangle", "Trading Strategies", ["volatility"], ["long_strangle"]),
    ("butterfly", "Trading Strategies", ["defined_risk"], ["butterfly"]),
    ("broken wing", "Trading Strategies", ["defined_risk"], ["broken_wing_butterfly"]),
    ("calendar spread", "Trading Strategies", ["time_spreads"], ["calendar"]),
    ("0dte", "SPY 1DTE Playbook", ["0dte"], ["spy_1dte_long"]),
    ("1dte", "SPY 1DTE Playbook", ["1dte"], ["spy_1dte_long"]),
    ("opening range", "SPY 1DTE Playbook", ["orb"], ["spy_1dte_orb"]),
    ("vwap", "SPY 1DTE Playbook", ["vwap"], ["spy_1dte_vwap"]),
    ("roll forward", "SPY 1DTE Playbook", ["adjustments"], ["roll_forward"]),
    ("adjustment", "SPY 1DTE Playbook", ["adjustments"], ["convert_debit_spread"]),
    ("position sizing", "Risk Management", ["sizing"], ["kelly", "fixed_fractional"]),
    ("value at risk", "Risk Management", ["var"], []),
    ("max drawdown", "Risk Management", ["drawdown"], []),
    ("stop loss", "Risk Management", ["stops"], []),
    ("kelly criterion", "Risk Management", ["sizing"], ["kelly"]),
    ("reinforcement learning", "ML AI Pipelines", ["rl"], []),
    ("feature engineering", "ML AI Pipelines", ["features"], []),
    ("mlflow", "ML AI Pipelines", ["mlops"], []),
    ("etl", "Data Pipelines", ["etl"], []),
    ("streaming", "Data Pipelines", ["streaming"], []),
    ("schedule", "Python Automation", ["scheduling"], []),
    ("backtest", "Trading Strategies", ["backtesting"], []),
    ("overfitting", "Edge Cases", ["backtest_pitfalls"], []),
    ("look-ahead", "Edge Cases", ["backtest_pitfalls"], []),
    ("liquidity", "Edge Cases", ["market_microstructure"], []),
    ("fat tails", "Edge Cases", ["model_risk"], []),
]


@dataclass
class KnowledgeEntry:
    section: str
    tags: List[str]
    snippet: str
    source: str
    keyword: str
    strategy_ids: List[str] = field(default_factory=list)
    timestamp: str = ""
    page: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class KnowledgeBase:
    """Hierarchical JSON catalog. Loads/saves brain state."""

    def __init__(self, path: Optional[Path] = None):
        self.path = Path(path) if path else Path(__file__).parent / "data" / "brain_catalog.json"
        self.catalog: Dict[str, List[Dict[str, Any]]] = {s: [] for s in CATALOG_SECTIONS}
        self.strategy_rules: Dict[str, Dict[str, Any]] = {}
        self.meta: Dict[str, Any] = {
            "version": "1.0",
            "owner": "Michael Chapman / NERDCOMMAND / GangsterNerds LLC",
            "goal": "Self-improving option trading brain — ingest books, price, decide, risk-manage, adjust.",
            "updated_at": None,
        }
        self.load()

    def load(self) -> None:
        if not self.path.exists():
            self._seed_defaults()
            self.save()
            return
        raw = json.loads(self.path.read_text(encoding="utf-8"))
        self.catalog = raw.get("catalog", self.catalog)
        for s in CATALOG_SECTIONS:
            self.catalog.setdefault(s, [])
        self.strategy_rules = raw.get("strategy_rules", {})
        self.meta = raw.get("meta", self.meta)

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.meta["updated_at"] = _utc_now()
        payload = {
            "meta": self.meta,
            "catalog": self.catalog,
            "strategy_rules": self.strategy_rules,
        }
        self.path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def _seed_defaults(self) -> None:
        """Core brain logic baked in so agent works before any PDF ingest."""
        seeds = [
            KnowledgeEntry(
                section="Core Foundations",
                tags=["bs_formula", "gbm"],
                snippet=(
                    "GBM: dS = μS dt + σS dW. Risk-neutral: μ = r − q. "
                    "Call c = S e^{-qτ} N(d1) − X e^{-rτ} N(d2). "
                    "Use implied vol from market; adjust for dividends (Merton)."
                ),
                source="OTA_SEED:Crack_Basic_Black_Scholes",
                keyword="black-scholes",
                strategy_ids=[],
                timestamp=_utc_now(),
            ),
            KnowledgeEntry(
                section="Numerical Methods",
                tags=["monte_carlo", "variance_reduction"],
                snippet=(
                    "Monte Carlo European: simulate risk-neutral paths, discount E[payoff]. "
                    "One-step exact lognormal terminal; antithetic (Z,-Z) reduces variance. "
                    "Converges to BS as N→∞. Path-dependent options need multi-step paths."
                ),
                source="OTA_SEED:Numerical_MC",
                keyword="monte carlo",
                strategy_ids=[],
                timestamp=_utc_now(),
            ),
            KnowledgeEntry(
                section="Risk Management",
                tags=["sizing"],
                snippet=(
                    "Never risk >1–2% of capital per trade. Prefer defined-risk structures. "
                    "Size with fixed-fractional or fractional Kelly. Model risk in crashes / fat tails."
                ),
                source="OTA_SEED:Risk_Rules",
                keyword="position sizing",
                strategy_ids=["fixed_fractional"],
                timestamp=_utc_now(),
            ),
            KnowledgeEntry(
                section="SPY 1DTE Playbook",
                tags=["1dte", "adjustments", "orb"],
                snippet=(
                    "SPY 1DTE: selective entry (trend + ORB/VWAP + vol filter), not every day. "
                    "Losing long: primary convert to debit spread (sell OTM wing); "
                    "secondary roll forward; tertiary hedge opposite; butterfly for recovery. "
                    "No magic — adjustments lower breakeven / max loss, not guarantee profit. "
                    "Backtest with commissions/slippage before live."
                ),
                source="OTA_SEED:SPY_1DTE_ReverseEngineer",
                keyword="1dte",
                strategy_ids=["spy_1dte_long", "convert_debit_spread", "roll_forward"],
                timestamp=_utc_now(),
            ),
            KnowledgeEntry(
                section="Trading Strategies",
                tags=["spreads"],
                snippet=(
                    "Convert long call losing value → sell higher strike call = debit spread. "
                    "Collects credit, lowers net debit and breakeven, caps upside."
                ),
                source="OTA_SEED:Adjustment_Debit_Spread",
                keyword="debit spread",
                strategy_ids=["convert_debit_spread", "bull_call"],
                timestamp=_utc_now(),
            ),
        ]
        for e in seeds:
            self.catalog[e.section].append(e.to_dict())

        self.strategy_rules = {
            "convert_debit_spread": {
                "when": "long_option_loss_pct > 0.40",
                "action": "CONVERT_TO_DEBIT_SPREAD",
                "priority": 1,
                "source": "OTA_SEED",
            },
            "roll_forward": {
                "when": "time_left_years < 0.1 and pnl < 0",
                "action": "ROLL_FORWARD",
                "priority": 2,
                "source": "OTA_SEED",
            },
            "fixed_fractional": {
                "risk_per_trade": 0.02,
                "action": "SIZE_BY_RISK",
                "source": "OTA_SEED",
            },
            "spy_1dte_orb": {
                "min_setup_score": 70,
                "filters": ["ema_trend", "orb", "atr_momentum"],
                "source": "OTA_SEED",
            },
        }

    def append_entry(self, entry: KnowledgeEntry) -> None:
        entry.timestamp = entry.timestamp or _utc_now()
        section = entry.section if entry.section in self.catalog else "Source References"
        self.catalog[section].append(entry.to_dict())
        for sid in entry.strategy_ids:
            self.strategy_rules.setdefault(
                sid,
                {
                    "action": sid.upper(),
                    "source": entry.source,
                    "keyword": entry.keyword,
                    "priority": 50,
                },
            )

    def search(self, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        q = query.lower()
        hits: List[Dict[str, Any]] = []
        for section, items in self.catalog.items():
            for item in items:
                blob = f"{section} {item.get('snippet','')} {item.get('keyword','')}".lower()
                if q in blob or any(t in blob for t in q.split()):
                    hits.append(item)
        return hits[:limit]

    def relevant_rules(self, context_keywords: List[str]) -> List[Dict[str, Any]]:
        out = []
        for kw in context_keywords:
            for sid, rule in self.strategy_rules.items():
                if kw.lower() in sid.lower() or kw.lower() in json.dumps(rule).lower():
                    out.append({"id": sid, **rule})
        return out

    def stats(self) -> Dict[str, Any]:
        return {
            "sections": {k: len(v) for k, v in self.catalog.items()},
            "total_entries": sum(len(v) for v in self.catalog.values()),
            "strategy_rules": len(self.strategy_rules),
            "path": str(self.path),
        }


class KnowledgeIngestion:
    """
    Auto-detect keywords in book text / PDF and append to KnowledgeBase.

    Production upgrade path:
      1) pdfplumber extract (see scripts/ingest_option_pdfs.py in OptionScope)
      2) optional LLM summarization for image-heavy pages
      3) re-compile TypeScript strategy rules via scripts/compile_ingest_rules.mjs
    """

    def __init__(self, kb: KnowledgeBase):
        self.kb = kb

    def extract_text(self, path: Path, max_chars: int = 200_000) -> str:
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(path)
        suffix = path.suffix.lower()
        if suffix in {".txt", ".md", ".csv", ".json"}:
            return path.read_text(encoding="utf-8", errors="ignore")[:max_chars]
        if suffix == ".pdf":
            try:
                import pdfplumber  # type: ignore
            except ImportError:
                # Fallback: record path for later real extract
                return f"[PDF_PLACEHOLDER path={path.name} — install pdfplumber for full extract]"
            chunks: List[str] = []
            with pdfplumber.open(path) as pdf:
                for i, page in enumerate(pdf.pages[:80]):
                    t = page.extract_text() or ""
                    chunks.append(t)
                    if sum(len(c) for c in chunks) > max_chars:
                        break
            return "\n".join(chunks)[:max_chars]
        return path.read_text(encoding="utf-8", errors="ignore")[:max_chars]

    def ingest_text(
        self,
        text: str,
        source_name: str,
        max_entries: int = 40,
    ) -> List[KnowledgeEntry]:
        lower = text.lower()
        added: List[KnowledgeEntry] = []
        seen = set()

        for keyword, section, tags, strategy_ids in KEYWORD_MAP:
            if keyword not in lower:
                continue
            key = (section, keyword)
            if key in seen:
                continue
            seen.add(key)
            # Pull a window around first match
            idx = lower.find(keyword)
            start = max(0, idx - 120)
            end = min(len(text), idx + 280)
            snippet = re.sub(r"\s+", " ", text[start:end]).strip()
            entry = KnowledgeEntry(
                section=section,
                tags=tags,
                snippet=snippet or f"Matched keyword '{keyword}' in {source_name}",
                source=source_name,
                keyword=keyword,
                strategy_ids=strategy_ids,
                timestamp=_utc_now(),
            )
            self.kb.append_entry(entry)
            added.append(entry)
            if len(added) >= max_entries:
                break

        self.kb.save()
        return added

    def ingest_file(self, path: Path, source_name: Optional[str] = None) -> List[KnowledgeEntry]:
        path = Path(path)
        name = source_name or path.stem
        text = self.extract_text(path)
        return self.ingest_text(text, name)
