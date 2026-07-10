/* ============================================================================
   OPTIONSCOPE — MESSAGE 2 of N
   Valuation (Black-Scholes + Binomial/American), Greeks,
   seeded GBM Monte Carlo, probability outputs w/ confidence intervals.

   Split each section into the path shown in its banner: ===== FILE: path =====
   Depends on Message 1 (types.ts, payoff.ts, money.ts).
   ============================================================================ */


/* ============================================================================
   ===== FILE: src/domain/rng.ts =====
   Deterministic, reproducible RNG. mulberry32 for speed + a normal via
   Box-Muller. Seed in => identical stream out (required for reproducibility).
   ============================================================================ */

/** mulberry32: fast, decent-quality 32-bit PRNG. Deterministic from seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sampler (Box-Muller) backed by a uniform generator.
 *  Caches the second variate for efficiency. */
export function makeNormal(uniform: () => number): () => number {
  let spare: number | null = null;
  return function normal(): number {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0, v = 0, s = 0;
    do {
      u = uniform() * 2 - 1;
      v = uniform() * 2 - 1;
      s = u * u + v * v;
    } while (s === 0 || s >= 1);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * mul;
    return u * mul;
  };
}


/* ============================================================================
   ===== FILE: src/domain/normal.ts =====
   Normal CDF/PDF for Black-Scholes. Abramowitz-Stegun 7.1.26 for erf.
   ============================================================================ */

export function erf(x: number): number {
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export const normCdf = (x: number): number => 0.5 * (1 + erf(x / Math.SQRT2));
export const normPdf = (x: number): number =>
  Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);


/* ============================================================================
   ===== FILE: src/domain/blackScholes.ts =====
   European valuation + analytic Greeks. Continuous dividend yield q.
   r, q, sigma are decimals (0.05 = 5%). t in years.
   ============================================================================ */

import { normCdf, normPdf } from "./normal";
import type { OptionType } from "./types";

export interface BSInputs {
  spot: number;
  strike: number;
  t: number;        // years to expiration
  r: number;        // risk-free rate (dec)
  q: number;        // dividend yield (dec)
  sigma: number;    // implied vol (dec)
  type: OptionType;
}

export interface Greeks {
  price: number;
  delta: number;
  gamma: number;
  theta: number;    // per YEAR; divide by 365 for per-day
  vega: number;     // per 1.00 vol (per 100 vol-points); /100 for per-point
  rho: number;      // per 1.00 rate
}

function d1d2(i: BSInputs): { d1: number; d2: number } {
  const { spot, strike, t, r, q, sigma } = i;
  const vol = sigma * Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (r - q + 0.5 * sigma * sigma) * t) / vol;
  return { d1, d2: d1 - vol };
}

