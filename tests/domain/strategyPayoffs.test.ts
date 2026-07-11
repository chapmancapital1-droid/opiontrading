import { describe, it, expect } from "vitest";
import { analyzePayoff } from "@/domain/payoff";
import type { Leg } from "@/domain/types";

type Side = "long" | "short";
type Extra = Record<string, unknown>;
const call = (side: Side, strike: number, prem: number, extra: Extra = {}): Leg => ({
  assetType: "option", side, optionType: "call", contracts: 1, strike,
  expiration: "2026-01-16", premiumPerShare: prem, multiplier: 100,
  impliedVol: 0.3, exerciseStyle: "american", feesTotal: 0, quoteTimestamp: null, ...extra,
} as unknown as Leg);
const put = (side: Side, strike: number, prem: number, extra: Extra = {}): Leg =>
  ({ ...(call(side, strike, prem, extra) as unknown as Extra), optionType: "put" } as unknown as Leg);
const stock = (side: Side, shares: number, entry: number, extra: Extra = {}): Leg => ({
  assetType: "stock", side, shares, entryPrice: entry, feesTotal: 0, quoteTimestamp: null, ...extra,
} as unknown as Leg);
const A = (legs: Leg[]) => analyzePayoff({ underlying: "TEST", legs });

describe("Acceptance fixtures — expiration payoff", () => {
  it("Bull call spread 500/510 (headline)", () => {
    const r = A([call("long", 500, 6.20), call("short", 510, 3.10)]);
    expect(r.netCashFlow).toBe(-310);   // net debit $310
    expect(r.totalDebit).toBe(310);
    expect(r.maxLoss).toBe(-310);
    expect(r.maxProfit).toBe(690);
    expect(r.breakEvens).toEqual([503.1]);
  });

  it("Covered call: 100 sh @100, short 105c @2.50", () => {
    const r = A([stock("long", 100, 100), call("short", 105, 2.50)]);
    expect(r.breakEvens).toEqual([97.5]);
    expect(r.maxProfit).toBe(750);
    expect(r.maxLoss).toBe(-9750);
    expect(r.plAtPrice(90)).toBe(-750);
    expect(r.plAtPrice(103)).toBe(550);
    expect(r.plAtPrice(110)).toBe(750);
  });

  it("Cash-secured put: short 95p @2.00", () => {
    const r = A([put("short", 95, 2.00)]);
    expect(r.maxProfit).toBe(200);
    expect(r.breakEvens).toEqual([93]);
    expect(r.maxLoss).toBe(-9300);
    expect(r.plAtPrice(90)).toBe(-300);
  });

  it("Bull call debit 100/110", () => {
    const r = A([call("long", 100, 6.00), call("short", 110, 2.00)]);
    expect(r.totalDebit).toBe(400);
    expect(r.breakEvens).toEqual([104]);
    expect(r.maxProfit).toBe(600);
    expect(r.maxLoss).toBe(-400);
  });

  it("Bear call credit 105/110", () => {
    const r = A([call("short", 105, 3.00), call("long", 110, 1.20)]);
    expect(r.totalCredit).toBe(180);
    expect(r.breakEvens).toEqual([106.8]);
    expect(r.maxProfit).toBe(180);
    expect(r.maxLoss).toBe(-320);
  });

  it("Bull put credit 95/90", () => {
    const r = A([put("short", 95, 2.70), put("long", 90, 1.10)]);
    expect(r.totalCredit).toBe(160);
    expect(r.breakEvens).toEqual([93.4]);
    expect(r.maxProfit).toBe(160);
    expect(r.maxLoss).toBe(-340);
  });

  it("Long straddle @100 (unlimited upside, two BEs)", () => {
    const r = A([call("long", 100, 4.00), put("long", 100, 3.50)]);
    expect(r.maxLoss).toBe(-750);
    expect(r.maxProfit).toBe("unlimited");
    expect(r.breakEvens).toEqual([92.5, 107.5]);
    expect(r.plAtPrice(80)).toBe(1250);
    expect(r.plAtPrice(120)).toBe(1250);
  });

  it("Iron condor 85/90/110/115 (two BEs)", () => {
    const r = A([
      put("long", 85, 0.50), put("short", 90, 1.20),
      call("short", 110, 1.10), call("long", 115, 0.40),
    ]);
    expect(r.totalCredit).toBe(140);
    expect(r.breakEvens).toEqual([88.6, 111.4]);
    expect(r.maxProfit).toBe(140);
    expect(r.maxLoss).toBe(-360);
  });
});

describe("Risk classification (no chart-range dependence)", () => {
  it("Long call: unlimited upside, loss capped at debit", () => {
    const r = A([call("long", 500, 6.20)]);
    expect(r.maxProfit).toBe("unlimited");
    expect(r.hasUnlimitedUpside).toBe(true);
    expect(r.maxLoss).toBe(-620);
  });
  it("Naked short call: undefined loss detected structurally", () => {
    const r = A([call("short", 100, 5.00)]);
    expect(r.hasUnlimitedDownside).toBe(true);
    expect(r.maxLoss).toBe("undefined");
  });
});

describe("Edge cases", () => {
  it("Multiple contracts scale linearly", () => {
    const r = A([call("long", 500, 6.20, { contracts: 3 }), call("short", 510, 3.10, { contracts: 3 })]);
    expect(r.totalDebit).toBe(930);
    expect(r.maxProfit).toBe(2070);
  });
  it("Fees reduce credit / increase debit", () => {
    const r = A([put("short", 95, 2.00, { feesTotal: 1.30 })]);
    expect(r.netCashFlow).toBe(198.70);
  });
  it("Zero DTE still yields intrinsic payoff", () => {
    const r = A([call("long", 100, 1.00, { expiration: "2026-01-16" })]);
    expect(r.plAtPrice(105)).toBe(400);
  });
  it("Adjusted multiplier (e.g. 50) honored", () => {
    const r = A([call("long", 100, 2.00, { multiplier: 50 })]);
    expect(r.netCashFlow).toBe(-100);
    expect(r.plAtPrice(110)).toBe(400);
  });
});
