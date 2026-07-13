/**
 * OptionScope Trading Brain public API.
 * Phase 4 selector + portfolio growth allocator + risk gates.
 */

export { runTradingBrain, evaluateCandidates } from "./selector";
export {
  sizePosition,
  allocateProfit,
  applyAllocation,
  projectGrowthPath,
  suggestCoreParking,
} from "./portfolio";
export {
  evaluateAccountGates,
  evaluateRuleGates,
  remainingRiskBudget,
  allPassed,
  firstFailure,
} from "./riskGates";
export type {
  AccountState,
  BrainDecision,
  BrainRecommendation,
  ProfitAllocation,
  RiskGateResult,
  SelectInput,
  SizedTrade,
  StrategyCandidate,
} from "./types";
