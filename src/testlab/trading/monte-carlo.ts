// @ts-nocheck
/**
 * Monte Carlo Options Pricing
 * 
 * Simulates thousands of potential price paths using geometric
 * Brownian motion and averages the payoffs. This method naturally
 * handles path-dependent features and is the most flexible pricing
 * approach — making it valuable for testing how different simulation
 * assumptions affect strategy performance.
 */

import { SeededRNG } from './rng';

export interface MonteCarloResult {
  callPrice: number;
  putPrice: number;
  callStdError: number;
  putStdError: number;
  pathsSimulated: number;
  finalPrices: number[]; // sample of terminal prices for analysis
  paths: number[][]; // sample paths for visualization (first N)
}

/**
 * Monte Carlo pricing using Geometric Brownian Motion
 * 
 * dS = mu*S*dt + sigma*S*dW
 * 
 * Discretized: S(t+dt) = S(t) * exp((mu - sigma^2/2)*dt + sigma*sqrt(dt)*Z)
 * where Z ~ N(0,1)
 */
export function monteCarloPricing(params: {
  S: number;           // Spot price
  K: number;           // Strike price
  T: number;           // Time to expiry (years)
  r: number;           // Risk-free rate
  sigma: number;       // Volatility
  mu?: number;         // Drift (defaults to r for risk-neutral)
  steps?: number;      // Time steps per path
  paths?: number;      // Number of simulation paths
  rng: SeededRNG;      // Seeded RNG for reproducibility
  storePaths?: number; // How many paths to store for visualization
}): MonteCarloResult {
  const {
    S, K, T, r, sigma,
    mu = r,
    steps = 252,
    paths = 10000,
    rng,
    storePaths = 50,
  } = params;

  const dt = T / steps;
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const diffusion = sigma * Math.sqrt(dt);

  let callSum = 0;
  let putSum = 0;
  let callSumSq = 0;
  let putSumSq = 0;

  const finalPrices: number[] = [];
  const storedPaths: number[][] = [];

  for (let i = 0; i < paths; i++) {
    const pathRng = rng.fork(i);
    let price = S;
    const path: number[] = [S];

    for (let j = 0; j < steps; j++) {
      const z = pathRng.normal();
      price = price * Math.exp(drift + diffusion * z);
      if (i < storePaths) path.push(price);
    }

    if (i < storePaths) storedPaths.push(path);
    finalPrices.push(price);

    const callPayoff = Math.max(price - K, 0);
    const putPayoff = Math.max(K - price, 0);

    const discountFactor = Math.exp(-r * T);
    callSum += callPayoff * discountFactor;
    putSum += putPayoff * discountFactor;
    callSumSq += (callPayoff * discountFactor) ** 2;
    putSumSq += (putPayoff * discountFactor) ** 2;
  }

  const callPrice = callSum / paths;
  const putPrice = putSum / paths;
  const callStdError = Math.sqrt((callSumSq / paths - callPrice * callPrice) / paths);
  const putStdError = Math.sqrt((putSumSq / paths - putPrice * putPrice) / paths);

  return {
    callPrice,
    putPrice,
    callStdError,
    putStdError,
    pathsSimulated: paths,
    finalPrices,
    paths: storedPaths,
  };
}

/**
 * Estimate probability of price finishing in a range
 * using Monte Carlo simulation. This feeds into the
 * hypothesis formation stage of the scientific method.
 */
export function strikeProbabilityMC(params: {
  S: number;
  T: number;
  r: number;
  sigma: number;
  mu?: number;
  lowerBound?: number;
  upperBound?: number;
  paths?: number;
  rng: SeededRNG;
}): number {
  const {
    S, T, r, sigma, mu = r,
    lowerBound = -Infinity,
    upperBound = Infinity,
    paths = 5000,
    rng,
  } = params;

  const dt = 1 / 252;
  const steps = Math.ceil(T * 252);
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const diffusion = sigma * Math.sqrt(dt);

  let inRange = 0;

  for (let i = 0; i < paths; i++) {
    const pathRng = rng.fork(i);
    let price = S;

    for (let j = 0; j < steps; j++) {
      price = price * Math.exp(drift + diffusion * pathRng.normal());
    }

    if (price >= lowerBound && price <= upperBound) {
      inRange++;
    }
  }

  return inRange / paths;
}
