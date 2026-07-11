/* ============================================================================
   OPTIONSCOPE — OPENBB INTEGRATION (live market data + news)

   Adds an OpenBB-backed MarketDataProvider AND a News layer, matching the
   existing provider-independent architecture (see optionscope-data-layer.ts):

   - OpenBBProvider implements the SAME MarketDataProvider interface as
     DemoProvider / PolygonProvider — the calculation engine and UI need ZERO
     changes. Select it with MARKET_DATA_PROVIDER=openbb.
   - A new News layer (NewsProvider interface + OpenBBNewsProvider) fills the
     gap that no existing provider covered. Select with NEWS_PROVIDER=openbb.

   OpenBB (https://github.com/OpenBB-finance/OpenBB) normalizes 30+ data
   providers (Polygon, Tradier, CBOE, FMP, Yahoo, Intrinio, …) behind one REST
   API. Run its FastAPI server locally or on a host:

     pip install openbb
     uvicorn openbb_core.api.rest_api:app --host 0.0.0.0 --port 8000

   Then point OptionScope at it (see docs/OPENBB_SETUP.md and .env.example):

     MARKET_DATA_PROVIDER=openbb
     OPENBB_BASE_URL=http://localhost:8000
     OPENBB_API_PROVIDER=cboe          # which downstream provider OpenBB uses
     OPENBB_DELAY_MINUTES=15           # honest freshness label (see below)
     NEWS_PROVIDER=openbb
     NEWS_API_PROVIDER=benzinga        # or tiingo, fmp, intrinio, …

   HONESTY NOTE (matches the product spec): OpenBB data is delayed/EOD unless
   your downstream provider entitlement is real-time. We label everything
   "delayed" by default and surface OPENBB_DELAY_MINUTES — the app must never
   claim real-time it does not have.

   Field mapping: OpenBB REST responses look like { results: [...], provider,
   warnings, chart, extra }. Row field names vary slightly by downstream
   provider, so every mapping below reads a few likely aliases and tolerates
   nulls. Adjust the alias lists if you standardize on one provider.
   ============================================================================ */


/* ============================================================================
   ===== FILE: src/data/providers/openbb.ts =====
   OpenBB-backed MarketDataProvider. Server-only (reads env, holds base URL).
   ============================================================================ */

import "server-only";
import type { MarketDataProvider } from "../provider";
import type {
  UnderlyingQuote, OptionChain, OptionQuote, EventData, ProviderResult, Freshness,
} from "../types";
import type { OptionType, ExerciseStyle } from "@/domain/types";
import { normalizeContract } from "../contractId";

/** Read the first present, finite number from a row given candidate keys. */
function num(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}
/** Read the first present, non-empty string from a row given candidate keys. */
function str(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}

export class OpenBBProvider implements MarketDataProvider {
  readonly id = "openbb";
  private readonly base: string;
  private readonly provider: string;   // downstream OpenBB provider (cboe, tradier, …)
  private readonly delayMinutes: number;

