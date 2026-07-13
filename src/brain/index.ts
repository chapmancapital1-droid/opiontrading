/**
 * OptionScope Trading Brain public API.
 * Phase 4 selector + portfolio growth allocator + risk gates + Phase 4.1 engine score.
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
export { instantiateStrategy, chainToRows, pickPreferredExpiration } from "./instantiate";
export {
  scoreRecommendationsWithEngine,
  buildRiskMapsFromChain,
} from "./engineScore";
export { demoAccount, DEFAULT_DEMO_ACCOUNT } from "./demoAccount";
export { explainStrategy, explanationToMarkdown } from "./explain";
export type { StrategyExplanation, ExplainCitation, BrainExplainInput } from "./explain";
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
export type { InstantiatedStrategy, ChainRow } from "./instantiate";
export type { ScoredRecommendation, EngineMetrics } from "./engineScore";
