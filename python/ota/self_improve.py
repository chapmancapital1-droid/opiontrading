"""
Long-horizon self-improvement for the NERDCOMMAND trading brain.

Simulates many synthetic market years (default 400) under regime-switching GBM,
applies SPY 1DTE-style logic driven by BrainGenome, scores fitness, and evolves
parameters. Champion genome + lessons are written back into the knowledge catalog.

Usage:
  cd python
  python -m ota.self_improve --years 400 --generations 12 --pop 8
  python -m ota.self_improve --years 50 --fast   # smoke

This is NOT a claim of 400 years of real SPY history. It is a stress laboratory:
many years of synthetic regimes so the brain can fail, learn, and harden rules
before live capital.
"""
from __future__ import annotations

import argparse
import json
import logging
import math
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from .genome import BrainGenome, crossover, mutate_genome
from .knowledge import KnowledgeBase, KnowledgeEntry
from .pricing import black_scholes

logger = logging.getLogger("ota.self_improve")

DATA = Path(__file__).resolve().parent / "data"
DATA.mkdir(parents=True, exist_ok=True)


# ── Market regimes (multi-century lab) ─────────────────────────

REGIMES = {
    "bull": {"mu": 0.10, "sigma": 0.14, "weight": 0.40},
    "bear": {"mu": -0.12, "sigma": 0.22, "weight": 0.15},
    "sideways": {"mu": 0.02, "sigma": 0.12, "weight": 0.30},
    "crisis": {"mu": -0.35, "sigma": 0.45, "weight": 0.08},
    "meltup": {"mu": 0.25, "sigma": 0.28, "weight": 0.07},
}


def _pick_regime(rng: np.random.Generator) -> str:
    names = list(REGIMES.keys())
    w = np.array([REGIMES[n]["weight"] for n in names], dtype=float)
    w /= w.sum()
    return str(rng.choice(names, p=w))


