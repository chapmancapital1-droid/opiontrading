// @ts-nocheck
/**
 * Black-Scholes Options Pricing Model
 * 
 * The theoretical cornerstone of options pricing. Used here as one
 * of three pricing methods (BS, Monte Carlo, Binomial) that the
 * evolution engine can weight differently to form hypotheses about
 * which model best captures real option dynamics under each regime.
 */

import { normalCDF } from './normal';

export interface BSPricingResult {
  callPrice: number;
  putPrice: number;
  callDelta: number;
  putDelta: number;
  callGamma: number;
  putGamma: number;
  callVega: number;
  putVega: number;
  callTheta: number;
  putTheta: number;
  callRho: number;
  putRho: number;
  impliedCallProbability: number; // Risk-neutral probability of ITM at expiry
  impliedPutProbability: number;
}

/**
 * Black-Scholes pricing for European options
 * 
 * @param S - Spot price of underlying
 * @param K - Strike price
 * @param T - Time to expiry in years (e.g., 1/252 for 1 trading day)
 * @param r - Risk-free interest rate (annualized)
 * @param sigma - Implied volatility (annualized)
 */
export function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): BSPricingResult {
  if (T <= 0) {
    // At expiry: intrinsic value only
    const callIntrinsic = Math.max(S - K, 0);
    const putIntrinsic = Math.max(K - S, 0);
    return {
      callPrice: callIntrinsic,
      putPrice: putIntrinsic,
      callDelta: S > K ? 1 : 0,
      putDelta: S < K ? -1 : 0,
      callGamma: 0,
      putGamma: 0,
      callVega: 0,
      putVega: 0,
      callTheta: 0,
      putTheta: 0,
      callRho: 0,
      putRho: 0,
      impliedCallProbability: S > K ? 1 : 0,
      impliedPutProbability: S < K ? 1 : 0,
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const Nmd1 = normalCDF(-d1);
  const Nmd2 = normalCDF(-d2);

  const discountFactor = Math.exp(-r * T);
  const nd1 = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI); // PDF at d1

  const callPrice = S * Nd1 - K * discountFactor * Nd2;
  const putPrice = K * discountFactor * Nmd2 - S * Nmd1;

  const callDelta = Nd1;
  const putDelta = Nd1 - 1;
  const gamma = nd1 / (S * sigma * sqrtT);
  const vega = S * nd1 * sqrtT / 100; // per 1% vol change
  const callTheta = (-(S * nd1 * sigma) / (2 * sqrtT) - r * K * discountFactor * Nd2) / 365;
  const putTheta = (-(S * nd1 * sigma) / (2 * sqrtT) + r * K * discountFactor * Nmd2) / 365;
  const callRho = K * T * discountFactor * Nd2 / 100;
  const putRho = -K * T * discountFactor * Nmd2 / 100;

  return {
    callPrice,
    putPrice,
    callDelta,
    putDelta,
    callGamma: gamma,
    putGamma: gamma,
    callVega: vega,
    putVega: vega,
    callTheta,
    putTheta,
    callRho,
    putRho,
    impliedCallProbability: Nd2,
    impliedPutProbability: Nmd2,
  };
}

/**
 * Estimate implied volatility from market price using Newton-Raphson
 * Used by the evolution engine to understand what the "market" expects
 * and compare it against the synthetic market's realized volatility.
 */
export function impliedVolatility(
  optionPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  isCall: boolean = true,
  maxIterations: number = 50,
  tolerance: number = 1e-8
): number {
  let sigma = 0.3; // initial guess: 30% vol

  for (let i = 0; i < maxIterations; i++) {
    const result = blackScholes(S, K, T, r, sigma);
    const price = isCall ? result.callPrice : result.putPrice;
    const vega = (result.callVega * 100) / S; // convert back to raw vega

    const diff = price - optionPrice;
    if (Math.abs(diff) < tolerance) break;
    if (Math.abs(vega) < 1e-12) break;

    sigma = sigma - diff / vega;
    if (sigma <= 0.001) sigma = 0.001;
    if (sigma > 5) sigma = 5;
  }

  return sigma;
}

/**
 * Greeks sensitivity analysis — how option price changes
 * when each input shifts by a small amount. This feeds into
 * the risk management layer of the evolution engine.
 */
export function greeksSensitivity(
  S: number, K: number, T: number, r: number, sigma: number
): Record<string, number> {
  const base = blackScholes(S, K, T, r, sigma);
  const dS = S * 0.01;
  const dSigma = 0.01;
  const dT = 1 / 252;

  const upS = blackScholes(S + dS, K, T, r, sigma);
  const downS = blackScholes(S - dS, K, T, r, sigma);
  const upVol = blackScholes(S, K, T, r, sigma + dSigma);
  const downVol = blackScholes(S, K, T, r, sigma - dSigma);
  const nextDay = blackScholes(S, K, T - dT, r, sigma);

  return {
    delta: (upS.callPrice - base.callPrice) / dS,
    gamma: (upS.callPrice - 2 * base.callPrice + downS.callPrice) / (dS * dS),
    vega: (upVol.callPrice - downVol.callPrice) / (2 * dSigma),
    theta: (nextDay.callPrice - base.callPrice) / dT,
  };
}