  constructor(opts?: { baseUrl?: string; provider?: string; delayMinutes?: number }) {
    this.base = (opts?.baseUrl ?? process.env.OPENBB_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
    this.provider = opts?.provider ?? process.env.OPENBB_API_PROVIDER ?? "cboe";
    this.delayMinutes = opts?.delayMinutes ?? Number(process.env.OPENBB_DELAY_MINUTES ?? 15);
  }

  private meta(freshness: Freshness = "delayed") {
    return {
      source: "openbb",
      timestamp: new Date().toISOString(),
      freshness,
      ...(freshness === "delayed" ? { delayMinutes: this.delayMinutes } : {}),
    };
  }

  /** GET a versioned OpenBB REST path and return its `results` array. */
  private async get(path: string, params: Record<string, string>): Promise<ProviderResult<Record<string, unknown>[]>> {
    const qs = new URLSearchParams({ provider: this.provider, ...params }).toString();
    const url = `${this.base}/api/v1${path}?${qs}`;
    let res: Response;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch (e) {
      return { ok: false, error: { code: "upstream", message: `OpenBB unreachable at ${this.base}: ${(e as Error).message}`, retryable: true } };
    }
    if (res.status === 429) return { ok: false, error: { code: "rate_limited", message: "OpenBB rate limited", retryable: true } };
    if (res.status === 404) return { ok: false, error: { code: "not_found", message: `Not found: ${path}`, retryable: false } };
    if (!res.ok) return { ok: false, error: { code: "upstream", message: `OpenBB ${res.status} on ${path}`, retryable: res.status >= 500 } };
    let body: unknown;
    try { body = await res.json(); } catch { return { ok: false, error: { code: "upstream", message: "OpenBB returned non-JSON", retryable: true } }; }
    const results = (body as { results?: unknown }).results;
    if (!Array.isArray(results)) return { ok: false, error: { code: "upstream", message: "OpenBB response missing results[]", retryable: false } };
    return { ok: true, data: results as Record<string, unknown>[] };
  }

  async getUnderlyingQuote(symbol: string): Promise<ProviderResult<UnderlyingQuote>> {
    const r = await this.get("/equity/price/quote", { symbol });
    if (!r.ok) return r;
    const row = r.data[0];
    if (!row) return { ok: false, error: { code: "not_found", message: `No quote for ${symbol}`, retryable: false } };
    const price = num(row, "last_price", "price", "close", "prev_close");
    if (price == null) return { ok: false, error: { code: "upstream", message: `No price field for ${symbol}`, retryable: false } };
    return { ok: true, data: { symbol: symbol.toUpperCase(), price, meta: this.meta() } };
  }

  async listExpirations(symbol: string): Promise<ProviderResult<string[]>> {
    const r = await this.get("/derivatives/options/chains", { symbol });
    if (!r.ok) return r;
    const set = new Set<string>();
    for (const row of r.data) {
      const exp = str(row, "expiration", "expiration_date", "expiry");
      if (exp) set.add(exp.slice(0, 10));
    }
    return { ok: true, data: [...set].sort() };
  }

  async getOptionChain(symbol: string, expiration: string): Promise<ProviderResult<OptionChain>> {
    const r = await this.get("/derivatives/options/chains", { symbol });
    if (!r.ok) return r;
    const want = expiration.slice(0, 10);
    const quotes: OptionQuote[] = [];
    for (const row of r.data) {
      const exp = str(row, "expiration", "expiration_date", "expiry");
      if (!exp || exp.slice(0, 10) !== want) continue;
      const strike = num(row, "strike", "strike_price");
      const typeRaw = (str(row, "option_type", "type", "contract_type") ?? "").toLowerCase();
      const optionType: OptionType | null =
        typeRaw.startsWith("c") ? "call" : typeRaw.startsWith("p") ? "put" : null;
      if (strike == null || optionType == null) continue;

      const bid = num(row, "bid");
      const ask = num(row, "ask");
      const mark = num(row, "mark", "last_trade_price", "last_price", "close") ??
        (bid != null && ask != null ? (bid + ask) / 2 : null);
      const iv = num(row, "implied_volatility", "iv");
      const multiplier = num(row, "contract_multiplier", "multiplier") ?? 100;

      quotes.push({
        contract: normalizeContract({
          underlying: symbol, expiration: want, strike, optionType,
          multiplier, occSymbol: str(row, "contract_symbol", "symbol") ?? undefined,
        }),
        bid, ask, mark,
        impliedVol: iv,                       // OpenBB reports IV as a decimal
        volume: num(row, "volume"),
        openInterest: num(row, "open_interest", "oi"),
        exerciseStyle: "american" as ExerciseStyle,   // US equity options; override for index
        meta: this.meta(),
      });
    }
    if (quotes.length === 0) {
      return { ok: false, error: { code: "not_found", message: `No contracts for ${symbol} ${want}`, retryable: false } };
    }
    return { ok: true, data: { underlying: symbol.toUpperCase(), expiration: want, quotes, meta: this.meta() } };
  }

  async getEvents(symbol: string): Promise<ProviderResult<EventData>> {
    const out: EventData = { nextEarnings: null, exDividend: null, dividendYield: null };
    // Earnings calendar (best-effort; endpoint availability depends on provider entitlement).
    const earn = await this.get("/equity/calendar/earnings", { symbol });
    if (earn.ok && earn.data[0]) out.nextEarnings = str(earn.data[0], "report_date", "date") ?? null;
    // Dividends.
    const div = await this.get("/equity/fundamental/dividends", { symbol });
    if (div.ok && div.data[0]) {
      out.exDividend = str(div.data[0], "ex_dividend_date", "ex_date", "date") ?? null;
      out.dividendYield = num(div.data[0], "yield", "dividend_yield");
    }
    return { ok: true, data: out };   // events are best-effort; never fail the trade over them
  }
}


/* ============================================================================
   ===== FILE: src/data/news/types.ts =====
   News DTOs. Mirrors the market-data layer: every item is timestamped and
   carries its source. Sentiment is optional (provider-dependent).
   ============================================================================ */

export interface NewsItem {
  id: string;
  title: string;
  url: string | null;
  source: string;              // publisher/site, e.g. "Benzinga"
  provider: string;            // upstream id, e.g. "openbb"
  published: string;           // ISO timestamp
  symbols: string[];           // tickers referenced
  summary: string | null;
  sentiment: number | null;    // optional, -1..1 when provided
}

export interface NewsQuery {
  symbol?: string;             // omit for broad market/world news
  limit?: number;
}


/* ============================================================================
   ===== FILE: src/data/news/provider.ts =====
   The single News interface the app depends on. Reuses ProviderResult so error
   handling and withRetry() from the market-data layer apply unchanged.
   ============================================================================ */

import type { ProviderResult } from "../types";
import type { NewsItem, NewsQuery } from "./types";

export interface NewsProvider {
  readonly id: string;
  /** Company/ticker news when query.symbol is set, else broad market news. */
  getNews(query: NewsQuery): Promise<ProviderResult<NewsItem[]>>;
}


/* ============================================================================
   ===== FILE: src/data/news/providers/openbb.ts =====
   OpenBB-backed news. /news/company for a ticker, /news/world otherwise.
   ============================================================================ */

import "server-only";
import type { NewsProvider } from "../provider";
import type { NewsItem, NewsQuery } from "../types";
import type { ProviderResult } from "../../types";

export class OpenBBNewsProvider implements NewsProvider {
  readonly id = "openbb";
  private readonly base: string;
  private readonly provider: string;

