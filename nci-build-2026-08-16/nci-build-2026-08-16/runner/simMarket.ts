/**
 * NCI Runner — simulated market.
 * ---------------------------------------------------------------------------
 * Replaces the broken sim in daily.ts. The old one seeded its RNG from
 * (symbol + calendar date), so every call inside a day returned identical
 * prices — entry and exit landed on the same number and every trade lost
 * exactly the modeled slippage. A stopped watch.
 *
 * This one keeps a persistent simulated clock and a persistent price series
 * per symbol on disk. Time advances between sessions, prices evolve, and both
 * outcomes are genuinely reachable.
 *
 * Design notes that matter for honesty:
 *   - Geometric Brownian motion with per-symbol drift and volatility. Real
 *     enough to exercise the plumbing, NOT a market model. A strategy that
 *     profits here has proven it survives random walk with costs — a low bar,
 *     but a real one, and most naive systems fail it.
 *   - Costs are modeled: half-spread on entry AND exit, plus slippage. This is
 *     what quietly kills small accounts, so the sim must not hide it.
 *   - Intraday paths are generated so stops and targets can be hit DURING the
 *     session rather than only checked at the close. Without this, stop-losses
 *     look far better than they are.
 */

import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config";
import type { Bar, DataFeed, Snapshot, Broker } from "./sessions";

const CLOCK_FILE = path.join(ROOT, "sim-clock.json");

interface SymbolSpec {
  price: number;
  /** Annualized drift. Deliberately near zero — no free trend to farm. */
  drift: number;
  /** Annualized volatility. */
  vol: number;
  spreadPct: number;
  avgVolume: number;
  earningsDay: number | null;
}

interface SimClock {
  day: number;
  symbols: Record<string, SymbolSpec>;
  /** Intraday high/low reached since the open, for stop/target resolution. */
  session: Record<string, { open: number; high: number; low: number; last: number }>;
}

const UNIVERSE = ["F", "SOFI", "PLTR", "NIO", "AAL", "SNAP", "RIVN", "HOOD", "INTC", "T"];

/* Mulberry32 — small, fast, well-distributed. */
function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller: uniform -> standard normal. */
function gauss(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-9);
  const v = Math.max(rnd(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function freshClock(): SimClock {
  const rnd = rngFrom(20260815);
  const symbols: Record<string, SymbolSpec> = {};
  for (const s of UNIVERSE) {
    symbols[s] = {
      price: 8 + rnd() * 45,
      // Drift centered on zero. If the strategy makes money here it isn't
      // because the simulator handed it a rising market.
      drift: (rnd() - 0.5) * 0.12,
      vol: 0.28 + rnd() * 0.35,
      spreadPct: 0.0008 + rnd() * 0.0025,
      avgVolume: 1_500_000 + rnd() * 9_000_000,
      earningsDay: null,
    };
  }
  return { day: 0, symbols, session: {} };
}

export function loadClock(): SimClock {
  fs.mkdirSync(ROOT, { recursive: true });
  if (!fs.existsSync(CLOCK_FILE)) {
    const c = freshClock();
    saveClock(c);
    return c;
  }
  return JSON.parse(fs.readFileSync(CLOCK_FILE, "utf8")) as SimClock;
}

export function saveClock(c: SimClock): void {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(CLOCK_FILE, JSON.stringify(c, null, 2));
}

/**
 * Advance one trading day. Generates the intraday path so that highs and lows
 * are real — a stop can be hit at 10:15 even if the close was above it.
 */
export function advanceDay(): SimClock {
  const c = loadClock();
  c.day += 1;
  c.session = {};

  for (const sym of UNIVERSE) {
    const spec = c.symbols[sym];
    if (!spec) continue;

    const rnd = rngFrom(c.day * 7919 + sym.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0));

    const open = spec.price;
    let px = open;
    let high = open;
    let low = open;

    // 78 five-minute steps in a session.
    const steps = 78;
    const dt = 1 / (252 * steps);
    for (let i = 0; i < steps; i++) {
      const shock = gauss(rnd);
      px *= Math.exp((spec.drift - 0.5 * spec.vol ** 2) * dt + spec.vol * Math.sqrt(dt) * shock);
      high = Math.max(high, px);
      low = Math.min(low, px);
    }

    spec.price = Math.max(1, px);
    // Earnings arrive on a real schedule rather than a coin flip each call.
    spec.earningsDay = (c.day + sym.length) % 45 === 0 ? c.day + 1 : null;

    c.session[sym] = { open, high, low, last: spec.price };
  }

  saveClock(c);
  return c;
}

/** Build the trailing bar history the signals need. */
function historyFor(sym: string, spec: SymbolSpec, day: number, count: number): Bar[] {
  const bars: Bar[] = [];
  // Walk backwards deterministically from today's price.
  let px = spec.price;
  const back: number[] = [px];
  for (let d = 0; d < count; d++) {
    const rnd = rngFrom((day - d) * 7919 + sym.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0));
    const dt = 1 / 252;
    const shock = gauss(rnd);
    px /= Math.exp((spec.drift - 0.5 * spec.vol ** 2) * dt + spec.vol * Math.sqrt(dt) * shock);
    back.push(Math.max(1, px));
  }
  back.reverse();

  for (let i = 1; i < back.length; i++) {
    const o = back[i - 1] ?? 1;
    const c = back[i] ?? 1;
    const wiggle = Math.abs(c - o) * 0.6 + c * 0.002;
    bars.push({
      t: new Date(Date.now() - (back.length - i) * 86_400_000).toISOString(),
      o,
      h: Math.max(o, c) + wiggle,
      l: Math.min(o, c) - wiggle,
      c,
      v: spec.avgVolume * (0.7 + ((i * 37) % 60) / 100),
    });
  }
  return bars;
}

