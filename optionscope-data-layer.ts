/* ============================================================================
   OPTIONSCOPE — MESSAGE 4 of N
   Provider-independent market-data layer + server API routes.

   Design goals (from your spec):
   - Never expose a market-data secret in browser code. Keys read ONLY in
     server route handlers via process.env (no NEXT_PUBLIC_).
   - One MarketDataProvider interface; swap demo -> licensed feed with zero
     changes to the calculation engine or UI.
   - Normalized contract identifier so ticker/expiry/strike/type/multiplier/
     adjusted status are unambiguous.
   - Quote timestamps, delayed/manual labels, retry + error handling.

   Split each section into the path in its banner: ===== FILE: path =====
   ============================================================================ */


/* ============================================================================
   ===== FILE: src/data/contractId.ts =====
   Normalized contract identity + OCC-style symbol build/parse.
   Adjusted contracts (non-100 multiplier / special deliverable) are flagged.
   ============================================================================ */

import type { ContractId, OptionType } from "@/domain/types";

/** Build an OCC-style symbol: ROOT + YYMMDD + C/P + strike*1000 (8 digits). */
export function buildOccSymbol(c: Omit<ContractId, "occSymbol">): string {
  const root = c.underlying.toUpperCase().padEnd(6, " ").slice(0, 6).trimEnd();
  const d = new Date(c.expiration);
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const cp = c.optionType === "call" ? "C" : "P";
  const strk = String(Math.round(c.strike * 1000)).padStart(8, "0");
  return `${root}${yy}${mm}${dd}${cp}${strk}`;
}

/** Parse an OCC-style symbol back into a partial ContractId. */
export function parseOccSymbol(sym: string): Omit<ContractId, "multiplier" | "isAdjusted"> | null {
  const m = sym.trim().match(/^([A-Z.]{1,6})(\d{6})([CP])(\d{8})$/);
  if (!m) return null;
  const [, root, ymd, cp, strk] = m;
  const yy = Number(ymd!.slice(0, 2));
  const year = 2000 + yy;
  const month = ymd!.slice(2, 4);
  const day = ymd!.slice(4, 6);
  return {
    underlying: root!,
    expiration: `${year}-${month}-${day}`,
    optionType: cp === "C" ? "call" : ("put" as OptionType),
    strike: Number(strk) / 1000,
    occSymbol: sym.trim(),
  };
}

/** Normalize any provider contract into our ContractId, flagging adjustments. */
export function normalizeContract(input: {
  underlying: string;
  expiration: string;
  strike: number;
  optionType: OptionType;
  multiplier?: number;
  deliverableNote?: string | null;
  occSymbol?: string;
}): ContractId {
  const multiplier = input.multiplier ?? 100;
  const isAdjusted =
    multiplier !== 100 || Boolean(input.deliverableNote && input.deliverableNote.trim() !== "");
  const base: Omit<ContractId, "occSymbol"> = {
    underlying: input.underlying.toUpperCase(),
    expiration: input.expiration,
    strike: input.strike,
    optionType: input.optionType,
    multiplier,
    isAdjusted,
  };
  return { ...base, occSymbol: input.occSymbol ?? buildOccSymbol(base) };
}


/* ============================================================================
   ===== FILE: src/data/types.ts =====
   Provider-facing DTOs. All quotes carry a timestamp + freshness label.
   ============================================================================ */

import type { ContractId, ExerciseStyle } from "@/domain/types";

export type Freshness = "realtime" | "delayed" | "manual" | "stale";

export interface QuoteMeta {
  source: string;         // provider id, "demo", or "manual"
  timestamp: string;      // ISO
  freshness: Freshness;
  delayMinutes?: number;
}

export interface UnderlyingQuote {
  symbol: string;
  price: number;
  meta: QuoteMeta;
}

