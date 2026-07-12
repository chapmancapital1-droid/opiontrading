import type { TradeRow } from "./types";

export interface Bin {
  label: string;
  lo: number; hi: number;
  predictedAvg: number;   // avg forecast PoP in this bin
  observedRate: number;   // fraction that actually profited
  n: number;
  wilsonLow: number;      // 95% Wilson lower bound on observed rate
  wilsonHigh: number;
}

export interface JournalStats {
  totalTrades: number;
  closedTrades: number;
  winRate: number | null;
  avgProfit: number | null;      // avg of positive realized P/L
  avgLoss: number | null;        // avg of negative realized P/L
  avgExpectedValueAtEntry: number | null;
  avgPredictedPoP: number | null;
  avgRealizedPL: number | null;
  byStrategy: { strategy: string; n: number; winRate: number | null; avgPL: number | null }[];
  byDTE: { bucket: string; n: number; winRate: number | null }[];
  calibration: Bin[];
  sampleWarning: string;
}

function wilson(p: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.96, z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

const isWin = (t: TradeRow) => (t.realized_pl ?? 0) > 0;
const isClosed = (t: TradeRow) =>
  ["closed", "expired", "exercised", "assigned"].includes(t.state);

export function computeJournalStats(trades: TradeRow[]): JournalStats {
  const closed = trades.filter(isClosed).filter((t) => t.realized_pl != null);
  const wins = closed.filter(isWin);
  const losses = closed.filter((t) => (t.realized_pl ?? 0) < 0);

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  // by strategy
  const stratMap = new Map<string, TradeRow[]>();
  for (const t of closed) {
    const a = stratMap.get(t.strategy) ?? [];
    a.push(t); stratMap.set(t.strategy, a);
  }
  const byStrategy = [...stratMap.entries()].map(([strategy, ts]) => ({
    strategy, n: ts.length,
    winRate: ts.length ? ts.filter(isWin).length / ts.length : null,
    avgPL: avg(ts.map((t) => t.realized_pl!)),
  }));

  // by DTE bucket (uses planned_exit_date vs opened_at as a rough proxy)
  const dteBucket = (t: TradeRow): string => {
    if (!t.planned_exit_date || !t.opened_at) return "unknown";
    const d = Math.round(
      (new Date(t.planned_exit_date).getTime() - new Date(t.opened_at).getTime()) / 864e5
    );
    if (d <= 7) return "0–7";
    if (d <= 21) return "8–21";
    if (d <= 45) return "22–45";
    return "45+";
  };
  const dteMap = new Map<string, TradeRow[]>();
  for (const t of closed) {
    const b = dteBucket(t);
    const a = dteMap.get(b) ?? []; a.push(t); dteMap.set(b, a);
  }
  const byDTE = [...dteMap.entries()].map(([bucket, ts]) => ({
    bucket, n: ts.length,
    winRate: ts.length ? ts.filter(isWin).length / ts.length : null,
  }));

  // calibration bins: predicted PoP vs observed win frequency
  const edges = [0, 0.2, 0.4, 0.6, 0.8, 1.01];
  const calibration: Bin[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i]!, hi = edges[i + 1]!;
    const inBin = closed.filter((t) => {
      const p = t.forecast.probProfit;
      return p >= lo && p < hi;
    });
    const observed = inBin.length ? inBin.filter(isWin).length / inBin.length : 0;
    const [wl, wh] = wilson(observed, inBin.length);
    calibration.push({
      label: `${Math.round(lo * 100)}–${Math.round(Math.min(hi, 1) * 100)}%`,
      lo, hi,
      predictedAvg: inBin.length ? avg(inBin.map((t) => t.forecast.probProfit))! : 0,
      observedRate: observed,
      n: inBin.length,
      wilsonLow: wl, wilsonHigh: wh,
    });
  }

  const sampleWarning =
    closed.length < 30
      ? `Only ${closed.length} closed trade(s). This is far too few to judge whether the probability model is accurate — treat all rates below as noisy.`
      : `${closed.length} closed trades. Calibration is still an estimate; wide Wilson intervals mean low confidence in that bin.`;

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    winRate: closed.length ? wins.length / closed.length : null,
    avgProfit: avg(wins.map((t) => t.realized_pl!)),
    avgLoss: avg(losses.map((t) => t.realized_pl!)),
    avgExpectedValueAtEntry: avg(trades.map((t) => t.forecast.expectedPL)),
    avgPredictedPoP: avg(trades.map((t) => t.forecast.probProfit)),
    avgRealizedPL: avg(closed.map((t) => t.realized_pl!)),
    byStrategy, byDTE, calibration, sampleWarning,
  };
}
