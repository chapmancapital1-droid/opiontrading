/** Pure series math used by the NCI TA TypeScript port (no DOM). */

export function ema(values: readonly number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (period < 1 || values.length === 0) return out;
  const k = 2 / (period + 1);
  let prev = values[0]!;
  out[0] = prev;
  for (let i = 1; i < values.length; i++) {
    prev = values[i]! * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function sma(values: readonly number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function rsi(closes: readonly number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  if (closes.length < period + 1) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!;
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function atr(
  high: readonly number[],
  low: readonly number[],
  close: readonly number[],
  period = 14
): number[] {
  const tr = new Array<number>(close.length).fill(0);
  for (let i = 0; i < close.length; i++) {
    if (i === 0) {
      tr[i] = high[i]! - low[i]!;
      continue;
    }
    const hl = high[i]! - low[i]!;
    const hc = Math.abs(high[i]! - close[i - 1]!);
    const lc = Math.abs(low[i]! - close[i - 1]!);
    tr[i] = Math.max(hl, hc, lc);
  }
  return sma(tr, period);
}

export function macd(
  closes: readonly number[],
  fast = 12,
  slow = 26,
  signal = 9
): { main: number[]; signal: number[]; hist: number[] } {
  const ef = ema(closes, fast);
  const es = ema(closes, slow);
  const main = closes.map((_, i) => ef[i]! - es[i]!);
  const sig = ema(main.map((v) => (Number.isFinite(v) ? v : 0)), signal);
  const hist = main.map((v, i) => v - sig[i]!);
  return { main, signal: sig, hist };
}

/** Stochastic %K then optional SMA for %D. */
export function stochK(
  high: readonly number[],
  low: readonly number[],
  close: readonly number[],
  period = 14
): number[] {
  const out = new Array<number>(close.length).fill(NaN);
  for (let i = period - 1; i < close.length; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hh = Math.max(hh, high[j]!);
      ll = Math.min(ll, low[j]!);
    }
    const den = hh - ll;
    out[i] = den === 0 ? 50 : (100 * (close[i]! - ll)) / den;
  }
  return out;
}

export function cci(
  high: readonly number[],
  low: readonly number[],
  close: readonly number[],
  period = 14
): number[] {
  const tp = close.map((c, i) => (high[i]! + low[i]! + c) / 3);
  const mid = sma(tp, period);
  const out = new Array<number>(close.length).fill(NaN);
  for (let i = period - 1; i < close.length; i++) {
    let mad = 0;
    for (let j = i - period + 1; j <= i; j++) mad += Math.abs(tp[j]! - mid[i]!);
    mad /= period;
    out[i] = mad === 0 ? 0 : (tp[i]! - mid[i]!) / (0.015 * mad);
  }
  return out;
}

export function highest(values: readonly number[], period: number, end: number): number {
  let h = -Infinity;
  const start = Math.max(0, end - period + 1);
  for (let i = start; i <= end; i++) h = Math.max(h, values[i]!);
  return h;
}

export function lowest(values: readonly number[], period: number, end: number): number {
  let l = Infinity;
  const start = Math.max(0, end - period + 1);
  for (let i = start; i <= end; i++) l = Math.min(l, values[i]!);
  return l;
}

export function lastFinite(series: readonly number[], idx: number): number {
  const v = series[idx];
  return v != null && Number.isFinite(v) ? v : 0;
}

export function momentum(closes: readonly number[], period: number): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  for (let i = period; i < closes.length; i++) {
    out[i] = closes[i]! - closes[i - period]!;
  }
  return out;
}

/** Wilder-style ADX approximation via DX of +DM/-DM. */
export function adxApprox(
  high: readonly number[],
  low: readonly number[],
  close: readonly number[],
  period = 14
): number[] {
  const n = close.length;
  const out = new Array<number>(n).fill(NaN);
  if (n < period + 2) return out;
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];
  for (let i = 1; i < n; i++) {
    const up = high[i]! - high[i - 1]!;
    const down = low[i - 1]! - low[i]!;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
    const hl = high[i]! - low[i]!;
    const hc = Math.abs(high[i]! - close[i - 1]!);
    const lc = Math.abs(low[i]! - close[i - 1]!);
    tr.push(Math.max(hl, hc, lc));
  }
  // simple rolling means as ADX proxy
  const atrS = sma(tr, period);
  const pdiS = sma(plusDM, period);
  const mdiS = sma(minusDM, period);
  for (let i = 0; i < atrS.length; i++) {
    const a = atrS[i]!;
    if (!Number.isFinite(a) || a === 0) continue;
    const pdi = (100 * pdiS[i]!) / a;
    const mdi = (100 * mdiS[i]!) / a;
    const den = pdi + mdi;
    const dx = den === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / den;
    out[i + 1] = dx; // aligned roughly to bar index
  }
  // smooth dx into adx
  const dxVals = out.map((v) => (Number.isFinite(v) ? v : 0));
  const adxS = sma(dxVals, period);
  for (let i = 0; i < n; i++) out[i] = adxS[i] ?? out[i]!;
  return out;
}
