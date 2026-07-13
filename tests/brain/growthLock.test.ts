/**
 * Integration lock: simulated wheel-style P/L series must grow equity and
 * build portfolio core under balanced policy without violating risk gates.
 */
import { describe, it, expect } from "vitest";
import { runTradingBrain } from "@/brain/selector";
import { allocateProfit, applyAllocation, sizePosition } from "@/brain/portfolio";
import { evaluateAccountGates, remainingRiskBudget, allPassed } from "@/brain/riskGates";
import type { AccountState } from "@/brain/types";
import type { MarketContext } from "@/lib/marketContext";
import { PORTFOLIO_POLICY } from "@/knowledge/portfolioPolicy";

function mkCtx(): MarketContext {
  return {
    symbol: "SPY",
    spot: 550,
    expiration: "2026-08-15",
    atmIv: 0.18,
    ivRank: 0.7,
    ivTrend: "elevated",
    spotTrend: "sideways",
    expectedMove: 12,
    liquidity: "tight",
    eventProximity: "clear",
    newsSentiment: "neutral",
    expectedMovePct: 0.022,
    sampleSize: 40,
    confidence: "high",
    asOf: "2026-07-11T16:00:00.000Z",
    notes: ["fixture"],
  };
}

describe("growth lock simulation — options profits → portfolio", () => {
  it("10 winning credit trades compound equity and core portfolio", () => {
    let acct: AccountState = {
      equity: 10_000,
      cash: 10_000,
      optionsFloat: 6_000,
      portfolioCore: 0,
      openRiskDollars: 0,
      openCampaigns: 0,
      dailyRealizedPL: 0,
      approvalProfile: "level3_spreads",
      growthMode: "balanced",
      sharesHeld: {},
    };

    // Each "trade" is a $80 credit-spread win (defined max loss $90/contract ≈ under 1% of $10k)
    for (let i = 0; i < 10; i++) {
      const gates = evaluateAccountGates(acct);
      expect(allPassed(gates)).toBe(true);

      const sized = sizePosition({
        account: acct,
        maxLossPerContract: 90,
        collateralPerContract: 500,
      });
      expect(sized.contracts).toBeGreaterThanOrEqual(1);

      // Simulate open: reserve risk
      acct = {
        ...acct,
        openRiskDollars: acct.openRiskDollars + sized.riskDollars,
        openCampaigns: acct.openCampaigns + 1,
      };

      // Close at profit $80 * contracts
      const realized = 80 * sized.contracts;
      const alloc = allocateProfit({ realizedPL: realized, growthMode: "balanced" });
      acct = applyAllocation(acct, {
        ...alloc,
      });
      // Free risk on close
      acct = {
        ...acct,
        openRiskDollars: Math.max(0, acct.openRiskDollars - sized.riskDollars),
        openCampaigns: Math.max(0, acct.openCampaigns - 1),
      };
    }

    expect(acct.equity).toBeGreaterThan(10_000);
    expect(acct.portfolioCore).toBeGreaterThan(0);
    // balanced 50% of profits → core
    // 10 trades * at least $80 → core ≥ 400 if always 1 contract
    expect(acct.portfolioCore).toBeGreaterThanOrEqual(400);
    // options float also grew
    expect(acct.optionsFloat).toBeGreaterThan(6_000);
  });

  it("brain never recommends auto-execution fields", () => {
    const d = runTradingBrain({
      context: mkCtx(),
      account: {
        equity: 25_000,
        cash: 15_000,
        optionsFloat: 10_000,
        portfolioCore: 5_000,
        openRiskDollars: 0,
        openCampaigns: 0,
        dailyRealizedPL: 0,
        approvalProfile: "level3_spreads",
        growthMode: "aggressive_growth",
      },
      maxLossByStrategyId: {
        cash_secured_put: 2000,
        bull_put_credit: 400,
        iron_condor: 300,
      },
    });
    const json = JSON.stringify(d);
    expect(json).not.toMatch(/api_key|password|session_token|place_order|auto_execute/i);
    expect(d.executionMode).toBe("manual_checklist_only");
    expect(d.broker).toBe("robinhood");
  });

  it("remaining budget never goes negative under sequential opens", () => {
    let acct: AccountState = {
      equity: 10_000,
      cash: 10_000,
      optionsFloat: 8_000,
      portfolioCore: 0,
      openRiskDollars: 0,
      openCampaigns: 0,
      dailyRealizedPL: 0,
      approvalProfile: "level3_spreads",
      growthMode: "balanced",
    };
    const budget = PORTFOLIO_POLICY.growthModes.balanced.openRiskBudgetPct * acct.equity;
    for (let i = 0; i < 20; i++) {
      const rem = remainingRiskBudget(acct);
      expect(rem).toBeGreaterThanOrEqual(0);
      const s = sizePosition({ account: acct, maxLossPerContract: 500 });
      if (s.contracts < 1) break;
      acct = {
        ...acct,
        openRiskDollars: acct.openRiskDollars + s.riskDollars,
        openCampaigns: acct.openCampaigns + 1,
      };
      expect(acct.openRiskDollars).toBeLessThanOrEqual(budget + 1e-9);
    }
  });
});
