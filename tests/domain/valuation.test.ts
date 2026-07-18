import { describe, it, expect } from "vitest";
import { valueLegAtTarget, aggregateGreeks } from "@/domain/valuation";
import type { OptionLeg } from "@/domain/types";

const leg = (partial: Partial<OptionLeg> & Pick<OptionLeg, "optionType" | "side" | "strike">): OptionLeg => ({
  assetType: "option",
  contracts: 1,
  expiration: "2026-09-18",
  premiumPerShare: 3,
  multiplier: 100,
  impliedVol: 0.28,
  exerciseStyle: "european",
  feesTotal: 0,
  quoteTimestamp: null,
  ...partial,
});

describe("valuation", () => {
  const params = {
    targetSpot: 100,
    targetDate: "2026-07-16",
    r: 0.045,
    q: 0.005,
    ivScenario: { kind: "fixed" as const },
  };

  it("long call has positive delta at position scale", () => {
    const { positionGreeks } = valueLegAtTarget(
      leg({ side: "long", optionType: "call", strike: 100 }),
      params
    );
    expect(positionGreeks.delta).toBeGreaterThan(0);
  });

  it("short put has positive delta", () => {
    const { positionGreeks } = valueLegAtTarget(
      leg({ side: "short", optionType: "put", strike: 100 }),
      params
    );
    // short put delta = - (negative put delta) = positive
    expect(positionGreeks.delta).toBeGreaterThan(0);
  });

  it("aggregate greeks sums legs", () => {
    const legs = [
      leg({ side: "long", optionType: "call", strike: 100 }),
      leg({ side: "short", optionType: "call", strike: 105 }),
    ];
    const agg = aggregateGreeks(legs, params, 0);
    const a = valueLegAtTarget(legs[0]!, params).positionGreeks;
    const b = valueLegAtTarget(legs[1]!, params).positionGreeks;
    expect(agg.delta).toBeCloseTo(a.delta + b.delta, 6);
    expect(agg.gamma).toBeCloseTo(a.gamma + b.gamma, 6);
  });

  it("stock shares add to delta", () => {
    const agg = aggregateGreeks([], params, 100);
    expect(agg.delta).toBe(100);
  });
});
