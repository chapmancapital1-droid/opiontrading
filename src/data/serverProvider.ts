import "server-only";
import type { MarketDataProvider } from "./provider";
import { DemoProvider } from "./providers/demo";
import { PolygonProvider } from "./providers/polygon";
import { OpenBBProvider } from "./providers/openbb";
import { AlpacaProvider } from "./providers/alpaca";
import { FallbackProvider, getFallbackStatus } from "./providers/fallback";

let cached: MarketDataProvider | null = null;
let demoSingleton: DemoProvider | null = null;

function getDemo(): DemoProvider {
  if (!demoSingleton) demoSingleton = new DemoProvider();
  return demoSingleton;
}

function buildProvider(kind: string): MarketDataProvider | null {
  const key = process.env.MARKET_DATA_API_KEY ?? "";
  const base = process.env.MARKET_DATA_BASE_URL;

  switch (kind) {
    case "polygon":
      if (!key) return null;
      return new PolygonProvider(key, base);
    case "alpaca": {
      const keyId = process.env.ALPACA_API_KEY_ID ?? key;
      const secret = process.env.ALPACA_API_SECRET_KEY ?? process.env.ALPACA_SECRET_KEY ?? "";
      if (!keyId || !secret) return null;
      return new AlpacaProvider(keyId, secret, {
        dataBase: process.env.ALPACA_DATA_BASE_URL ?? "https://data.alpaca.markets",
        tradingBase:
          process.env.ALPACA_TRADING_BASE_URL ?? base ?? "https://paper-api.alpaca.markets",
      });
    }
    case "openbb":
      return new OpenBBProvider();
    case "demo":
      return getDemo();
    default:
      return null;
  }
}

/**
 * Primary + backups + always-on demo hybrid.
 * MARKET_DATA_PROVIDER=alpaca
 * MARKET_DATA_BACKUP_PROVIDERS=polygon,openbb  (optional comma list)
 */
export function getServerProvider(): MarketDataProvider {
  if (cached) return cached;

  const primary = (process.env.MARKET_DATA_PROVIDER ?? "demo").toLowerCase().trim();
  const backups = (process.env.MARKET_DATA_BACKUP_PROVIDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const ordered = [primary, ...backups, "demo"];
  const seen = new Set<string>();
  const providers: MarketDataProvider[] = [];

  for (const kind of ordered) {
    if (seen.has(kind)) continue;
    seen.add(kind);
    const p = buildProvider(kind);
    if (p) providers.push(p);
    else if (kind !== "demo") {
      console.warn(`[OptionScope] provider "${kind}" not configured — skipped`);
    }
  }

  // Always include demo as final safety net
  if (!providers.some((p) => p.id === "demo")) {
    providers.push(getDemo());
  }

  console.info(
    `[OptionScope] data cascade: ${providers.map((p) => p.id).join(" → ")}`
  );

  cached = new FallbackProvider(providers, getDemo());
  return cached;
}

/** Status for UI badges after last request. */
export function providerStatus(): {
  id: string;
  usingDemoFallback: boolean;
  quoteSource?: string;
  chainSource?: string;
  lastError?: string | null;
  tried?: string[];
} {
  const s = getFallbackStatus();
  return {
    id: s.id,
    usingDemoFallback: s.usingDemoFallback,
    quoteSource: s.quoteSource,
    chainSource: s.chainSource,
    lastError: s.lastError,
    tried: s.tried,
  };
}
