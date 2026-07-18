/**
 * Hive Brain — cumulative knowledge from successful Evolve Lab runs.
 *
 * Successful synthetic champions update:
 *   - strategy win-rate rollups
 *   - improvement lessons (process notes for the empire companion)
 *   - append-only run log
 *
 * Files under src/knowledge/catalog/hive/ are meant to be committed to GitHub
 * so every install and push grows shared option-trading knowledge.
 *
 * Educational synthetic lab only — not live fill statistics.
 */

export const HIVE_VERSION = "HIVE-1.0.0";

/** Thresholds for “successful” evolve (ingested into hive). */
export const HIVE_SUCCESS = {
  minWinRate: 0.48,
  minSharpe: 0.15,
  minTrades: 8,
  minStatisticalEdge: 0.02,
  maxDrawdown: 0.45,
} as const;

export type HiveChampionMetrics = {
  strategyId: string;
  strategyLabel?: string;
  dte: number;
  ticker: string;
  sharpe: number;
  sortino: number;
  maxDD: number;
  winRate: number;
  trades: number;
  totalReturn: number;
  profitFactor: number;
  statisticalEdge: number;
  kellyOptimal: number;
  expectedValue: number;
  fitnessComposite?: number;
  marketYears?: number;
  evalYears?: number;
  generations?: number;
  populationSize?: number;
  seed?: number;
  regimeResults?: Record<
    string,
    { trades?: number; winRate?: number; avgPnL?: number; totalPnL?: number }
  >;
};

export type HiveRunRecord = {
  id: string;
  at: string;
  success: true;
  source: "evolve_lab";
  metrics: HiveChampionMetrics;
  lessons: string[];
};

export type StrategyWinRateRow = {
  strategyId: string;
  runs: number;
  totalTrades: number;
  /** Volume-weighted average win rate across successful runs */
  avgWinRate: number;
  bestWinRate: number;
  worstWinRate: number;
  avgSharpe: number;
  bestSharpe: number;
  avgStatisticalEdge: number;
  avgMaxDD: number;
  lastRunAt: string;
  preferredDtes: number[];
  tickersSeen: string[];
  notes: string[];
};

export type HiveBrainDoc = {
  version: string;
  updatedAt: string;
  totalSuccessfulRuns: number;
  totalRejectedRuns: number;
  strategies: Record<string, StrategyWinRateRow>;
  /** Top lessons distilled for the companion (newest first, capped) */
  improvementLessons: string[];
  lastChampion?: {
    strategyId: string;
    ticker: string;
    dte: number;
    winRate: number;
    sharpe: number;
    statisticalEdge: number;
    at: string;
  };
  doctrine: string[];
};

export type IngestResult =
  | {
      ok: true;
      ingested: true;
      runId: string;
      lessons: string[];
      strategy: StrategyWinRateRow;
      reason: string;
    }
  | {
      ok: true;
      ingested: false;
      reason: string;
      failures: string[];
    };

export function emptyHiveBrain(): HiveBrainDoc {
  return {
    version: HIVE_VERSION,
    updatedAt: new Date(0).toISOString(),
    totalSuccessfulRuns: 0,
    totalRejectedRuns: 0,
    strategies: {},
    improvementLessons: [],
    doctrine: [
      "Hive metrics are from SYNTHETIC evolve runs — not Robinhood fill history.",
      "Use win-rate trends for process preference, not as live PoP guarantees.",
      "Always size real capital in Trade Lab under empire seed ceilings.",
      "Push catalog/hive/*.json to GitHub so installs share cumulative knowledge.",
    ],
  };
}

export function evaluateHiveSuccess(m: HiveChampionMetrics): {
  success: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  if (!(m.winRate >= HIVE_SUCCESS.minWinRate)) {
    failures.push(
      `winRate ${(m.winRate * 100).toFixed(1)}% < ${(HIVE_SUCCESS.minWinRate * 100).toFixed(0)}%`,
    );
  }
  if (!(m.sharpe >= HIVE_SUCCESS.minSharpe)) {
    failures.push(`sharpe ${m.sharpe.toFixed(2)} < ${HIVE_SUCCESS.minSharpe}`);
  }
  if (!(m.trades >= HIVE_SUCCESS.minTrades)) {
    failures.push(`trades ${m.trades} < ${HIVE_SUCCESS.minTrades}`);
  }
  if (!(m.statisticalEdge >= HIVE_SUCCESS.minStatisticalEdge)) {
    failures.push(
      `edge ${(m.statisticalEdge * 100).toFixed(1)}% < ${(HIVE_SUCCESS.minStatisticalEdge * 100).toFixed(0)}%`,
    );
  }
  if (!(m.maxDD <= HIVE_SUCCESS.maxDrawdown)) {
    failures.push(
      `maxDD ${(m.maxDD * 100).toFixed(1)}% > ${(HIVE_SUCCESS.maxDrawdown * 100).toFixed(0)}%`,
    );
  }
  return { success: failures.length === 0, failures };
}

