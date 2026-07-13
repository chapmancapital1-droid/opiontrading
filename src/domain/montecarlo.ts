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
  const span = Number.isFinite(hi - lo) ? hi - lo : 0;
  const width = span > 0 ? span / bins : 1;
  const hist = Array.from({ length: bins }, (_, k) => ({ bin: lo + k * width, count: 0 }));
  for (const v of pls) {
    if (!Number.isFinite(v)) continue;
    let idx = Math.floor((v - lo) / width);
    if (!Number.isFinite(idx)) idx = 0;
    idx = Math.max(0, Math.min(bins - 1, idx));
    const bin = hist[idx];
    if (bin) bin.count++;
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
