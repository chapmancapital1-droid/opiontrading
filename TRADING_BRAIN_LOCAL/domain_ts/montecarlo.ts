/**
 * Monte Carlo engine for OptionScope / NerdCommand OTA brain.
 *
 * Foundations (Crack Basic Black-Scholes + risk-neutral pricing):
 *   dS = μ S dt + σ S dW   under RN measure: μ = r − q
 *   European payoff discounted: e^{−rT} E[max(±(S_T − K), 0)]
 *
 * Two surfaces:
 *   1) runMonteCarlo        — multi-leg strategy P/L at expiration (Trade Lab / Compare)
 *   2) monteCarloEuropean   — pure European option price vs Black-Scholes (pricing module)
 *
 * Variance reduction: antithetic variates (pair Z and −Z).
 * Paths: multi-step GBM (exact log-Euler) for visualization / path-dependent extension.
 */

import { mulberry32, makeNormal } from "./rng";
import { plAtExpiration } from "./payoff";
import { blackScholes } from "./blackScholes";
import type { Leg, OptionType } from "./types";

// ─────────────────────────────────────────────────────────────
// Strategy Monte Carlo (expiration P/L distribution)
// ─────────────────────────────────────────────────────────────

export type DriftMode =
  | { kind: "risk-neutral" }
  | { kind: "user"; annualDrift: number }; // decimal (0.08 = 8%/yr)

export interface MCParams {
  legs: Leg[];
  spot: number;
  tYears: number; // horizon to expiration
  sigma: number; // annualized vol (dec)
  r: number;
  q: number;
  drift: DriftMode;
  simulations: number; // default 20000
  seed: number; // reproducibility
  /** Antithetic variates (pairs Z, −Z). Default true. */
  antithetic?: boolean;
  /**
   * Time steps for multi-step GBM paths.
   * Default 1 (exact terminal for pure GBM Europeans; strategy uses S_T only).
   */
  steps?: number;
  /** If true, return a small sample of full paths for charts. */
  collectPaths?: boolean;
  pathSampleSize?: number;
}

export interface MCResult {
  simulations: number;
  seed: number;
  probProfit: number; // P(P/L > 0)
  probLoss: number; // P(P/L < 0)
  probZero: number; // P(P/L == 0)
  expectedPL: number;
  stdErrorPL: number;
  ci95PL: [number, number];
  median: number;
  p5: number;
  p95: number;
  stdErrorProb: number; // sqrt(p(1-p)/N) for probProfit
  ci95Prob: [number, number];
  histogram: { bin: number; count: number }[];
  driftUsed: number;
  antithetic: boolean;
  steps: number;
  /** Optional path samples: each path is [S0, S1, …, ST] */
  samplePaths?: number[][];
  note: string;
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx),
    hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

/** Simulate terminal spot under GBM. steps=1 is exact for lognormal S_T. */
function terminalSpotGBM(
  S0: number,
  mu: number,
  sigma: number,
  T: number,
  steps: number,
  normal: () => number,
  zOverride?: number
): { sT: number; path?: number[] } {
  if (T <= 0 || sigma < 0 || !Number.isFinite(S0) || S0 <= 0) {
    return { sT: Math.max(0, S0) };
  }
  const nSteps = Math.max(1, Math.floor(steps));
  if (nSteps === 1) {
    const z = zOverride ?? normal();
    const drift = (mu - 0.5 * sigma * sigma) * T;
    const vol = sigma * Math.sqrt(T);
    const sT = S0 * Math.exp(drift + vol * z);
    return { sT };
  }
  const dt = T / nSteps;
  const driftStep = (mu - 0.5 * sigma * sigma) * dt;
  const volStep = sigma * Math.sqrt(dt);
  let s = S0;
  const path: number[] = [S0];
  for (let k = 0; k < nSteps; k++) {
    // For multi-step with antithetic, zOverride only applies to full-horizon
    // one-shot; multi-step always draws fresh increments.
    const z = normal();
    s = s * Math.exp(driftStep + volStep * z);
    path.push(s);
  }
  return { sT: s, path };
}

