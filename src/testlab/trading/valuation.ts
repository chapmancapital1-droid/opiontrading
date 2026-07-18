// @ts-nocheck
/**
 * Triangulated Valuation
 * 
 * Combines all three pricing models (BS, Monte Carlo, Binomial)
 * into a consensus price. The evolution engine uses the weights
 * as evolvable parameters — discovering, for example, that Monte
 * Carlo weights should increase during crisis regimes when
 * fat tails matter more.
 */

import { blackScholes, BSPricingResult } from './black-scholes';
import { monteCarloPricing, MonteCarloResult } from './monte-carlo';
import { binomialPricing, BinomialResult } from './binomial';
import { SeededRNG } from './rng';

export interface ValuationWeights {
  blackScholes: number;
  monteCarlo: number;
  binomial: number;
}

export interface ConsensusPrice {
  weightedCall: number;
  weightedPut: number;
  bs: BSPricingResult;
  mc: MonteCarloResult;
  bin: BinomialResult;
  modelDisagreement: number; // How much the models disagree (information for evolution)
}

/**
 * Triangulate option price across three models
 * 
 * This is a key scientific method component: using multiple independent
 * measurement methods (like using different instruments in physics) to
 * reduce measurement error and detect model bias.
 */
export function triangulatePrice(params: {
  S: number;
  K: number;
  T: number;
  r: number;
  sigma: number;
  weights: ValuationWeights;
  rng: SeededRNG;
  mcPaths?: number;
  binomialSteps?: number;
}): ConsensusPrice {
  const { S, K, T, r, sigma, weights, rng, mcPaths = 5000, binomialSteps = 100 } = params;

  // Normalize weights
  const total = weights.blackScholes + weights.monteCarlo + weights.binomial;
  const wBS = weights.blackScholes / total;
  const wMC = weights.monteCarlo / total;
  const wBin = weights.binomial / total;

  // Run all three models
  const bs = blackScholes(S, K, T, r, sigma);
  const mc = monteCarloPricing({ S, K, T, r, sigma, paths: mcPaths, rng });
  const bin = binomialPricing({ S, K, T, r, sigma, steps: binomialSteps });

  // Weighted consensus
  const weightedCall = wBS * bs.callPrice + wMC * mc.callPrice + wBin * bin.callPrice;
  const weightedPut = wBS * bs.putPrice + wMC * mc.putPrice + wBin * bin.putPrice;

  // Measure model disagreement (coefficient of variation of call prices)
  const prices = [bs.callPrice, mc.callPrice, bin.callPrice];
  const mean = (prices[0] + prices[1] + prices[2]) / 3;
  const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / 3;
  const modelDisagreement = mean > 0 ? Math.sqrt(variance) / mean : 0;

  return { weightedCall, weightedPut, bs, mc, bin, modelDisagreement };
}
