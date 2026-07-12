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
