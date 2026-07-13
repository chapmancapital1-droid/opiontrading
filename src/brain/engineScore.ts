/**
 * Phase 4.1 — Score brain recommendations with the full quantitative engine.
 * PoP / EV / RoR via compareStrategies (payoff + Monte Carlo).
 */

import { compareStrategies, type CompareRow } from "@/lib/compare";
import type { DriftMode } from "@/domain/montecarlo";
import { instantiateStrategy, type ChainRow, type InstantiatedStrategy } from "./instantiate";
import type { BrainDecision, BrainRecommendation } from "./types";

export interface EngineMetrics {
  strategyId: string;
  probProfit: number | null;
  expectedPL: number | null;
  returnOnRisk: number | null;
  maxProfit: number | "unlimited" | null;
  maxLoss: number | "undefined" | null;
  netCashFlow: number | null;
  breakEvens: number[];
  instantiated: boolean;
  notes: string[];
}

export interface ScoredRecommendation extends BrainRecommendation {
  engine: EngineMetrics;
  legsNote: string;
}

export interface EngineScoreContext {
  symbol: string;
  spot: number;
  expiration: string;
  chain: readonly ChainRow[];
  sigma: number;
  tYears: number;
  r?: number;
  q?: number;
  simulations?: number;
  seed?: number;
}

export function scoreRecommendationsWithEngine(
  decision: BrainDecision,
  ctx: EngineScoreContext
): ScoredRecommendation[] {
  const recs = decision.recommendations;
  if (!recs.length) return [];

  const instById = new Map<string, InstantiatedStrategy>();
  for (const r of recs) {
    if (instById.has(r.strategyId)) continue;
    instById.set(
      r.strategyId,
      instantiateStrategy({
        strategyId: r.strategyId,
        symbol: ctx.symbol,
        spot: ctx.spot,
        expiration: ctx.expiration,
        chain: ctx.chain,
      })
    );
  }

  const compareItems = recs
    .map((r) => {
      const inst = instById.get(r.strategyId)!;
      if (!inst.ok || !inst.legs.length) return null;
      return { label: r.strategyId, legs: inst.legs };
    })
    .filter((x): x is { label: string; legs: InstantiatedStrategy["legs"] } => x != null);

  // Score one strategy at a time so a single failure cannot blank a batch of 3.
  const rnDrift: DriftMode = { kind: "risk-neutral" };
  const rows = new Map<string, CompareRow>();
  const engineErrors = new Map<string, string>();
  for (const item of compareItems) {
    try {
      const scored = compareStrategies([item], {
        spot: ctx.spot,
        tYears: Math.max(ctx.tYears, 1 / 365),
        sigma: Math.max(ctx.sigma, 0.05),
        r: ctx.r ?? 0.045,
        q: ctx.q ?? 0.005,
        drift: rnDrift,
        simulations: ctx.simulations ?? 8_000,
        seed: ctx.seed ?? 42,
      });
      for (const row of scored) rows.set(row.label, row);
    } catch (e) {
      engineErrors.set(
        item.label,
        e instanceof Error ? e.message : "Engine score failed (unknown error)"
      );
    }
  }

  return recs.map((r) => {
    const inst = instById.get(r.strategyId)!;
    const row = rows.get(r.strategyId);
    const engErr = engineErrors.get(r.strategyId);
    const baseNotes = [...inst.notes];
    if (engErr) baseNotes.push(`Engine score failed: ${engErr}`);
    if (!inst.ok) baseNotes.push("Could not instantiate from chain");
    if (inst.ok && !row && !engErr) baseNotes.push("Engine metrics unavailable for this structure");

    const engine: EngineMetrics = row
      ? {
          strategyId: r.strategyId,
          probProfit: row.probProfit,
          expectedPL: row.expectedPL,
          returnOnRisk: row.returnOnRisk,
          maxProfit: row.maxProfit,
          maxLoss: row.maxLoss,
          netCashFlow: row.netCashFlow,
          breakEvens: row.breakEvens,
          instantiated: true,
          notes: baseNotes,
        }
      : {
          strategyId: r.strategyId,
          probProfit: null,
          expectedPL: null,
          returnOnRisk: null,
          maxProfit: null,
          maxLoss: null,
          netCashFlow: null,
          breakEvens: [],
          instantiated: inst.ok,
          notes: baseNotes,
        };

    // Prefer engine max-loss for display when brain sizing had none
    const maxLossPerContract =
      r.maxLossPerContract ??
      inst.maxLossPerContract ??
      (typeof engine.maxLoss === "number" ? Math.abs(engine.maxLoss) : null);

    return {
      ...r,
      maxLossPerContract,
      engine,
      legsNote: inst.notes.join("; "),
    };
  });
}

/** Build maxLoss / collateral maps for runTradingBrain from a chain. */
export function buildRiskMapsFromChain(
  strategyIds: string[],
  ctx: Omit<EngineScoreContext, "sigma" | "tYears" | "r" | "q" | "simulations" | "seed">
): {
  maxLossByStrategyId: Record<string, number>;
  collateralByStrategyId: Record<string, number>;
  instantiations: InstantiatedStrategy[];
} {
  const maxLossByStrategyId: Record<string, number> = {};
  const collateralByStrategyId: Record<string, number> = {};
  const instantiations: InstantiatedStrategy[] = [];

  for (const id of strategyIds) {
    const inst = instantiateStrategy({
      strategyId: id,
      symbol: ctx.symbol,
      spot: ctx.spot,
      expiration: ctx.expiration,
      chain: ctx.chain,
    });
    instantiations.push(inst);
    if (inst.maxLossPerContract != null && inst.maxLossPerContract > 0) {
      maxLossByStrategyId[id] = inst.maxLossPerContract;
    }
    if (inst.collateralPerContract != null && inst.collateralPerContract > 0) {
      collateralByStrategyId[id] = inst.collateralPerContract;
    }
  }

  return { maxLossByStrategyId, collateralByStrategyId, instantiations };
}
