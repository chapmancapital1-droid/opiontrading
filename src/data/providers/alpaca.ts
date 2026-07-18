/**
 * Alpaca paper / live market-data provider.
 *
 * Auth: APCA-API-KEY-ID + APCA-API-SECRET-KEY (server-only env).
 * Quotes & option chains use the Market Data API (data.alpaca.markets).
 * Paper trading base (paper-api.alpaca.markets) is for account/orders later —
 * OptionScope never places orders automatically.
 *
 * Educational analysis only — not investment advice.
 */

import type { MarketDataProvider } from "../provider";
import type {
  UnderlyingQuote,
  OptionChain,
  OptionQuote,
  EventData,
  ProviderResult,
} from "../types";
import { normalizeContract } from "../contractId";
import type { OptionType } from "@/domain/types";

export class AlpacaProvider implements MarketDataProvider {
  readonly id = "alpaca";
  private readonly keyId: string;
  private readonly secret: string;
  private readonly dataBase: string;
  private readonly tradingBase: string;

  constructor(
    keyId: string,
    secret: string,
    opts?: { dataBase?: string; tradingBase?: string }
  ) {
    this.keyId = keyId;
    this.secret = secret;
    this.dataBase = (opts?.dataBase ?? "https://data.alpaca.markets").replace(/\/$/, "");
    this.tradingBase = (opts?.tradingBase ?? "https://paper-api.alpaca.markets").replace(
      /\/$/,
      ""
    );
  }

  private headers(): HeadersInit {
    return {
      "APCA-API-KEY-ID": this.keyId,
      "APCA-API-SECRET-KEY": this.secret,
      Accept: "application/json",
    };
  }

