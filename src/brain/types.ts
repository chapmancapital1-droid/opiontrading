/**
 * OptionScope Trading Brain — decision types.
 * Advisory only: produces rankings + size + Robinhood checklist context.
 * Never places orders.
 */

import type { ApprovalProfile } from "@/domain/strategyDefinitions";
import type { Confidence, MarketContext } from "@/lib/marketContext";
import type { GrowthMode, PortfolioRole, StrategyRule } from "@/knowledge/types";
import type { NciTaSnapshot } from "@/indicators/nciTa";

export interface AccountState {
  /** Total account equity (cash + positions mark). */
  equity: number;
  /** Settled cash available. */
  cash: number;
  /** Cash earmarked for CSP collateral / option float. */
  optionsFloat: number;
  /** Capital parked in core portfolio (ETFs/shares). */
  portfolioCore: number;
  /** Sum of modeled max losses on open option trades. */
  openRiskDollars: number;
  /** Number of open option campaigns. */
  openCampaigns: number;
  /** Realized P/L today (negative = loss). */
  dailyRealizedPL: number;
  approvalProfile: ApprovalProfile;
  growthMode: GrowthMode;
  /** Optional held shares by symbol (for covered-call eligibility). */
  sharesHeld?: Record<string, number>;
}

export interface RiskGateResult {
  passed: boolean;
  code: string;
  message: string;
}

export interface SizedTrade {
  contracts: number;
  riskDollars: number;
  riskPctOfEquity: number;
  collateralRequired: number | null;
  cappedBy: "risk_budget" | "per_trade_cap" | "cash" | "remaining_budget" | "min_one" | "zero";
}

export interface ProfitAllocation {
  realizedProfit: number;
  toOptionsFloat: number;
  toPortfolioCore: number;
  reinvestOptionsPct: number;
  portfolioCorePct: number;
  growthMode: GrowthMode;
  note: string;
}

export interface StrategyCandidate {
  rule: StrategyRule;
  matchScore: number;
  matchReasons: string[];
  rejectReasons: string[];
  eligible: boolean;
}

export interface BrainRecommendation {
  rank: number;
  ruleId: string;
  strategyId: string;
  name: string;
  portfolioRole: PortfolioRole;
  matchScore: number;
  matchReasons: string[];
  growthPrimary: boolean;
  /** Suggested contracts after sizing (0 if blocked). */
  suggestedContracts: number;
  /** Max loss per contract used for sizing (user/engine supplies). */
  maxLossPerContract: number | null;
  riskDollars: number;
  entryRules: string[];
  exitRules: string[];
  bookSource: string;
  robinhoodNextStep: string;
  /**
   * Pure coach copy when suggestedContracts === 0 and maxLoss is known.
   * Always populated in that case so UI never shows silent zero.
   */
  zeroSizeCoach?: string | null;
  /**
   * SPY (or SPX) advanced playbook lines — when to trade, how to adjust, structure tips.
   * Only populated when context.symbol is SPY-class.
   */
  advancedInstructions?: string[];
}

export interface BrainDecision {
  version: string;
  broker: "robinhood";
  executionMode: "manual_checklist_only";
  symbol: string;
  asOf: string;
  contextConfidence: Confidence;
  growthMode: GrowthMode;
  gates: RiskGateResult[];
  allGatesPassed: boolean;
  haltTrading: boolean;
  haltReason: string | null;
  recommendations: BrainRecommendation[];
  /** Chart bias layer from NCI TA (null if not loaded). */
  nciTa: {
    masterDir: string;
    masterPct: number;
    trigger: string;
    fireBuy: boolean;
    fireSell: boolean;
    allGatesPass: boolean;
    abcStage: string;
    source: string;
    degraded: boolean;
  } | null;
  accountSnapshot: {
    equity: number;
    cash: number;
    optionsFloat: number;
    portfolioCore: number;
    openRiskDollars: number;
    remainingRiskBudget: number;
  };
  disclaimer: string;
  marketNotes: string[];
  /**
   * Full SPY advanced playbook when symbol is SPY/SPX.
   * UI surfaces this on Command SPY tab + Brain panel.
   */
  spyPlaybook?: import("@/knowledge/spyPlaybook").SpyAdvancedPlaybook | null;
}

export interface SelectInput {
  context: MarketContext;
  account: AccountState;
  /**
   * Live NCI Complete Trading Assistant snapshot (from TS engine or TV webhook).
   * When present, biases strategy ranking toward the chart's master/FIRE state.
   */
  nciTa?: NciTaSnapshot | null;
  /**
   * Optional map of strategyId → modeled max loss per 1-lot (positive dollars).
   * Used for contract sizing. When missing, recommendation still ranks but contracts = 0.
   */
  maxLossByStrategyId?: Record<string, number>;
  /**
   * Optional map of strategyId → collateral per 1-lot.
   */
  collateralByStrategyId?: Record<string, number>;
  /** Limit ranked output (default 5). */
  topN?: number;
  /** Prefer growth-primary rules when scores tie. */
  preferGrowthPrimary?: boolean;
}