export interface OptionQuote {
  contract: ContractId;
  bid: number | null;
  ask: number | null;
  mark: number | null;
  impliedVol: number | null;   // decimal
  volume: number | null;
  openInterest: number | null;
  exerciseStyle: ExerciseStyle;
  meta: QuoteMeta;
}

export interface OptionChain {
  underlying: string;
  expiration: string;
  quotes: OptionQuote[];
  meta: QuoteMeta;
}

export interface EventData {
  nextEarnings?: string | null;   // ISO date or null
  exDividend?: string | null;
  dividendYield?: number | null;  // decimal
}

export interface ProviderError {
  code: "not_configured" | "not_found" | "rate_limited" | "upstream" | "bad_request";
  message: string;
  retryable: boolean;
}

export type ProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProviderError };


/* ============================================================================
   ===== FILE: src/data/provider.ts =====
   The single interface every data source implements. The app depends on THIS,
   never on a concrete provider.
   ============================================================================ */

import type {
  UnderlyingQuote, OptionChain, EventData, ProviderResult,
} from "./types";
import type { OptionType } from "@/domain/types";

export interface MarketDataProvider {
  readonly id: string;
  getUnderlyingQuote(symbol: string): Promise<ProviderResult<UnderlyingQuote>>;
  listExpirations(symbol: string): Promise<ProviderResult<string[]>>;
  getOptionChain(symbol: string, expiration: string): Promise<ProviderResult<OptionChain>>;
  getEvents(symbol: string): Promise<ProviderResult<EventData>>;
  /** Optional single-contract quote (some feeds support it directly). */
  getOptionQuote?(
    symbol: string, expiration: string, strike: number, type: OptionType
  ): Promise<ProviderResult<OptionChain>>;
}

/** Small retry helper with exponential backoff for retryable provider errors. */
export async function withRetry<T>(
  fn: () => Promise<ProviderResult<T>>,
  attempts = 3,
  baseDelayMs = 200
): Promise<ProviderResult<T>> {
  let last: ProviderResult<T> | null = null;
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (last.ok || !last.error.retryable) return last;
    await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
  }
  return last!;
}


/* ============================================================================
   ===== FILE: src/data/providers/demo.ts =====
   Deterministic demo provider. No network, no keys. Generates a plausible
   chain from a seeded model so the whole app works offline / for tests.
   Clearly labeled freshness: "manual" (never pretends to be realtime).
   ============================================================================ */

import type { MarketDataProvider } from "../provider";
import type {
  UnderlyingQuote, OptionChain, OptionQuote, EventData, ProviderResult,
} from "../types";
import { normalizeContract } from "../contractId";
import { blackScholes } from "@/domain/blackScholes";
import type { OptionType } from "@/domain/types";

const DEMO_SPOTS: Record<string, number> = {
  AAPL: 212.5, MSFT: 448.0, SPY: 556.0, NVDA: 122.0, TSLA: 245.0, DEMO: 100.0,
};

function baseIV(symbol: string): number {
  return symbol === "TSLA" || symbol === "NVDA" ? 0.55 : symbol === "SPY" ? 0.14 : 0.28;
}
function nowISO(): string { return new Date().toISOString(); }

function makeExpirations(): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 1; i <= 6; i++) {
    const e = new Date(d);
    e.setDate(d.getDate() + i * 21);
    out.push(e.toISOString().slice(0, 10));
  }
  return out;
}

export class DemoProvider implements MarketDataProvider {
  readonly id = "demo";

  async getUnderlyingQuote(symbol: string): Promise<ProviderResult<UnderlyingQuote>> {
    const s = DEMO_SPOTS[symbol.toUpperCase()] ?? 100;
    return {
      ok: true,
      data: {
        symbol: symbol.toUpperCase(), price: s,
        meta: { source: "demo", timestamp: nowISO(), freshness: "manual" },
      },
    };
  }

  async listExpirations(): Promise<ProviderResult<string[]>> {
    return { ok: true, data: makeExpirations() };
  }

