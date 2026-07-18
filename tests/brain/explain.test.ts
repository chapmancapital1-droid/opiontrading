import { describe, it, expect } from "vitest";
import { explainStrategy, explanationToMarkdown } from "@/brain/explain";
import { runTradingBrain } from "@/brain/selector";
import { scoreRecommendationsWithEngine } from "@/brain/engineScore";
import { demoAccount } from "@/brain/demoAccount";
import type { MarketContext } from "@/lib/marketContext";
import type { ChainRow } from "@/brain/instantiate";

function ctx(over: Partial<MarketContext> = {}): MarketContext {
  return {
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
    notes: ["test"],
    ...over,
  };
}

function chain(spot = 190): ChainRow[] {
  const rows: ChainRow[] = [];
  for (let k = 160; k <= 220; k += 5) {
    rows.push({ strike: k, type: "put", mark: Math.max(0.2, (spot - k) * 0.06 + 1), iv: 0.28 });
    rows.push({ strike: k, type: "call", mark: Math.max(0.2, (k - spot) * 0.06 + 1), iv: 0.28 });
  }
  return rows;
}

describe("Phase 5 grounded explainer", () => {
  it("explains top rec with structured facts and never invents auto-trade", () => {
    const market = ctx();
    const decision = runTradingBrain({
      context: market,
      account: demoAccount(),
      maxLossByStrategyId: { cash_secured_put: 18000, bull_put_credit: 400, iron_condor: 400 },
      topN: 3,
    });
    const scored = scoreRecommendationsWithEngine(decision, {
      symbol: "AAPL",
      spot: 190,
      expiration: market.expiration,
      chain: chain(),
      sigma: 0.28,
      tYears: 40 / 365,
      simulations: 2_000,
      seed: 1,
    });

    const x = explainStrategy({ decision, context: market, scored });
    expect(x.strategyId).toBeTruthy();
    expect(x.facts.symbol).toBe("AAPL");
    expect(x.disclaimer.toLowerCase()).toMatch(/not investment advice|educational/);
    expect(x.howToUseBuilder.some((h) => /never auto-trade/i.test(h))).toBe(true);
    expect(x.headline).toContain(market.symbol);

    const md = explanationToMarkdown(x);
    expect(md).toContain("## Why now");
    expect(md).toContain("Disclaimer");
  });

  it("handles empty recommendations cleanly", () => {
    const market = ctx({ eventProximity: "earnings", ivTrend: "low", spotTrend: "down" });
    const decision = runTradingBrain({
      context: market,
      account: demoAccount({ approvalProfile: "level2_basic", cash: 100, equity: 100 }),
      topN: 5,
    });
    const x = explainStrategy({ decision, context: market, scored: [] });
    expect(x.name).toMatch(/no recommendation/i);
    expect(x.facts.suggestedContracts).toBe(0);
  });
});