def simulate_trading_year(
    genome: BrainGenome,
    year_index: int,
    rng: np.random.Generator,
    start_spot: float = 100.0,
    start_capital: float = 50_000.0,
    days: int = 252,
) -> Dict[str, Any]:
    """
    One synthetic year of daily 1DTE-style trades under a drawn regime.
    Uses BS intrinsic-ish settlement for speed (lab scale).
    """
    regime = _pick_regime(rng)
    mu = REGIMES[regime]["mu"]
    sigma = REGIMES[regime]["sigma"] * (0.85 + 0.3 * rng.random())
    # Slight genome IV awareness
    trade_iv = float(np.clip(genome.default_iv * (sigma / 0.16), 0.08, 0.60))

    capital = float(start_capital)
    peak = capital
    max_dd = 0.0
    spot = float(start_spot)
    trades = 0
    wins = 0
    losses = 0
    gross_win = 0.0
    gross_loss = 0.0
    pnls: List[float] = []

    for d in range(days):
        # Daily GBM step
        z = float(rng.standard_normal())
        ret = (mu - 0.5 * sigma * sigma) / 252.0 + sigma * math.sqrt(1 / 252.0) * z
        # Intraday open→close for entry mid-day proxy
        open_px = spot
        spot = max(1.0, spot * math.exp(ret))
        close_px = spot
        day_move = (close_px - open_px) / open_px

        # Simple entry score proxy (trend + momentum vs "ATR" = sigma daily)
        atr_proxy = max(1e-6, sigma / math.sqrt(252))
        score = 50.0
        direction = "call"
        if day_move > 0.15 * atr_proxy:
            score += 25.0
            direction = "call"
        elif day_move < -0.15 * atr_proxy:
            score += 25.0
            direction = "put"
        else:
            score += 5.0
            direction = "call" if day_move >= 0 else "put"
        # ORB proxy: large |move|
        if abs(day_move) > atr_proxy:
            score += 20.0
        score += float(rng.uniform(0, 15))  # noise / incomplete info

        if score < genome.min_entry_score:
            continue

        # Strike ATM
        strike = round(open_px) if open_px > 50 else round(open_px, 1)
        t_entry = 1.0 / 365.0
        raw = black_scholes(
            open_px, strike, t_entry, genome.r, trade_iv, direction  # type: ignore
        )
        entry = raw + genome.slippage_per_share
        if entry < genome.min_option_premium or entry > genome.max_option_premium:
            continue

        # POP filter (N(d2) style)
        vol = trade_iv * math.sqrt(t_entry)
        if vol <= 0:
            continue
        d2 = (math.log(open_px / strike) + (genome.r - 0.5 * trade_iv**2) * t_entry) / vol
        from scipy.stats import norm

        pop = float(norm.cdf(d2) if direction == "call" else norm.cdf(-d2))
        if pop < genome.min_pop:
            continue

        cost_per = entry * 100.0
        risk_budget = capital * genome.risk_per_trade
        contracts = max(1, int(risk_budget / cost_per))
        contracts = min(contracts, genome.max_contracts)
        entry_cost = contracts * cost_per + contracts * genome.commission_per_contract
        if entry_cost > capital * 0.95:
            continue

        # Exit at close: intrinsic (1DTE end-of-day)
        if direction == "call":
            exit_raw = max(close_px - strike, 0.0)
        else:
            exit_raw = max(strike - close_px, 0.0)
        exit_px = max(0.0, exit_raw - genome.slippage_per_share)

        # Mid-day mark for adjustment (halfway path)
        mid_px = open_px * math.exp(0.5 * ret)
        if direction == "call":
            mid_opt = max(mid_px - strike, 0.0) * 0.7 + entry * 0.3  # crude mark
        else:
            mid_opt = max(strike - mid_px, 0.0) * 0.7 + entry * 0.3
        pnl_frac = (mid_opt - entry) / max(entry, 1e-9)

        adjusted = False
        wing_credit = 0.0
        if genome.use_adjustments and pnl_frac <= -genome.loss_trigger_pct:
            # Convert to debit spread: sell ~5pt OTM wing
            wing = strike + 5 if direction == "call" else strike - 5
            if direction == "call":
                wing_val = max(mid_px - wing, 0.0) * 0.5
            else:
                wing_val = max(wing - mid_px, 0.0) * 0.5
            wing_credit = max(0.05, wing_val)
            adjusted = True

        if adjusted:
            wing = strike + 5 if direction == "call" else strike - 5
            if direction == "call":
                wing_exit = max(close_px - wing, 0.0)
            else:
                wing_exit = max(wing - close_px, 0.0)
            spread_exit = max(0.0, exit_px - wing_exit)
            net_debit = entry - wing_credit
            pnl = (
                contracts * (spread_exit - net_debit) * 100.0
                - 2 * contracts * genome.commission_per_contract
            )
        else:
            # Optional profit take mid-day
            if pnl_frac >= genome.profit_take_pct:
                take = entry * (1.0 + genome.profit_take_pct)
                pnl = (
                    contracts * (take - entry) * 100.0
                    - 2 * contracts * genome.commission_per_contract
                )
            else:
                pnl = (
                    contracts * (exit_px - entry) * 100.0
                    - 2 * contracts * genome.commission_per_contract
                )

        # Prefer defined risk: if flag on, shave tail losses (spread-like)
        if genome.prefer_defined_risk and pnl < 0:
            pnl *= 0.75  # bounded damage proxy for starting defined-risk

        capital += pnl
        capital = max(0.0, capital)
        peak = max(peak, capital)
        dd = (peak - capital) / peak if peak > 0 else 0.0
        max_dd = max(max_dd, dd)

        trades += 1
        pnls.append(pnl)
        if pnl > 0:
            wins += 1
            gross_win += pnl
        else:
            losses += 1
            gross_loss += abs(pnl)

        if capital < start_capital * 0.15:
            # Ruin-ish stop year
            break

    total_pnl = capital - start_capital
    win_rate = wins / trades if trades else 0.0
    pf = gross_win / gross_loss if gross_loss > 1e-9 else (99.0 if gross_win > 0 else 0.0)
    ret = capital / start_capital - 1.0
    # Fitness components for this year
    sharpe_proxy = 0.0
    if len(pnls) > 2:
        arr = np.array(pnls, dtype=float)
        sharpe_proxy = float(arr.mean() / (arr.std() + 1e-9) * math.sqrt(max(trades, 1)))

    return {
        "year": year_index,
        "regime": regime,
        "trades": trades,
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate,
        "profit_factor": min(pf, 99.0),
        "total_pnl": total_pnl,
        "return": ret,
        "max_dd": max_dd,
        "ending_capital": capital,
        "ending_spot": spot,
        "sharpe_proxy": sharpe_proxy,
        "sigma": sigma,
        "mu": mu,
    }


