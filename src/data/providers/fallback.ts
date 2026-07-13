/**
 * Cascading market-data provider: try primary → backups → demo hybrid.
 * Ensures Trade Lab always gets a chain (synthetic if live options unavailable).
 */

import type { MarketDataProvider } from "../provider";
import type {
  UnderlyingQuote,
  OptionChain,
  EventData,
  ProviderResult,
} from "../types";
import { DemoProvider } from "./demo";

export interface FallbackStatus {
  id: string;
  usingDemoFallback: boolean;
  quoteSource: string;
  chainSource: string;
  lastError: string | null;
  tried: string[];
}

let lastStatus: FallbackStatus = {
  id: "demo",
  usingDemoFallback: true,
  quoteSource: "demo",
  chainSource: "demo",
  lastError: null,
  tried: [],
};

export function getFallbackStatus(): FallbackStatus {
  return { ...lastStatus };
}

export class FallbackProvider implements MarketDataProvider {
  readonly id = "fallback";
  private readonly chain: MarketDataProvider[];
  private readonly demo: DemoProvider;

  constructor(providers: MarketDataProvider[], demo: DemoProvider) {
    // ensure demo is last
    const withoutDemo = providers.filter((p) => p.id !== "demo");
    this.demo = demo;
    this.chain = [...withoutDemo, demo];
  }

  private setStatus(partial: Partial<FallbackStatus>): void {
    lastStatus = { ...lastStatus, ...partial };
  }

  async getUnderlyingQuote(symbol: string): Promise<ProviderResult<UnderlyingQuote>> {
    const tried: string[] = [];
    let lastErr: string | null = null;

    for (const p of this.chain) {
      tried.push(p.id);
      try {
        const r = await p.getUnderlyingQuote(symbol);
        if (r.ok && r.data.price > 0) {
          // Seed demo so synthetic options use live spot if options API fails later
          this.demo.seedSpot(symbol, r.data.price);
          this.setStatus({
            id: p.id === "demo" ? "demo" : p.id,
            usingDemoFallback: p.id === "demo",
            quoteSource: r.data.meta.source || p.id,
            lastError: null,
            tried,
          });
          return r;
        }
        if (!r.ok) lastErr = r.error.message;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }

    this.setStatus({
      id: "demo",
      usingDemoFallback: true,
      quoteSource: "demo",
      lastError: lastErr,
      tried,
    });
    return this.demo.getUnderlyingQuote(symbol);
  }

  async listExpirations(symbol: string): Promise<ProviderResult<string[]>> {
    const tried: string[] = [];
    let lastErr: string | null = null;

    for (const p of this.chain) {
      tried.push(p.id);
      try {
        const r = await p.listExpirations(symbol);
        if (r.ok && r.data.length > 0) {
          this.setStatus({
            chainSource: p.id,
            usingDemoFallback: p.id === "demo" || lastStatus.usingDemoFallback,
            lastError: p.id === "demo" ? lastErr : null,
            tried: [...lastStatus.tried, ...tried.filter((t) => !lastStatus.tried.includes(t))],
            id: lastStatus.quoteSource.includes("demo") && p.id === "demo" ? "demo" : lastStatus.id,
          });
          return r;
        }
        if (!r.ok) lastErr = `${p.id}: ${r.error.message}`;
      } catch (e) {
        lastErr = `${p.id}: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    this.setStatus({
      chainSource: "demo",
      usingDemoFallback: true,
      lastError: lastErr,
      tried,
    });
    return this.demo.listExpirations(symbol);
  }

  async getOptionChain(symbol: string, expiration: string): Promise<ProviderResult<OptionChain>> {
    const tried: string[] = [];
    let lastErr: string | null = null;

    for (const p of this.chain) {
      tried.push(p.id);
      try {
        const r = await p.getOptionChain(symbol, expiration);
        if (r.ok && r.data.quotes.length > 0) {
          const hybrid = p.id === "demo" && lastStatus.quoteSource !== "demo";
          this.setStatus({
            chainSource: hybrid ? "demo+live-spot" : r.data.meta.source || p.id,
            usingDemoFallback: p.id === "demo",
            lastError: p.id === "demo" ? lastErr : null,
            tried: [...new Set([...lastStatus.tried, ...tried])],
            id: hybrid ? `${lastStatus.quoteSource}+demo-chain` : p.id,
          });
          return r;
        }
        if (!r.ok) lastErr = `${p.id}: ${r.error.message}`;
        else lastErr = `${p.id}: empty chain`;
      } catch (e) {
        lastErr = `${p.id}: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    this.setStatus({
      chainSource: "demo",
      usingDemoFallback: true,
      lastError: lastErr,
      tried,
    });
    return this.demo.getOptionChain(symbol, expiration);
  }

  async getEvents(symbol: string): Promise<ProviderResult<EventData>> {
    for (const p of this.chain) {
      try {
        const r = await p.getEvents(symbol);
        if (r.ok) return r;
      } catch {
        /* continue */
      }
    }
    return this.demo.getEvents(symbol);
  }
}
