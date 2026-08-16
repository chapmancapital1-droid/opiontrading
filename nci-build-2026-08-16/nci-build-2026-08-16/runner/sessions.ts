/**
 * NCI Runner — the four daily sessions.
 * ---------------------------------------------------------------------------
 *   03:00–06:00 ET  london     scan 30m charts, bullish bias, STAGE only
 *   08:00–09:25 ET  premarket  screen down to 3 candidates for the open
 *   09:30–11:00 ET  usOpen     execute staged candidates with stops
 *   15:45–16:15 ET  review     close intraday, score forecasts, write lessons
 *
 * Market data comes through the app's existing provider abstraction, so the
 * runner inherits demo / Alpaca / Polygon without a second integration.
 */

import { CONFIG } from "./config";
import { runGates, gatesPassed, failedGates, positionSize, type TradeIntent } from "./gates";
import {
  appendJournal,
  appendLesson,
  computePerformance,
  loadState,
  readJournal,
  saveState,
  type Forecast,
  type RunnerState,
  type TradeRecord,
} from "./state";

/* -------------------------------------------------------------------------- */
/* Market data surface — swap the impl, keep the shape                        */
/* -------------------------------------------------------------------------- */

export interface Bar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Snapshot {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  prevClose: number;
  avgVolume: number;
  earningsInDays: number | null;
  bars: Bar[];
}

export interface DataFeed {
  universe(): Promise<string[]>;
  snapshot(symbol: string, interval: string): Promise<Snapshot>;
}

/* -------------------------------------------------------------------------- */
/* Signals — small, legible, testable                                         */
/* -------------------------------------------------------------------------- */

export function sma(bars: Bar[], n: number): number | null {
  if (bars.length < n) return null;
  const slice = bars.slice(-n);
  return slice.reduce((a, b) => a + b.c, 0) / n;
}

export function atr(bars: Bar[], n = 14): number | null {
  if (bars.length < n + 1) return null;
  let sum = 0;
  for (let i = bars.length - n; i < bars.length; i++) {
    const cur = bars[i];
    const prev = bars[i - 1];
    if (!cur || !prev) return null;
    sum += Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c));
  }
  return sum / n;
}