/** Black-Scholes price + Greeks. Handles t<=0 (intrinsic) gracefully. */
export function blackScholes(i: BSInputs): Greeks {
  const { spot, strike, t, r, q, sigma, type } = i;

  if (t <= 0 || sigma <= 0) {
    const intrinsic =
      type === "call" ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0);
    const delta =
      type === "call" ? (spot > strike ? 1 : 0) : spot < strike ? -1 : 0;
    return { price: intrinsic, delta, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const { d1, d2 } = d1d2(i);
  const df = Math.exp(-r * t);
  const dq = Math.exp(-q * t);
  const nd1 = normCdf(d1), nd2 = normCdf(d2);
  const pdf = normPdf(d1);

  if (type === "call") {
    const price = spot * dq * nd1 - strike * df * nd2;
    const delta = dq * nd1;
    const gamma = (dq * pdf) / (spot * sigma * Math.sqrt(t));
    const theta =
      (-(spot * dq * pdf * sigma) / (2 * Math.sqrt(t)) -
        r * strike * df * nd2 +
        q * spot * dq * nd1);
    const vega = spot * dq * pdf * Math.sqrt(t);
    const rho = strike * t * df * nd2;
    return { price, delta, gamma, theta, vega, rho };
  } else {
    const nnd1 = normCdf(-d1), nnd2 = normCdf(-d2);
    const price = strike * df * nnd2 - spot * dq * nnd1;
    const delta = -dq * nnd1;
    const gamma = (dq * pdf) / (spot * sigma * Math.sqrt(t));
    const theta =
      (-(spot * dq * pdf * sigma) / (2 * Math.sqrt(t)) +
        r * strike * df * nnd2 -
        q * spot * dq * nnd1);
    const vega = spot * dq * pdf * Math.sqrt(t);
    const rho = -strike * t * df * nnd2;
    return { price, delta, gamma, theta, vega, rho };
  }
}


/* ============================================================================
   ===== FILE: src/domain/binomial.ts =====
   Cox-Ross-Rubinstein binomial with early-exercise for AMERICAN options.
   Greeks by finite difference off the tree. Steps default 200.
   ============================================================================ */

import type { OptionType } from "./types";
import type { Greeks } from "./blackScholes";

export interface CRRInputs {
  spot: number; strike: number; t: number;
  r: number; q: number; sigma: number;
  type: OptionType; steps?: number;
}

/** CRR price with American early exercise. */
export function crrPrice(i: CRRInputs): number {
  const { spot, strike, t, r, q, sigma, type } = i;
  const N = i.steps ?? 200;
  if (t <= 0 || sigma <= 0) {
    return type === "call" ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0);
  }
  const dt = t / N;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const disc = Math.exp(-r * dt);
  const p = (Math.exp((r - q) * dt) - d) / (u - d);
  if (p < 0 || p > 1) {
    // numerical guard: fall back to no-arb bound
  }

  // Terminal values.
  const vals = new Array<number>(N + 1);
  for (let j = 0; j <= N; j++) {
    const s = spot * Math.pow(u, j) * Math.pow(d, N - j);
    vals[j] = type === "call" ? Math.max(s - strike, 0) : Math.max(strike - s, 0);
  }
  // Backward induction with early exercise.
  for (let n = N - 1; n >= 0; n--) {
    for (let j = 0; j <= n; j++) {
      const cont = disc * (p * vals[j + 1]! + (1 - p) * vals[j]!);
      const s = spot * Math.pow(u, j) * Math.pow(d, n - j);
      const exer = type === "call" ? s - strike : strike - s;
      vals[j] = Math.max(cont, exer);
    }
  }
  return vals[0]!;
}

/** American Greeks via central finite differences around the tree. */
export function crrGreeks(i: CRRInputs): Greeks {
  const h = Math.max(i.spot * 0.01, 0.01);
  const base = crrPrice(i);
  const up = crrPrice({ ...i, spot: i.spot + h });
  const dn = crrPrice({ ...i, spot: i.spot - h });
  const delta = (up - dn) / (2 * h);
  const gamma = (up - 2 * base + dn) / (h * h);

  const dv = 0.01; // 1 vol point
  const vUp = crrPrice({ ...i, sigma: i.sigma + dv });
  const vega = (vUp - base) / dv / 100; // per vol-point -> scale note below

  const dtStep = Math.min(i.t, 1 / 365);
  const tDn = crrPrice({ ...i, t: Math.max(i.t - dtStep, 1e-6) });
  const theta = (tDn - base) / dtStep; // per year

  const dr = 0.0001;
  const rUp = crrPrice({ ...i, r: i.r + dr });
  const rho = (rUp - base) / dr / 100;

  return { price: base, delta, gamma, theta, vega: vega * 100, rho };
}


/* ============================================================================
   ===== FILE: src/domain/valuation.ts =====
   Model selector: pick BS (European) or CRR (American) from leg metadata.
   Reprices a leg at a TARGET DATE (before expiration) under an IV scenario.
   ============================================================================ */

import { blackScholes } from "./blackScholes";
import { crrPrice, crrGreeks } from "./binomial";
import type { Greeks } from "./blackScholes";
import type { OptionLeg } from "./types";

export type IVScenario =
  | { kind: "fixed" }
  | { kind: "shift"; deltaVolPoints: number }   // parallel shift, in vol points (0.05 = +5pts)
  | { kind: "absolute"; sigma: number };        // set IV directly

export interface ValuationParams {
  targetSpot: number;
  targetDate: string;    // ISO; must be <= expiration
  r: number;
  q: number;
  ivScenario: IVScenario;
}

