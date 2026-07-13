import { describe, it, expect } from "vitest";
import { computeNciTa, snapshotFromAlert, putSnapshot, getSnapshot } from "@/indicators/nciTa";
import type { Bar } from "@/indicators/nciTa";
import { runTradingBrain } from "@/brain/selector";
import type { AccountState } from "@/brain/types";
import type { MarketContext } from "@/lib/marketContext";

function synthBars(n: number, start = 100, drift = 0.15): Bar[] {
  const bars: Bar[] = [];
  let px = start;
  for (let i = 0; i < n; i++) {
    const o = px;
    // mild uptrend + noise
    const ch = drift * (0.5 + Math.sin(i / 7) * 0.3) + (i % 5 === 0 ? -0.4 : 0.2);
    const c = Math.max(1, o + ch);
    const h = Math.max(o, c) + 0.3;
    const l = Math.min(o, c) - 0.3;
    bars.push({
      time: Date.UTC(2025, 0, 1) + i * 3600_000,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: 1_000_000 + i * 1000,
    });
    px = c;
  }
  return bars;
}

describe("computeNciTa — Pine language port", () => {
  it("returns a full snapshot with 5 layer scores", () => {
    const snap = computeNciTa({
      symbol: "SPY",
      timeframe: "60",
      bars: synthBars(200),
      sessionOk: true,
    });
    expect(snap.version).toBe("NCI-TA-2.0");
    expect(snap.symbol).toBe("SPY");
    expect(snap.sbBull + snap.sbBear).toBe(24);
    expect(snap.master).toBeGreaterThanOrEqual(-1);
    expect(snap.master).toBeLessThanOrEqual(1);
    expect(["BULL", "BEAR", "FLAT"]).toContain(snap.masterDir);
    expect(snap.layerScores.superBias).toBeDefined();
    expect(snap.portBull + snap.portBear).toBeLessThanOrEqual(11);
    expect(snap.voterBull + snap.voterBear).toBeLessThanOrEqual(15);
  });

  it("marks degraded when few bars", () => {
    const snap = computeNciTa({ symbol: "AAPL", bars: synthBars(40) });
    expect(snap.degraded).toBe(true);
  });
});

describe("TradingView webhook snapshot", () => {
  it("maps FIRE_BUY alert into brain-readable snapshot", () => {
    const snap = snapshotFromAlert({
      symbol: "AAPL",
      event: "FIRE_BUY",
      master: 0.55,
      master_pct: 55,
      sb_net: 18,
      sb_bull: 21,
      sb_bear: 3,
      timeframe: "5",
    });
    expect(snap.fireBuy).toBe(true);
    expect(snap.trigger).toBe("FIRE_BUY");
    expect(snap.masterDir).toBe("BULL");
    putSnapshot(snap);
    expect(getSnapshot("aapl")?.fireBuy).toBe(true);
  });
});

describe("brain + NCI TA integration", () => {
  const ctx = (): MarketContext => ({
    symbol: "AAPL",
    spot: 190,
    expiration: "2026-08-21",
    atmIv: 0.3,
    ivRank: 0.7,
    ivTrend: "elevated",
    spotTrend: "sideways",
    expectedMove: 8,
    liquidity: "normal",
    eventProximity: "clear",
    newsSentiment: "neutral",
    expectedMovePct: 0.04,
    sampleSize: 30,
    confidence: "high",
    asOf: "2026-07-11T18:00:00.000Z",
    notes: [],
  });
  const acct = (): AccountState => ({
    equity: 10_000,
    cash: 8_000,
    optionsFloat: 5_000,
    portfolioCore: 2_000,
    openRiskDollars: 0,
    openCampaigns: 0,
    dailyRealizedPL: 0,
    approvalProfile: "level3_spreads",
    growthMode: "balanced",
  });

  it("FIRE BUY boosts bullish income strategies in ranking reasons", () => {
    const nciTa = snapshotFromAlert({
      symbol: "AAPL",
      event: "FIRE_BUY",
      master: 0.6,
      master_pct: 60,
      sb_net: 20,
    });
    const d = runTradingBrain({
      context: ctx(),
      account: acct(),
      nciTa,
      maxLossByStrategyId: { cash_secured_put: 90, bull_put_credit: 80 },
    });
    expect(d.nciTa?.fireBuy).toBe(true);
    expect(d.marketNotes.some((n) => n.includes("NCI TA live"))).toBe(true);
    const top = d.recommendations[0];
    expect(top).toBeTruthy();
    // bullish / growth primary should surface
    expect(
      top!.matchReasons.some((r) => r.includes("FIRE BUY") || r.includes("Growth-primary") || r.includes("master"))
    ).toBe(true);
  });

  it("C CONTRACTION blocks growth_tactical long call path", () => {
    const nciTa = snapshotFromAlert({
      symbol: "AAPL",
      event: "HEARTBEAT",
      master: 0.4,
      master_pct: 40,
      abc: "C",
    });
    // force contraction stage
    nciTa.abcStage = "C_CONTRACTION";
    nciTa.masterDir = "BULL";
    const d = runTradingBrain({
      context: {
        ...ctx(),
        ivTrend: "low",
        spotTrend: "up",
        newsSentiment: "positive",
      },
      account: acct(),
      nciTa,
      maxLossByStrategyId: { long_call: 200, bull_call_debit: 150 },
    });
    const tactical = d.recommendations.filter((r) =>
      ["long_call", "bull_call_debit"].includes(r.strategyId)
    );
    // either absent or not top — contraction rejects growth_tactical in scoreRule
    expect(tactical.every((r) => r.matchScore === 0 || !r.name.includes("Tactical"))).toBe(true);
  });
});