  async getOptionChain(symbol: string, expiration: string): Promise<ProviderResult<OptionChain>> {
    const sym = symbol.toUpperCase();
    const spot = DEMO_SPOTS[sym] ?? 100;
    const iv = baseIV(sym);
    const t = Math.max(
      (new Date(expiration).getTime() - Date.now()) / (365.25 * 864e5),
      1 / 365
    );
    const step = spot < 50 ? 1 : spot < 200 ? 2.5 : 5;
    const lo = Math.round((spot * 0.8) / step) * step;
    const hi = Math.round((spot * 1.2) / step) * step;

    const quotes: OptionQuote[] = [];
    for (let k = lo; k <= hi; k += step) {
      for (const type of ["call", "put"] as OptionType[]) {
        const g = blackScholes({ spot, strike: k, t, r: 0.045, q: 0.005, sigma: iv, type });
        const mark = Math.max(g.price, 0.01);
        const halfSpread = Math.max(mark * 0.03, 0.02);
        quotes.push({
          contract: normalizeContract({ underlying: sym, expiration, strike: k, optionType: type }),
          bid: Number((mark - halfSpread).toFixed(2)),
          ask: Number((mark + halfSpread).toFixed(2)),
          mark: Number(mark.toFixed(2)),
          impliedVol: iv,
          volume: Math.round(500 * Math.exp(-Math.abs(k - spot) / (spot * 0.1))),
          openInterest: Math.round(2000 * Math.exp(-Math.abs(k - spot) / (spot * 0.15))),
          exerciseStyle: sym === "SPY" ? "american" : "american",
          meta: { source: "demo", timestamp: nowISO(), freshness: "manual" },
        });
      }
    }
    return {
      ok: true,
      data: {
        underlying: sym, expiration, quotes,
        meta: { source: "demo", timestamp: nowISO(), freshness: "manual" },
      },
    };
  }

  async getEvents(symbol: string): Promise<ProviderResult<EventData>> {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return {
      ok: true,
      data: {
        nextEarnings: symbol.toUpperCase() === "SPY" ? null : d.toISOString().slice(0, 10),
        exDividend: null,
        dividendYield: 0.005,
      },
    };
  }
}


/* ============================================================================
   ===== FILE: src/data/providers/polygon.ts =====
   Example licensed-provider adapter (skeleton). Reads its key from the SERVER
   env only. This file must never be imported into client code.
   Replace endpoints/field mapping to match your licensed contract.
   ============================================================================ */

import type { MarketDataProvider } from "../provider";
import type {
  UnderlyingQuote, OptionChain, OptionQuote, EventData, ProviderResult,
} from "../types";
import { normalizeContract } from "../contractId";
import type { OptionType } from "@/domain/types";

export class PolygonProvider implements MarketDataProvider {
  readonly id = "polygon";
  private readonly key: string;
  private readonly base: string;

  constructor(key: string, base = "https://api.polygon.io") {
    this.key = key;
    this.base = base;
  }

