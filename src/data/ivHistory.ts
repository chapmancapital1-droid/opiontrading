/**
 * IV history — pure, DOM-free core.
 *
 * Stores a daily ATM implied-vol snapshot per underlying and derives the
 * IV rank / percentile signals the market-context engine (Phase 3) and the
 * strategy selector (Phase 4) condition on.
 *
 * This module holds *only* pure functions and types so it is unit-testable in
 * a Node environment. Browser persistence lives in `ivHistoryStore.ts`.
 *
 * Conventions:
 *  - `atmIv` and `spot` are decimals/prices as returned by the data layer
 *    (e.g. 0.28 = 28% IV).
 *  - IV rank / percentile are returned in [0, 1] where 1 = highest IV.
 */

export interface IvSnapshot {
  /** Calendar day key, YYYY-MM-DD. At most one snapshot per day per symbol. */
  date: string;
  /** ATM implied vol for that day, decimal (0.28 = 28%). */
  atmIv: number;
  /** Underlying price that day, when available — powers the spot-trend signal. */
  spot?: number;
}

export interface IvHistorySummary {
  /** Number of snapshots in the lookback window. */
  count: number;
  /** Latest ATM IV (decimal). */
  current: number;
  /** Lowest ATM IV in the window. */
  min: number;
  /** Highest ATM IV in the window. */
  max: number;
  /** (current - min) / (max - min), clamped to [0, 1]. */
  ivRank: number;
  /** Fraction of days with IV <= current, in [0, 1]. */
  ivPercentile: number;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Normalize a Date or ISO-ish string to a YYYY-MM-DD day key (UTC). */
export function toDateKey(d: Date | string): string {
  if (typeof d === "string") {
    if (DATE_KEY.test(d)) return d;
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) throw new Error(`invalid date: ${d}`);
    return parsed.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Insert or replace the snapshot for its day, returning a new array sorted by
 * date ascending. Same-day writes upsert (last write wins) so intraday reloads
 * don't inflate the sample.
 */
export function upsertSnapshot(history: readonly IvSnapshot[], snap: IvSnapshot): IvSnapshot[] {
  const date = toDateKey(snap.date);
  const clean: IvSnapshot = { date, atmIv: snap.atmIv, ...(snap.spot != null ? { spot: snap.spot } : {}) };
  const next = history.filter((h) => h.date !== date);
  next.push(clean);
  next.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return next;
}

/** Cap history to the most recent `maxDays` snapshots (default ≈ 2 trading years). */
export function pruneHistory(history: readonly IvSnapshot[], maxDays = 504): IvSnapshot[] {
  if (history.length <= maxDays) return history.slice();
  return history.slice(history.length - maxDays);
}

/** Finite ATM-IV values in chronological order. */
function ivValues(history: readonly IvSnapshot[]): number[] {
  return history.map((h) => h.atmIv).filter((v) => Number.isFinite(v));
}

/**
 * IV rank: where `current` sits between the window low and high, in [0, 1].
 * Returns null when there is no usable range (fewer than 2 points, or a flat
 * series where min === max).
 */
export function computeIvRank(values: readonly number[], current: number): number | null {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2 || !Number.isFinite(current)) return null;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max - min <= 0) return null;
  const rank = (current - min) / (max - min);
  return Math.min(1, Math.max(0, rank));
}

/**
 * IV percentile: fraction of days with IV <= `current`, in [0, 1].
 * Returns null when there are no observations.
 */
export function computeIvPercentile(values: readonly number[], current: number): number | null {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0 || !Number.isFinite(current)) return null;
  const atOrBelow = finite.filter((v) => v <= current).length;
  return atOrBelow / finite.length;
}

/**
 * Summarize a history series. `current` defaults to the most recent snapshot's
 * ATM IV. Returns null when the series is empty. IV rank falls back to the
 * percentile when the range is degenerate so callers always get a number.
 */
export function summarizeIvHistory(
  history: readonly IvSnapshot[],
  current?: number
): IvHistorySummary | null {
  const values = ivValues(history);
  if (values.length === 0) return null;
  const last = values[values.length - 1]!;
  const cur = current != null && Number.isFinite(current) ? current : last;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rank = computeIvRank(values, cur);
  const pct = computeIvPercentile(values, cur) ?? 0.5;
  return {
    count: values.length,
    current: cur,
    min,
    max,
    ivRank: rank ?? pct,
    ivPercentile: pct,
  };
}
