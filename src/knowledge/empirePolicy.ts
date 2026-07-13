/**
 * Empire capital-survival policy overlay for Michael's personal companion.
 * Stricter than default PORTFOLIO_POLICY when equity is in seed / early stages.
 * Educational process tool — not investment advice.
 */

import type { GrowthMode } from "./types";
import { PORTFOLIO_POLICY } from "./portfolioPolicy";

export type CapitalPhase = "seed" | "stage1" | "stage2" | "scale";

export interface EmpirePhaseLimits {
  phase: CapitalPhase;
  label: string;
  /** Soft risk per trade as fraction of equity */
  perTradeRiskPct: number;
  /** Hard cap per trade */
  perTradeRiskCapPct: number;
  openRiskBudgetPct: number;
  maxOpenCampaigns: number;
  /** Prefer / force this growth mode key for sizing */
  growthMode: GrowthMode;
  /** Strategy IDs allowed as primary recommendations (others deprioritized or blocked) */
  preferredStrategyIds: string[];
  /** Block these strategyIds entirely at this phase */
  blockedStrategyIds: string[];
  /** Absolute max loss fraction of equity for one trade */
  absoluteMaxLossPct: number;
  dailyLossHaltPct: number;
  ladderFrom: number;
  ladderTo: number;
  note: string;
}

const SEED_PREFERRED = [
  "bull_call_debit",
  "bear_put_debit",
  "long_call",
  "long_put",
  "bull_put_credit",
  "bear_call_credit",
];

const SEED_BLOCKED = [
  "cash_secured_put", // cash lock usually >> seed equity
  // covered_call allowed only if sharesHeld — handled at rule gate via shares
];

export function resolveCapitalPhase(equity: number): CapitalPhase {
  if (!(equity > 0) || !Number.isFinite(equity)) return "seed";
  if (equity < 5_000) return "seed";
  if (equity < 25_000) return "stage1";
  if (equity < 100_000) return "stage2";
  return "scale";
}

export function getEmpirePhaseLimits(equity: number): EmpirePhaseLimits {
  const phase = resolveCapitalPhase(equity);
  switch (phase) {
    case "seed":
      return {
        phase: "seed",
        label: "Seed ($0–$5k)",
        perTradeRiskPct: 0.005,
        perTradeRiskCapPct: 0.01,
        openRiskBudgetPct: 0.1,
        maxOpenCampaigns: 2,
        growthMode: "income_preservation",
        preferredStrategyIds: SEED_PREFERRED,
        blockedStrategyIds: SEED_BLOCKED,
        absoluteMaxLossPct: 0.02,
        dailyLossHaltPct: 0.02,
        ladderFrom: 500,
        ladderTo: 5_000,
        note:
          "Seed micro: defined-risk only bias. CSP/wheel usually unaffordable. 0.5% risk target — missing trades beats oversize.",
      };
    case "stage1":
      return {
        phase: "stage1",
        label: "Stage 1 ($5k–$25k)",
        perTradeRiskPct: 0.0075,
        perTradeRiskCapPct: 0.015,
        openRiskBudgetPct: 0.12,
        maxOpenCampaigns: 3,
        growthMode: "income_preservation",
        preferredStrategyIds: [...SEED_PREFERRED, "iron_condor", "covered_call", "cash_secured_put"],
        blockedStrategyIds: [],
        absoluteMaxLossPct: 0.03,
        dailyLossHaltPct: 0.025,
        ladderFrom: 5_000,
        ladderTo: 25_000,
        note: "Stage 1: verticals + selective CSP/CC when cash/shares support them.",
      };
    case "stage2":
      return {
        phase: "stage2",
        label: "Stage 2 ($25k–$100k)",
        perTradeRiskPct: 0.01,
        perTradeRiskCapPct: 0.02,
        openRiskBudgetPct: 0.2,
        maxOpenCampaigns: 4,
        growthMode: "balanced",
        preferredStrategyIds: [],
        blockedStrategyIds: [],
        absoluteMaxLossPct: PORTFOLIO_POLICY.hardGates.absoluteMaxLossPct,
        dailyLossHaltPct: PORTFOLIO_POLICY.hardGates.dailyLossHaltPct,
        ladderFrom: 25_000,
        ladderTo: 100_000,
        note: "Stage 2: full policy balanced modes available; still manual RH only.",
      };
    default:
      return {
        phase: "scale",
        label: "Scale ($100k+)",
        perTradeRiskPct: 0.01,
        perTradeRiskCapPct: 0.02,
        openRiskBudgetPct: 0.2,
        maxOpenCampaigns: 6,
        growthMode: "balanced",
        preferredStrategyIds: [],
        blockedStrategyIds: [],
        absoluteMaxLossPct: PORTFOLIO_POLICY.hardGates.absoluteMaxLossPct,
        dailyLossHaltPct: PORTFOLIO_POLICY.hardGates.dailyLossHaltPct,
        ladderFrom: 100_000,
        ladderTo: 500_000,
        note: "Scale: standard NCI-OS policy. Empire still: no auto-trade.",
      };
  }
}

