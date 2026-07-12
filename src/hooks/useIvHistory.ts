"use client";

/**
 * useIvHistory — query a symbol's IV history and derive IV rank / percentile.
 *
 * Reads the localStorage-backed store on mount (and when the symbol changes),
 * exposes a `record` action to append today's ATM IV snapshot, and returns
 * memoized rank/percentile helpers plus a summary. All values are in [0, 1]
 * where 1 = highest IV.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeIvPercentile,
  computeIvRank,
  summarizeIvHistory,
  type IvHistorySummary,
  type IvSnapshot,
} from "@/data/ivHistory";
import { readIvHistory, recordIvSnapshot } from "@/data/ivHistoryStore";

export interface UseIvHistory {
  /** Chronological snapshots for the symbol. */
  history: IvSnapshot[];
  /** True until the first client-side read has run (SSR-safe). */
  ready: boolean;
  /** Upsert today's ATM IV (and optional spot) for the symbol. */
  record: (atmIv: number, opts?: { spot?: number; date?: string }) => void;
  /** IV rank of `current` vs history, [0,1]; null when range is unusable. */
  ivRank: (current: number) => number | null;
  /** IV percentile of `current` vs history, [0,1]; null when empty. */
  ivPercentile: (current: number) => number | null;
  /** Convenience summary (min/max/current/rank/percentile); null when empty. */
  summary: IvHistorySummary | null;
}

export function useIvHistory(symbol: string): UseIvHistory {
  const sym = symbol.trim().toUpperCase();
  const [history, setHistory] = useState<IvSnapshot[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHistory(sym ? readIvHistory(sym) : []);
    setReady(true);
  }, [sym]);

  const record = useCallback(
    (atmIv: number, opts?: { spot?: number; date?: string }) => {
      if (!sym) return;
      setHistory(recordIvSnapshot(sym, atmIv, opts));
    },
    [sym]
  );

  const values = useMemo(() => history.map((h) => h.atmIv), [history]);

  const ivRank = useCallback((current: number) => computeIvRank(values, current), [values]);
  const ivPercentile = useCallback(
    (current: number) => computeIvPercentile(values, current),
    [values]
  );

  const summary = useMemo(() => summarizeIvHistory(history), [history]);

  return { history, ready, record, ivRank, ivPercentile, summary };
}
