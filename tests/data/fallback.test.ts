import { describe, it, expect } from "vitest";
import { DemoProvider } from "@/data/providers/demo";
import { FallbackProvider } from "@/data/providers/fallback";
import type { MarketDataProvider } from "@/data/provider";
import type { ProviderResult, UnderlyingQuote, OptionChain, EventData } from "@/data/types";

/** Failing primary — simulates Alpaca options 404 */
class FailOptionsProvider implements MarketDataProvider {
  readonly id = "fake-primary";
  async getUnderlyingQuote(symbol: string): Promise<ProviderResult<UnderlyingQuote>> {
    return {
      ok: true,
      data: {
        symbol: symbol.toUpperCase(),
        price: 18.8,
        meta: { source: "fake-primary", timestamp: new Date().toISOString(), freshness: "realtime" },
      },
    };
  }
  async listExpirations(): Promise<ProviderResult<string[]>> {
    return {
      ok: false,
      error: { code: "not_found", message: "No option contracts", retryable: false },
    };
  }
  async getOptionChain(): Promise<ProviderResult<OptionChain>> {
    return {
      ok: false,
      error: { code: "not_found", message: "Not found", retryable: false },
    };
  }
  async getEvents(): Promise<ProviderResult<EventData>> {
    return { ok: true, data: {} };
  }
}

describe("FallbackProvider hybrid SOFI path", () => {
  it("uses live quote spot for demo chain when options API fails", async () => {
    const demo = new DemoProvider();
    const fb = new FallbackProvider([new FailOptionsProvider()], demo);

    const q = await fb.getUnderlyingQuote("SOFI");
    expect(q.ok).toBe(true);
    if (q.ok) expect(q.data.price).toBe(18.8);

    const ex = await fb.listExpirations("SOFI");
    expect(ex.ok).toBe(true);
    if (!ex.ok) return;
    expect(ex.data.length).toBeGreaterThan(0);

    const chain = await fb.getOptionChain("SOFI", ex.data[0]!);
    expect(chain.ok).toBe(true);
    if (!chain.ok) return;
    expect(chain.data.quotes.length).toBeGreaterThan(10);
    // Synthetic board centered near live 18.8
    const strikes = chain.data.quotes.map((c) => c.contract.strike);
    const mid = (Math.min(...strikes) + Math.max(...strikes)) / 2;
    expect(mid).toBeGreaterThan(10);
    expect(mid).toBeLessThan(30);
  });
});
