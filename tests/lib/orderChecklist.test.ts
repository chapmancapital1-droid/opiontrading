import { describe, it, expect } from "vitest";
import { buildChecklist, checklistToText } from "@/lib/orderChecklist";
import type { OptionLeg } from "@/domain/types";

function callLeg(contracts: number): OptionLeg {
  return {
    assetType: "option",
    side: "long",
    optionType: "call",
    contracts,
    strike: 100,
    expiration: "2026-08-21",
    premiumPerShare: 1.5,
    multiplier: 100,
    impliedVol: 0.25,
    exerciseStyle: "american",
    feesTotal: 0,
    quoteTimestamp: null,
  };
}

function shortCall(contracts: number): OptionLeg {
  return {
    assetType: "option",
    side: "short",
    optionType: "call",
    contracts,
    strike: 105,
    expiration: "2026-08-21",
    premiumPerShare: 0.8,
    multiplier: 100,
    impliedVol: 0.25,
    exerciseStyle: "american",
    feesTotal: 0,
    quoteTimestamp: null,
  };
}

describe("orderChecklist (contracts override + journal text)", () => {
  it("buildChecklist uses min leg contracts by default", () => {
    const c = buildChecklist({
      underlying: "SPY",
      strategyName: "Bull call debit",
      legs: [callLeg(2), shortCall(2)],
      netCashFlow: -300,
      perShareNet: -1.5,
      maxLoss: 300,
      collateral: null,
      breakEvens: [101.5],
      quoteTimestamp: null,
    });
    expect(c.contracts).toBe(2);
    expect(c.maxModeledLoss).toBe(300);
  });

  it("contracts override scales checklist count and leg qty", () => {
    const c = buildChecklist({
      underlying: "SPY",
      strategyName: "Bull call debit",
      legs: [callLeg(1), shortCall(1)],
      netCashFlow: -150,
      perShareNet: -1.5,
      maxLoss: 150,
      collateral: null,
      breakEvens: [101.5],
      quoteTimestamp: null,
      contracts: 3,
    });
    expect(c.contracts).toBe(3);
    expect(c.legs.every((l) => l.quantity === 3)).toBe(true);
    expect(c.estTotal).toBeCloseTo(450, 5);
    expect(c.maxModeledLoss).toBeCloseTo(450, 5);
  });

  it("contracts override 0 is allowed (zero-size journal honesty)", () => {
    const c = buildChecklist({
      underlying: "AAPL",
      strategyName: "Bull call debit",
      legs: [callLeg(1)],
      netCashFlow: -200,
      perShareNet: -2,
      maxLoss: 200,
      collateral: null,
      breakEvens: [],
      quoteTimestamp: null,
      contracts: 0,
    });
    expect(c.contracts).toBe(0);
  });

  it("checklistToText is non-empty and journal-ready", () => {
    const c = buildChecklist({
      underlying: "SPY",
      strategyName: "Bull call debit",
      legs: [callLeg(1), shortCall(1)],
      netCashFlow: -150,
      perShareNet: -1.5,
      maxLoss: 150,
      collateral: null,
      breakEvens: [101.5],
      quoteTimestamp: "2026-07-15T12:00:00.000Z",
      plannedProfitTarget: 75,
      plannedLossLimit: 150,
      contracts: 1,
    });
    const text = checklistToText(c);
    expect(text.length).toBeGreaterThan(40);
    expect(text).toMatch(/OPTIONSCOPE ORDER CHECKLIST/i);
    expect(text).toMatch(/SPY/);
    expect(text).toMatch(/Bull call debit/);
    expect(text).toMatch(/1x/);
    expect(text).toMatch(/Max modeled loss/i);
    expect(text).toMatch(/Not investment advice/i);
  });
});
