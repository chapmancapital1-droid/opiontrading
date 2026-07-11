import type { OptionQuote, EventData, Freshness } from "./types";

export interface LiquidityFlags {
  spread: number | null;
  spreadPctOfMark: number | null;
  wideSpread: boolean;
  noBid: boolean;
  lowVolume: boolean;
  lowOpenInterest: boolean;
  staleQuote: boolean;
  adjustedContract: boolean;
  notes: string[];
}

export function assessLiquidity(q: OptionQuote, quoteAgeMinutes: number): LiquidityFlags {
  const spread = q.bid != null && q.ask != null ? Number((q.ask - q.bid).toFixed(2)) : null;
  const spreadPct = spread != null && q.mark ? spread / q.mark : null;
  const notes: string[] = [];

  const wideSpread = spreadPct != null && spreadPct > 0.1;
  const noBid = q.bid == null || q.bid <= 0;
  const lowVolume = (q.volume ?? 0) < 10;
  const lowOpenInterest = (q.openInterest ?? 0) < 100;
  const staleQuote = quoteAgeMinutes > 15;

  if (wideSpread) notes.push("Wide bid-ask spread — a limit order may fill poorly or not at all.");
  if (noBid) notes.push("No bid — exiting this option may be difficult.");
  if (lowVolume) notes.push("Low volume today.");
  if (lowOpenInterest) notes.push("Low open interest.");
  if (staleQuote) notes.push("Quote is stale; refresh before trusting the price.");
  if (q.contract.isAdjusted) notes.push("Adjusted / non-standard contract — verify the deliverable in Robinhood.");
  notes.push("Liquidity flags are not a fill prediction. A limit order is never guaranteed to execute.");

  return {
    spread, spreadPctOfMark: spreadPct,
    wideSpread, noBid, lowVolume, lowOpenInterest, staleQuote,
    adjustedContract: q.contract.isAdjusted, notes,
  };
}

export interface EventWarnings { earningsSoon: boolean; exDivSoon: boolean; notes: string[]; }

export function assessEvents(ev: EventData, expiration: string): EventWarnings {
  const notes: string[] = [];
  const now = Date.now();
  const days = (iso?: string | null) =>
    iso ? Math.round((new Date(iso).getTime() - now) / 864e5) : Infinity;
  const dExp = days(expiration);
  const earningsSoon = days(ev.nextEarnings) <= dExp && days(ev.nextEarnings) >= 0;
  const exDivSoon = days(ev.exDividend) <= dExp && days(ev.exDividend) >= 0;

  if (earningsSoon) notes.push("Earnings fall on or before this expiration — expect elevated IV and possible IV crush.");
  if (exDivSoon) notes.push("Ex-dividend date before expiration — early assignment risk rises on ITM short calls.");
  return { earningsSoon, exDivSoon, notes };
}

export const freshnessLabel = (f: Freshness): string =>
  ({ realtime: "Real-time", delayed: "Delayed", manual: "Manual entry", stale: "Stale" }[f]);
