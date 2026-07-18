import { describe, expect, it } from "vitest";
import {
  distillLessons,
  emptyHiveBrain,
  evaluateHiveSuccess,
  getStrategyHiveNote,
  mergeSuccessfulRun,
  strategyWinRatesExport,
  type HiveChampionMetrics,
} from "@/knowledge/hiveBrain";

function baseMetrics(over: Partial<HiveChampionMetrics> = {}): HiveChampionMetrics {
  return {
    strategyId: "5dte_iron_condor",
    dte: 5,
    ticker: "SPY",
    sharpe: 0.8,
    sortino: 1.1,
    maxDD: 0.18,
    winRate: 0.62,
    trades: 40,
    totalReturn: 0.22,
    profitFactor: 1.4,
    statisticalEdge: 0.1,
    kellyOptimal: 0.12,
    expectedValue: 25,
    ...over,
  };
}

describe("hiveBrain success gate", () => {
  it("accepts strong champions", () => {
    const g = evaluateHiveSuccess(baseMetrics());
    expect(g.success).toBe(true);
    expect(g.failures).toEqual([]);
  });

  it("rejects low win rate", () => {
    const g = evaluateHiveSuccess(baseMetrics({ winRate: 0.3 }));
    expect(g.success).toBe(false);
    expect(g.failures.some((f) => f.includes("winRate"))).toBe(true);
  });

  it("rejects high drawdown", () => {
    const g = evaluateHiveSuccess(baseMetrics({ maxDD: 0.6 }));
    expect(g.success).toBe(false);
    expect(g.failures.some((f) => f.includes("maxDD"))).toBe(true);
  });
});

describe("hiveBrain merge + win rates", () => {
  it("merges two successful runs and tracks avg win rate", () => {
    const t0 = "2026-07-18T12:00:00.000Z";
    const t1 = "2026-07-18T13:00:00.000Z";
    const a = mergeSuccessfulRun(emptyHiveBrain(), baseMetrics({ winRate: 0.6, trades: 10 }), t0, "r1");
    const b = mergeSuccessfulRun(
      a.brain,
      baseMetrics({ winRate: 0.5, trades: 30, sharpe: 0.5 }),
      t1,
      "r2",
    );
    const row = b.brain.strategies["5dte_iron_condor"]!;
    expect(row.runs).toBe(2);
    expect(row.totalTrades).toBe(40);
    // trade-weighted: (0.6*10 + 0.5*30) / 40 = 0.525
    expect(row.avgWinRate).toBeCloseTo(0.525, 5);
    expect(row.bestWinRate).toBeCloseTo(0.6, 5);
    expect(row.bestSharpe).toBeCloseTo(0.8, 5);
    expect(b.brain.totalSuccessfulRuns).toBe(2);
    expect(b.brain.improvementLessons.length).toBeGreaterThan(0);

    const export_ = strategyWinRatesExport(b.brain);
    expect(export_.strategies[0]!.strategyId).toBe("5dte_iron_condor");
    expect(getStrategyHiveNote(b.brain, "5dte_iron_condor")).toMatch(/Hive lab/);
  });

  it("distills lessons including weak regimes", () => {
    const lessons = distillLessons(
      baseMetrics({
        regimeResults: {
          bull: { avgPnL: 10 },
          crisis: { avgPnL: -5 },
        },
      }),
    );
    expect(lessons.some((l) => l.includes("crisis"))).toBe(true);
  });
});
