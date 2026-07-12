/**
 * Phase 3 — Quantitative market-context engine.
 *
 * Turns raw data-layer output (quote + chain + IV history + events + news) into
 * a typed `MarketContext`: the signal bundle the Phase 4 strategy selector and
 * the Phase 5 AI layer reason over.
 *
 * Pure and deterministic (pass `now` to pin time). Every branch degrades
 * gracefully so a partial/demo payload still yields a usable context — the
 * `confidence` field and `notes` record how much to trust it.
 *
 * Educational analysis only — no signal here is investment advice.
 */

import type { UnderlyingQuote, OptionChain, OptionQuote, EventData } from "@/data/types";
import type { NewsItem } from "@/data/news/types";
import { computeIvRank, type IvSnapshot } from "@/data/ivHistory";

export type IvTrend = "elevated" | "neutral" | "low";
export type SpotTrend = "up" | "sideways" | "down";
export type Liquidity = "tight" | "normal" | "wide";
export type EventProximity = "earnings" | "ex-div" | "clear";
export type NewsSentiment = "positive" | "neutral" | "negative";
export type Confidence = "high" | "medium" | "low";

/** The signal bundle the strategy brain conditions on. */
export interface MarketContext {
  symbol: string;
  spot: number;
  expiration: string;
  /** ATM implied vol (decimal) from the nearest expiry, or null if unlisted. */
  atmIv: number | null;

  // ---- required signals ----
  /** Where current IV sits in its own history, [0,1] (1 = highest). */
  ivRank: number;
  ivTrend: IvTrend;
  spotTrend: SpotTrend;
  /** Expected move to expiry in $ (ATM straddle price, per share). */
  expectedMove: number;
  liquidity: Liquidity;
  eventProximity: EventProximity;
  newsSentiment: NewsSentiment;

  // ---- diagnostics (additive, non-breaking) ----
  /** Expected move as a fraction of spot, or null when unavailable. */
  expectedMovePct: number | null;
  /** IV-history points backing the rank. */
  sampleSize: number;
  confidence: Confidence;
  asOf: string;
  /** Plain-language, educational notes on how each signal was derived. */
  notes: string[];
}

export interface MarketContextInput {
  symbol: string;
  quote: UnderlyingQuote;
  /** Nearest-expiry chain — drives ATM IV, expected move, and liquidity. */
  chain: OptionChain;
  /** Historical daily ATM IV (with optional spot) for rank + spot trend. */
  ivHistory: readonly IvSnapshot[];
  events: EventData;
  news: readonly NewsItem[];
  /** Override current time for deterministic tests. */
  now?: number;
}

const DAY_MS = 864e5;
const IV_ELEVATED = 0.66;
const IV_LOW = 0.33;
const SPOT_MOVE_THRESHOLD = 0.02; // ±2% over the trend window
const SPOT_WINDOW = 20;           // trailing snapshots for trend
const SENTIMENT_BAND = 0.15;
const SPREAD_TIGHT = 0.05;        // spread as % of mark
const SPREAD_WIDE = 0.15;

/** Nearest strike to spot that has a finite mark, for `type`. */
function nearestByType(quotes: readonly OptionQuote[], spot: number, type: "call" | "put"): OptionQuote | null {
  let best: OptionQuote | null = null;
  for (const q of quotes) {
    if (q.contract.optionType !== type || q.mark == null || !Number.isFinite(q.mark)) continue;
    if (best === null) { best = q; continue; }
    if (Math.abs(q.contract.strike - spot) < Math.abs(best.contract.strike - spot)) best = q;
  }
  return best;
}

/** Median of a numeric list, or null when empty. */
function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

function ivTrendFromRank(rank: number): IvTrend {
  if (rank >= IV_ELEVATED) return "elevated";
  if (rank <= IV_LOW) return "low";
  return "neutral";
}

