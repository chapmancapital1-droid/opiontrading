// @ts-nocheck
/**
 * Binomial Tree (Cox-Ross-Rubinstein) Options Pricing
 * 
 * Discretizes time into steps where the price can move up or down.
 * Naturally handles American-style exercise and is the third
 * pricing perspective in our triangulation approach. The evolution
 * engine can use all three models to identify regime-specific
 * pricing biases.
 */

import { normalCDF } from './normal';

export interface BinomialResult {
  callPrice: number;
  putPrice: number;
  callDelta: number;
  putDelta: number;
  steps: number;
  earlyExercisePremium: number; // Difference from European pricing
}

/**
 * CRR Binomial Tree for European or American options
 * 
 * Up factor: u = exp(sigma * sqrt(dt))
 * Down factor: d = 1/u
 * Risk-neutral probability: p = (exp(r*dt) - d) / (u - d)
 */
export function binomialPricing(params: {
  S: number;
  K: number;
  T: number;
  r: number;
  sigma: number;
  steps?: number;
  american?: boolean;
  isCall?: boolean;
}): BinomialResult {
  const {
    S, K, T, r, sigma,
    steps = 100,
    american = false,
    isCall = true,
  } = params;

  const dt = T / steps;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const disc = Math.exp(-r * dt);
  const p = (Math.exp(r * dt) - d) / (u - d);

  // Build terminal values
  const finalValues = new Float64Array(steps + 1);

  for (let i = 0; i <= steps; i++) {
    const ST = S * Math.pow(u, steps - i) * Math.pow(d, i);
    if (isCall) {
      finalValues[i] = Math.max(ST - K, 0);
    } else {
      finalValues[i] = Math.max(K - ST, 0);
    }
  }

  // Backward induction
  let optionValues = finalValues;

  for (let step = steps - 1; step >= 0; step--) {
    const newValues = new Float64Array(step + 1);
    for (let i = 0; i <= step; i++) {
      const continuation = disc * (p * optionValues[i] + (1 - p) * optionValues[i + 1]);
      const ST = S * Math.pow(u, step - i) * Math.pow(d, i);
      const exercise = isCall ? Math.max(ST - K, 0) : Math.max(K - ST, 0);

      newValues[i] = american ? Math.max(continuation, exercise) : continuation;
    }
    optionValues = newValues;
  }

  // Compute delta from step 1 values
  const step1Values = new Float64Array(2);
  const Su = S * u;
  const Sd = S * d;
  const payoffUp = isCall ? Math.max(Su * u - K, 0) : Math.max(K - Su * u, 0);
  const payoffDown = isCall ? Math.max(Sd * u - K, 0) : Math.max(K - Sd * u, 0);
  step1Values[0] = disc * (p * payoffUp + (1 - p) * (isCall ? Math.max(Su * d - K, 0) : Math.max(K - Su * d, 0)));
  step1Values[1] = disc * (p * (isCall ? Math.max(Sd * u - K, 0) : Math.max(K - Sd * u, 0)) + (1 - p) * (isCall ? Math.max(Sd * d - K, 0) : Math.max(K - Sd * d, 0)));

  if (american) {
    step1Values[0] = Math.max(step1Values[0], isCall ? Math.max(Su - K, 0) : Math.max(K - Su, 0));
    step1Values[1] = Math.max(step1Values[1], isCall ? Math.max(Sd - K, 0) : Math.max(K - Sd, 0));
  }

  const delta = (step1Values[0] - step1Values[1]) / (Su - Sd);

  // Also compute the opposite type for comparison
  let oppositePrice = 0;
  const oppositeFinal = new Float64Array(steps + 1);
  for (let i = 0; i <= steps; i++) {
    const ST = S * Math.pow(u, steps - i) * Math.pow(d, i);
    oppositeFinal[i] = isCall ? Math.max(K - ST, 0) : Math.max(ST - K, 0);
  }
  let oppValues = oppositeFinal;
  for (let step = steps - 1; step >= 0; step--) {
    const newVals = new Float64Array(step + 1);
    for (let i = 0; i <= step; i++) {
      newVals[i] = disc * (p * oppValues[i] + (1 - p) * oppValues[i + 1]);
    }
    oppValues = newVals;
  }
  oppositePrice = oppValues[0];

  // Put-call parity check for early exercise premium
  const europeanPrice = optionValues[0];
  const parityCall = europeanPrice + K * Math.exp(-r * T) - S;
  const earlyExercisePremium = Math.abs(europeanPrice - (isCall ?
    (parityCall) : europeanPrice));

  return {
    callPrice: isCall ? optionValues[0] : oppositePrice,
    putPrice: isCall ? oppositePrice : optionValues[0],
    callDelta: isCall ? delta : delta - 1,
    putDelta: isCall ? delta - 1 : delta,
    steps,
    earlyExercisePremium: american ? earlyExercisePremium : 0,
  };
}
