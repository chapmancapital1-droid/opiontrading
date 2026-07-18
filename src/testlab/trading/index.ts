// @ts-nocheck
export { SeededRNG } from './rng';
export { normalPDF, normalCDF, normalInv, twoTailedPValue, confidenceIntervalWidth } from './normal';
export { blackScholes, impliedVolatility, greeksSensitivity, BSPricingResult } from './black-scholes';
export { monteCarloPricing, strikeProbabilityMC, MonteCarloResult } from './monte-carlo';
export { binomialPricing, BinomialResult } from './binomial';
export { legPayoff, analyzeTrade, verticalSpread, ironCondor, TradeLeg, TradeResult } from './payoff';
export { triangulatePrice, ValuationWeights, ConsensusPrice } from './valuation';
export { generateMarket, MarketBar, MarketRegime, SyntheticMarket, RegimeParams } from './market-generator';
export {
  Genome, GENOME_BOUNDS, randomGenome, expertGenome,
  crossover, mutate, clampGenome,
} from './genome';
export { runBacktest, BacktestResult, Position } from './backtester';
export {
  runEvolution, defaultConfig, FitnessScore, Individual, GenerationResult,
  EvolutionConfig, EvolutionProgress,
} from './evolution';
export {
  ALL_STRATEGIES, AVAILABLE_DTES, getStrategiesForDTE, dteLabel,
  getStrategiesByDTE,
  type DTE, type StrategyDef,
} from './strategies';
export {
  TICKER_PROFILES, getTickerProfile, getAvailableTickers, createCustomProfile,
  type TickerProfile,
} from './ticker-profiles';
