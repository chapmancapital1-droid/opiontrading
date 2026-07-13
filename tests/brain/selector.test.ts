import { describe, it, expect } from "vitest";
import { runTradingBrain, evaluateCandidates } from "@/brain/selector";
import { evaluateAccountGates, allPassed } from "@/brain/riskGates";
import type { AccountState } from "@/brain/types";
import type { MarketContext } from "@/lib/marketContext";
import { PORTFOLIO_POLICY } from "@/knowledge/portfolioPolicy";
import { STRATEGY_RULES, growthPrimaryRules } from "@/knowledge/strategyRules";

function ctx(over: Partial<MarketContext> = {}): MarketContext {
  return {
    symbol: "AAPL",
    spot: 190,
    expiration: "2026-08-21",
    atmIv: 0.28,
    ivRank: 0.72,
    ivTrend: "elevated",
    spotTrend: "sideways",
    expectedMove: 8.5,
    liquidity: "normal",
    eventProximity: "clear",
    newsSentiment: "neutral",
    expectedMovePct: 0.045,
    sampleSize: 30,
    confidence: "high",
    asOf: "2026-07-11T15:00:00.000Z",
    notes: [],
    ...over,
  };
}

function account(over: Partial<AccountState> = {}): AccountState {
  return {
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
  };
}

describe("strategy rule library lock", () => {
  it("has growth-primary income engines (wheel path)", () => {
    const g = growthPrimaryRules();
    expect(g.some((r) => r.strategyId === "cash_secured_put")).toBe(true);
    expect(g.some((r) => r.strategyId === "covered_call")).toBe(true);
    expect(g.some((r) => r.strategyId === "bull_put_credit")).toBe(true);
  });

  it("every rule maps to a known risk profile and approval", () => {
    for (const r of STRATEGY_RULES) {
      expect(["defined", "substantial_downside_capped_upside", "undefined"]).toContain(r.riskProfile);
      expect(["level2_basic", "level3_spreads", "sandbox_undefined"]).toContain(r.approval);
      expect(r.dteMin).toBeLessThanOrEqual(r.dteMax);
    }
  });
});

describe("evaluateCandidates — market context matching", () => {
  it("elevated IV + sideways → prefers premium-selling income engines", () => {
    const cands = evaluateCandidates(ctx(), account());
    const eligible = cands.filter((c) => c.eligible).map((c) => c.rule.strategyId);
    expect(eligible).toContain("cash_secured_put");
    expect(eligible).toContain("bull_put_credit");
    expect(eligible).toContain("iron_condor");
    // long call wants low IV + uptrend — not eligible here
    expect(eligible).not.toContain("long_call");
  });

  it("rejects CSP into earnings when eventStance avoid_earnings", () => {
    const cands = evaluateCandidates(ctx({ eventProximity: "earnings" }), account());
    const csp = cands.find((c) => c.rule.strategyId === "cash_secured_put");
    expect(csp?.eligible).toBe(false);
    expect(csp?.rejectReasons.some((r) => r.includes("EVENT_EARNINGS") || r.includes("earnings"))).toBe(true);
  });

  it("covered call requires shares", () => {
    const noShares = evaluateCandidates(ctx(), account({ sharesHeld: {} }));
    const cc0 = noShares.find((c) => c.rule.strategyId === "covered_call");
    expect(cc0?.eligible).toBe(false);

    const withShares = evaluateCandidates(ctx(), account({ sharesHeld: { AAPL: 100 } }));
    const cc1 = withShares.find((c) => c.rule.strategyId === "covered_call");
    expect(cc1?.eligible).toBe(true);
  });

  it("level2 account cannot select level3 spreads", () => {
    const cands = evaluateCandidates(ctx(), account({ approvalProfile: "level2_basic" }));
    const condor = cands.find((c) => c.rule.strategyId === "iron_condor");
    expect(condor?.eligible).toBe(false);
    // CSP is level2
    const csp = cands.find((c) => c.rule.strategyId === "cash_secured_put");
    expect(csp?.eligible).toBe(true);
  });

  it("wide liquidity is rejected", () => {
    const cands = evaluateCandidates(ctx({ liquidity: "wide" }), account());
    expect(cands.every((c) => !c.eligible || c.rule.minLiquidity === "wide")).toBe(true);
    // all our rules minLiquidity is tight/normal — none should be eligible
    expect(cands.filter((c) => c.eligible)).toHaveLength(0);
  });

  it("uptrend + low IV unlocks bull call debit path", () => {
    const cands = evaluateCandidates(
      ctx({ ivTrend: "low", ivRank: 0.2, spotTrend: "up", newsSentiment: "positive" }),
      account()
    );
    const bull = cands.find((c) => c.rule.strategyId === "bull_call_debit");
    expect(bull?.eligible).toBe(true);
  });
});