/** Risk dollars allowed for one trade under empire overlay. */
export function empireRiskCeiling(equity: number, openRiskDollars: number): {
  perTrade: number;
  remainingBudget: number;
  absolute: number;
  hardCeiling: number;
  phase: EmpirePhaseLimits;
} {
  const phase = getEmpirePhaseLimits(equity);
  const perTrade = equity * Math.min(phase.perTradeRiskPct, phase.perTradeRiskCapPct);
  const budget = equity * phase.openRiskBudgetPct;
  const remainingBudget = Math.max(0, budget - openRiskDollars);
  const absolute = equity * phase.absoluteMaxLossPct;
  const hardCeiling = Math.min(perTrade, remainingBudget, absolute);
  return { perTrade, remainingBudget, absolute, hardCeiling, phase };
}

export function empireBlocksStrategy(strategyId: string, equity: number): boolean {
  const phase = getEmpirePhaseLimits(equity);
  return phase.blockedStrategyIds.includes(strategyId);
}

export function empirePrefersStrategy(strategyId: string, equity: number): boolean {
  const phase = getEmpirePhaseLimits(equity);
  if (!phase.preferredStrategyIds.length) return true;
  return phase.preferredStrategyIds.includes(strategyId);
}

/** Human coach text when 1 lot exceeds seed risk. */
export function zeroSizeCoach(args: {
  equity: number;
  maxLossPerContract: number;
  strategyId?: string;
}): string {
  const { equity, maxLossPerContract, strategyId } = args;
  const { hardCeiling, phase } = empireRiskCeiling(equity, 0);
  const riskPct = equity > 0 ? (maxLossPerContract / equity) * 100 : 0;
  const lines = [
    `Empire ${phase.phase}: equity $${equity.toFixed(0)} allows ~$${hardCeiling.toFixed(2)} risk per trade (${(phase.perTradeRiskPct * 100).toFixed(1)}% target).`,
    `This structure's max loss per 1-lot is $${maxLossPerContract.toFixed(2)} (${riskPct.toFixed(1)}% of equity) — size is 0 to protect the empire.`,
  ];
  if (strategyId === "cash_secured_put" || strategyId === "covered_call") {
    lines.push(
      "CSP/CC often need stock×100 cash or shares. At seed, prefer cheap defined-risk debit/credit verticals."
    );
  } else {
    lines.push(
      "Try a tighter-width vertical, lower-priced debit, or paper the process until equity supports 1-lot risk."
    );
  }
  return lines.join(" ");
}

export function ladderProgress(equity: number): {
  phase: CapitalPhase;
  from: number;
  to: number;
  pct: number;
  label: string;
} {
  const phase = getEmpirePhaseLimits(equity);
  const span = Math.max(1, phase.ladderTo - phase.ladderFrom);
  const pct = Math.min(100, Math.max(0, ((equity - phase.ladderFrom) / span) * 100));
  return {
    phase: phase.phase,
    from: phase.ladderFrom,
    to: phase.ladderTo,
    pct,
    label: phase.label,
  };
}