export const simFeed: DataFeed = {
  async universe() {
    return UNIVERSE;
  },
  async snapshot(symbol): Promise<Snapshot> {
    const c = loadClock();
    const spec = c.symbols[symbol];
    if (!spec) throw new Error(`Unknown sim symbol ${symbol}`);

    const bars = historyFor(symbol, spec, c.day, 60);
    const spread = spec.price * spec.spreadPct;

    return {
      symbol,
      last: spec.price,
      bid: spec.price - spread / 2,
      ask: spec.price + spread / 2,
      prevClose: bars[bars.length - 2]?.c ?? spec.price,
      avgVolume: spec.avgVolume,
      earningsInDays: spec.earningsDay ? spec.earningsDay - c.day : null,
      bars,
    };
  },
};

/**
 * Paper broker with honest costs and intraday stop/target resolution.
 * Entry pays the ask plus slippage; exit receives the bid minus slippage.
 */
export const paperBroker: Broker = {
  async placeBracket(o) {
    const c = loadClock();
    const spec = c.symbols[o.symbol];
    if (!spec) return { ok: false, fillPrice: 0, id: "", error: "unknown symbol" };

    const halfSpread = (o.entry * spec.spreadPct) / 2;
    const slippage = o.entry * 0.0005;
    return {
      ok: true,
      fillPrice: o.entry + halfSpread + slippage,
      id: `paper-${o.symbol}-d${c.day}-${Date.now()}`,
    };
  },

  async closePosition(symbol) {
    const c = loadClock();
    const spec = c.symbols[symbol];
    const sess = c.session[symbol];
    if (!spec) return { ok: false, fillPrice: 0 };

    const exitRef = sess?.last ?? spec.price;
    const halfSpread = (exitRef * spec.spreadPct) / 2;
    const slippage = exitRef * 0.0005;
    return { ok: true, fillPrice: Math.max(0.01, exitRef - halfSpread - slippage) };
  },
};

/**
 * Resolve a bracket against the day's actual intraday path.
 * Order of checks matters: if both stop and target were touched we assume the
 * STOP filled first. That is the pessimistic assumption, and the right one —
 * a backtest that assumes the good fill flatters every strategy ever written.
 */
export function resolveBracket(
  symbol: string,
  entry: number,
  stop: number,
  target: number,
): { exit: number; reason: "stop" | "target" | "close" } {
  const c = loadClock();
  const sess = c.session[symbol];
  const spec = c.symbols[symbol];
  if (!sess || !spec) return { exit: entry, reason: "close" };

  if (sess.low <= stop) return { exit: stop, reason: "stop" };
  if (sess.high >= target) return { exit: target, reason: "target" };
  return { exit: sess.last, reason: "close" };
}