  private async getData<T>(path: string): Promise<ProviderResult<T>> {
    try {
      const url = `${this.dataBase}${path.startsWith("/") ? path : `/${path}`}`;
      const res = await fetch(url, { headers: this.headers(), cache: "no-store" });
      if (res.status === 401 || res.status === 403)
        return {
          ok: false,
          error: {
            code: "upstream",
            message: `Alpaca auth failed HTTP ${res.status}`,
            retryable: false,
          },
        };
      if (res.status === 429)
        return {
          ok: false,
          error: { code: "rate_limited", message: "Alpaca rate limited", retryable: true },
        };
      if (res.status === 404)
        return { ok: false, error: { code: "not_found", message: "Not found", retryable: false } };
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          error: {
            code: "upstream",
            message: `Alpaca HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
            retryable: res.status >= 500,
          },
        };
      }
      return { ok: true, data: (await res.json()) as T };
    } catch (e) {
      return { ok: false, error: { code: "upstream", message: String(e), retryable: true } };
    }
  }

  async getUnderlyingQuote(symbol: string): Promise<ProviderResult<UnderlyingQuote>> {
    const sym = symbol.toUpperCase();
    // Latest trade (SIP or IEX depending on plan)
    const r = await this.getData<any>(
      `/v2/stocks/${encodeURIComponent(sym)}/trades/latest?feed=iex`
    );
    if (!r.ok) {
      // Fallback: latest quote mid
      const q = await this.getData<any>(
        `/v2/stocks/${encodeURIComponent(sym)}/quotes/latest?feed=iex`
      );
      if (!q.ok) return q;
      const bid = q.data?.quote?.bp;
      const ask = q.data?.quote?.ap;
      const mid =
        typeof bid === "number" && typeof ask === "number" && bid > 0 && ask > 0
          ? (bid + ask) / 2
          : typeof ask === "number"
            ? ask
            : typeof bid === "number"
              ? bid
              : null;
      if (mid == null)
        return {
          ok: false,
          error: { code: "upstream", message: "Malformed Alpaca quote", retryable: false },
        };
      return {
        ok: true,
        data: {
          symbol: sym,
          price: Number(mid.toFixed(4)),
          meta: {
            source: "alpaca",
            timestamp: q.data?.quote?.t ?? new Date().toISOString(),
            freshness: "realtime",
          },
        },
      };
    }
    const price = r.data?.trade?.p;
    if (typeof price !== "number")
      return {
        ok: false,
        error: { code: "upstream", message: "Malformed Alpaca trade", retryable: false },
      };
    return {
      ok: true,
      data: {
        symbol: sym,
        price,
        meta: {
          source: "alpaca",
          timestamp: r.data?.trade?.t ?? new Date().toISOString(),
          freshness: "realtime",
        },
      },
    };
  }

  async listExpirations(symbol: string): Promise<ProviderResult<string[]>> {
    const sym = symbol.toUpperCase();
    const set = new Set<string>();
    let pageToken: string | undefined;
    // Paginate contracts reference (cap pages to stay snappy)
    for (let page = 0; page < 8; page++) {
      const qs = new URLSearchParams({
        underlying_symbols: sym,
        status: "active",
        limit: "1000",
      });
      if (pageToken) qs.set("page_token", pageToken);
      const r = await this.getData<any>(`/v1beta1/options/contracts?${qs.toString()}`);
      if (!r.ok) return r;
      for (const c of r.data?.option_contracts ?? r.data?.contracts ?? []) {
        const exp = c?.expiration_date;
        if (exp) set.add(String(exp).slice(0, 10));
      }
      pageToken = r.data?.next_page_token;
      if (!pageToken) break;
    }
    const list = [...set].sort();
    if (!list.length)
      return {
        ok: false,
        error: {
          code: "not_found",
          message: `No option contracts for ${sym} (check Alpaca options entitlement)`,
          retryable: false,
        },
      };
    return { ok: true, data: list };
  }

  async getOptionChain(symbol: string, expiration: string): Promise<ProviderResult<OptionChain>> {
    const sym = symbol.toUpperCase();
    const exp = expiration.slice(0, 10);

    // Snapshot for underlying options filtered by expiration when supported
    const qs = new URLSearchParams({
      feed: "indicative",
      limit: "250",
    });
    // Some plans accept expiration filter on snapshots
    qs.set("type", "call");
    const calls = await this.getData<any>(
      `/v1beta1/options/snapshots/${encodeURIComponent(sym)}?${qs.toString()}&expiration_date=${exp}`
    );
    qs.set("type", "put");
    const puts = await this.getData<any>(
      `/v1beta1/options/snapshots/${encodeURIComponent(sym)}?${qs.toString()}&expiration_date=${exp}`
    );

    // Fallback: list contracts for expiry then batch snapshots by symbol
    if ((!calls.ok && !puts.ok) || emptySnapshots(calls) && emptySnapshots(puts)) {
      return this.chainViaContracts(sym, exp);
    }

    const quotes: OptionQuote[] = [];
    const now = new Date().toISOString();
    mergeSnapshots(calls, sym, exp, quotes, now);
    mergeSnapshots(puts, sym, exp, quotes, now);

    if (!quotes.length) return this.chainViaContracts(sym, exp);

    return {
      ok: true,
      data: {
        underlying: sym,
        expiration: exp,
        quotes,
        meta: { source: "alpaca", timestamp: now, freshness: "realtime" },
      },
    };
  }

  private async chainViaContracts(
    sym: string,
    exp: string
  ): Promise<ProviderResult<OptionChain>> {
    const r = await this.getData<any>(
      `/v1beta1/options/contracts?underlying_symbols=${sym}&expiration_date=${exp}&status=active&limit=1000`
    );
    if (!r.ok) return r;
    const contracts = r.data?.option_contracts ?? r.data?.contracts ?? [];
    if (!contracts.length)
      return {
        ok: false,
        error: {
          code: "not_found",
          message: `No contracts for ${sym} ${exp}`,
          retryable: false,
        },
      };

    // Snapshot by OCC symbols in chunks
    const symbols: string[] = contracts
      .map((c: any) => c?.symbol)
      .filter((s: unknown): s is string => typeof s === "string");
    const snapMap = new Map<string, any>();
    for (let i = 0; i < symbols.length; i += 100) {
      const chunk = symbols.slice(i, i + 100);
      const sr = await this.getData<any>(
        `/v1beta1/options/snapshots?symbols=${encodeURIComponent(chunk.join(","))}&feed=indicative`
      );
      if (sr.ok && sr.data?.snapshots) {
        for (const [k, v] of Object.entries(sr.data.snapshots)) snapMap.set(k, v);
      }
    }

    const now = new Date().toISOString();
    const quotes: OptionQuote[] = [];
    for (const c of contracts) {
      const type: OptionType = String(c.type || c.option_type || "").toLowerCase() === "put" ? "put" : "call";
      const strike = Number(c.strike_price);
      if (!Number.isFinite(strike)) continue;
      const snap = snapMap.get(c.symbol) ?? {};
      const bid = snap?.latestQuote?.bp ?? snap?.latest_quote?.bp ?? null;
      const ask = snap?.latestQuote?.ap ?? snap?.latest_quote?.ap ?? null;
      const last = snap?.latestTrade?.p ?? snap?.latest_trade?.p ?? null;
      const mark =
        typeof bid === "number" && typeof ask === "number" && bid > 0 && ask > 0
          ? (bid + ask) / 2
          : typeof last === "number"
            ? last
            : typeof ask === "number"
              ? ask
              : typeof bid === "number"
                ? bid
                : null;
      const iv =
        snap?.greeks?.iv ??
        snap?.impliedVolatility ??
        snap?.implied_volatility ??
        null;
      quotes.push({
        contract: normalizeContract({
          underlying: sym,
          expiration: exp,
          strike,
          optionType: type,
          multiplier: Number(c.size ?? c.multiplier ?? 100) || 100,
          occSymbol: c.symbol,
        }),
        bid: typeof bid === "number" ? bid : null,
        ask: typeof ask === "number" ? ask : null,
        mark: typeof mark === "number" ? mark : null,
        impliedVol: typeof iv === "number" ? iv : null,
        volume: snap?.dailyBar?.v ?? snap?.day?.volume ?? null,
        openInterest: c.open_interest != null ? Number(c.open_interest) : null,
        exerciseStyle: "american",
        meta: { source: "alpaca", timestamp: now, freshness: "realtime" },
      });
    }

    return {
      ok: true,
      data: {
        underlying: sym,
        expiration: exp,
        quotes,
        meta: { source: "alpaca", timestamp: now, freshness: "realtime" },
      },
    };
  }

  async getEvents(): Promise<ProviderResult<EventData>> {
    // Calendar / corporate actions can be wired later from Trading API
    void this.tradingBase;
    return { ok: true, data: { nextEarnings: null, exDividend: null, dividendYield: null } };
  }
}

function emptySnapshots(r: ProviderResult<any>): boolean {
  if (!r.ok) return true;
  const s = r.data?.snapshots ?? r.data;
  if (!s || typeof s !== "object") return true;
  return Object.keys(s).length === 0;
}

function mergeSnapshots(
  r: ProviderResult<any>,
  sym: string,
  exp: string,
  quotes: OptionQuote[],
  now: string
): void {
  if (!r.ok) return;
  const snaps = r.data?.snapshots ?? r.data;
  if (!snaps || typeof snaps !== "object") return;
  for (const [occ, snap] of Object.entries(snaps as Record<string, any>)) {
    const parsed = parseOcc(occ, sym);
    if (!parsed) continue;
    if (parsed.expiration !== exp) continue;
    const bid = snap?.latestQuote?.bp ?? snap?.latest_quote?.bp ?? null;
    const ask = snap?.latestQuote?.ap ?? snap?.latest_quote?.ap ?? null;
    const last = snap?.latestTrade?.p ?? snap?.latest_trade?.p ?? null;
    const mark =
      typeof bid === "number" && typeof ask === "number" && bid > 0 && ask > 0
        ? (bid + ask) / 2
        : typeof last === "number"
          ? last
          : null;
    const iv = snap?.greeks?.iv ?? snap?.impliedVolatility ?? null;
    quotes.push({
      contract: normalizeContract({
        underlying: sym,
        expiration: exp,
        strike: parsed.strike,
        optionType: parsed.type,
        multiplier: 100,
        occSymbol: occ,
      }),
      bid: typeof bid === "number" ? bid : null,
      ask: typeof ask === "number" ? ask : null,
      mark: typeof mark === "number" ? mark : null,
      impliedVol: typeof iv === "number" ? iv : null,
      volume: null,
      openInterest: null,
      exerciseStyle: "american",
      meta: { source: "alpaca", timestamp: now, freshness: "realtime" },
    });
  }
}

/** Best-effort OCC parse: AAPL250718C00190000 */
function parseOcc(
  occ: string,
  underlying: string
): { expiration: string; type: OptionType; strike: number } | null {
  const u = underlying.toUpperCase();
  if (!occ.toUpperCase().startsWith(u)) return null;
  const rest = occ.slice(u.length);
  // YYMMDD C/P strike*1000
  const m = rest.match(/^(\d{6})([CP])(\d{8})$/i);
  if (!m) return null;
  const yy = m[1]!.slice(0, 2);
  const mm = m[1]!.slice(2, 4);
  const dd = m[1]!.slice(4, 6);
  const year = Number(yy) >= 70 ? `19${yy}` : `20${yy}`;
  const type: OptionType = m[2]!.toUpperCase() === "P" ? "put" : "call";
  const strike = Number(m[3]) / 1000;
  return { expiration: `${year}-${mm}-${dd}`, type, strike };
}
