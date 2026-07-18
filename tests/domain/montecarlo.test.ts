import { describe, it, expect } from "vitest";
import {
  runMonteCarlo,
  monteCarloEuropean,
  simulateGbmPaths,
} from "@/domain/montecarlo";
import { blackScholes } from "@/domain/blackScholes";
import type { Leg } from "@/domain/types";

const longCall = (spot = 100): Leg[] => [
  {
    assetType: "option",
    side: "long",
    optionType: "call",
    contracts: 1,
    strike: 100,
    expiration: "2026-12-18",
    premiumPerShare: 4,
    multiplier: 100,
    impliedVol: 0.25,
    exerciseStyle: "european",
    feesTotal: 0,
    quoteTimestamp: null,
  },
];

describe("runMonteCarlo (strategy P/L)", () => {
  it("returns probabilities that sum to ~1", () => {
    const r = runMonteCarlo({
      legs: longCall(),
      spot: 100,
      tYears: 30 / 365,
      sigma: 0.25,
      r: 0.05,
      q: 0,
      drift: { kind: "risk-neutral" },
      simulations: 8_000,
      seed: 7,
    });
    expect(r.probProfit + r.probLoss + r.probZero).toBeCloseTo(1, 5);
    expect(r.probProfit).toBeGreaterThan(0.15);
    expect(r.probProfit).toBeLessThan(0.85);
    expect(r.ci95Prob[0]).toBeLessThanOrEqual(r.probProfit);
    expect(r.ci95Prob[1]).toBeGreaterThanOrEqual(r.probProfit);
    expect(r.stdErrorPL).toBeGreaterThanOrEqual(0);
    expect(r.antithetic).toBe(true);
  });

  it("is reproducible with fixed seed", () => {
    const p = {
      legs: longCall(),
      spot: 100,
      tYears: 0.1,
      sigma: 0.3,
      r: 0.04,
      q: 0,
      drift: { kind: "risk-neutral" as const },
      simulations: 3_000,
      seed: 99,
    };
    const a = runMonteCarlo(p);
    const b = runMonteCarlo(p);
    expect(a.expectedPL).toBe(b.expectedPL);
    expect(a.probProfit).toBe(b.probProfit);
  });

  it("multi-step paths still produce valid probs", () => {
    const r = runMonteCarlo({
      legs: longCall(),
      spot: 100,
      tYears: 0.25,
      sigma: 0.2,
      r: 0.05,
      q: 0,
      drift: { kind: "risk-neutral" },
      simulations: 4_000,
      seed: 3,
      steps: 50,
      antithetic: false,
      collectPaths: true,
      pathSampleSize: 8,
    });
    expect(r.probProfit + r.probLoss + r.probZero).toBeCloseTo(1, 5);
    expect(r.steps).toBe(50);
    expect(r.samplePaths?.length).toBeGreaterThan(0);
    expect(r.samplePaths![0]!.length).toBe(51);
  });
});

describe("monteCarloEuropean (pricing vs Black-Scholes)", () => {
  const base = {
    spot: 100,
    strike: 100,
    tYears: 1,
    r: 0.05,
    q: 0,
    sigma: 0.2,
    simulations: 80_000,
    seed: 42,
    antithetic: true,
    steps: 1 as number,
  };

  it("ATM call converges to Black-Scholes within ~2¢ (large N + antithetic)", () => {
    const mc = monteCarloEuropean({ ...base, type: "call" });
    const bs = blackScholes({
      spot: 100,
      strike: 100,
      t: 1,
      r: 0.05,
      q: 0,
      sigma: 0.2,
      type: "call",
    });
    expect(mc.blackScholesPrice).toBeCloseTo(bs.price, 6);
    // 80k antithetic paths: should be well inside a few cents
    expect(mc.absError).toBeLessThan(0.08);
    expect(mc.ci95[0]).toBeLessThanOrEqual(mc.price);
    expect(mc.ci95[1]).toBeGreaterThanOrEqual(mc.price);
    // BS price should land inside ~3 SE of MC mean with high probability
    expect(Math.abs(mc.price - bs.price)).toBeLessThan(4 * mc.stdError + 0.05);
  });

  it("ATM put converges to Black-Scholes", () => {
    const mc = monteCarloEuropean({ ...base, type: "put", simulations: 60_000 });
    expect(mc.absError).toBeLessThan(0.1);
  });

  it("put-call parity holds approximately on MC prices", () => {
    // c − p ≈ S e^{-qT} − K e^{-rT}
    const call = monteCarloEuropean({ ...base, type: "call", simulations: 100_000 });
    const put = monteCarloEuropean({ ...base, type: "put", simulations: 100_000, seed: 43 });
    const forward =
      100 * Math.exp(-0 * 1) - 100 * Math.exp(-0.05 * 1);
    const parityGap = call.price - put.price - forward;
    expect(Math.abs(parityGap)).toBeLessThan(0.15);
  });

  it("OTM call is cheaper than ATM call (same params)", () => {
    const atm = monteCarloEuropean({ ...base, type: "call", simulations: 40_000 });
    const otm = monteCarloEuropean({
      ...base,
      type: "call",
      strike: 120,
      simulations: 40_000,
      seed: 11,
    });
    expect(otm.price).toBeLessThan(atm.price);
  });

  it("expired option returns intrinsic", () => {
    const mc = monteCarloEuropean({
      spot: 110,
      strike: 100,
      tYears: 0,
      r: 0.05,
      sigma: 0.2,
      type: "call",
    });
    expect(mc.price).toBe(10);
    expect(mc.simulations).toBe(0);
  });

  it("multi-step discretization still near BS (higher SE allowed)", () => {
    const mc = monteCarloEuropean({
      ...base,
      type: "call",
      steps: 52,
      antithetic: false,
      simulations: 30_000,
      seed: 5,
    });
    expect(mc.absError).toBeLessThan(0.35);
    expect(mc.steps).toBe(52);
  });

  it("is reproducible with fixed seed", () => {
    const a = monteCarloEuropean({ ...base, type: "call", simulations: 5_000 });
    const b = monteCarloEuropean({ ...base, type: "call", simulations: 5_000 });
    expect(a.price).toBe(b.price);
    expect(a.stdError).toBe(b.stdError);
  });
});

describe("simulateGbmPaths", () => {
  it("returns numPaths of length steps+1 starting at spot", () => {
    const paths = simulateGbmPaths({
      spot: 50,
      tYears: 1,
      sigma: 0.25,
      mu: 0.05,
      steps: 10,
      numPaths: 5,
      seed: 1,
    });
    expect(paths).toHaveLength(5);
    for (const p of paths) {
      expect(p).toHaveLength(11);
      expect(p[0]).toBe(50);
      expect(p.every((x) => Number.isFinite(x) && x > 0)).toBe(true);
    }
  });

  it("is deterministic", () => {
    const opts = {
      spot: 100,
      tYears: 0.5,
      sigma: 0.3,
      mu: 0.04,
      steps: 20,
      numPaths: 3,
      seed: 77,
    };
    expect(simulateGbmPaths(opts)).toEqual(simulateGbmPaths(opts));
  });
});
