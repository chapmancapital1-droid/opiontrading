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