export function distillLessons(m: HiveChampionMetrics): string[] {
  const lessons: string[] = [];
  const wr = (m.winRate * 100).toFixed(0);
  const sh = m.sharpe.toFixed(2);
  lessons.push(
    `[${m.strategyId} · ${m.ticker} · ${m.dte}DTE] synthetic WR ${wr}% · Sharpe ${sh} · trades ${m.trades}`,
  );
  if (m.winRate >= 0.55 && m.maxDD <= 0.25) {
    lessons.push(
      `${m.strategyId}: high win-rate + controlled DD in lab — prefer defined-risk variants at seed capital.`,
    );
  }
  if (m.statisticalEdge >= 0.08) {
    lessons.push(
      `${m.strategyId}: lab edge ${(m.statisticalEdge * 100).toFixed(1)}% — keep entry selectivity; still validate on live chain.`,
    );
  }
  if (m.kellyOptimal > 0 && m.kellyOptimal < 0.25) {
    lessons.push(
      `${m.strategyId}: lab Kelly ~${(m.kellyOptimal * 100).toFixed(0)}% — size below Kelly for real capital.`,
    );
  }
  if (m.maxDD > 0.3) {
    lessons.push(
      `${m.strategyId}: lab DD ${(m.maxDD * 100).toFixed(0)}% — tighten stops / width before live use.`,
    );
  }
  const regimes = m.regimeResults ?? {};
  const weak = Object.entries(regimes).filter(([, r]) => (r?.avgPnL ?? 0) < 0);
  if (weak.length > 0) {
    lessons.push(
      `${m.strategyId}: weak lab regimes: ${weak.map(([k]) => k).join(", ")} — avoid forcing that structure there.`,
    );
  }
  return lessons.slice(0, 6);
}

function uniqCap(arr: string[], cap: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of arr) {
    const t = s.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

export function mergeSuccessfulRun(
  brain: HiveBrainDoc,
  metrics: HiveChampionMetrics,
  atIso: string,
  runId: string,
): { brain: HiveBrainDoc; run: HiveRunRecord; lessons: string[] } {
  const lessons = distillLessons(metrics);
  const prev = brain.strategies[metrics.strategyId];
  const runs = (prev?.runs ?? 0) + 1;
  const totalTrades = (prev?.totalTrades ?? 0) + Math.max(0, metrics.trades);
  const prevWR = prev?.avgWinRate ?? metrics.winRate;
  const prevN = prev?.runs ?? 0;
  // Exponential-ish blend then stabilize with trade weighting
  const avgWinRate =
    totalTrades > 0
      ? ((prev?.avgWinRate ?? 0) * (prev?.totalTrades ?? 0) +
          metrics.winRate * metrics.trades) /
        totalTrades
      : (prevWR * prevN + metrics.winRate) / runs;
  const avgSharpe =
    ((prev?.avgSharpe ?? 0) * prevN + metrics.sharpe) / runs;
  const avgEdge =
    ((prev?.avgStatisticalEdge ?? 0) * prevN + metrics.statisticalEdge) / runs;
  const avgMaxDD = ((prev?.avgMaxDD ?? 0) * prevN + metrics.maxDD) / runs;

  const preferredDtes = uniqCap(
    [...(prev?.preferredDtes.map(String) ?? []), String(metrics.dte)],
    8,
  ).map((d) => Number(d));

  const row: StrategyWinRateRow = {
    strategyId: metrics.strategyId,
    runs,
    totalTrades,
    avgWinRate,
    bestWinRate: Math.max(prev?.bestWinRate ?? 0, metrics.winRate),
    worstWinRate:
      prev && prev.runs > 0
        ? Math.min(prev.worstWinRate, metrics.winRate)
        : metrics.winRate,
    avgSharpe,
    bestSharpe: Math.max(prev?.bestSharpe ?? Number.NEGATIVE_INFINITY, metrics.sharpe),
    avgStatisticalEdge: avgEdge,
    avgMaxDD,
    lastRunAt: atIso,
    preferredDtes,
    tickersSeen: uniqCap([...(prev?.tickersSeen ?? []), metrics.ticker], 24),
    notes: uniqCap([...(prev?.notes ?? []), ...lessons], 12),
  };

  const next: HiveBrainDoc = {
    ...brain,
    version: HIVE_VERSION,
    updatedAt: atIso,
    totalSuccessfulRuns: brain.totalSuccessfulRuns + 1,
    strategies: { ...brain.strategies, [metrics.strategyId]: row },
    improvementLessons: uniqCap([...lessons, ...brain.improvementLessons], 80),
    lastChampion: {
      strategyId: metrics.strategyId,
      ticker: metrics.ticker,
      dte: metrics.dte,
      winRate: metrics.winRate,
      sharpe: metrics.sharpe,
      statisticalEdge: metrics.statisticalEdge,
      at: atIso,
    },
    doctrine: brain.doctrine?.length ? brain.doctrine : emptyHiveBrain().doctrine,
  };

  const run: HiveRunRecord = {
    id: runId,
    at: atIso,
    success: true,
    source: "evolve_lab",
    metrics,
    lessons,
  };

  return { brain: next, run, lessons };
}

export function applyRejected(brain: HiveBrainDoc, atIso: string): HiveBrainDoc {
  return {
    ...brain,
    updatedAt: atIso,
    totalRejectedRuns: brain.totalRejectedRuns + 1,
  };
}

/** Lightweight lookup for UI / soft ranking notes */
export function getStrategyHiveNote(
  brain: HiveBrainDoc,
  strategyId: string,
): string | null {
  const row = brain.strategies[strategyId];
  if (!row || row.runs < 1) return null;
  return `Hive lab (${row.runs} runs): avg WR ${(row.avgWinRate * 100).toFixed(0)}% · best WR ${(row.bestWinRate * 100).toFixed(0)}% · avg Sharpe ${row.avgSharpe.toFixed(2)} · last ${row.lastRunAt.slice(0, 10)}`;
}

export function strategyWinRatesExport(
  brain: HiveBrainDoc,
): {
  version: string;
  updatedAt: string;
  totalSuccessfulRuns: number;
  strategies: StrategyWinRateRow[];
} {
  const strategies = Object.values(brain.strategies).sort(
    (a, b) => b.avgWinRate - a.avgWinRate || b.runs - a.runs,
  );
  return {
    version: brain.version,
    updatedAt: brain.updatedAt,
    totalSuccessfulRuns: brain.totalSuccessfulRuns,
    strategies,
  };
}
