import { describe, it, expect } from "vitest";
import { buildDemoLegs, COMPARE_STRATEGY_IDS } from "@/lib/demoStrategyLegs";
import { compareStrategies } from "@/lib/compare";

describe("demoStrategyLegs + compare", () => {
  it("builds legs for every compare strategy id", () => {
    for (const id of COMPARE_STRATEGY_IDS) {
      const legs = buildDemoLegs(id, 100, 30);
      expect(legs.length).toBeGreaterThan(0);
    }
  });

  it("compareStrategies returns PoP in [0,1] for three structures", () => {
    const items = (["long_call", "bull_put_credit", "iron_condor"] as const).map((id) => ({
      label: id,
      legs: buildDemoLegs(id, 100, 30),
    }));
    const rows = compareStrategies(items, {
      spot: 100,
      tYears: 30 / 365,
      sigma: 0.28,
      r: 0.045,
      q: 0.005,
      drift: { kind: "risk-neutral" },
      simulations: 2_000,
      seed: 1,
    });
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(r.probProfit).toBeGreaterThanOrEqual(0);
      expect(r.probProfit).toBeLessThanOrEqual(1);
    }
  });
});