def fitness_from_years(years: List[Dict[str, Any]]) -> Tuple[float, Dict[str, float]]:
    """Aggregate multi-year fitness — reward return & PF, punish DD & ruin."""
    if not years:
        return -1e9, {}
    rets = np.array([y["return"] for y in years], dtype=float)
    dds = np.array([y["max_dd"] for y in years], dtype=float)
    pfs = np.array([y["profit_factor"] for y in years], dtype=float)
    wrs = np.array([y["win_rate"] for y in years], dtype=float)
    trades = np.array([y["trades"] for y in years], dtype=float)
    ruins = sum(1 for y in years if y["ending_capital"] < 10_000)

    mean_ret = float(rets.mean())
    med_ret = float(np.median(rets))
    mean_dd = float(dds.mean())
    p95_dd = float(np.percentile(dds, 95))
    mean_pf = float(np.clip(pfs, 0, 10).mean())
    mean_wr = float(wrs.mean())
    trade_activity = float(np.clip(trades.mean() / 80.0, 0, 1.5))

    # Crisis years subset
    crisis = [y for y in years if y["regime"] == "crisis"]
    crisis_ret = float(np.mean([y["return"] for y in crisis])) if crisis else 0.0

    fitness = (
        100.0 * mean_ret
        + 40.0 * med_ret
        + 15.0 * mean_pf
        + 20.0 * mean_wr
        + 5.0 * trade_activity
        + 10.0 * crisis_ret  # survival in crisis
        - 80.0 * mean_dd
        - 120.0 * p95_dd
        - 50.0 * ruins
    )
    metrics = {
        "fitness": fitness,
        "mean_return": mean_ret,
        "median_return": med_ret,
        "mean_max_dd": mean_dd,
        "p95_max_dd": p95_dd,
        "mean_pf": mean_pf,
        "mean_win_rate": mean_wr,
        "mean_trades_per_year": float(trades.mean()),
        "crisis_mean_return": crisis_ret,
        "ruin_years": float(ruins),
        "n_years": float(len(years)),
    }
    return fitness, metrics


def run_horizon(
    genome: BrainGenome,
    n_years: int,
    seed: int,
    start_capital: float = 50_000.0,
) -> Tuple[float, Dict[str, float], List[Dict[str, Any]]]:
    rng = np.random.default_rng(seed)
    years: List[Dict[str, Any]] = []
    capital = start_capital
    spot = 100.0
    for y in range(n_years):
        # Compound capital lightly across years (lab path)
        yr = simulate_trading_year(
            genome,
            year_index=y,
            rng=rng,
            start_spot=spot,
            start_capital=max(5_000.0, capital),
        )
        years.append(yr)
        capital = yr["ending_capital"]
        spot = yr["ending_spot"]
        # Reseed capital each century-block to avoid single-path domination
        if (y + 1) % 50 == 0:
            capital = start_capital
            spot = 100.0 * (1.0 + 0.02 * rng.standard_normal())
    fit, metrics = fitness_from_years(years)
    return fit, metrics, years