/** ATM IV from the chain: average of the ATM call/put IV, else whichever exists. */
export function atmImpliedVol(chain: OptionChain, spot: number): number | null {
  const call = nearestByType(chain.quotes, spot, "call");
  const put = nearestByType(chain.quotes, spot, "put");
  const ivs = [call?.impliedVol, put?.impliedVol].filter(
    (v): v is number => v != null && Number.isFinite(v) && v > 0
  );
  if (ivs.length === 0) return null;
  return ivs.reduce((a, b) => a + b, 0) / ivs.length;
}

/** Expected move to expiry = ATM straddle price (call mark + put mark). */
function expectedMoveFromChain(chain: OptionChain, spot: number): number | null {
  const call = nearestByType(chain.quotes, spot, "call");
  const put = nearestByType(chain.quotes, spot, "put");
  if (call?.mark == null || put?.mark == null) return null;
  const move = call.mark + put.mark;
  return Number.isFinite(move) && move > 0 ? move : null;
}

/** Liquidity from near-the-money spread as % of mark (median). */
function liquidityFromChain(chain: OptionChain, spot: number): { level: Liquidity; median: number | null } {
  const band = Math.max(spot * 0.1, 1);
  const pcts: number[] = [];
  for (const q of chain.quotes) {
    if (Math.abs(q.contract.strike - spot) > band) continue;
    if (q.bid == null || q.ask == null || q.mark == null || q.mark <= 0) continue;
    const spread = q.ask - q.bid;
    if (spread < 0) continue;
    pcts.push(spread / q.mark);
  }
  const m = median(pcts);
  if (m == null) return { level: "normal", median: null };
  if (m <= SPREAD_TIGHT) return { level: "tight", median: m };
  if (m >= SPREAD_WIDE) return { level: "wide", median: m };
  return { level: "normal", median: m };
}

/** Spot trend from the IV-history spot series vs the current quote. */
function spotTrendFromHistory(
  ivHistory: readonly IvSnapshot[],
  currentSpot: number
): { trend: SpotTrend; refSpot: number | null } {
  const spots = ivHistory
    .map((h) => h.spot)
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
  if (spots.length < 2) return { trend: "sideways", refSpot: null };
  const window = spots.slice(Math.max(0, spots.length - SPOT_WINDOW));
  const refSpot = window[0]!;
  const change = (currentSpot - refSpot) / refSpot;
  if (change > SPOT_MOVE_THRESHOLD) return { trend: "up", refSpot };
  if (change < -SPOT_MOVE_THRESHOLD) return { trend: "down", refSpot };
  return { trend: "sideways", refSpot };
}

function daysUntil(iso: string | null | undefined, now: number): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (t - now) / DAY_MS;
}

/** Earnings/ex-div falling on or before expiry take precedence over "clear". */
function eventProximityFrom(events: EventData, expiration: string, now: number): EventProximity {
  const dExp = daysUntil(expiration, now);
  const dEarn = daysUntil(events.nextEarnings, now);
  const dDiv = daysUntil(events.exDividend, now);
  if (dEarn >= 0 && dEarn <= dExp) return "earnings";
  if (dDiv >= 0 && dDiv <= dExp) return "ex-div";
  return "clear";
}

const POSITIVE_WORDS = /\b(beat|beats|surge|surged|upgrade|upgraded|record|rally|rallies|jumps?|tops?|soar|soars|gains?|outperform|raises?|bullish)\b/i;
const NEGATIVE_WORDS = /\b(miss|misses|plunge|plunged|downgrade|downgraded|lawsuit|cuts?|falls?|slump|warns?|probe|investigation|bearish|recall|halts?|drops?)\b/i;

/**
 * News sentiment: prefer numeric sentiment when the feed provides it; otherwise
 * fall back to a transparent keyword tally over headlines/summaries.
 */
