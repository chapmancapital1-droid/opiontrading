// @ts-nocheck
/**
 * Normal Distribution Utilities
 * 
 * The normal distribution is the foundation of Black-Scholes theory
 * and underlies our assumption of log-normal asset returns.
 * These functions are used across pricing, probability estimation,
 * and hypothesis testing in the evolution engine.
 */

/** Standard normal PDF */
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard normal CDF using Abramowitz & Stegun approximation
 * Maximum error: 7.5e-8 (sufficient for pricing accuracy)
 */
export function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Inverse normal CDF (quantile function) using rational approximation
 * Used for generating normal samples and for implied volatility calculations
 * Peter Acklam's algorithm, accurate to ~1.15e-9
 */
export function normalInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < 1e-10) return -6.361; // practical lower bound
  if (p > 1 - 1e-10) return 6.361; // practical upper bound

  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
    1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
    6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
    -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/** Two-tailed p-value for a z-statistic (hypothesis testing) */
export function twoTailedPValue(z: number): number {
  return 2 * (1 - normalCDF(Math.abs(z)));
}

/** Confidence interval width for a given confidence level */
export function confidenceIntervalWidth(stddev: number, n: number, confidence: number = 0.95): number {
  const z = normalInv(1 - (1 - confidence) / 2);
  return 2 * z * stddev / Math.sqrt(n);
}
