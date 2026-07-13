/**
 * Locked portfolio policy for OptionScope growth brain.
 * Broker path: Robinhood manual entry via order checklist only.
 */

import type { PortfolioPolicy } from "./types";

export const PORTFOLIO_POLICY: PortfolioPolicy = {
  version: "NCI-OS-BRAIN-1.0.0",
  broker: "robinhood",
  executionMode: "manual_checklist_only",
  growthModes: {
    aggressive_growth: {
      openRiskBudgetPct: 0.30,
      perTradeRiskPct: 0.015,
      perTradeRiskCapPct: 0.02,
      reinvestOptionsPct: 0.70,
      portfolioCorePct: 0.30,
      maxOpenCampaigns: 6,
    },
    balanced: {
      openRiskBudgetPct: 0.20,
      perTradeRiskPct: 0.01,
      perTradeRiskCapPct: 0.02,
      reinvestOptionsPct: 0.50,
      portfolioCorePct: 0.50,
      maxOpenCampaigns: 4,
    },
    income_preservation: {
      openRiskBudgetPct: 0.12,
      perTradeRiskPct: 0.0075,
      perTradeRiskCapPct: 0.015,
      reinvestOptionsPct: 0.30,
      portfolioCorePct: 0.70,
      maxOpenCampaigns: 3,
    },
  },
  hardGates: {
    blockUndefinedRisk: true,
    absoluteMaxLossPct: 0.05,
    dailyLossHaltPct: 0.03,
    minContextConfidence: "low",
    rejectWideLiquidity: true,
    respectEventStance: true,
  },
  wheelUniverse: ["AAPL", "MSFT", "AMZN", "GOOGL", "META", "NVDA", "INTC", "SOFI", "SLV", "SPY", "QQQ", "IWM"],
  corePortfolioUniverse: ["VTI", "VXUS", "BND", "SCHD", "DGRO", "SPY", "QQQ"],
  disclaimer:
    "Educational decision support only. Not investment advice. Not affiliated with Robinhood. " +
    "All probabilities are model estimates. Verify every order manually in Robinhood before entry.",
};

/** Sum of reinvest + core must equal 1 for every growth mode (invariant). */
export function assertPolicyInvariants(policy: PortfolioPolicy = PORTFOLIO_POLICY): void {
  for (const [mode, g] of Object.entries(policy.growthModes)) {
    const sum = Number((g.reinvestOptionsPct + g.portfolioCorePct).toFixed(6));
    if (sum !== 1) {
      throw new Error(`Policy invariant broken for ${mode}: reinvest+core must equal 1 (got ${sum})`);
    }
    if (g.perTradeRiskPct > g.perTradeRiskCapPct) {
      throw new Error(`Policy invariant broken for ${mode}: perTradeRiskPct > cap`);
    }
    if (g.openRiskBudgetPct <= 0 || g.openRiskBudgetPct > 0.5) {
      throw new Error(`Policy invariant broken for ${mode}: openRiskBudgetPct out of safe band`);
    }
  }
  if (policy.executionMode !== "manual_checklist_only") {
    throw new Error("Policy invariant: Robinhood path must be manual_checklist_only");
  }
  if (policy.broker !== "robinhood") {
    throw new Error("Policy invariant: broker must be robinhood for this companion build");
  }
}
