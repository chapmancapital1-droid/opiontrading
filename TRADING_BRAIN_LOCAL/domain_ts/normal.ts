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