export interface ModelDisclosure {
  model: "black-scholes" | "binomial-crr";
  sigmaUsed: number;
  r: number; q: number; tYears: number;
}

function yearsBetween(fromISO: string, toISO: string): number {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 0);
}

function sigmaFor(leg: OptionLeg, sc: IVScenario): number {
  const base = leg.impliedVol ?? 0;
  switch (sc.kind) {
    case "fixed": return base;
    case "shift": return Math.max(base + sc.deltaVolPoints, 0.0001);
    case "absolute": return Math.max(sc.sigma, 0.0001);
  }
}

/** Reprice a single option leg at a target date. Returns per-share price +
 *  Greeks scaled to the leg's contract·multiplier and side. */
export function valueLegAtTarget(
  leg: OptionLeg,
  p: ValuationParams
): { perShare: number; positionGreeks: Greeks; disclosure: ModelDisclosure } {
  const t = yearsBetween(p.targetDate, leg.expiration);
  const sigma = sigmaFor(leg, p.ivScenario);
  const common = { spot: p.targetSpot, strike: leg.strike, t, r: p.r, q: p.q, sigma, type: leg.optionType };

  let g: Greeks;
  let model: ModelDisclosure["model"];
  if (leg.exerciseStyle === "american") {
    g = crrGreeks(common);
    model = "binomial-crr";
  } else {
    g = blackScholes(common);
    model = "black-scholes";
  }

  const size = leg.contracts * leg.multiplier;
  const dir = leg.side === "long" ? 1 : -1;
  const positionGreeks: Greeks = {
    price: g.price * size * dir,
    delta: g.delta * size * dir,
    gamma: g.gamma * size * dir,
    theta: (g.theta / 365) * size * dir, // per-DAY at position scale
    vega: (g.vega / 100) * size * dir,   // per vol-POINT at position scale
    rho: (g.rho) * size * dir,
  };
  return { perShare: g.price, positionGreeks, disclosure: { model, sigmaUsed: sigma, r: p.r, q: p.q, tYears: t } };
}

/** Aggregate position Greeks across all option legs (stock adds delta = shares). */
export function aggregateGreeks(legs: OptionLeg[], p: ValuationParams, stockShares = 0): Greeks {
  const agg: Greeks = { price: 0, delta: stockShares, gamma: 0, theta: 0, vega: 0, rho: 0 };
  for (const leg of legs) {
    const { positionGreeks } = valueLegAtTarget(leg, p);
    agg.price += positionGreeks.price;
    agg.delta += positionGreeks.delta;
    agg.gamma += positionGreeks.gamma;
    agg.theta += positionGreeks.theta;
    agg.vega += positionGreeks.vega;
    agg.rho += positionGreeks.rho;
  }
  return agg;
}


/* ============================================================================
   ===== FILE: src/domain/montecarlo.ts =====
   Seeded GBM Monte Carlo -> probability of profit/loss, expected value,
   percentiles, and Monte Carlo standard error / confidence interval.

   Two drift modes:
     - "risk-neutral": mu = r - q         (Market-Implied mode)
     - "user":         mu = userDrift     (User-Assumption mode)
   P/L is the FULL-STRATEGY expiration P/L (uses payoff.ts).
   ============================================================================ */

import { mulberry32, makeNormal } from "./rng";
import { plAtExpiration } from "./payoff";
import type { Leg } from "./types";

export type DriftMode =
  | { kind: "risk-neutral" }
  | { kind: "user"; annualDrift: number }; // decimal (0.08 = 8%/yr)

export interface MCParams {
  legs: Leg[];
  spot: number;
  tYears: number;         // horizon to expiration
  sigma: number;          // annualized vol for the simulation (dec)
  r: number;
  q: number;
  drift: DriftMode;
  simulations: number;    // default 20000
  seed: number;           // reproducibility
}

