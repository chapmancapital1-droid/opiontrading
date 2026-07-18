import { describe, it, expect } from "vitest";
import {
  parseRhPaste,
  rowsToSharesHeld,
  deriveSharesHeld,
  estimateOpenRiskProxy,
} from "@/lib/rhImport";
import { resolvePersonalAccountState } from "@/brain/resolveAccount";
import { evaluateRuleGates } from "@/brain/riskGates";
import type { StrategyRule } from "@/knowledge/types";
import type { MarketContext } from "@/lib/marketContext";
import { DEFAULT_PERSONAL_ACCOUNT } from "@/lib/personalAccount";

describe("parseRhPaste", () => {
  it("parses simple CSV with header", () => {
    const csv = `Symbol,Side,Quantity,Price,Date
AAPL,buy,1,3.50,2026-07-01
MSFT,sell,2,1.20,2026-07-02`;
    const r = parseRhPaste(csv);
    expect(r.rows.length).toBe(2);
    expect(r.rows[0]!.symbol).toBe("AAPL");
    expect(r.rows[0]!.qty).toBe(1);
    expect(r.summary).toMatch(/2/);
  });

  it("rejects empty", () => {
    const r = parseRhPaste("   ");
    expect(r.rows.length).toBe(0);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("includes process hints and never asks for password", () => {
    const r = parseRhPaste("BOT 1 SPY call");
    expect(r.processHints.some((h) => /password/i.test(h))).toBe(true);
  });
});

describe("rowsToSharesHeld", () => {
  it("maps stock-like qty by symbol", () => {
    const r = parseRhPaste(`Symbol,Side,Quantity,Price,Date
AAPL,buy,100,185.00,2026-07-01
F,buy,100,12.00,2026-07-01`);
    const shares = rowsToSharesHeld(r.rows);
    expect(shares.AAPL).toBe(100);
    expect(shares.F).toBe(100);
    expect(deriveSharesHeld(r.rows).AAPL).toBe(100);
  });

  it("skips lines that look like option contracts", () => {
    const rows = [
      {
        symbol: "AAPL",
        side: "buy",
        qty: 1,
        price: 3.5,
        amount: 3.5,
        date: null,
        raw: "BOT 1 AAPL 190 Call 3.50",
        kind: "order" as const,
      },
      {
        symbol: "F",
        side: "buy",
        qty: 100,
        price: 12,
        amount: 1200,
        date: null,
        raw: "BOT 100 F shares",
        kind: "position" as const,
      },
    ];
    const shares = rowsToSharesHeld(rows);
    expect(shares.AAPL).toBeUndefined();
    expect(shares.F).toBe(100);
  });
});

describe("estimateOpenRiskProxy", () => {
  it("sums abs qty * price when present", () => {
    const proxy = estimateOpenRiskProxy([
      {
        symbol: "AAPL",
        side: "buy",
        qty: 10,
        price: 5,
        amount: 50,
        date: null,
        raw: "AAPL",
        kind: "order",
      },
    ]);
    expect(proxy).toBe(50);
  });
});

describe("RH paste → AccountState bridge (W1-B04)", () => {
  it("AAPL buy 100 → covered_call share gate passes at seed equity", () => {
    const r = parseRhPaste(`Symbol,Side,Quantity,Price,Date
AAPL,buy,100,190.00,2026-07-01`);
    const held = rowsToSharesHeld(r.rows);
    expect(held.AAPL).toBeGreaterThanOrEqual(100);

    const account = resolvePersonalAccountState({
      profile: {
        ...DEFAULT_PERSONAL_ACCOUNT,
        equitySource: "robinhood_paste",
        manualEquity: 500,
        manualCash: 500,
      },
      rhSharesHeld: held,
    });
    expect(account.equity).toBe(500);
    expect(account.sharesHeld?.AAPL).toBeGreaterThanOrEqual(100);

    const ctx: MarketContext = {
      symbol: "AAPL",
      spot: 190,
      expiration: "2026-08-21",
      atmIv: 0.28,
      ivRank: 0.7,
      ivTrend: "elevated",
      spotTrend: "sideways",
      expectedMove: 8,
      liquidity: "normal",
      eventProximity: "clear",
      newsSentiment: "neutral",
      expectedMovePct: 0.04,
      sampleSize: 20,
      confidence: "high",
      asOf: "2026-07-12T15:00:00.000Z",
      notes: [],
    };
    const ccRule = {
      id: "cc_test",
      strategyId: "covered_call",
      name: "Covered Call",
      thesis: "moderately_bullish",
      portfolioRole: "income_engine",
      riskProfile: "defined",
      approval: "level2_basic",
      ivConditions: ["elevated", "neutral"],
      trends: ["up", "sideways"],
      eventStance: "avoid_earnings",
      minLiquidity: "normal",
      newsBias: "any",
      entryRules: [],
      exitRules: [],
      shortDeltaTarget: 0.25,
      dteMin: 21,
      dteMax: 45,
      priority: 0.9,
      growthPrimary: true,
      bookSource: "test",
      structure: "cc",
      notes: [],
    } as StrategyRule;

    const gates = evaluateRuleGates(ccRule, ctx, account);
    expect(gates.some((g) => g.code === "NO_SHARES_FOR_CC" && !g.passed)).toBe(false);
    expect(gates.some((g) => g.code === "SHARES_OK" && g.passed)).toBe(true);
  });
});