export function runMonteCarlo(p: MCParams): MCResult {
  const N = Math.max(1, Math.floor(p.simulations));
  const useAnti = p.antithetic !== false;
  const steps = Math.max(1, Math.floor(p.steps ?? 1));
  const collectPaths = p.collectPaths === true;
  const pathCap = Math.max(0, Math.min(p.pathSampleSize ?? 32, 64));

  const uniform = mulberry32(p.seed);
  const normal = makeNormal(uniform);

  const mu = p.drift.kind === "risk-neutral" ? p.r - p.q : p.drift.annualDrift;

  // Effective independent path count (antithetic counts as 2 outcomes per draw)
  const pairs = useAnti && steps === 1 ? Math.ceil(N / 2) : N;
  const pls = new Float64Array(N);
  const samplePaths: number[][] = [];
  let profit = 0,
    loss = 0,
    zero = 0,
    sum = 0,
    sumSq = 0;
  let filled = 0;

  for (let i = 0; i < pairs && filled < N; i++) {
    if (useAnti && steps === 1) {
      // Exact terminal: one Z → S(Z) and S(−Z)
      const z = normal();
      const drift = (mu - 0.5 * p.sigma * p.sigma) * p.tYears;
      const vol = p.sigma * Math.sqrt(Math.max(0, p.tYears));
      const sPos =
        p.tYears <= 0
          ? p.spot
          : p.spot * Math.exp(drift + vol * z);
      const sNeg =
        p.tYears <= 0
          ? p.spot
          : p.spot * Math.exp(drift + vol * -z);

      for (const sT of [sPos, sNeg]) {
        if (filled >= N) break;
        const pl = plAtExpiration(p.legs, sT);
        pls[filled++] = pl;
        sum += pl;
        sumSq += pl * pl;
        if (pl > 0) profit++;
        else if (pl < 0) loss++;
        else zero++;
        if (collectPaths && samplePaths.length < pathCap) {
          samplePaths.push([p.spot, sT]);
        }
      }
    } else {
      const { sT, path } = terminalSpotGBM(
        p.spot,
        mu,
        p.sigma,
        p.tYears,
        steps,
        normal
      );
      const pl = plAtExpiration(p.legs, sT);
      pls[filled++] = pl;
      sum += pl;
      sumSq += pl * pl;
      if (pl > 0) profit++;
      else if (pl < 0) loss++;
      else zero++;
      if (collectPaths && path && samplePaths.length < pathCap) {
        samplePaths.push(path);
      } else if (collectPaths && samplePaths.length < pathCap) {
        samplePaths.push([p.spot, sT]);
      }
    }
  }

  const n = filled;
  const probProfit = profit / n;
  const probLoss = loss / n;
  const probZero = zero / n;
  const expectedPL = sum / n;
  const variance =
    n > 1 ? Math.max(0, sumSq / n - expectedPL * expectedPL) : 0;
  const stdErrorPL = Math.sqrt(variance / n);
  const ci95PL: [number, number] = [
    expectedPL - 1.96 * stdErrorPL,
    expectedPL + 1.96 * stdErrorPL,
  ];

  const sorted = Array.from(pls.subarray(0, n)).sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const p5 = percentile(sorted, 0.05);
  const p95 = percentile(sorted, 0.95);

  const se = Math.sqrt((probProfit * (1 - probProfit)) / n);
  const ci95Prob: [number, number] = [
    Math.max(0, probProfit - 1.96 * se),
    Math.min(1, probProfit + 1.96 * se),
  ];

  // Histogram: 40 bins across [p1, p99]
  const lo = percentile(sorted, 0.01),
    hi = percentile(sorted, 0.99);
  const bins = 40;
  const span = Number.isFinite(hi - lo) ? hi - lo : 0;
  const width = span > 0 ? span / bins : 1;
  const hist = Array.from({ length: bins }, (_, k) => ({
    bin: lo + k * width,
    count: 0,
  }));
  for (let i = 0; i < n; i++) {
    const v = pls[i]!;
    if (!Number.isFinite(v)) continue;
    let idx = Math.floor((v - lo) / width);
    if (!Number.isFinite(idx)) idx = 0;
    idx = Math.max(0, Math.min(bins - 1, idx));
    const bin = hist[idx];
    if (bin) bin.count++;
  }

  const result: MCResult = {
    simulations: n,
    seed: p.seed,
    probProfit,
    probLoss,
    probZero,
    expectedPL: Number(expectedPL.toFixed(2)),
    stdErrorPL,
    ci95PL: [Number(ci95PL[0].toFixed(2)), Number(ci95PL[1].toFixed(2))],
    median: Number(median.toFixed(2)),
    p5: Number(p5.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    stdErrorProb: se,
    ci95Prob,
    histogram: hist,
    driftUsed: mu,
    antithetic: useAnti && steps === 1,
    steps,
    note:
      "GBM with fixed volatility" +
      (useAnti && steps === 1 ? " + antithetic variates" : "") +
      (steps > 1 ? ` · ${steps}-step paths` : " · exact terminal S_T") +
      ". Real volatility, rates, and liquidity change. " +
      "Probabilities are model estimates, not guarantees.",
  };
  if (collectPaths) result.samplePaths = samplePaths;
  return result;
}

// ─────────────────────────────────────────────────────────────
// European option pricing Monte Carlo (vs Black-Scholes)
// ─────────────────────────────────────────────────────────────

export interface EuropeanMCParams {
  /** Spot S0 */
  spot: number;
  /** Strike X / K */
  strike: number;
  /** Years to maturity τ */
  tYears: number;
  /** Continuous risk-free rate */
  r: number;
  /** Continuous dividend yield */
  q?: number;
  /** Annualized volatility σ */
  sigma: number;
  type: OptionType;
  /** Number of simulated terminal prices (before antithetic doubling semantics) */
  simulations?: number;
  /** Discretization steps per path (1 = exact lognormal terminal) */
  steps?: number;
  seed?: number;
  /** Pair each Z with −Z (default true) */
  antithetic?: boolean;
  /** Collect a few paths for charts */
  collectPaths?: boolean;
  pathSampleSize?: number;
}

export interface EuropeanMCResult {
  price: number;
  stdError: number;
  ci95: [number, number];
  blackScholesPrice: number;
  absError: number;
  relError: number;
  simulations: number;
  seed: number;
  antithetic: boolean;
  steps: number;
  type: OptionType;
  /** Discounted payoff sample mean components for explainability */
  meanPayoff: number;
  discount: number;
  samplePaths?: number[][];
  note: string;
}

/**
 * Risk-neutral Monte Carlo price for a European call/put.
 * Converges to Black-Scholes as N → ∞ (and steps=1 has no time-discretization bias).
 */
export function monteCarloEuropean(p: EuropeanMCParams): EuropeanMCResult {
  const S0 = p.spot;
  const K = p.strike;
  const T = Math.max(0, p.tYears);
  const r = p.r;
  const q = p.q ?? 0;
  const sigma = p.sigma;
  const type = p.type;
  const N = Math.max(1, Math.floor(p.simulations ?? 50_000));
  const steps = Math.max(1, Math.floor(p.steps ?? 1));
  const seed = p.seed ?? 42;
  const useAnti = p.antithetic !== false;
  const collectPaths = p.collectPaths === true;
  const pathCap = Math.max(0, Math.min(p.pathSampleSize ?? 24, 64));

  const bs = blackScholes({
    spot: S0,
    strike: K,
    t: T,
    r,
    q,
    sigma: Math.max(sigma, 1e-12),
    type,
  });

  if (T <= 0 || sigma <= 0 || S0 <= 0 || K <= 0) {
    const intrinsic =
      type === "call" ? Math.max(S0 - K, 0) : Math.max(K - S0, 0);
    return {
      price: intrinsic,
      stdError: 0,
      ci95: [intrinsic, intrinsic],
      blackScholesPrice: bs.price,
      absError: Math.abs(intrinsic - bs.price),
      relError: bs.price !== 0 ? Math.abs(intrinsic - bs.price) / Math.abs(bs.price) : 0,
      simulations: 0,
      seed,
      antithetic: useAnti,
      steps,
      type,
      meanPayoff: intrinsic,
      discount: 1,
      note: "Expired or zero-vol: intrinsic value (no simulation).",
    };
  }

  const uniform = mulberry32(seed);
  const normal = makeNormal(uniform);
  const mu = r - q;
  const discount = Math.exp(-r * T);

  // Store discounted payoffs for SE
  const discPayoffs = new Float64Array(N);
  const samplePaths: number[][] = [];
  let filled = 0;

  const payoff = (sT: number): number =>
    type === "call" ? Math.max(sT - K, 0) : Math.max(K - sT, 0);

  if (useAnti && steps === 1) {
    // Exact terminal + antithetic
    const drift = (mu - 0.5 * sigma * sigma) * T;
    const vol = sigma * Math.sqrt(T);
    const pairs = Math.ceil(N / 2);
    for (let i = 0; i < pairs && filled < N; i++) {
      const z = normal();
      const sPos = S0 * Math.exp(drift + vol * z);
      const sNeg = S0 * Math.exp(drift + vol * -z);
      for (const sT of [sPos, sNeg]) {
        if (filled >= N) break;
        discPayoffs[filled++] = discount * payoff(sT);
        if (collectPaths && samplePaths.length < pathCap) {
          samplePaths.push([S0, sT]);
        }
      }
    }
  } else {
    for (let i = 0; i < N; i++) {
      const { sT, path } = terminalSpotGBM(S0, mu, sigma, T, steps, normal);
      discPayoffs[i] = discount * payoff(sT);
      filled = i + 1;
      if (collectPaths && samplePaths.length < pathCap) {
        samplePaths.push(path ?? [S0, sT]);
      }
    }
  }

  const n = filled;
  let sum = 0,
    sumSq = 0;
  for (let i = 0; i < n; i++) {
    const v = discPayoffs[i]!;
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / n;
  const variance = n > 1 ? Math.max(0, sumSq / n - mean * mean) : 0;
  // Antithetic pairs are correlated — SE is slightly conservative if we treat N as iid
  const stdError = Math.sqrt(variance / n);
  const ci95: [number, number] = [
    mean - 1.96 * stdError,
    mean + 1.96 * stdError,
  ];
  const absError = Math.abs(mean - bs.price);
  const relError =
    Math.abs(bs.price) > 1e-12 ? absError / Math.abs(bs.price) : absError;

  const result: EuropeanMCResult = {
    price: mean,
    stdError,
    ci95,
    blackScholesPrice: bs.price,
    absError,
    relError,
    simulations: n,
    seed,
    antithetic: useAnti && steps === 1,
    steps,
    type,
    meanPayoff: mean / discount,
    discount,
    note:
      "Risk-neutral GBM Monte Carlo European price. " +
      (useAnti && steps === 1 ? "Antithetic variates on. " : "") +
      (steps === 1
        ? "One-step exact lognormal terminal (no discretization bias). "
        : `${steps}-step path discretization. `) +
      "Compare price to blackScholesPrice for convergence check.",
  };
  if (collectPaths) result.samplePaths = samplePaths;
  return result;
}

/**
 * Generate multi-step GBM price paths under a chosen drift (for charts / stress).
 * Returns paths as arrays of length steps+1 (includes S0).
 */
export function simulateGbmPaths(opts: {
  spot: number;
  tYears: number;
  sigma: number;
  mu: number; // annual drift (use r−q for risk-neutral)
  steps: number;
  numPaths: number;
  seed: number;
}): number[][] {
  const {
    spot,
    tYears,
    sigma,
    mu,
    steps,
    numPaths,
    seed,
  } = opts;
  const nSteps = Math.max(1, Math.floor(steps));
  const nPaths = Math.max(1, Math.floor(numPaths));
  const uniform = mulberry32(seed);
  const normal = makeNormal(uniform);
  const T = Math.max(0, tYears);
  const dt = T / nSteps;
  const driftStep = (mu - 0.5 * sigma * sigma) * dt;
  const volStep = sigma * Math.sqrt(dt);
  const out: number[][] = [];

  for (let p = 0; p < nPaths; p++) {
    const path = new Array<number>(nSteps + 1);
    path[0] = spot;
    let s = spot;
    for (let k = 0; k < nSteps; k++) {
      if (T <= 0) {
        path[k + 1] = spot;
        continue;
      }
      s = s * Math.exp(driftStep + volStep * normal());
      path[k + 1] = s;
    }
    out.push(path);
  }
  return out;
}