export interface MCResult {
  simulations: number;
  seed: number;
  probProfit: number;     // P(P/L > 0)
  probLoss: number;       // P(P/L < 0)
  probZero: number;       // P(P/L == 0), tiny but reported
  expectedPL: number;
  median: number;
  p5: number;
  p95: number;
  stdErrorProb: number;   // sqrt(p(1-p)/N) for probProfit
  ci95Prob: [number, number];
  histogram: { bin: number; count: number }[];
  driftUsed: number;
  note: string;
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

export function runMonteCarlo(p: MCParams): MCResult {
  const N = Math.max(1, Math.floor(p.simulations));
  const uniform = mulberry32(p.seed);
  const normal = makeNormal(uniform);

  const mu = p.drift.kind === "risk-neutral" ? p.r - p.q : p.drift.annualDrift;
  const drift = (mu - 0.5 * p.sigma * p.sigma) * p.tYears;
  const vol = p.sigma * Math.sqrt(p.tYears);

  const pls = new Float64Array(N);
  let profit = 0, loss = 0, zero = 0, sum = 0;

  for (let i = 0; i < N; i++) {
    const z = normal();
    const sT = p.spot * Math.exp(drift + vol * z);
    const pl = plAtExpiration(p.legs, sT);
    pls[i] = pl;
    sum += pl;
    if (pl > 0) profit++;
    else if (pl < 0) loss++;
    else zero++;
  }

  const probProfit = profit / N;
  const probLoss = loss / N;
  const probZero = zero / N;
  const expectedPL = sum / N;

  const sorted = Array.from(pls).sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const p5 = percentile(sorted, 0.05);
  const p95 = percentile(sorted, 0.95);

  const se = Math.sqrt((probProfit * (1 - probProfit)) / N);
  const ci95Prob: [number, number] = [
    Math.max(0, probProfit - 1.96 * se),
    Math.min(1, probProfit + 1.96 * se),
  ];

  // Histogram: 40 bins across [p1, p99] to avoid outlier squashing.
  const lo = percentile(sorted, 0.01), hi = percentile(sorted, 0.99);
  const bins = 40;
  const width = (hi - lo) / bins || 1;
  const hist = Array.from({ length: bins }, (_, k) => ({ bin: lo + k * width, count: 0 }));
  for (const v of pls) {
    let idx = Math.floor((v - lo) / width);
    idx = Math.max(0, Math.min(bins - 1, idx));
    hist[idx]!.count++;
  }

  return {
    simulations: N,
    seed: p.seed,
    probProfit, probLoss, probZero,
    expectedPL: Number(expectedPL.toFixed(2)),
    median: Number(median.toFixed(2)),
    p5: Number(p5.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    stdErrorProb: se,
    ci95Prob,
    histogram: hist,
    driftUsed: mu,
    note:
      "GBM with fixed volatility. Real volatility, rates, and liquidity change. " +
      "Probabilities are model estimates, not guarantees.",
  };
}


/* ============================================================================
   ===== FILE: src/workers/mc.worker.ts =====
   Web Worker wrapper so a 20k+ simulation never blocks the UI thread.
   Usage (client): new Worker(new URL("../workers/mc.worker.ts", import.meta.url))
   ============================================================================ */

/// <reference lib="webworker" />
import { runMonteCarlo, type MCParams, type MCResult } from "../domain/montecarlo";

export type MCRequest = { id: string; params: MCParams };
export type MCResponse = { id: string; result: MCResult };

self.onmessage = (e: MessageEvent<MCRequest>) => {
  const { id, params } = e.data;
  const result = runMonteCarlo(params);
  const msg: MCResponse = { id, result };
  (self as unknown as Worker).postMessage(msg);
};


/* ============================================================================
   ===== FILE: src/domain/runMcClient.ts =====
   Promise-based helper to call the worker from React. Falls back to inline
   execution during SSR / tests where Worker is unavailable.
   ============================================================================ */

import { runMonteCarlo, type MCParams, type MCResult } from "./montecarlo";

export function runMcClient(params: MCParams): Promise<MCResult> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return Promise.resolve(runMonteCarlo(params)); // SSR/test fallback
  }
  return new Promise((resolve) => {
    const worker = new Worker(new URL("../workers/mc.worker.ts", import.meta.url), {
      type: "module",
    });
    const id = Math.random().toString(36).slice(2);
    worker.onmessage = (e: MessageEvent<{ id: string; result: MCResult }>) => {
      if (e.data.id === id) {
        resolve(e.data.result);
        worker.terminate();
      }
    };
    worker.postMessage({ id, params });
  });
}
