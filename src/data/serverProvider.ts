import "server-only"; // Next.js: build error if this file reaches the client bundle
import type { MarketDataProvider } from "./provider";
import { DemoProvider } from "./providers/demo";
import { PolygonProvider } from "./providers/polygon";
import { OpenBBProvider } from "./providers/openbb";
import { AlpacaProvider } from "./providers/alpaca";

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
    case "alpaca": {
      const keyId = process.env.ALPACA_API_KEY_ID ?? key;
      const secret = process.env.ALPACA_API_SECRET_KEY ?? process.env.ALPACA_SECRET_KEY ?? "";
      if (!keyId || !secret) {
        console.warn("[OptionScope] ALPACA_API_KEY_ID/SECRET missing — falling back to demo data.");
        cached = new DemoProvider();
      } else {
        cached = new AlpacaProvider(keyId, secret, {
          dataBase: process.env.ALPACA_DATA_BASE_URL ?? "https://data.alpaca.markets",
          tradingBase:
            process.env.ALPACA_TRADING_BASE_URL ??
            base ??
            "https://paper-api.alpaca.markets",
        });
      }
      break;
    }
    case "openbb":
      cached = new OpenBBProvider(); // reads OPENBB_* env; keys live in OpenBB
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
  if (kind === "demo" || kind === "openbb") {
    return { id: kind, usingDemoFallback: false };
  }
  if (kind === "alpaca") {
    const keyId = process.env.ALPACA_API_KEY_ID ?? process.env.MARKET_DATA_API_KEY ?? "";
    const secret = process.env.ALPACA_API_SECRET_KEY ?? process.env.ALPACA_SECRET_KEY ?? "";
    const ok = Boolean(keyId && secret);
    return { id: ok ? "alpaca" : "demo", usingDemoFallback: !ok };
  }
  const key = process.env.MARKET_DATA_API_KEY ?? "";
  const usingDemoFallback = !key;
  return { id: usingDemoFallback ? "demo" : kind, usingDemoFallback };
}
