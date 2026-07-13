/**
 * OptionScope knowledge library — machine-usable strategy rules.
 * These feed the Phase 4 trading brain (selector + portfolio allocator).
 * Educational decision support only — not investment advice.
 */

import type { ApprovalProfile, RiskClass } from "@/domain/strategyDefinitions";
import type {
  EventProximity,
  IvTrend,
  Liquidity,
  NewsSentiment,
  SpotTrend,
} from "@/lib/marketContext";

export type Thesis =
  | "bullish"
  | "bearish"
  | "neutral"
  | "range"
  | "large-move"
  | "moderately_bullish"
  | "moderately_bearish";

export type PortfolioRole =
  | "income_engine"       // primary cashflow (wheel / CSP / credit spreads)
  | "growth_tactical"     // directional defined-risk bets
  | "hedge"               // protective
  | "core_equity"         // stock/ETF portfolio bucket (not an option structure)
  | "campaign";           // multi-step (wheel assignment cycle)

export type GrowthMode = "aggressive_growth" | "balanced" | "income_preservation";

export type ExitRuleId =
  | "profit_50pct_max"
  | "profit_25pct_max"
  | "dte_21_close_or_roll"
  | "stop_2x_credit"
  | "stop_1x_debit"
  | "assignment_then_cc"
  | "manual_review";

export interface StrategyRule {
  id: string;
  /** Maps to `StrategyDefinition.id` when applicable. */
  strategyId: string;
  name: string;
  thesis: Thesis;
  portfolioRole: PortfolioRole;
  riskProfile: RiskClass;
  approval: ApprovalProfile;
  /** Preferred IV regime(s). Empty = any. */
  ivConditions: IvTrend[];
  /** Preferred spot trend(s). Empty = any. */
  trends: SpotTrend[];
  eventStance: "prefer_clear" | "ok_through_events" | "avoid_earnings" | "avoid_ex_div";
  /** Reject when liquidity is worse than this (wide is worst). */
  minLiquidity: Liquidity;
  /** Prefer news alignment; "any" ignores sentiment. */
  newsBias: NewsSentiment | "any";
  entryRules: string[];
  exitRules: ExitRuleId[];
  /** Typical short-leg |delta| target when selling premium (0–1). */
  shortDeltaTarget: number | null;
  dteMin: number;
  dteMax: number;
  /** Weight in selector (0–1). Higher = preferred when multiple match. */
  priority: number;
  /** True for primary account-growth engines (wheel path). */
  growthPrimary: boolean;
  bookSource: string;
  structure: string;
  notes: string[];
}

export interface PortfolioPolicy {
  /** Version pin — tests lock against this exact string. */
  version: string;
  broker: "robinhood";
  executionMode: "manual_checklist_only";
  growthModes: Record<
    GrowthMode,
    {
      /** Max simultaneous open max-loss as fraction of equity. */
      openRiskBudgetPct: number;
      /** Risk per new trade as fraction of equity (soft target). */
      perTradeRiskPct: number;
      /** Hard cap per trade (never exceed). */
      perTradeRiskCapPct: number;
      /** Share of realized option profits that stay in options float. */
      reinvestOptionsPct: number;
      /** Share of realized option profits that move to portfolio core. */
      portfolioCorePct: number;
      /** Max concurrent option campaigns. */
      maxOpenCampaigns: number;
    }
  >;
  hardGates: {
    /** Companion mode blocks undefined risk. */
    blockUndefinedRisk: boolean;
    /** Never place if max loss exceeds this % of equity (hard). */
    absoluteMaxLossPct: number;
    /** Daily realized loss circuit breaker as % of equity. */
    dailyLossHaltPct: number;
    /** Min confidence for auto-ranking (still manual entry). */
    minContextConfidence: "low" | "medium" | "high";
    /** Reject wide liquidity in companion growth mode. */
    rejectWideLiquidity: boolean;
    /** Avoid new premium sales into earnings when stance requires clear. */
    respectEventStance: boolean;
  };
  /** Preferred underlyings for the wheel income engine (liquidity + FCF quality bias). */
  wheelUniverse: string[];
  /** Core portfolio tickers for profit parking (ETFs / quality equities). */
  corePortfolioUniverse: string[];
  disclaimer: string;
}
