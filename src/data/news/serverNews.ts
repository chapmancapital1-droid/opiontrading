import "server-only";
import type { NewsProvider } from "./provider";
import { OpenBBNewsProvider } from "./providers/openbb";

let cachedNews: NewsProvider | null = null;

export function getServerNewsProvider(): NewsProvider | null {
  if (cachedNews) return cachedNews;
  const kind = process.env.NEWS_PROVIDER ?? "none";
  switch (kind) {
    case "openbb":
      cachedNews = new OpenBBNewsProvider();
      return cachedNews;
    case "none":
    default:
      return null;   // UI hides the news panel when null
  }
}


/* ============================================================================
   ===== PATCH: src/data/serverProvider.ts =====
   Add an "openbb" case to the existing getServerProvider() switch. OpenBB
   needs no OptionScope-side API key (keys live in OpenBB's own config), so it
   is gated on OPENBB_BASE_URL rather than MARKET_DATA_API_KEY.

     import { OpenBBProvider } from "./providers/openbb";

     case "openbb":
       cached = new OpenBBProvider();   // reads OPENBB_* env
       break;

   And in providerStatus(), treat "openbb" as real (labeled) data:
     const usingDemoFallback =
       kind !== "demo" && kind !== "openbb" && !key;
   ============================================================================ */
