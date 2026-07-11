import type { Leg } from "@/domain/types";
import { analyzePayoff } from "@/domain/payoff";
import { runMonteCarlo, type DriftMode } from "@/domain/montecarlo";

export interface CompareInput {
  label: string;
  legs: Leg[];
}
export interface CompareRow {
  label: string;
  netCashFlow: number;
  maxProfit: number | "unlimited";
  maxLoss: number | "undefined";
  breakEvens: number[];
  probProfit: number;
  expectedPL: number;
  returnOnRisk: number | null;   // maxProfit / |maxLoss| when both finite
}

export function compareStrategies(
  items: CompareInput[],
  ctx: { spot: number; tYears: number; sigma: number; r: number; q: number; drift: DriftMode; simulations: number; seed: number }
): CompareRow[] {
  if (items.length > 3) items = items.slice(0, 3);
  return items.map((it) => {
    const p = analyzePayoff({ underlying: "CMP", legs: it.legs, currentPrice: ctx.spot });
    const mc = runMonteCarlo({ legs: it.legs, spot: ctx.spot, tYears: ctx.tYears, sigma: ctx.sigma, r: ctx.r, q: ctx.q, drift: ctx.drift, simulations: ctx.simulations, seed: ctx.seed });
    const ror =
      typeof p.maxProfit === "number" && typeof p.maxLoss === "number" && p.maxLoss !== 0
        ? Number((p.maxProfit / Math.abs(p.maxLoss)).toFixed(3))
        : null;
    return {
      label: it.label,
      netCashFlow: p.netCashFlow,
      maxProfit: p.maxProfit, maxLoss: p.maxLoss, breakEvens: p.breakEvens,
      probProfit: mc.probProfit, expectedPL: mc.expectedPL, returnOnRisk: ror,
    };
  });
}

export type SortKey = "probProfit" | "expectedPL" | "returnOnRisk" | "maxLoss" | "netCashFlow";
export function sortCompare(rows: CompareRow[], key: SortKey, dir: "asc" | "desc" = "desc"): CompareRow[] {
  const val = (r: CompareRow): number => {
    const v = r[key] as number | "unlimited" | "undefined" | null;
    if (v === "unlimited") return Number.POSITIVE_INFINITY;
    if (v === "undefined") return Number.NEGATIVE_INFINITY;
    return typeof v === "number" ? v : 0;
  };
  return [...rows].sort((a, b) => (dir === "desc" ? val(b) - val(a) : val(a) - val(b)));
}
