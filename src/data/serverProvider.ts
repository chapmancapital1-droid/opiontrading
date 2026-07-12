import "server-only"; // Next.js: build error if this file reaches the client bundle
import type { MarketDataProvider } from "./provider";
import { DemoProvider } from "./providers/demo";
import { PolygonProvider } from "./providers/polygon";
import { OpenBBProvider } from "./providers/openbb";

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
  const key = process.env.MARKET_DATA_API_KEY ?? "";
  const usingDemoFallback = kind !== "demo" && kind !== "openbb" && !key;
  return { id: usingDemoFallback ? "demo" : kind, usingDemoFallback };
}
