import { describe, it, expect } from "vitest";
import {
  isSpySymbol,
  buildSpyAdvancedPlaybook,
  spyAdvancedInstructionLines,
  SPY_STRATEGY_BOOST,
} from "@/knowledge/spyPlaybook";
import { runTradingBrain } from "@/brain/selector";
import type { AccountState } from "@/brain/types";
import type { MarketContext } from "@/lib/marketContext";

const account: AccountState = {
  equity: 25_000,
  cash: 12_000,
  optionsFloat: 5_000,
  portfolioCore: 8_000,
  openRiskDollars: 0,
  openCampaigns: 0,
  dailyRealizedPL: 0,
  approvalProfile: "level3_spreads",
  growthMode: "balanced",
  sharesHeld: {},
};

function ctx(symbol: string): MarketContext {
  return {
    symbol,
    spot: 550,
    expiration: "2026-08-15",
    atmIv: 0.18,
    ivRank: 0.55,
    ivTrend: "elevated",
    spotTrend: "up",
    expectedMove: 6,
    liquidity: "normal",
    eventProximity: "clear",
    newsSentiment: "positive",
    expectedMovePct: 0.01,
    sampleSize: 20,
    confidence: "medium",
    asOf: new Date().toISOString(),
    notes: [],
  };
}

describe("spyPlaybook", () => {
  it("detects SPY symbols", () => {
    expect(isSpySymbol("SPY")).toBe(true);
    expect(isSpySymbol("AMEX:SPY")).toBe(true);
    expect(isSpySymbol("AAPL")).toBe(false);
  });

  it("builds ≤4 high-POP guides", () => {
    const pb = buildSpyAdvancedPlaybook({ bias: "bullish", spot: 550 });
    expect(pb.highPopStrikeGuides.length).toBeLessThanOrEqual(4);
    expect(pb.highPopStrikeGuides.length).toBeGreaterThan(0);
    expect(pb.adjustmentLadder.length).toBeGreaterThan(2);
  });

  it("injects advanced instructions on SPY brain run", () => {
    const d = runTradingBrain({
      context: ctx("SPY"),
      account,
      topN: 3,
    });
    expect(d.spyPlaybook).toBeTruthy();
    expect(d.spyPlaybook?.symbol).toBe("SPY");
    expect(d.marketNotes.some((n) => n.includes("SPY ADVANCED"))).toBe(true);
    if (d.recommendations.length) {
      const r = d.recommendations[0]!;
      expect(r.advancedInstructions?.length).toBeGreaterThan(0);
      expect(
        r.entryRules.some((e) => e.toLowerCase().includes("spy") || e.includes("70"))
      ).toBe(true);
    }
  });

  it("does not attach spyPlaybook for non-SPY", () => {
    const d = runTradingBrain({
      context: ctx("AAPL"),
      account,
      topN: 3,
    });
    expect(d.spyPlaybook == null).toBe(true);
    expect(d.recommendations.every((r) => !r.advancedInstructions?.length)).toBe(true);
  });

  it("has boost map for core structures", () => {
    expect(SPY_STRATEGY_BOOST.bull_put_credit).toBeGreaterThan(0.1);
    expect(
      spyAdvancedInstructionLines(
        "bull_put_credit",
        buildSpyAdvancedPlaybook({ bias: "bullish" })
      ).length
    ).toBeGreaterThan(1);
  });
});
