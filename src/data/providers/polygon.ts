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
