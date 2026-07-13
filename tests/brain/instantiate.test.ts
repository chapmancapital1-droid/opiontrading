import { describe, it, expect } from "vitest";
import { instantiateStrategy, type ChainRow } from "@/brain/instantiate";
import { buildRiskMapsFromChain, scoreRecommendationsWithEngine } from "@/brain/engineScore";
import { runTradingBrain } from "@/brain/selector";
import { demoAccount } from "@/brain/demoAccount";
import type { MarketContext } from "@/lib/marketContext";

function synthChain(spot = 100): ChainRow[] {
  const rows: ChainRow[] = [];
  for (let k = 80; k <= 120; k += 5) {
    const otmPut = Math.max(0.15, (spot - k) * 0.08 + 1.2);
    const otmCall = Math.max(0.15, (k - spot) * 0.08 + 1.2);
    rows.push({ strike: k, type: "put", mark: Number(otmPut.toFixed(2)), iv: 0.28 });
    rows.push({ strike: k, type: "call", mark: Number(otmCall.toFixed(2)), iv: 0.28 });
  }
  return rows;
}

function ctx(over: Partial<MarketContext> = {}): MarketContext {
  return {
    symbol: "AAPL",
    spot: 100,
    expiration: "2026-08-21",
    atmIv: 0.28,
    ivRank: 0.7,
    ivTrend: "elevated",
    spotTrend: "sideways",
    expectedMove: 5,
    liquidity: "normal",
    eventProximity: "clear",
    newsSentiment: "neutral",
    expectedMovePct: 0.05,
    sampleSize: 20,
    confidence: "high",
    asOf: "2026-07-12T15:00:00.000Z",
    notes: [],
    ...over,
  };
}

describe("instantiateStrategy", () => {
  const chain = synthChain(100);

  it("builds cash-secured put with short put OTM and collateral", () => {
    const inst = instantiateStrategy({
      strategyId: "cash_secured_put",
      symbol: "AAPL",
      spot: 100,
      expiration: "2026-08-21",
      chain,
      shortDeltaTarget: 0.25,
    });
    expect(inst.ok).toBe(true);
    expect(inst.legs).toHaveLength(1);
    expect(inst.legs[0]!.assetType).toBe("option");
    if (inst.legs[0]!.assetType === "option") {
      expect(inst.legs[0]!.side).toBe("short");
      expect(inst.legs[0]!.optionType).toBe("put");
      expect(inst.legs[0]!.strike).toBeLessThanOrEqual(100);
    }
    expect(inst.collateralPerContract).toBeGreaterThan(0);
    expect(inst.maxLossPerContract).toBeGreaterThan(0);
  });

  it("builds iron condor with 4 legs", () => {
    const inst = instantiateStrategy({
      strategyId: "iron_condor",
      symbol: "AAPL",
      spot: 100,
      expiration: "2026-08-21",
      chain,
    });
    expect(inst.ok).toBe(true);
    expect(inst.legs.filter((l) => l.assetType === "option")).toHaveLength(4);
    expect(inst.maxLossPerContract).toBeGreaterThan(0);
  });

  it("builds bull put credit spread", () => {
    const inst = instantiateStrategy({
      strategyId: "bull_put_credit",
      symbol: "AAPL",
      spot: 100,
      expiration: "2026-08-21",
      chain,
    });
    expect(inst.ok).toBe(true);
    expect(inst.legs).toHaveLength(2);
  });

  it("fails cleanly on empty chain", () => {
    const inst = instantiateStrategy({
      strategyId: "long_call",
      symbol: "AAPL",
      spot: 100,
      expiration: "2026-08-21",
      chain: [],
    });
    expect(inst.ok).toBe(false);
  });
});

describe("engineScore Phase 4.1", () => {
  it("sizes recommendations and attaches PoP/EV from engine", () => {
    const chain = synthChain(100);
    const market = ctx();
    const { maxLossByStrategyId, collateralByStrategyId } = buildRiskMapsFromChain(
      ["cash_secured_put", "bull_put_credit", "iron_condor", "long_call"],
      {
        symbol: "AAPL",
        spot: 100,
        expiration: "2026-08-21",
        chain,
      }
    );

    const decision = runTradingBrain({
      context: market,
      account: demoAccount(),
      maxLossByStrategyId,
      collateralByStrategyId,
      topN: 5,
    });

    expect(decision.recommendations.length).toBeGreaterThan(0);

    const scored = scoreRecommendationsWithEngine(decision, {
      symbol: "AAPL",
      spot: 100,
      expiration: "2026-08-21",
      chain,
      sigma: 0.28,
      tYears: 40 / 365,
      simulations: 3_000,
      seed: 7,
    });

    expect(scored.length).toBe(decision.recommendations.length);
    const withEngine = scored.filter((s) => s.engine.probProfit != null);
    expect(withEngine.length).toBeGreaterThan(0);
    for (const s of withEngine) {
      expect(s.engine.probProfit!).toBeGreaterThanOrEqual(0);
      expect(s.engine.probProfit!).toBeLessThanOrEqual(1);
    }
  });
});
