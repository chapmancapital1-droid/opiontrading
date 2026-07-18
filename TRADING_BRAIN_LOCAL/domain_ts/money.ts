import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

export type Money = Decimal;
export const D = (v: Decimal.Value): Decimal => new Decimal(v);
export const ZERO = D(0);

export const add = (...xs: Decimal.Value[]): Decimal =>
  xs.reduce<Decimal>((a, b) => a.plus(b), ZERO);
export const sub = (a: Decimal.Value, b: Decimal.Value): Decimal => D(a).minus(b);
export const mul = (...xs: Decimal.Value[]): Decimal =>
  xs.reduce<Decimal>((a, b) => a.times(b), D(1));
export const div = (a: Decimal.Value, b: Decimal.Value): Decimal => D(a).div(b);
export const neg = (a: Decimal.Value): Decimal => D(a).neg();
export const maxD = (a: Decimal.Value, b: Decimal.Value): Decimal =>
  Decimal.max(D(a), D(b));
export const minD = (a: Decimal.Value, b: Decimal.Value): Decimal =>
  Decimal.min(D(a), D(b));

/** Intrinsic payoff of one long option contract-share at price s. */
export const intrinsicCall = (s: Decimal.Value, k: Decimal.Value): Decimal =>
  maxD(sub(s, k), ZERO);
export const intrinsicPut = (s: Decimal.Value, k: Decimal.Value): Decimal =>
  maxD(sub(k, s), ZERO);

export const toNumber = (a: Decimal.Value): number => D(a).toNumber();

/** Presentation-layer formatting only. */
export const fmtUSD = (a: Decimal.Value, dp = 2): string => {
  const n = D(a).toDecimalPlaces(dp, Decimal.ROUND_HALF_EVEN);
  const sign = n.isNegative() ? "-" : "";
  const abs = n.abs().toFixed(dp);
  const [intPart, frac] = abs.split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${withCommas}${frac ? "." + frac : ""}`;
};

export const fmtPct = (frac01: number, dp = 1): string =>
  `${(frac01 * 100).toFixed(dp)}%`;
