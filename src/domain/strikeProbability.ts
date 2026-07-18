/**
 * Probability that spot hits / finishes beyond a chosen strike by expiration.
 * Educational Black–Scholes style metrics — not investment advice.
 *
 * - finishAbove / finishBelow: risk-neutral P(S_T ≷ K) via N(±d2)
 * - touch: continuous GBM barrier probability of ever reaching K by T
 */

import { normCdf } from "./normal";

export type HitScoreLevel =
  | "very_low"
  | "low"
  | "moderate"
  | "high"
  | "very_high";

export type HitTone = "green" | "amber" | "red";

export interface StrikeProbabilityInput {
  spot: number;
  strike: number;
  /** Years to expiration */
  tYears: number;
  /** IV as decimal (0.30 = 30%) */
  sigma: number;
  r?: number;
  q?: number;
}

export interface StrikeProbabilityResult {
  spot: number;
  strike: number;
  direction: "up" | "down" | "at";
  /** P(S_T >= K) risk-neutral */
  finishAbove: number;
  /** P(S_T <= K) risk-neutral */
  finishBelow: number;
  /** P(path touches K by T) continuous barrier approx */
  touch: number;
  /** Primary “will it hit” score = touch (capped [0,1]) */
  hitScore: number;
  level: HitScoreLevel;
  tone: HitTone;
  /** Human label for the box */
  levelLabel: string;
  note: string;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/** Score bands for UI green/red. */
export function scoreLevel(p: number): {
  level: HitScoreLevel;
  tone: HitTone;
  levelLabel: string;
} {
  const hit = clamp01(p);
  if (hit >= 0.75)
    return { level: "very_high", tone: "green", levelLabel: "Very high — likely to touch" };
  if (hit >= 0.55)
    return { level: "high", tone: "green", levelLabel: "High — more likely than not" };
  if (hit >= 0.4)
    return { level: "moderate", tone: "amber", levelLabel: "Moderate — coin-flip zone" };
  if (hit >= 0.2)
    return { level: "low", tone: "red", levelLabel: "Low — unlikely to touch" };
  return { level: "very_low", tone: "red", levelLabel: "Very low — far OTM stretch" };
}

/**
 * Continuous barrier: P( max path reaches K ) for K > S, or P( min path reaches K ) for K < S.
 * Risk-neutral drift μ = r − q − σ²/2.
 * @see standard GBM first-passage formulas
 */
export function probabilityOfTouch(args: {
  spot: number;
  strike: number;
  tYears: number;
  sigma: number;
  r?: number;
  q?: number;
}): number {
  const S = args.spot;
  const K = args.strike;
  const T = args.tYears;
  const sigma = args.sigma;
  const r = args.r ?? 0.045;
  const q = args.q ?? 0;

  if (!(S > 0) || !(K > 0) || !(T > 0) || !(sigma > 0)) return 0;
  if (Math.abs(S - K) / S < 1e-9) return 1; // already at strike

  const vol = sigma * Math.sqrt(T);
  const mu = r - q - 0.5 * sigma * sigma; // GBM drift of log S
  const x = Math.log(K / S);

  // Upper barrier K > S
  if (K > S) {
    const d = (-x + mu * T) / vol;
    const d2 = (-x - mu * T) / vol;
    const expTerm = Math.exp((2 * mu * x) / (sigma * sigma));
    return clamp01(normCdf(d) + expTerm * normCdf(d2));
  }

  // Lower barrier K < S  (symmetric via reflection)
  const xDown = Math.log(S / K); // positive
  const d = (-xDown + mu * T) / vol;
  const d2 = (-xDown - mu * T) / vol;
  // For down barrier use −μ in the exponential for the reflection term carefully:
  // P(min <= K) = N( (ln(K/S) - μT)/(σ√T) ) + (K/S)^{2μ/σ²} N( (ln(K/S) + μT)/(σ√T) )
  const z1 = (Math.log(K / S) - mu * T) / vol;
  const z2 = (Math.log(K / S) + mu * T) / vol;
  const power = Math.exp((2 * mu * Math.log(K / S)) / (sigma * sigma));
  return clamp01(normCdf(z1) + power * normCdf(z2));
}

/** Risk-neutral P(S_T > K) = N(d2) for the forward under BS. */
export function probabilityFinishAbove(args: {
  spot: number;
  strike: number;
  tYears: number;
  sigma: number;
  r?: number;
  q?: number;
}): number {
  const S = args.spot;
  const K = args.strike;
  const T = args.tYears;
  const sigma = args.sigma;
  const r = args.r ?? 0.045;
  const q = args.q ?? 0;
  if (!(S > 0) || !(K > 0) || !(T > 0) || !(sigma > 0)) return S >= K ? 1 : 0;
  const vol = sigma * Math.sqrt(T);
  const d2 =
    (Math.log(S / K) + (r - q - 0.5 * sigma * sigma) * T) / vol;
  return clamp01(normCdf(d2));
}

export function computeStrikeProbability(
  input: StrikeProbabilityInput
): StrikeProbabilityResult {
  const { spot, strike, tYears, sigma } = input;
  const r = input.r ?? 0.045;
  const q = input.q ?? 0;

  const finishAbove = probabilityFinishAbove({ spot, strike, tYears, sigma, r, q });
  const finishBelow = clamp01(1 - finishAbove);
  const touch = probabilityOfTouch({ spot, strike, tYears, sigma, r, q });

  const direction: StrikeProbabilityResult["direction"] =
    Math.abs(spot - strike) / Math.max(spot, 1) < 0.001
      ? "at"
      : strike > spot
        ? "up"
        : "down";

  const hitScore = touch;
  const { level, tone, levelLabel } = scoreLevel(hitScore);

  const note =
    direction === "at"
      ? "Spot is already at the strike — touch ≈ 100%."
      : direction === "up"
        ? `Up-move: chance of trading at or above $${strike.toFixed(2)} by expiry (touch).`
        : `Down-move: chance of trading at or below $${strike.toFixed(2)} by expiry (touch).`;

  return {
    spot,
    strike,
    direction,
    finishAbove,
    finishBelow,
    touch,
    hitScore,
    level,
    tone,
    levelLabel,
    note,
  };
}
