/**
 * NCI Runner — persistent state.
 * ---------------------------------------------------------------------------
 * This file IS the continuity. The model that reasons each morning has no
 * memory of yesterday; this state is what gets loaded into its context so the
 * system behaves like it remembers. Every run reads it, appends to it, and
 * leaves it better than it found it.
 *
 * Two stores:
 *   state.json    — current account + open positions + rolling stats (mutable)
 *   journal.jsonl — append-only trade record, one JSON object per line
 *
 * The journal is append-only on purpose. A trade log you can quietly edit is
 * a trade log that will eventually flatter you.
 */

import fs from "node:fs";
import path from "node:path";
import { CONFIG, JOURNAL_FILE, LESSONS_FILE, ROOT, STATE_FILE } from "./config";

export type Side = "long" | "short";
export type TradeStatus = "open" | "closed" | "rejected";

export interface Forecast {
  /** What the brain expected, written BEFORE the outcome is known. */
  thesis: string;
  direction: "up" | "down";
  targetPrice: number;
  stopPrice: number;
  /** Model probability of hitting target before stop, 0-1. */
  probability: number;
  /** Which session and signals produced it. */
  session: string;
  signals: string[];
}

export interface TradeRecord {
  id: string;
  openedAt: string;
  closedAt?: string;
  symbol: string;
  side: Side;
  status: TradeStatus;
  mode: "paper" | "live";
  qty: number;
  entryPrice: number;
  exitPrice?: number;
  stopPrice: number;
  targetPrice: number;
  riskDollars: number;
  realizedPL?: number;
  /** Written at entry, never edited. Scored at close. */
  forecast: Forecast;
  /** Filled by the review pass. */
  outcome?: {
    hitTarget: boolean;
    hitStop: boolean;
    forecastCorrect: boolean;
    rMultiple: number;
    note: string;
  };
  rejectReason?: string;
}

export interface RunnerState {
  version: 1;
  createdAt: string;
  updatedAt: string;
  mode: "paper" | "live";
  equity: number;
  startingEquity: number;
  peakEquity: number;
  openPositions: TradeRecord[];
  /** Candidates staged by pre-market / London, consumed at the open. */
  watchlist: {
    stagedAt: string;
    session: string;
    symbol: string;
    reason: string;
    bias: "up" | "down";
  }[];
  stats: {
    tradesClosed: number;
    wins: number;
    losses: number;
    grossWin: number;
    grossLoss: number;
    dailyRealizedPL: number;
    weeklyRealizedPL: number;
    lastTradingDay: string;
  };
  halts: { code: string; until: string; reason: string }[];
}

function emptyState(): RunnerState {
  const now = new Date().toISOString();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    mode: "paper",
    equity: CONFIG.startingEquity,
    startingEquity: CONFIG.startingEquity,
    peakEquity: CONFIG.startingEquity,
    openPositions: [],
    watchlist: [],
    stats: {
      tradesClosed: 0,
      wins: 0,
      losses: 0,
      grossWin: 0,
      grossLoss: 0,
      dailyRealizedPL: 0,
      weeklyRealizedPL: 0,
      lastTradingDay: "",
    },
    halts: [],
  };
}

export function loadState(): RunnerState {
  fs.mkdirSync(ROOT, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) {
    const s = emptyState();
    saveState(s);
    return s;
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as RunnerState;
  } catch {
    // A corrupt state file must never silently reset the account history.
    const backup = path.join(ROOT, `state.corrupt.${Date.now()}.json`);
    fs.copyFileSync(STATE_FILE, backup);
    throw new Error(
      `state.json is unreadable. Backed up to ${backup}. Refusing to start with a blank history.`,
    );
  }
}

export function saveState(s: RunnerState): void {
  fs.mkdirSync(ROOT, { recursive: true });
  s.updatedAt = new Date().toISOString();
  s.peakEquity = Math.max(s.peakEquity, s.equity);
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

/** Append-only. There is no update or delete by design. */
export function appendJournal(t: TradeRecord): void {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.appendFileSync(JOURNAL_FILE, JSON.stringify(t) + "\n");
}

export function readJournal(): TradeRecord[] {
  if (!fs.existsSync(JOURNAL_FILE)) return [];
  return fs
    .readFileSync(JOURNAL_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as TradeRecord);
}

export function appendLesson(text: string): void {
  fs.mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  fs.appendFileSync(LESSONS_FILE, `\n## ${stamp}\n${text}\n`);
}

export function readLessons(limit = 4000): string {
  if (!fs.existsSync(LESSONS_FILE)) return "";
  const all = fs.readFileSync(LESSONS_FILE, "utf8");
  return all.length > limit ? all.slice(-limit) : all;
}

/* -------------------------------------------------------------------------- */
/* Derived statistics — the numbers that decide whether this system works      */
/* -------------------------------------------------------------------------- */

export interface Performance {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  /** Expected dollars per trade. Negative means the system is a leak. */
  expectancy: number;
  profitFactor: number;
  maxDrawdownPct: number;
  /** Forecast calibration: how often the written thesis was right. */
  forecastAccuracy: number;
  netPL: number;
}

export function computePerformance(state: RunnerState, journal: TradeRecord[]): Performance {
  const closed = journal.filter((t) => t.status === "closed" && typeof t.realizedPL === "number");
  const wins = closed.filter((t) => (t.realizedPL ?? 0) > 0);
  const losses = closed.filter((t) => (t.realizedPL ?? 0) <= 0);

  const grossWin = wins.reduce((a, t) => a + (t.realizedPL ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + (t.realizedPL ?? 0), 0));

  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const winRate = closed.length ? wins.length / closed.length : 0;

  const expectancy = closed.length ? (grossWin - grossLoss) / closed.length : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  // Drawdown walked forward across the realized equity curve.
  let equity = state.startingEquity;
  let peak = equity;
  let maxDd = 0;
  for (const t of closed) {
    equity += t.realizedPL ?? 0;
    peak = Math.max(peak, equity);
    if (peak > 0) maxDd = Math.max(maxDd, (peak - equity) / peak);
  }

  const scored = closed.filter((t) => t.outcome);
  const forecastAccuracy = scored.length
    ? scored.filter((t) => t.outcome?.forecastCorrect).length / scored.length
    : 0;

  return {
    trades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgWin,
    avgLoss,
    expectancy,
    profitFactor,
    maxDrawdownPct: maxDd,
    forecastAccuracy,
    netPL: grossWin - grossLoss,
  };
}

/**
 * The go/no-go gate. Answers one question honestly: has this system earned
 * the right to touch real money yet?
 */
export function liveReadiness(perf: Performance): {
  ready: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const v = CONFIG.validation;

  if (perf.trades < v.minTradesBeforeLive) {
    reasons.push(
      `Only ${perf.trades} closed trades. Need ${v.minTradesBeforeLive} before the sample means anything.`,
    );
  }
  if (perf.expectancy <= v.minExpectancyDollars) {
    reasons.push(
      `Expectancy is ${perf.expectancy.toFixed(2)}/trade. A system that loses on paper loses faster live.`,
    );
  }
  if (perf.maxDrawdownPct > v.maxDrawdownPctBeforeReview) {
    reasons.push(
      `Max drawdown ${(perf.maxDrawdownPct * 100).toFixed(1)}% exceeds the ${(
        v.maxDrawdownPctBeforeReview * 100
      ).toFixed(0)}% review threshold.`,
    );
  }
  return { ready: reasons.length === 0, reasons };
}