def evolve(
    years: int = 400,
    generations: int = 10,
    population: int = 8,
    seed: int = 42,
    elite: int = 2,
    eval_years: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Evolutionary self-improvement.
    Each candidate is stress-tested on `eval_years` (default=years, can subsample for speed).
    """
    eval_years = eval_years or years
    rng = np.random.default_rng(seed)
    # Initial population
    base = BrainGenome.load(DATA / "champion_genome.json")
    pop: List[BrainGenome] = [base]
    while len(pop) < population:
        pop.append(mutate_genome(base, rng, scale=1.2))

    history: List[Dict[str, Any]] = []
    champion = base
    champ_fit = -1e18
    champ_metrics: Dict[str, float] = {}

    t0 = time.time()
    for gen in range(generations):
        scored: List[Tuple[float, BrainGenome, Dict[str, float]]] = []
        for i, g in enumerate(pop):
            # Unique seed per candidate/gen for fair but varied labs
            fit, metrics, _ = run_horizon(
                g, n_years=eval_years, seed=seed + gen * 1000 + i * 17
            )
            g.fitness = fit
            g.generation = gen
            scored.append((fit, g, metrics))
            logger.info(
                "gen=%s cand=%s fit=%.2f mean_ret=%.3f dd=%.3f wr=%.2f",
                gen,
                i,
                fit,
                metrics.get("mean_return", 0),
                metrics.get("mean_max_dd", 0),
                metrics.get("mean_win_rate", 0),
            )

        scored.sort(key=lambda x: x[0], reverse=True)
        best_fit, best_g, best_m = scored[0]
        history.append(
            {
                "generation": gen,
                "best_fitness": best_fit,
                "best_metrics": best_m,
                "best_genome": best_g.to_dict(),
            }
        )
        if best_fit > champ_fit:
            champ_fit = best_fit
            champion = BrainGenome(**best_g.to_dict())
            champion.fitness = best_fit
            champion.notes = f"champion gen {gen} fit={best_fit:.2f}"
            champ_metrics = best_m

        # Next gen: elites + crossover/mutation
        elites = [s[1] for s in scored[:elite]]
        next_pop: List[BrainGenome] = [BrainGenome(**e.to_dict()) for e in elites]
        while len(next_pop) < population:
            if rng.random() < 0.6 and len(elites) >= 2:
                a, b = elites[int(rng.integers(0, len(elites)))], elites[
                    int(rng.integers(0, len(elites)))
                ]
                child = crossover(a, b, rng)
                child = mutate_genome(child, rng, scale=0.8)
            else:
                parent = elites[int(rng.integers(0, len(elites)))]
                child = mutate_genome(parent, rng, scale=1.0)
            next_pop.append(child)
        pop = next_pop

    # Final full-horizon validation on champion
    logger.info("Final validation: %s years on champion…", years)
    final_fit, final_metrics, final_years = run_horizon(
        champion, n_years=years, seed=seed + 99991
    )
    champion.fitness = final_fit
    champion.notes = (
        f"validated {years}y fit={final_fit:.2f} mean_ret={final_metrics.get('mean_return', 0):.3f}"
    )
    champion.save(DATA / "champion_genome.json")

    # Persist evolution report
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request_years": years,
        "eval_years_per_candidate": eval_years,
        "generations": generations,
        "population": population,
        "seed": seed,
        "elapsed_sec": round(time.time() - t0, 2),
        "champion_genome": champion.to_dict(),
        "champion_validation_metrics": final_metrics,
        "evolution_history": history,
        "regime_model": REGIMES,
        "disclaimer": (
            "Synthetic regime lab — not real 400y SPY history. "
            "Use to harden rules; re-validate on real bars before live risk."
        ),
    }
    report_path = DATA / "self_improve_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    # Write lessons into knowledge brain
    _write_brain_lessons(champion, final_metrics, years)

    # Yearly summary sample (first/last/crisis)
    sample_years = final_years[:3] + final_years[-3:]
    report["sample_years"] = sample_years
    report_path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    logger.info("Champion saved → %s", DATA / "champion_genome.json")
    logger.info("Report → %s", report_path)
    return report


def _write_brain_lessons(
    genome: BrainGenome, metrics: Dict[str, float], years: int
) -> None:
    kb = KnowledgeBase()
    # Store genome in meta
    kb.meta["genome"] = genome.to_dict()
    kb.meta["self_improve"] = {
        "last_run": datetime.now(timezone.utc).isoformat(),
        "years": years,
        "metrics": metrics,
    }
    # Update actionable rules from genome
    kb.strategy_rules["fixed_fractional"] = {
        "risk_per_trade": genome.risk_per_trade,
        "action": "SIZE_BY_RISK",
        "source": "SELF_IMPROVE",
        "priority": 1,
    }
    kb.strategy_rules["convert_debit_spread"] = {
        "when": f"long_option_loss_pct > {genome.loss_trigger_pct}",
        "action": "CONVERT_TO_DEBIT_SPREAD",
        "priority": 1,
        "source": "SELF_IMPROVE",
        "enabled": genome.use_adjustments,
    }
    kb.strategy_rules["spy_1dte_orb"] = {
        "min_setup_score": genome.min_entry_score,
        "min_pop": genome.min_pop,
        "filters": ["ema_trend", "orb", "atr_momentum"],
        "source": "SELF_IMPROVE",
    }
    kb.strategy_rules["self_improve_champion"] = {
        "action": "APPLY_GENOME",
        "genome": genome.to_dict(),
        "source": "SELF_IMPROVE",
        "priority": 0,
    }

    snippet = (
        f"Self-improve after {years} synthetic years: "
        f"min_entry_score={genome.min_entry_score:.1f}, min_pop={genome.min_pop:.2f}, "
        f"risk_per_trade={genome.risk_per_trade:.3f}, loss_trigger={genome.loss_trigger_pct:.2f}, "
        f"use_adjustments={genome.use_adjustments}, prefer_defined_risk={genome.prefer_defined_risk}. "
        f"Metrics: mean_return={metrics.get('mean_return', 0):.3f}, "
        f"mean_dd={metrics.get('mean_max_dd', 0):.3f}, "
        f"win_rate={metrics.get('mean_win_rate', 0):.3f}, "
        f"fitness={metrics.get('fitness', 0):.2f}."
    )
    kb.append_entry(
        KnowledgeEntry(
            section="Edge Cases",
            tags=["self_improve", "long_horizon", "genome"],
            snippet=snippet,
            source="SELF_IMPROVE_LAB",
            keyword="self improve",
            strategy_ids=["self_improve_champion", "fixed_fractional", "convert_debit_spread"],
        )
    )
    kb.append_entry(
        KnowledgeEntry(
            section="SPY 1DTE Playbook",
            tags=["1dte", "evolved"],
            snippet=(
                "Evolved 1DTE gates from multi-century lab. "
                f"Only trade when score≥{genome.min_entry_score:.0f} and POP≥{genome.min_pop:.0%}. "
                f"Adjust losers at {genome.loss_trigger_pct:.0%} premium loss. "
                "Prefer defined-risk structures for survival across regimes."
            ),
            source="SELF_IMPROVE_LAB",
            keyword="1dte",
            strategy_ids=["spy_1dte_orb", "spy_1dte_debit_adjust"],
        )
    )
    kb.save()
    logger.info("Brain catalog updated with self-improve lessons")


def apply_champion_to_strategy() -> BrainGenome:
    """Load champion genome (for agent / dashboard)."""
    return BrainGenome.load(DATA / "champion_genome.json")


def main(argv: Optional[List[str]] = None) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )
    p = argparse.ArgumentParser(description="NERDCOMMAND 400-year self-improve lab")
    p.add_argument("--years", type=int, default=400, help="Validation horizon years")
    p.add_argument(
        "--eval-years",
        type=int,
        default=0,
        help="Years per candidate during evolution (0=min(years,80))",
    )
    p.add_argument("--generations", type=int, default=10)
    p.add_argument("--pop", type=int, default=8, help="Population size")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--fast", action="store_true", help="Smoke: 40y, 4 gen, pop 4")
    args = p.parse_args(argv)

    years = args.years
    gens = args.generations
    pop = args.pop
    eval_years = args.eval_years
    if args.fast:
        years = min(years, 40)
        gens = min(gens, 4)
        pop = min(pop, 4)
        eval_years = eval_years or 20
    if not eval_years:
        eval_years = min(years, 80)

    print(
        f"=== NERDCOMMAND Self-Improve Lab ===\n"
        f"validation_years={years} eval_years={eval_years} "
        f"generations={gens} population={pop} seed={args.seed}\n"
    )
    report = evolve(
        years=years,
        generations=gens,
        population=pop,
        seed=args.seed,
        eval_years=eval_years,
    )
    print(json.dumps(
        {
            "champion_genome": report["champion_genome"],
            "champion_validation_metrics": report["champion_validation_metrics"],
            "elapsed_sec": report["elapsed_sec"],
            "report_path": str(DATA / "self_improve_report.json"),
            "genome_path": str(DATA / "champion_genome.json"),
            "disclaimer": report["disclaimer"],
        },
        indent=2,
    ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