function newsSentimentFrom(news: readonly NewsItem[]): { label: NewsSentiment; basis: "numeric" | "keyword" | "none" } {
  const scored = news.map((n) => n.sentiment).filter((v): v is number => v != null && Number.isFinite(v));
  if (scored.length > 0) {
    const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
    if (avg > SENTIMENT_BAND) return { label: "positive", basis: "numeric" };
    if (avg < -SENTIMENT_BAND) return { label: "negative", basis: "numeric" };
    return { label: "neutral", basis: "numeric" };
  }
  if (news.length === 0) return { label: "neutral", basis: "none" };
  let pos = 0;
  let neg = 0;
  for (const n of news) {
    const text = `${n.title} ${n.summary ?? ""}`;
    if (POSITIVE_WORDS.test(text)) pos += 1;
    if (NEGATIVE_WORDS.test(text)) neg += 1;
  }
  if (pos > neg) return { label: "positive", basis: "keyword" };
  if (neg > pos) return { label: "negative", basis: "keyword" };
  return { label: "neutral", basis: "keyword" };
}

function confidenceFrom(sampleSize: number, atmIv: number | null, hasNews: boolean): Confidence {
  if (sampleSize < 5 || atmIv == null) return "low";
  if (sampleSize >= 20 && hasNews) return "high";
  return "medium";
}

/**
 * Compute the market context for a symbol from live (or demo) data-layer output.
 * Never throws on partial data — missing inputs degrade to neutral defaults and
 * are surfaced through `notes` and `confidence`.
 */
export function computeMarketContext(input: MarketContextInput): MarketContext {
  const now = input.now ?? Date.now();
  const spot = input.quote.price;
  const notes: string[] = [];

  const atmIv = atmImpliedVol(input.chain, spot);
  if (atmIv == null) notes.push("No listed IV near the money — IV signals fall back to history/neutral.");

  // IV rank over history; current = live ATM IV when available, else last snapshot.
  const ivValues = input.ivHistory.map((h) => h.atmIv);
  const lastIv = ivValues.length > 0 ? ivValues[ivValues.length - 1]! : null;
  const currentIv = atmIv ?? lastIv;
  const sampleSize = ivValues.length;
  let ivRank: number;
  if (currentIv != null) {
    const rank = computeIvRank(ivValues, currentIv);
    if (rank == null) {
      ivRank = 0.5;
      notes.push(
        sampleSize < 2
          ? "IV rank needs more history — showing a neutral 0.5 until snapshots accumulate."
          : "IV has been flat across history — IV rank defaults to neutral 0.5."
      );
    } else {
      ivRank = rank;
    }
  } else {
    ivRank = 0.5;
    notes.push("No IV available — IV rank defaults to neutral 0.5.");
  }
  const ivTrend = ivTrendFromRank(ivRank);

  const { trend: spotTrend, refSpot } = spotTrendFromHistory(input.ivHistory, spot);
  if (refSpot == null) notes.push("Spot trend needs more price history — defaulting to sideways.");

  const expectedMoveRaw = expectedMoveFromChain(input.chain, spot);
  const expectedMove = expectedMoveRaw ?? 0;
  const expectedMovePct = expectedMoveRaw != null && spot > 0 ? expectedMoveRaw / spot : null;
  if (expectedMoveRaw == null) notes.push("Expected move unavailable — ATM straddle not fully quoted.");

  const liq = liquidityFromChain(input.chain, spot);
  if (liq.median == null) notes.push("No two-sided quotes near the money — liquidity defaults to normal.");

  const eventProximity = eventProximityFrom(input.events, input.chain.expiration, now);

  const sentiment = newsSentimentFrom(input.news);
  if (sentiment.basis === "keyword") notes.push("News sentiment inferred from headline keywords (feed has no scores).");
  if (sentiment.basis === "none") notes.push("No news in window — sentiment defaults to neutral.");

  const confidence = confidenceFrom(sampleSize, atmIv, input.news.length > 0);

  return {
    symbol: input.symbol.trim().toUpperCase(),
    spot,
    expiration: input.chain.expiration,
    atmIv,
    ivRank,
    ivTrend,
    spotTrend,
    expectedMove,
    liquidity: liq.level,
    eventProximity,
    newsSentiment: sentiment.label,
    expectedMovePct,
    sampleSize,
    confidence,
    asOf: new Date(now).toISOString(),
    notes,
  };
}
