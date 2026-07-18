import { describe, it, expect } from "vitest";
import { runStrategyScan, DEFAULT_SCANNER_FILTERS } from "@/lib/strategyScanner";

describe("strategyScanner", () => {
  it("returns at most 15 hits and never pads", () => {
    const r = runStrategyScan({
      strategyId: "bull_put_credit",
      minPrice: 8,
      maxPrice: 150,
      maxResults: 15,
    });
    expect(r.hits.length).toBeLessThanOrEqual(15);
    expect(r.hits.length).toBe(r.hits.filter((h) => h.fitScore >= r.filters.minFitScore).length);
    for (const h of r.hits) {
      expect(h.spot).toBeGreaterThanOrEqual(8);
      expect(h.spot).toBeLessThanOrEqual(150);
      expect(h.rank).toBeGreaterThan(0);
    }
  });

  it("bull call debit prefers different set than credit when bias locked", () => {
    const credit = runStrategyScan({
      strategyId: "bull_put_credit",
      bias: "bullish",
      maxResults: 15,
    });
    const debit = runStrategyScan({
      strategyId: "bull_call_debit",
      bias: "bullish",
      maxResults: 15,
    });
    expect(credit.strategyId).toBe("bull_put_credit");
    expect(debit.strategyId).toBe("bull_call_debit");
    expect(credit.hits.length).toBeGreaterThan(0);
    expect(debit.hits.length).toBeGreaterThan(0);
  });

  it("respects tight price band may return fewer than 15", () => {
    const r = runStrategyScan({
      ...DEFAULT_SCANNER_FILTERS,
      strategyId: "iron_condor",
      minPrice: 40,
      maxPrice: 45,
      maxResults: 15,
      minFitScore: 0.2,
    });
    expect(r.hits.length).toBeLessThanOrEqual(15);
    for (const h of r.hits) {
      expect(h.spot).toBeGreaterThanOrEqual(40);
      expect(h.spot).toBeLessThanOrEqual(45);
    }
  });
});
