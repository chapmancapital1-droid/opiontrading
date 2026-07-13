import { describe, it, expect } from "vitest";
import {
  allocateProfit,
  applyAllocation,
  projectGrowthPath,
  sizePosition,
  suggestCoreParking,
} from "@/brain/portfolio";
import { remainingRiskBudget } from "@/brain/riskGates";
import type { AccountState } from "@/brain/types";
import { PORTFOLIO_POLICY, assertPolicyInvariants } from "@/knowledge/portfolioPolicy";

const baseAccount = (over: Partial<AccountState> = {}): AccountState => ({
  equity: 10_000,
  cash: 8_000,
  optionsFloat: 5_000,
  portfolioCore: 2_000,
  openRiskDollars: 0,
  openCampaigns: 0,
  dailyRealizedPL: 0,
  approvalProfile: "level3_spreads",
  growthMode: "balanced",
  sharesHeld: {},
  ...over,
});

describe("portfolio policy invariants", () => {
  it("locks reinvest+core = 1 for every growth mode", () => {
    expect(() => assertPolicyInvariants()).not.toThrow();
    for (const g of Object.values(PORTFOLIO_POLICY.growthModes)) {
      expect(g.reinvestOptionsPct + g.portfolioCorePct).toBeCloseTo(1, 9);
      expect(g.perTradeRiskPct).toBeLessThanOrEqual(g.perTradeRiskCapPct);
    }
  });

  it("is manual Robinhood checklist only — never auto-broker", () => {
    expect(PORTFOLIO_POLICY.broker).toBe("robinhood");
    expect(PORTFOLIO_POLICY.executionMode).toBe("manual_checklist_only");
  });
});

describe("sizePosition — account growth risk lock", () => {
  it("sizes so max loss ≤ 1% equity in balanced mode", () => {
    // max loss $100/contract, equity $10k → 1% = $100 → 1 contract
    const s = sizePosition({
      account: baseAccount(),
      maxLossPerContract: 100,
    });
    expect(s.contracts).toBe(1);
    expect(s.riskDollars).toBe(100);
    expect(s.riskPctOfEquity).toBeCloseTo(0.01, 5);
  });

  it("never exceeds 2% hard per-trade cap (balanced)", () => {
    // $50 max loss → target 1% = $100 → 2 contracts; cap 2% = $200 → still 2
    const s = sizePosition({
      account: baseAccount(),
      maxLossPerContract: 50,
    });
    expect(s.contracts).toBe(2);
    expect(s.riskDollars).toBeLessThanOrEqual(10_000 * 0.02);
  });

  it("returns 0 contracts when even 1 lot exceeds risk budget", () => {
    const s = sizePosition({
      account: baseAccount({ openRiskDollars: 1990 }), // remaining budget $10 at 20% of 10k
      maxLossPerContract: 100,
    });
    expect(s.contracts).toBe(0);
    expect(s.cappedBy).toBe("remaining_budget");
  });

  it("cash-secures CSP by collateral limit", () => {
    // Risk allows many lots ($20 max loss), cash only covers 1 × $5,000 collateral
    const s = sizePosition({
      account: baseAccount({ equity: 50_000, cash: 8_000, openRiskDollars: 0 }),
      maxLossPerContract: 20,
      collateralPerContract: 5_000,
    });
    expect(s.contracts).toBe(1);
    expect(s.cappedBy).toBe("cash");
    expect(s.collateralRequired).toBe(5_000);
  });

  it("rejects non-positive max loss", () => {
    expect(sizePosition({ account: baseAccount(), maxLossPerContract: 0 }).contracts).toBe(0);
    expect(sizePosition({ account: baseAccount(), maxLossPerContract: -10 }).contracts).toBe(0);
  });

  it("absolute hard gate: never risk > 5% equity on one trade", () => {
    const s = sizePosition({
      account: baseAccount({ growthMode: "aggressive_growth", equity: 10_000, cash: 10_000 }),
      maxLossPerContract: 400, // 4% each
    });
    // aggressive 1.5% target → 0 contracts (400 > 150); absolute 5% = 500 would allow 1
    // but soft target rejects oversize — locked growth behavior
    expect(s.contracts).toBe(0);
  });
});

