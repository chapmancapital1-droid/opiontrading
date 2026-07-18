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
