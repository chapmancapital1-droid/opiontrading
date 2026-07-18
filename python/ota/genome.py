"""
Evolvable trading-brain genome (parameters the self-improver mutates).

Persisted into brain_catalog.json under meta.genome + strategy_rules tuning.
"""
from __future__ import annotations

import json
from copy import deepcopy
from dataclasses import asdict, dataclass, fields
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class BrainGenome:
    """All knobs that define how the brain trades (SPY 1DTE + risk)."""

    # Entry
    min_entry_score: float = 70.0
    min_pop: float = 0.55
    max_strikes: int = 4
    atr_momentum_weight: float = 20.0

    # Risk
    risk_per_trade: float = 0.02
    max_contracts: int = 5
    commission_per_contract: float = 0.65
    slippage_per_share: float = 0.05

    # Adjustments
    loss_trigger_pct: float = 0.40
    prefer_defined_risk: bool = True
    use_adjustments: bool = True
    profit_take_pct: float = 0.50  # take partial when +50% of premium

    # Pricing / filters
    default_iv: float = 0.18
    r: float = 0.05
    min_option_premium: float = 0.15
    max_option_premium: float = 15.0
    atm_band: float = 12.0

    # Self-improve meta
    generation: int = 0
    fitness: float = 0.0
    notes: str = "seed genome"

    def clamp(self) -> "BrainGenome":
        self.min_entry_score = float(min(95.0, max(40.0, self.min_entry_score)))
        self.min_pop = float(min(0.85, max(0.40, self.min_pop)))
        self.max_strikes = int(min(4, max(1, self.max_strikes)))
        self.risk_per_trade = float(min(0.05, max(0.005, self.risk_per_trade)))
        self.max_contracts = int(min(20, max(1, self.max_contracts)))
        self.loss_trigger_pct = float(min(0.70, max(0.15, self.loss_trigger_pct)))
        self.profit_take_pct = float(min(1.0, max(0.20, self.profit_take_pct)))
        self.default_iv = float(min(0.60, max(0.08, self.default_iv)))
        self.atm_band = float(min(25.0, max(3.0, self.atm_band)))
        self.min_option_premium = float(min(2.0, max(0.05, self.min_option_premium)))
        self.max_option_premium = float(min(30.0, max(1.0, self.max_option_premium)))
        return self

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "BrainGenome":
        known = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in d.items() if k in known}).clamp()

    def save(self, path: Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> "BrainGenome":
        path = Path(path)
        if not path.exists():
            return cls()
        return cls.from_dict(json.loads(path.read_text(encoding="utf-8")))


def mutate_genome(g: BrainGenome, rng, scale: float = 1.0) -> BrainGenome:
    """Gaussian mutation of continuous knobs."""
    c = BrainGenome(**g.to_dict())
    c.min_entry_score += float(rng.normal(0, 3.0 * scale))
    c.min_pop += float(rng.normal(0, 0.03 * scale))
    c.risk_per_trade += float(rng.normal(0, 0.003 * scale))
    c.loss_trigger_pct += float(rng.normal(0, 0.04 * scale))
    c.profit_take_pct += float(rng.normal(0, 0.05 * scale))
    c.default_iv += float(rng.normal(0, 0.02 * scale))
    c.atm_band += float(rng.normal(0, 1.0 * scale))
    if rng.random() < 0.15:
        c.use_adjustments = not c.use_adjustments
    if rng.random() < 0.15:
        c.prefer_defined_risk = not c.prefer_defined_risk
    if rng.random() < 0.2:
        c.max_contracts = int(max(1, c.max_contracts + rng.integers(-2, 3)))
    c.generation = g.generation + 1
    c.notes = f"mutated from gen {g.generation}"
    return c.clamp()


def crossover(a: BrainGenome, b: BrainGenome, rng) -> BrainGenome:
    """Uniform crossover."""
    da, db = a.to_dict(), b.to_dict()
    child = {}
    for k in da:
        child[k] = da[k] if rng.random() < 0.5 else db[k]
    out = BrainGenome.from_dict(child)
    out.generation = max(a.generation, b.generation) + 1
    out.notes = f"crossover gen {out.generation}"
    return out.clamp()
