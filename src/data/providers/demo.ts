import type { MarketDataProvider } from "../provider";
import type {
  UnderlyingQuote, OptionChain, OptionQuote, EventData, ProviderResult,
} from "../types";
import { normalizeContract } from "../contractId";
import { blackScholes } from "@/domain/blackScholes";
import type { OptionType } from "@/domain/types";

const DEMO_SPOTS: Record<string, number> = {
  AAPL: 212.5,
  MSFT: 448.0,
  SPY: 556.0,
  NVDA: 122.0,
  TSLA: 245.0,
  SOFI: 18.8,
  AMD: 155.0,
  AMZN: 185.0,
  META: 510.0,
  GOOGL: 175.0,
  DEMO: 100.0,
};

function baseIV(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s === "TSLA" || s === "NVDA") return 0.55;
  if (s === "SOFI" || s === "PLTR" || s === "MARA") return 0.62;
  if (s === "SPY" || s === "QQQ" || s === "IWM") return 0.14;
  return 0.32;
}

function nowISO(): string {
  return new Date().toISOString();
}

/** Next Friday + following Fridays (more realistic option board). */
function makeExpirations(): string[] {
  const out: string[] = [];
  const d = new Date();
  // advance to next Friday
  const day = d.getUTCDay();
  const add = day <= 5 ? 5 - day : 6;
  d.setUTCDate(d.getUTCDate() + (add === 0 ? 7 : add));
  for (let i = 0; i < 8; i++) {
    const e = new Date(d);
    e.setUTCDate(d.getUTCDate() + i * 7);
    // also monthly-ish every 4th
    out.push(e.toISOString().slice(0, 10));
  }
  // add ~30 and ~45 DTE if not present
  for (const days of [30, 45, 60]) {
    const e = new Date();
    e.setUTCDate(e.getUTCDate() + days);
    out.push(e.toISOString().slice(0, 10));
  }
  return [...new Set(out)].sort();
}

/**
 * Demo / synthetic chain provider.
 * Always succeeds for any ticker. Can seed spot from a live quote for hybrid fallback.
 */
export class DemoProvider implements MarketDataProvider {
  readonly id = "demo";
  /** Live spots injected when primary quote works but options fail */
  private spotOverrides = new Map<string, number>();

  /** Seed synthetic chain around a live equity price (e.g. Alpaca quote for SOFI). */
  seedSpot(symbol: string, price: number): void {
    if (price > 0 && Number.isFinite(price)) {
      this.spotOverrides.set(symbol.toUpperCase(), price);
    }
  }

  private spotFor(symbol: string): number {
    const s = symbol.toUpperCase();
    return this.spotOverrides.get(s) ?? DEMO_SPOTS[s] ?? 50;
  }

  async getUnderlyingQuote(symbol: string): Promise<ProviderResult<UnderlyingQuote>> {
    const s = symbol.toUpperCase();
    const price = this.spotFor(s);
    return {
      ok: true,
      data: {
        symbol: s,
        price,
        meta: {
          source: this.spotOverrides.has(s) ? "demo+live-spot" : "demo",
          timestamp: nowISO(),
          freshness: "manual",
        },
      },
    };
  }

  async listExpirations(_symbol?: string): Promise<ProviderResult<string[]>> {
    return { ok: true, data: makeExpirations() };
  }

  async getOptionChain(symbol: string, expiration: string): Promise<ProviderResult<OptionChain>> {
    const sym = symbol.toUpperCase();
    const spot = this.spotFor(sym);
    const iv = baseIV(sym);
    const t = Math.max(
      (new Date(expiration).getTime() - Date.now()) / (365.25 * 864e5),
      1 / 365
    );
    const step = spot < 25 ? 0.5 : spot < 50 ? 1 : spot < 200 ? 2.5 : 5;
    const lo = Math.round((spot * 0.8) / step) * step;
    const hi = Math.round((spot * 1.2) / step) * step;
    const source = this.spotOverrides.has(sym) ? "demo+live-spot" : "demo";

    const quotes: OptionQuote[] = [];
    for (let k = lo; k <= hi + 1e-9; k = Number((k + step).toFixed(4))) {
      for (const type of ["call", "put"] as OptionType[]) {
        const g = blackScholes({ spot, strike: k, t, r: 0.045, q: 0.005, sigma: iv, type });
        const mark = Math.max(g.price, 0.01);
        const halfSpread = Math.max(mark * 0.03, 0.02);
        quotes.push({
          contract: normalizeContract({
            underlying: sym,
            expiration,
            strike: Number(k.toFixed(2)),
            optionType: type,
          }),
          bid: Number((mark - halfSpread).toFixed(2)),
          ask: Number((mark + halfSpread).toFixed(2)),
          mark: Number(mark.toFixed(2)),
          impliedVol: iv,
          volume: Math.round(500 * Math.exp(-Math.abs(k - spot) / (spot * 0.1))),
          openInterest: Math.round(2000 * Math.exp(-Math.abs(k - spot) / (spot * 0.15))),
          exerciseStyle: "american",
          meta: { source, timestamp: nowISO(), freshness: "manual" },
        });
      }
    }
    return {
      ok: true,
      data: {
        underlying: sym,
        expiration,
        quotes,
        meta: { source, timestamp: nowISO(), freshness: "manual" },
      },
    };
  }

  async getEvents(symbol: string): Promise<ProviderResult<EventData>> {
    const d = new Date();
    d.setDate(d.getDate() + 30);
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
