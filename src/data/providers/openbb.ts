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
          underlying: symbol, expiration: want, strike, optionType, multiplier,
          ...((): { occSymbol?: string } => {
            const occ = str(row, "contract_symbol", "symbol");
            return occ ? { occSymbol: occ } : {};
          })(),
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