describe("runTradingBrain — end-to-end growth lock", () => {
  it("returns versioned Robinhood manual decision", () => {
    const d = runTradingBrain({
      context: ctx(),
      account: account(),
      maxLossByStrategyId: {
        // empire stage1 @ $10k: 0.75% ≈ $75 — max losses under ceiling so size ≥ 1
        cash_secured_put: 70,
        bull_put_credit: 60,
        iron_condor: 50,
        bear_call_credit: 60,
      },
      collateralByStrategyId: {
        cash_secured_put: 4_800,
        bull_put_credit: 500,
      },
    });

    expect(d.version).toBe(PORTFOLIO_POLICY.version);
    expect(d.broker).toBe("robinhood");
    expect(d.executionMode).toBe("manual_checklist_only");
    expect(d.haltTrading).toBe(false);
    expect(d.recommendations.length).toBeGreaterThan(0);
    // growth primary should rank first among ties preference
    expect(d.recommendations[0]!.growthPrimary).toBe(true);
    expect(d.recommendations[0]!.robinhoodNextStep).toContain("Robinhood");
    expect(d.recommendations.some((r) => r.suggestedContracts >= 1)).toBe(true);
    expect(d.disclaimer).toContain("Not investment advice");
  });

  it("sizes CSP by cash collateral and risk budget", () => {
    const d = runTradingBrain({
      context: ctx(),
      account: account({ cash: 10_000, equity: 10_000 }),
      // empire stage1 risk ~$75 → max loss $50 allows 1 lot
      maxLossByStrategyId: { cash_secured_put: 50 },
      collateralByStrategyId: { cash_secured_put: 5_000 },
    });
    const csp = d.recommendations.find((r) => r.strategyId === "cash_secured_put");
    expect(csp).toBeTruthy();
    expect(csp!.suggestedContracts).toBe(1);
  });

  it("halts on daily loss circuit breaker — no recommendations", () => {
    const d = runTradingBrain({
      context: ctx(),
      account: account({ dailyRealizedPL: -400 }), // 4% > 3% halt
      maxLossByStrategyId: { cash_secured_put: 100 },
    });
    expect(d.haltTrading).toBe(true);
    expect(d.haltReason).toContain("DAILY_LOSS_HALT");
    expect(d.recommendations).toHaveLength(0);
  });

  it("halts when risk budget exhausted", () => {
    const d = runTradingBrain({
      context: ctx(),
      account: account({ openRiskDollars: 2_000 }), // 20% of 10k fully used
      maxLossByStrategyId: { cash_secured_put: 100 },
    });
    expect(d.haltTrading).toBe(true);
    expect(d.recommendations).toHaveLength(0);
  });

  it("accountSnapshot remainingRiskBudget matches empire-capped policy math", () => {
    const a = account({ openRiskDollars: 400 });
    const d = runTradingBrain({ context: ctx(), account: a });
    // stage1 empire 12% of 10k − 400
    expect(d.accountSnapshot.remainingRiskBudget).toBe(10_000 * 0.12 - 400);
  });
});

describe("account gates", () => {
  it("fails invalid equity", () => {
    const g = evaluateAccountGates(account({ equity: 0 }));
    expect(allPassed(g)).toBe(false);
    expect(g.some((x) => x.code === "INVALID_EQUITY" && !x.passed)).toBe(true);
  });

  it("fails max campaigns", () => {
    const g = evaluateAccountGates(account({ openCampaigns: 4, growthMode: "balanced" }));
    expect(g.some((x) => x.code === "MAX_CAMPAIGNS" && !x.passed)).toBe(true);
  });
});
