import { describe, it, expect } from "vitest";
import {
  resolveCapitalPhase,
  getEmpirePhaseLimits,
  empireRiskCeiling,
  empireBlocksStrategy,
  zeroSizeCoach,
  ladderProgress,
} from "@/knowledge/empirePolicy";
import { sizePosition } from "@/brain/portfolio";
import { seedAccount } from "@/brain/demoAccount";
import { evaluateRuleGates, allPassed } from "@/brain/riskGates";
import type { StrategyRule } from "@/knowledge/types";
import type { MarketContext } from "@/lib/marketContext";

describe("empirePolicy", () => {
  it("classifies $500 as seed and $6000 as stage1", () => {
    expect(resolveCapitalPhase(500)).toBe("seed");
    expect(resolveCapitalPhase(6000)).toBe("stage1");
    expect(resolveCapitalPhase(30_000)).toBe("stage2");
  });

  it("seed risk ceiling is ~0.5% of equity", () => {
    const { hardCeiling, phase } = empireRiskCeiling(500, 0);
    expect(phase.phase).toBe("seed");
    expect(hardCeiling).toBeLessThanOrEqual(500 * 0.01 + 0.01);
    expect(hardCeiling).toBeGreaterThan(0);
    expect(hardCeiling).toBeCloseTo(2.5, 5); // min of 0.5% target and remaining
  });

  it("blocks CSP at seed", () => {
    expect(empireBlocksStrategy("cash_secured_put", 500)).toBe(true);
    expect(empireBlocksStrategy("bull_put_credit", 500)).toBe(false);
  });

  it("sizes 0 when 1-lot max loss exceeds seed ceiling", () => {
    const account = seedAccount(500);
    const sized = sizePosition({
      account,
      maxLossPerContract: 150, // way above $2.50 ceiling
      empireMode: true,
    });
    expect(sized.contracts).toBe(0);
    const coach = zeroSizeCoach({ equity: 500, maxLossPerContract: 150, strategyId: "bull_call_debit" });
    expect(coach).toMatch(/size is 0/i);
  });

  it("ladder progress at seed start is ~0%", () => {
    const p = ladderProgress(500);
    expect(p.phase).toBe("seed");
    expect(p.pct).toBeCloseTo(0, 0);
  });
});

describe("empire rule gates", () => {
  const ctx: MarketContext = {
    symbol: "AAPL",
    spot: 190,
    expiration: "2026-08-21",
    atmIv: 0.28,
    ivRank: 0.7,
    ivTrend: "elevated",
    spotTrend: "sideways",
    expectedMove: 8,
    liquidity: "normal",
    eventProximity: "clear",
    newsSentiment: "neutral",
    expectedMovePct: 0.04,
    sampleSize: 20,
    confidence: "high",
    asOf: "2026-07-12T15:00:00.000Z",
    notes: [],
  };

  const cspRule = {
    id: "wheel_csp_entry",
    strategyId: "cash_secured_put",
    name: "CSP",
    thesis: "moderately_bullish",
    portfolioRole: "income_engine",
    riskProfile: "substantial_downside_capped_upside",
    approval: "level2_basic",
    ivConditions: ["elevated", "neutral"],
    trends: ["up", "sideways"],
    eventStance: "avoid_earnings",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [],
    exitRules: ["profit_50pct_max"],
    shortDeltaTarget: 0.25,
    dteMin: 21,
    dteMax: 45,
    priority: 0.95,
    growthPrimary: true,
    bookSource: "test",
    structure: "csp",
    notes: [],
  } as StrategyRule;

  it("fails EMPIRE_PHASE_BLOCK for CSP at $500", () => {
    const gates = evaluateRuleGates(cspRule, ctx, seedAccount(500));
    expect(allPassed(gates)).toBe(false);
    expect(gates.some((g) => g.code === "EMPIRE_PHASE_BLOCK")).toBe(true);
  });
});