  constructor(opts?: { baseUrl?: string; provider?: string }) {
    this.base = (opts?.baseUrl ?? process.env.OPENBB_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
    this.provider = opts?.provider ?? process.env.NEWS_API_PROVIDER ?? "benzinga";
  }

  async getNews(query: NewsQuery): Promise<ProviderResult<NewsItem[]>> {
    const limit = String(query.limit ?? 20);
    const path = query.symbol ? "/news/company" : "/news/world";
    const params = new URLSearchParams({ provider: this.provider, limit });
    if (query.symbol) params.set("symbol", query.symbol);
    const url = `${this.base}/api/v1${path}?${params.toString()}`;

    let res: Response;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch (e) {
      return { ok: false, error: { code: "upstream", message: `OpenBB news unreachable: ${(e as Error).message}`, retryable: true } };
    }
    if (res.status === 429) return { ok: false, error: { code: "rate_limited", message: "OpenBB news rate limited", retryable: true } };
    if (!res.ok) return { ok: false, error: { code: "upstream", message: `OpenBB news ${res.status}`, retryable: res.status >= 500 } };

    let body: unknown;
    try { body = await res.json(); } catch { return { ok: false, error: { code: "upstream", message: "OpenBB news non-JSON", retryable: true } }; }
    const rows = (body as { results?: unknown }).results;
    if (!Array.isArray(rows)) return { ok: false, error: { code: "upstream", message: "OpenBB news missing results[]", retryable: false } };

    const items: NewsItem[] = rows.map((raw, i) => {
      const row = raw as Record<string, unknown>;
      const pick = (...keys: string[]): string | null => {
        for (const k of keys) { const v = row[k]; if (typeof v === "string" && v.trim() !== "") return v; }
        return null;
      };
      const symbolsRaw = row["symbols"];
      const symbols =
        Array.isArray(symbolsRaw) ? symbolsRaw.map(String)
        : typeof symbolsRaw === "string" ? symbolsRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : query.symbol ? [query.symbol.toUpperCase()] : [];
      const sentRaw = row["sentiment"];
      return {
        id: pick("id", "url") ?? `openbb-${i}`,
        title: pick("title", "headline") ?? "(untitled)",
        url: pick("url", "link"),
        source: pick("source", "publisher", "site") ?? "unknown",
        provider: "openbb",
        published: pick("date", "published", "published_at", "created_at") ?? new Date().toISOString(),
        symbols,
        summary: pick("text", "summary", "description"),
        sentiment: typeof sentRaw === "number" ? sentRaw : null,
      };
    });
    return { ok: true, data: items };
  }
}


/* ============================================================================
   ===== FILE: src/data/news/serverNews.ts =====
   News factory, mirrors serverProvider.getServerProvider(). NEWS_PROVIDER
   selects the implementation; "none" disables the news panel cleanly.
   ============================================================================ */

import "server-only";
import type { NewsProvider } from "./provider";
import { OpenBBNewsProvider } from "./providers/openbb";

let cachedNews: NewsProvider | null = null;

export function getServerNewsProvider(): NewsProvider | null {
  if (cachedNews) return cachedNews;
  const kind = process.env.NEWS_PROVIDER ?? "none";
  switch (kind) {
    case "openbb":
      cachedNews = new OpenBBNewsProvider();
      return cachedNews;
    case "none":
    default:
      return null;   // UI hides the news panel when null
  }
}


/* ============================================================================
   ===== PATCH: src/data/serverProvider.ts =====
   Add an "openbb" case to the existing getServerProvider() switch. OpenBB
   needs no OptionScope-side API key (keys live in OpenBB's own config), so it
   is gated on OPENBB_BASE_URL rather than MARKET_DATA_API_KEY.

     import { OpenBBProvider } from "./providers/openbb";

     case "openbb":
       cached = new OpenBBProvider();   // reads OPENBB_* env
       break;

   And in providerStatus(), treat "openbb" as real (labeled) data:
     const usingDemoFallback =
       kind !== "demo" && kind !== "openbb" && !key;
   ============================================================================ */


/* ============================================================================
   ===== FILE: src/app/api/news/route.ts =====
   Server route: news. Keys never leave the server (they live in OpenBB).
   GET /api/news?symbol=AAPL&limit=20   (omit symbol for market news)
   ============================================================================ */

/*
import { NextRequest, NextResponse } from "next/server";
import { getServerNewsProvider } from "@/data/news/serverNews";
import { withRetry } from "@/data/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const provider = getServerNewsProvider();
  if (!provider) return NextResponse.json({ items: [], disabled: true });

  const symbol = req.nextUrl.searchParams.get("symbol") ?? undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const r = await withRetry(() => provider.getNews({ symbol, limit }));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error.code === "rate_limited" ? 429 : 502 });
  return NextResponse.json({ items: r.data, source: provider.id });
}
*/


/* ============================================================================
   ===== FILE: src/data/news/client.ts =====
   Tiny browser client for the news panel (mirrors the market-data client).
   ============================================================================ */

import type { NewsItem } from "./types";

export async function fetchNews(symbol?: string, limit = 20): Promise<{ items: NewsItem[]; disabled?: boolean }> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (symbol) qs.set("symbol", symbol);
  const res = await fetch(`/api/news?${qs.toString()}`);
  if (!res.ok) throw new Error(`news ${res.status}`);
  return res.json();
}