export function rsi(bars: Bar[], n = 14): number | null {
  if (bars.length < n + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = bars.length - n; i < bars.length; i++) {
    const cur = bars[i];
    const prev = bars[i - 1];
    if (!cur || !prev) return null;
    const d = cur.c - prev.c;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  if (loss === 0) return 100;
  const rs = gain / n / (loss / n);
  return 100 - 100 / (1 + rs);
}

export interface Score {
  symbol: string;
  total: number;
  signals: string[];
  bias: "up" | "down";
}

/**
 * Bullish confluence score. Deliberately boring: trend, momentum, structure,
 * participation. Each voter is one point so no single indicator can carry a
 * bad setup, and the reasons are printable into the journal.
 */
export function scoreBullish(s: Snapshot): Score {
  const signals: string[] = [];
  let total = 0;

  const ma20 = sma(s.bars, 20);
  const ma50 = sma(s.bars, 50);
  const r = rsi(s.bars);
  const a = atr(s.bars);

  if (ma20 !== null && s.last > ma20) {
    total++;
    signals.push("above 20MA");
  }
  if (ma20 !== null && ma50 !== null && ma20 > ma50) {
    total++;
    signals.push("20MA over 50MA");
  }
  if (r !== null && r > 50 && r < 72) {
    total++;
    signals.push(`RSI ${r.toFixed(0)} (strong, not extended)`);
  }
  if (s.last > s.prevClose) {
    total++;
    signals.push("above prior close");
  }
  const recent = s.bars.slice(-6);
  const rising = recent.length === 6 && recent.every((b, i) => i === 0 || b.l >= (recent[i - 1]?.l ?? 0) * 0.995);
  if (rising) {
    total++;
    signals.push("higher lows on 30m");
  }
  if (a !== null && s.last > 0 && a / s.last > 0.004) {
    total++;
    signals.push("ATR wide enough to pay");
  }

  return { symbol: s.symbol, total, signals, bias: "up" };
}

/* -------------------------------------------------------------------------- */
/* Session: London overlap — scan and stage                                   */
/* -------------------------------------------------------------------------- */

export async function runLondonSession(feed: DataFeed): Promise<RunnerState> {
  const state = loadState();
  const cfg = CONFIG.sessions.london;
  const universe = await feed.universe();
  const staged: Score[] = [];

  for (const sym of universe) {
    try {
      const snap = await feed.snapshot(sym, cfg.chartInterval);
      if (snap.last < CONFIG.screen.minPrice || snap.last > CONFIG.screen.maxPrice) continue;
      const score = scoreBullish(snap);
      if (score.total >= 4) staged.push(score);
    } catch {
      continue; // A single bad symbol must never take down the scan.
    }
  }

  staged.sort((a, b) => b.total - a.total);
  state.watchlist = staged.slice(0, 6).map((s) => ({
    stagedAt: new Date().toISOString(),
    session: cfg.label,
    symbol: s.symbol,
    reason: `${s.total}/6 bullish · ${s.signals.join(", ")}`,
    bias: s.bias,
  }));

  saveState(state);
  appendLesson(
    `**London scan** — ${staged.length} names cleared 4/6 bullish confluence on the 30m. Staged: ${
      state.watchlist.map((w) => w.symbol).join(", ") || "none"
    }. No orders placed (session is scan-only).`,
  );
  return state;
}

/* -------------------------------------------------------------------------- */
/* Session: Pre-market — cut to three                                         */
/* -------------------------------------------------------------------------- */

export interface Candidate {
  symbol: string;
  score: number;
  signals: string[];
  entry: number;
  stop: number;
  target: number;
  bid: number;
  ask: number;
  earningsInDays: number | null;
  rr: number;
}

export async function runPremarketSession(feed: DataFeed): Promise<Candidate[]> {
  const state = loadState();
  const cfg = CONFIG.sessions.premarket;
  const S = CONFIG.screen;
  const R = CONFIG.risk;

  // Start from what London staged, then widen if it came back thin.
  const seeds = state.watchlist.map((w) => w.symbol);
  const universe = seeds.length >= S.candidateCount ? seeds : [...new Set([...seeds, ...(await feed.universe())])];

  const scored: Candidate[] = [];

  for (const sym of universe) {
    try {
      const snap = await feed.snapshot(sym, cfg.chartInterval);

      if (snap.last < S.minPrice || snap.last > S.maxPrice) continue;
      if (snap.avgVolume < S.minAvgVolume) continue;
      if (snap.earningsInDays !== null && snap.earningsInDays <= S.earningsBlackoutDays) continue;

      const score = scoreBullish(snap);
      if (score.total < 4) continue;

      // Stop placed off structure when ATR allows, else the flat percentage.
      const a = atr(snap.bars) ?? snap.last * R.stopLossPct;
      const stop = Math.min(snap.last - a * 1.2, snap.last * (1 - R.stopLossPct));
      const target = snap.last + (snap.last - stop) * 2;
      const rr = (target - snap.last) / (snap.last - stop);

      scored.push({
        symbol: sym,
        score: score.total,
        signals: score.signals,
        entry: snap.last,
        stop,
        target,
        bid: snap.bid,
        ask: snap.ask,
        earningsInDays: snap.earningsInDays,
        rr,
      });
    } catch {
      continue;
    }
  }

  scored.sort((a, b) => b.score - a.score || b.rr - a.rr);
  const top = scored.slice(0, S.candidateCount);

  state.watchlist = top.map((c) => ({
    stagedAt: new Date().toISOString(),
    session: cfg.label,
    symbol: c.symbol,
    reason: `${c.score}/6 · ${c.signals.join(", ")} · R:R ${c.rr.toFixed(2)}`,
    bias: "up",
  }));
  saveState(state);

  appendLesson(
    `**Pre-market** — screened ${universe.length} names to ${top.length} candidates: ${
      top.map((c) => `${c.symbol} (${c.score}/6)`).join(", ") || "none — no setup met the bar, which is a valid outcome"
    }.`,
  );

  return top;
}

/* -------------------------------------------------------------------------- */
/* Session: US open — execute                                                 */
/* -------------------------------------------------------------------------- */

export interface Broker {
  placeBracket(o: {
    symbol: string;
    qty: number;
    entry: number;
    stop: number;
    target: number;
  }): Promise<{ ok: boolean; fillPrice: number; id: string; error?: string }>;
  closePosition(symbol: string): Promise<{ ok: boolean; fillPrice: number }>;
}

export async function runOpenSession(
  candidates: Candidate[],
  broker: Broker,
  mode: "paper" | "live",
  now = new Date(),
): Promise<TradeRecord[]> {
  const state = loadState();
  const cfg = CONFIG.sessions.usOpen;
  const placed: TradeRecord[] = [];

  for (const c of candidates) {
    const intent: TradeIntent = {
      symbol: c.symbol,
      side: "long",
      entryPrice: c.entry,
      stopPrice: c.stop,
      targetPrice: c.target,
      bid: c.bid,
      ask: c.ask,
      session: cfg.label,
      sessionAllowsExecution: cfg.allowExecution,
      probability: c.score / 6,
      earningsWithinDays: c.earningsInDays,
    };

    const results = runGates(state, intent, now);
    const forecast: Forecast = {
      thesis: `${c.score}/6 bullish confluence. Long above structure, stop under ATR, 2R target.`,
      direction: "up",
      targetPrice: c.target,
      stopPrice: c.stop,
      probability: c.score / 6,
      session: cfg.label,
      signals: c.signals,
    };

    if (!gatesPassed(results)) {
      const rejected: TradeRecord = {
        id: `${c.symbol}-${Date.now()}`,
        openedAt: now.toISOString(),
        symbol: c.symbol,
        side: "long",
        status: "rejected",
        mode,
        qty: 0,
        entryPrice: c.entry,
        stopPrice: c.stop,
        targetPrice: c.target,
        riskDollars: 0,
        forecast,
        rejectReason: failedGates(results)
          .map((g) => g.message)
          .join(" | "),
      };
      appendJournal(rejected);
      continue;
    }

    const qty = positionSize(intent);
    const fill = await broker.placeBracket({
      symbol: c.symbol,
      qty,
      entry: c.entry,
      stop: c.stop,
      target: c.target,
    });

    if (!fill.ok) {
      appendLesson(`Order rejected by broker for ${c.symbol}: ${fill.error ?? "unknown"}.`);
      continue;
    }

    const trade: TradeRecord = {
      id: fill.id,
      openedAt: now.toISOString(),
      symbol: c.symbol,
      side: "long",
      status: "open",
      mode,
      qty,
      entryPrice: fill.fillPrice,
      stopPrice: c.stop,
      targetPrice: c.target,
      riskDollars: qty * Math.abs(fill.fillPrice - c.stop),
      forecast,
    };

    state.openPositions.push(trade);
    appendJournal(trade);
    placed.push(trade);
  }

  saveState(state);
  return placed;
}

/* -------------------------------------------------------------------------- */
/* Session: Review — close, score, learn                                      */
/* -------------------------------------------------------------------------- */

export type BracketResolver = (
  symbol: string,
  entry: number,
  stop: number,
  target: number,
) => { exit: number; reason: "stop" | "target" | "close" };

export async function runReviewSession(
  broker: Broker,
  feed: DataFeed,
  resolve?: BracketResolver,
): Promise<{ closed: TradeRecord[]; summary: string }> {
  const state = loadState();
  const closed: TradeRecord[] = [];

  // Roll the day. Without this the daily/weekly halt counters accumulate
  // forever and eventually block every entry permanently — a halt that never
  // lifts is a bug, not a safety feature.
  const today = new Date().toISOString().slice(0, 10);
  if (state.stats.lastTradingDay !== today) {
    state.stats.dailyRealizedPL = 0;
    state.stats.lastTradingDay = today;
  }

  for (const pos of [...state.openPositions]) {
    // Prefer intraday bracket resolution: a stop can fill at 10:15 even if the
    // close was above it. Falling back to a close-only fill would flatter every
    // stop-loss strategy ever written.
    let exitPrice: number;
    let reason: "stop" | "target" | "close";

    if (resolve) {
      const r = resolve(pos.symbol, pos.entryPrice, pos.stopPrice, pos.targetPrice);
      exitPrice = r.exit;
      reason = r.reason;
    } else {
      const exit = await broker.closePosition(pos.symbol);
      if (!exit.ok) continue;
      exitPrice = exit.fillPrice;
      reason = exitPrice <= pos.stopPrice ? "stop" : exitPrice >= pos.targetPrice ? "target" : "close";
    }

    const pl = (exitPrice - pos.entryPrice) * pos.qty;
    const rMultiple = pos.riskDollars > 0 ? pl / pos.riskDollars : 0;
    const hitTarget = reason === "target";
    const hitStop = reason === "stop";

    const done: TradeRecord = {
      ...pos,
      status: "closed",
      closedAt: new Date().toISOString(),
      exitPrice,
      realizedPL: pl,
      outcome: {
        hitTarget,
        hitStop,
        forecastCorrect: pl > 0,
        rMultiple,
        note: hitTarget
          ? "Target reached."
          : hitStop
            ? "Stopped out — the stop did its job."
            : "Closed at session end, neither target nor stop.",
      },
    };

    appendJournal(done);
    closed.push(done);

    state.equity += pl;
    state.stats.dailyRealizedPL += pl;
    state.stats.weeklyRealizedPL += pl;
    state.stats.tradesClosed++;
    if (pl > 0) {
      state.stats.wins++;
      state.stats.grossWin += pl;
    } else {
      state.stats.losses++;
      state.stats.grossLoss += Math.abs(pl);
    }
    state.openPositions = state.openPositions.filter((p) => p.id !== pos.id);
  }

  saveState(state);

  const perf = computePerformance(state, readJournal());
  const summary = [
    `Closed ${closed.length} position(s). Day P/L $${state.stats.dailyRealizedPL.toFixed(2)}. Equity $${state.equity.toFixed(2)}.`,
    `Sample: ${perf.trades} trades · win rate ${(perf.winRate * 100).toFixed(0)}% · expectancy $${perf.expectancy.toFixed(2)}/trade · max DD ${(perf.maxDrawdownPct * 100).toFixed(1)}%.`,
    perf.trades >= 20 && perf.expectancy <= 0
      ? `EXPECTANCY IS NEGATIVE over ${perf.trades} trades. This system is currently a leak. Stop adding trades and change something before continuing.`
      : perf.trades < 20
        ? "Sample still too small to mean anything. Keep logging."
        : "Expectancy positive — keep the sample growing before drawing conclusions.",
  ].join("\n");

  appendLesson(`**Review**\n${summary}`);
  return { closed, summary };
}
