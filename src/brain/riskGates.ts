/**
 * Hard risk gates — non-negotiable before any recommendation is actionable.
 * Companion mode: defined-risk / CSP / covered-call only; manual Robinhood entry.
 */

import type { Liquidity, MarketContext } from "@/lib/marketContext";
import { PORTFOLIO_POLICY } from "@/knowledge/portfolioPolicy";
import type { GrowthMode, StrategyRule } from "@/knowledge/types";
import type { AccountState, RiskGateResult } from "./types";

const LIQUIDITY_RANK: Record<Liquidity, number> = { tight: 0, normal: 1, wide: 2 };

export function remainingRiskBudget(account: AccountState, mode: GrowthMode = account.growthMode): number {
  const g = PORTFOLIO_POLICY.growthModes[mode];
  const budget = account.equity * g.openRiskBudgetPct;
  return Math.max(0, budget - account.openRiskDollars);
}

export function evaluateAccountGates(account: AccountState): RiskGateResult[] {
  const policy = PORTFOLIO_POLICY;
  const g = policy.growthModes[account.growthMode];
  const results: RiskGateResult[] = [];

  if (!(account.equity > 0) || !Number.isFinite(account.equity)) {
    results.push({
      passed: false,
      code: "INVALID_EQUITY",
      message: "Account equity must be a positive finite number.",
    });
  } else {
    results.push({ passed: true, code: "EQUITY_OK", message: "Equity is valid." });
  }

  const dailyHalt = account.equity * policy.hardGates.dailyLossHaltPct;
  if (account.dailyRealizedPL <= -dailyHalt) {
    results.push({
      passed: false,
      code: "DAILY_LOSS_HALT",
      message: `Daily realized loss ${account.dailyRealizedPL.toFixed(2)} hit ${policy.hardGates.dailyLossHaltPct * 100}% circuit breaker.`,
    });
  } else {
    results.push({
      passed: true,
      code: "DAILY_LOSS_OK",
      message: "Daily loss within circuit breaker.",
    });
  }

  if (account.openCampaigns >= g.maxOpenCampaigns) {
    results.push({
      passed: false,
      code: "MAX_CAMPAIGNS",
      message: `Open campaigns ${account.openCampaigns} >= max ${g.maxOpenCampaigns} for ${account.growthMode}.`,
    });
  } else {
    results.push({
      passed: true,
      code: "CAMPAIGNS_OK",
      message: "Campaign count within limit.",
    });
  }

  const rem = remainingRiskBudget(account);
  if (rem <= 0) {
    results.push({
      passed: false,
      code: "RISK_BUDGET_EXHAUSTED",
      message: "Open risk budget is fully used — no new risk until capital frees.",
    });
  } else {
    results.push({
      passed: true,
      code: "RISK_BUDGET_OK",
      message: `Remaining risk budget $${rem.toFixed(2)}.`,
    });
  }

  return results;
}

export function evaluateRuleGates(
  rule: StrategyRule,
  context: MarketContext,
  account: AccountState
): RiskGateResult[] {
  const policy = PORTFOLIO_POLICY;
  const results: RiskGateResult[] = [];

  // Approval profile gate
  const order: Record<string, number> = {
    level2_basic: 1,
    level3_spreads: 2,
    sandbox_undefined: 3,
  };
  const acctLevel = order[account.approvalProfile] ?? 0;
  const needLevel = order[rule.approval] ?? 99;
  if (acctLevel < needLevel) {
    results.push({
      passed: false,
      code: "APPROVAL_LEVEL",
      message: `Strategy requires ${rule.approval}; account is ${account.approvalProfile}.`,
    });
  } else {
    results.push({ passed: true, code: "APPROVAL_OK", message: "Approval level sufficient." });
  }

  // Undefined risk block in companion mode
  if (policy.hardGates.blockUndefinedRisk && rule.riskProfile === "undefined") {
    results.push({
      passed: false,
      code: "UNDEFINED_RISK_BLOCKED",
      message: "Undefined-risk strategies blocked in Robinhood companion mode.",
    });
  } else {
    results.push({ passed: true, code: "RISK_CLASS_OK", message: `Risk class ${rule.riskProfile} allowed.` });
  }

  // Liquidity
  if (
    policy.hardGates.rejectWideLiquidity &&
    LIQUIDITY_RANK[context.liquidity] > LIQUIDITY_RANK[rule.minLiquidity]
  ) {
    results.push({
      passed: false,
      code: "LIQUIDITY",
      message: `Liquidity ${context.liquidity} worse than rule min ${rule.minLiquidity}.`,
    });
  } else if (context.liquidity === "wide" && policy.hardGates.rejectWideLiquidity) {
    results.push({
      passed: false,
      code: "LIQUIDITY_WIDE",
      message: "Wide spreads rejected for growth-mode companion trading.",
    });
  } else {
    results.push({ passed: true, code: "LIQUIDITY_OK", message: `Liquidity ${context.liquidity} acceptable.` });
  }

  // Event stance
  if (policy.hardGates.respectEventStance) {
    if (rule.eventStance === "avoid_earnings" && context.eventProximity === "earnings") {
      results.push({
        passed: false,
        code: "EVENT_EARNINGS",
        message: "Rule avoids earnings; earnings fall inside the option horizon.",
      });
    } else if (rule.eventStance === "avoid_ex_div" && context.eventProximity === "ex-div") {
      results.push({
        passed: false,
        code: "EVENT_EXDIV",
        message: "Rule avoids ex-dividend; ex-div falls inside the option horizon.",
      });
    } else if (rule.eventStance === "prefer_clear" && context.eventProximity !== "clear") {
      results.push({
        passed: false,
        code: "EVENT_NOT_CLEAR",
        message: `Rule prefers clear calendar; eventProximity=${context.eventProximity}.`,
      });
    } else {
      results.push({ passed: true, code: "EVENT_OK", message: "Event stance satisfied." });
    }
  }

  // Covered call needs shares
  if (rule.strategyId === "covered_call") {
    const held = account.sharesHeld?.[context.symbol] ?? 0;
    if (held < 100) {
      results.push({
        passed: false,
        code: "NO_SHARES_FOR_CC",
        message: `Covered call needs ≥100 shares of ${context.symbol}; held ${held}.`,
      });
    } else {
      results.push({ passed: true, code: "SHARES_OK", message: `Held ${held} shares for covered call.` });
    }
  }

  // CSP needs cash (rough gate: cash > 0; sizing enforces fully)
  if (rule.strategyId === "cash_secured_put" && account.cash <= 0) {
    results.push({
      passed: false,
      code: "NO_CASH_FOR_CSP",
      message: "Cash-secured put requires positive cash collateral.",
    });
  }

  return results;
}

export function allPassed(gates: RiskGateResult[]): boolean {
  return gates.every((g) => g.passed);
}

export function firstFailure(gates: RiskGateResult[]): RiskGateResult | null {
  return gates.find((g) => !g.passed) ?? null;
}
