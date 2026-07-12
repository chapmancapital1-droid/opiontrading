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
