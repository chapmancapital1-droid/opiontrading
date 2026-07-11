import { describe, it, expect } from "vitest";
import { emptyLedger, record, campaignPL, cumulativeOptionCashFlow, realizedOnRoll } from "@/domain/tradeLifecycle";

describe("Wheel state machine cash flow", () => {
  it("sums to +$450 before fees", () => {
    let L = emptyLedger();
    L = record(L, { label: "Sell 95 put", amount: +200, kind: "premium_in" });
    L = record(L, { label: "Assigned: buy 100 @95", amount: -9500, kind: "stock_buy" });
    L = record(L, { label: "Sell 96 covered call", amount: +150, kind: "premium_in" });
    L = record(L, { label: "Called away @96", amount: +9600, kind: "stock_sell" });
    expect(campaignPL(L)).toBe(450);
  });
});

describe("Rolling ledger", () => {
  it("cumulative option cash flow is +$300, not +$450, and old-leg loss is -$150", () => {
    let L = emptyLedger();
    L = record(L, { label: "Sell call (open)", amount: +200, kind: "premium_in" });
    L = record(L, { label: "Buy back old call", amount: -350, kind: "premium_out" });
    L = record(L, { label: "Sell replacement call", amount: +450, kind: "premium_in" });
    expect(cumulativeOptionCashFlow(L)).toBe(300);
    expect(realizedOnRoll(200, -350)).toBe(-150);
  });
});
