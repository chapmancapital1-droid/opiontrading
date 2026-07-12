/**
 * IV history — browser persistence.
 *
 * MVP storage is localStorage, keyed per underlying, so IV rank/percentile
 * survive reloads without a backend. The read/write surface is intentionally
 * tiny and JSON-shaped so it can be swapped for a DB (Supabase is already wired
 * elsewhere) without touching callers.
 */

import { pruneHistory, toDateKey, upsertSnapshot, type IvSnapshot } from "./ivHistory";

const KEY_PREFIX = "optionscope:ivhistory:v1:";

function keyFor(symbol: string): string {
  return KEY_PREFIX + symbol.trim().toUpperCase();
}

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

/** Read the stored history for a symbol (chronological). Empty when absent/SSR. */
export function readIvHistory(symbol: string): IvSnapshot[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(keyFor(symbol));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is IvSnapshot =>
        !!x && typeof x === "object" &&
        typeof (x as IvSnapshot).date === "string" &&
        typeof (x as IvSnapshot).atmIv === "number"
      )
      .map((x) => ({ date: x.date, atmIv: x.atmIv, ...(x.spot != null ? { spot: x.spot } : {}) }));
  } catch {
    return [];
  }
}

function writeIvHistory(symbol: string, history: readonly IvSnapshot[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(keyFor(symbol), JSON.stringify(history));
  } catch {
    /* quota / private-mode — history is best-effort */
  }
}

/**
 * Record today's ATM IV snapshot for a symbol (upsert by day) and return the
 * updated, pruned history. `spot` is optional and feeds the spot-trend signal.
 */
export function recordIvSnapshot(
  symbol: string,
  atmIv: number,
  opts?: { spot?: number; date?: string }
): IvSnapshot[] {
  const existing = readIvHistory(symbol);
  if (!Number.isFinite(atmIv)) return existing;
  const date = opts?.date ? toDateKey(opts.date) : toDateKey(new Date());
  const snap: IvSnapshot = { date, atmIv, ...(opts?.spot != null ? { spot: opts.spot } : {}) };
  const next = pruneHistory(upsertSnapshot(existing, snap));
  writeIvHistory(symbol, next);
  return next;
}

/** Remove a symbol's stored history (useful for tests / resets). */
export function clearIvHistory(symbol: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(keyFor(symbol));
  } catch {
    /* ignore */
  }
}