  private async get<T>(path: string): Promise<ProviderResult<T>> {
    try {
      const url = `${this.base}${path}${path.includes("?") ? "&" : "?"}apiKey=${this.key}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 429)
        return { ok: false, error: { code: "rate_limited", message: "Rate limited", retryable: true } };
      if (res.status === 404)
        return { ok: false, error: { code: "not_found", message: "Not found", retryable: false } };
      if (!res.ok)
        return { ok: false, error: { code: "upstream", message: `HTTP ${res.status}`, retryable: res.status >= 500 } };
      return { ok: true, data: (await res.json()) as T };
    } catch (e) {
      return { ok: false, error: { code: "upstream", message: String(e), retryable: true } };
    }
  }

  async getUnderlyingQuote(symbol: string): Promise<ProviderResult<UnderlyingQuote>> {
    const r = await this.get<any>(`/v2/last/trade/${encodeURIComponent(symbol.toUpperCase())}`);
    if (!r.ok) return r;
    const price = r.data?.results?.p;
    if (typeof price !== "number")
      return { ok: false, error: { code: "upstream", message: "Malformed quote", retryable: false } };
    return {
      ok: true,
      data: {
        symbol: symbol.toUpperCase(), price,
        meta: {
          source: "polygon",
          timestamp: new Date(r.data?.results?.t ?? Date.now()).toISOString(),
          freshness: "delayed", delayMinutes: 15,
        },
      },
    };
  }

  async listExpirations(symbol: string): Promise<ProviderResult<string[]>> {
    const r = await this.get<any>(
      `/v3/reference/options/contracts?underlying_ticker=${symbol.toUpperCase()}&limit=1000`
    );
    if (!r.ok) return r;
    const set = new Set<string>();
    for (const c of r.data?.results ?? []) if (c?.expiration_date) set.add(c.expiration_date);
    return { ok: true, data: [...set].sort() };
  }

  async getOptionChain(symbol: string, expiration: string): Promise<ProviderResult<OptionChain>> {
    const r = await this.get<any>(
      `/v3/snapshot/options/${symbol.toUpperCase()}?expiration_date=${expiration}&limit=250`
    );
    if (!r.ok) return r;
    const quotes: OptionQuote[] = [];
    for (const it of r.data?.results ?? []) {
      const det = it?.details ?? {};
      const type: OptionType = det.contract_type === "put" ? "put" : "call";
      quotes.push({
        contract: normalizeContract({
          underlying: symbol.toUpperCase(),
          expiration,
          strike: det.strike_price,
          optionType: type,
          multiplier: det.shares_per_contract ?? 100,
        }),
        bid: it?.last_quote?.bid ?? null,
        ask: it?.last_quote?.ask ?? null,
        mark: it?.day?.close ?? it?.last_quote?.midpoint ?? null,
        impliedVol: it?.implied_volatility ?? null,
        volume: it?.day?.volume ?? null,
        openInterest: it?.open_interest ?? null,
        exerciseStyle: "american",
        meta: { source: "polygon", timestamp: new Date().toISOString(), freshness: "delayed", delayMinutes: 15 },
      });
    }
    return {
      ok: true,
      data: { underlying: symbol.toUpperCase(), expiration, quotes,
        meta: { source: "polygon", timestamp: new Date().toISOString(), freshness: "delayed", delayMinutes: 15 } },
    };
  }

  async getEvents(): Promise<ProviderResult<EventData>> {
    // Polygon dividends/earnings live on other endpoints; wire as needed.
    return { ok: true, data: { nextEarnings: null, exDividend: null, dividendYield: null } };
  }
}


/* ============================================================================
   ===== FILE: src/data/serverProvider.ts =====
   SERVER-ONLY factory. Selects a provider from env. If the "import server-only"
   guard is present it throws when accidentally imported into client code.
   ============================================================================ */

import "server-only"; // Next.js: build error if this file reaches the client bundle
import type { MarketDataProvider } from "./provider";
import { DemoProvider } from "./providers/demo";
import { PolygonProvider } from "./providers/polygon";

let cached: MarketDataProvider | null = null;

export function getServerProvider(): MarketDataProvider {
  if (cached) return cached;
  const kind = process.env.MARKET_DATA_PROVIDER ?? "demo";
  const key = process.env.MARKET_DATA_API_KEY ?? "";
  const base = process.env.MARKET_DATA_BASE_URL;

  switch (kind) {
    case "polygon":
      if (!key) {
        console.warn("[OptionScope] MARKET_DATA_API_KEY missing — falling back to demo data.");
        cached = new DemoProvider();
      } else {
        cached = new PolygonProvider(key, base);
      }
      break;
    case "demo":
    default:
      cached = new DemoProvider();
  }
  return cached;
}

/** Whether we are on real (labeled) data or demo fallback — surfaced to UI. */
export function providerStatus(): { id: string; usingDemoFallback: boolean } {
  const kind = process.env.MARKET_DATA_PROVIDER ?? "demo";
  const key = process.env.MARKET_DATA_API_KEY ?? "";
  const usingDemoFallback = kind !== "demo" && !key;
  return { id: usingDemoFallback ? "demo" : kind, usingDemoFallback };
}


/* ============================================================================
   ===== FILE: src/app/api/quote/route.ts =====
   Server route: underlying quote. Key never leaves the server.
   GET /api/quote?symbol=AAPL
   ============================================================================ */

/*
import { NextRequest, NextResponse } from "next/server";
import { getServerProvider, providerStatus } from "@/data/serverProvider";
import { withRetry } from "@/data/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const provider = getServerProvider();
  const r = await withRetry(() => provider.getUnderlyingQuote(symbol));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error.code === "not_found" ? 404 : 502 });
  return NextResponse.json({ quote: r.data, status: providerStatus() });
}
*/


/* ============================================================================
   ===== FILE: src/app/api/chain/route.ts =====
   GET /api/chain?symbol=AAPL&expiration=2026-02-20
   GET /api/chain?symbol=AAPL   -> returns expirations list
   ============================================================================ */

/*
import { NextRequest, NextResponse } from "next/server";
import { getServerProvider, providerStatus } from "@/data/serverProvider";
import { withRetry } from "@/data/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const expiration = req.nextUrl.searchParams.get("expiration");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const provider = getServerProvider();

  if (!expiration) {
    const r = await withRetry(() => provider.listExpirations(symbol));
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
    return NextResponse.json({ expirations: r.data, status: providerStatus() });
  }

  const r = await withRetry(() => provider.getOptionChain(symbol, expiration));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ chain: r.data, status: providerStatus() });
}
*/


/* ============================================================================
   ===== FILE: src/app/api/events/route.ts =====
   GET /api/events?symbol=AAPL  -> earnings / ex-div / yield
   ============================================================================ */

/*
import { NextRequest, NextResponse } from "next/server";
import { getServerProvider } from "@/data/serverProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const r = await getServerProvider().getEvents(symbol);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ events: r.data });
}
*/


/* ============================================================================
   ===== FILE: src/data/client.ts =====
   CLIENT-side fetch helpers. These call our own /api routes — they NEVER see
   the provider key. Includes a manual-entry escape hatch used when a user
   overrides quotes by hand.
   ============================================================================ */

import type { UnderlyingQuote, OptionChain, EventData } from "./types";

export interface StatusInfo { id: string; usingDemoFallback: boolean }

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json())?.error?.message ?? `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const dataClient = {
  quote: (symbol: string) =>
    j<{ quote: UnderlyingQuote; status: StatusInfo }>(`/api/quote?symbol=${encodeURIComponent(symbol)}`),
  expirations: (symbol: string) =>
    j<{ expirations: string[]; status: StatusInfo }>(`/api/chain?symbol=${encodeURIComponent(symbol)}`),
  chain: (symbol: string, expiration: string) =>
    j<{ chain: OptionChain; status: StatusInfo }>(
      `/api/chain?symbol=${encodeURIComponent(symbol)}&expiration=${encodeURIComponent(expiration)}`
    ),
  events: (symbol: string) =>
    j<{ events: EventData }>(`/api/events?symbol=${encodeURIComponent(symbol)}`),
};

/** Manual-entry quote builder — always labeled "manual" freshness. */
export function manualUnderlyingQuote(symbol: string, price: number): UnderlyingQuote {
  return {
    symbol: symbol.toUpperCase(), price,
    meta: { source: "manual", timestamp: new Date().toISOString(), freshness: "manual" },
  };
}


/* ============================================================================
   ===== FILE: src/data/liquidity.ts =====
   Liquidity & event warnings from quote data. Does NOT predict fills — it
   surfaces risk flags and explains that a limit order may not execute.
   ============================================================================ */

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
