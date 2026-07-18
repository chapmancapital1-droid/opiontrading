import { describe, it, expect } from "vitest";
import { blackScholes } from "@/domain/blackScholes";

/** Classic ATM call approx: ATM call ≈ 0.4 S σ √t for rough order. */
describe("blackScholes", () => {
  const base = {
    spot: 100,
    strike: 100,
    t: 30 / 365,
    r: 0.05,
    q: 0,
    sigma: 0.2,
    type: "call" as const,
  };

  it("prices ATM call > 0 and put-call parity holds approximately", () => {
    const call = blackScholes(base);
    const put = blackScholes({ ...base, type: "put" });
    expect(call.price).toBeGreaterThan(0);
    expect(put.price).toBeGreaterThan(0);
    // C - P ≈ S e^{-qT} - K e^{-rT}
    const forward =
      base.spot * Math.exp(-base.q * base.t) - base.strike * Math.exp(-base.r * base.t);
    expect(call.price - put.price).toBeCloseTo(forward, 2);
  });

  it("call delta between 0 and 1 for vanilla", () => {
    const call = blackScholes(base);
    expect(call.delta).toBeGreaterThan(0.3);
    expect(call.delta).toBeLessThan(0.7);
  });

  it("put delta between -1 and 0", () => {
    const put = blackScholes({ ...base, type: "put" });
    expect(put.delta).toBeLessThan(-0.3);
    expect(put.delta).toBeGreaterThan(-0.7);
  });

  it("gamma and vega positive", () => {
    const g = blackScholes(base);
    expect(g.gamma).toBeGreaterThan(0);
    expect(g.vega).toBeGreaterThan(0);
  });

  it("expired ITM call = intrinsic", () => {
    const g = blackScholes({ ...base, t: 0, spot: 110, strike: 100 });
    expect(g.price).toBeCloseTo(10, 6);
    expect(g.delta).toBe(1);
  });

  it("expired OTM call = 0", () => {
    const g = blackScholes({ ...base, t: 0, spot: 90, strike: 100 });
    expect(g.price).toBe(0);
    expect(g.delta).toBe(0);
  });
});