describe("allocateProfit — compound options → portfolio core", () => {
  it("balanced mode splits 50/50 on wins", () => {
    const a = allocateProfit({ realizedPL: 400, growthMode: "balanced" });
    expect(a.toOptionsFloat).toBe(200);
    expect(a.toPortfolioCore).toBe(200);
    expect(a.toOptionsFloat + a.toPortfolioCore).toBe(400);
  });

  it("aggressive mode reinvests 70% into options float", () => {
    const a = allocateProfit({ realizedPL: 1000, growthMode: "aggressive_growth" });
    expect(a.toOptionsFloat).toBe(700);
    expect(a.toPortfolioCore).toBe(300);
  });

  it("income_preservation parks 70% into portfolio core", () => {
    const a = allocateProfit({ realizedPL: 1000, growthMode: "income_preservation" });
    expect(a.toOptionsFloat).toBe(300);
    expect(a.toPortfolioCore).toBe(700);
  });

  it("losses hit options float only — never raid core", () => {
    const a = allocateProfit({ realizedPL: -250, growthMode: "balanced" });
    expect(a.toOptionsFloat).toBe(-250);
    expect(a.toPortfolioCore).toBe(0);
  });

  it("applyAllocation updates balances correctly on win", () => {
    const start = baseAccount();
    const alloc = allocateProfit({ realizedPL: 400, growthMode: "balanced" });
    const next = applyAllocation(start, alloc);
    expect(next.equity).toBe(10_400);
    expect(next.optionsFloat).toBe(5_200);
    expect(next.portfolioCore).toBe(2_200);
    expect(next.dailyRealizedPL).toBe(400);
  });

  it("applyAllocation on loss shrinks equity and float, leaves core", () => {
    const start = baseAccount();
    const alloc = allocateProfit({ realizedPL: -100, growthMode: "balanced" });
    const next = applyAllocation(start, alloc);
    expect(next.equity).toBe(9_900);
    expect(next.portfolioCore).toBe(2_000);
    expect(next.optionsFloat).toBe(4_900);
  });
});

describe("projectGrowthPath — multi-trade compounding", () => {
  it("grows portfolio core monotonically on a win series", () => {
    const start = baseAccount({ growthMode: "balanced" });
    const path = projectGrowthPath(start, [200, 200, 200]);
    expect(path).toHaveLength(3);
    expect(path[0]!.portfolioCore).toBe(2_100);
    expect(path[1]!.portfolioCore).toBe(2_200);
    expect(path[2]!.portfolioCore).toBe(2_300);
    expect(path[2]!.equity).toBe(10_600);
    // options float also compounds
    expect(path[2]!.optionsFloat).toBe(5_300);
  });

  it("core never decreases when option losses occur", () => {
    const start = baseAccount({ growthMode: "balanced", portfolioCore: 3_000 });
    const path = projectGrowthPath(start, [100, -50, 100]);
    for (const snap of path) {
      expect(snap.portfolioCore).toBeGreaterThanOrEqual(3_000);
    }
    expect(path[path.length - 1]!.portfolioCore).toBe(3_100); // +50 +50 from two wins
  });
});

describe("remainingRiskBudget", () => {
  it("is equity * openRiskBudgetPct − openRisk", () => {
    const a = baseAccount({ equity: 10_000, openRiskDollars: 500, growthMode: "balanced" });
    // 20% of 10k = 2000 − 500 = 1500
    expect(remainingRiskBudget(a)).toBe(1500);
  });
});

describe("suggestCoreParking", () => {
  it("suggests policy core universe tickers", () => {
    const picks = suggestCoreParking(300);
    expect(picks.length).toBe(3);
    expect(PORTFOLIO_POLICY.corePortfolioUniverse).toContain(picks[0]!.ticker);
  });
});
