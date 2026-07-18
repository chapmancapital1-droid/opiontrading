/**
 * Option Strategy Scanner — Finviz-style shortlist for OptionScope.
 * Returns ≤15 tickers that fit a strategy + filters (default $8–$150).
 * Never pads with junk names. Educational shortlist only.
 */

import { STRATEGY_PICKER, type StrategyPickerItem } from "@/lib/strategyCatalog";
import { rhHistoryScoreAdjust, RH_HISTORY_LESSONS } from "@/knowledge/rhHistoryLessons";

export type ScannerBias = "any" | "bullish" | "bearish" | "neutral";

export interface ScannerFilters {
  strategyId: string;
  minPrice: number;
  maxPrice: number;
  maxResults: number;
  bias: ScannerBias;
  minFitScore: number;
  seedMode: boolean;
  useRhHistory: boolean;
}

export interface ScannerCandidate {
  symbol: string;
  name: string;
  /** Demo / last-known spot for ranking when live quote unavailable */
  defaultSpot: number;
  sector: string;
  liquid: boolean;
}

export interface ScannerHit {
  rank: number;
  symbol: string;
  name: string;
  spot: number;
  fitScore: number;
  fitPct: number;
  strategyId: string;
  strategyLabel: string;
  thesis: string;
  riskLabel: string;
  trendProxy: "up" | "sideways" | "down";
  ivRankProxy: number;
  reasons: string[];
  openLabHref: string;
}

export interface ScannerResult {
  strategyId: string;
  strategyLabel: string;
  filters: ScannerFilters;
  hits: ScannerHit[];
  qualifiedCount: number;
  scannedCount: number;
  note: string;
  disclaimer: string;
  growthPath: string;
}

/** Liquid underlyings aimed at $8–$150 seed path (demo defaults; live quotes override). */
export const SCANNER_UNIVERSE: ScannerCandidate[] = [
  { symbol: "SOFI", name: "SoFi Technologies", defaultSpot: 14, sector: "Fintech", liquid: true },
  { symbol: "PLTR", name: "Palantir", defaultSpot: 28, sector: "Software", liquid: true },
  { symbol: "HOOD", name: "Robinhood", defaultSpot: 22, sector: "Fintech", liquid: true },
  { symbol: "RIVN", name: "Rivian", defaultSpot: 12, sector: "Auto", liquid: true },
  { symbol: "NIO", name: "NIO", defaultSpot: 5.5, sector: "Auto", liquid: true },
  { symbol: "PLUG", name: "Plug Power", defaultSpot: 3.2, sector: "Energy", liquid: true },
  { symbol: "MARA", name: "Marathon Digital", defaultSpot: 18, sector: "Crypto equity", liquid: true },
  { symbol: "RIOT", name: "Riot Platforms", defaultSpot: 11, sector: "Crypto equity", liquid: true },
  { symbol: "SOUN", name: "SoundHound", defaultSpot: 9, sector: "AI", liquid: true },
  { symbol: "PATH", name: "UiPath", defaultSpot: 13, sector: "Software", liquid: true },
  { symbol: "UPST", name: "Upstart", defaultSpot: 45, sector: "Fintech", liquid: true },
  { symbol: "AFRM", name: "Affirm", defaultSpot: 38, sector: "Fintech", liquid: true },
  { symbol: "COIN", name: "Coinbase", defaultSpot: 210, sector: "Crypto equity", liquid: true },
  { symbol: "UBER", name: "Uber", defaultSpot: 72, sector: "Mobility", liquid: true },
  { symbol: "LYFT", name: "Lyft", defaultSpot: 14, sector: "Mobility", liquid: true },
  { symbol: "SNAP", name: "Snap", defaultSpot: 11, sector: "Social", liquid: true },
  { symbol: "PINS", name: "Pinterest", defaultSpot: 32, sector: "Social", liquid: true },
  { symbol: "SQ", name: "Block", defaultSpot: 68, sector: "Fintech", liquid: true },
  { symbol: "SHOP", name: "Shopify", defaultSpot: 78, sector: "Commerce", liquid: true },
  { symbol: "AMD", name: "AMD", defaultSpot: 155, sector: "Semis", liquid: true },
  { symbol: "INTC", name: "Intel", defaultSpot: 24, sector: "Semis", liquid: true },
  { symbol: "MU", name: "Micron", defaultSpot: 98, sector: "Semis", liquid: true },
  { symbol: "F", name: "Ford", defaultSpot: 12, sector: "Auto", liquid: true },
  { symbol: "GM", name: "GM", defaultSpot: 48, sector: "Auto", liquid: true },
  { symbol: "BAC", name: "Bank of America", defaultSpot: 38, sector: "Banks", liquid: true },
  { symbol: "T", name: "AT&T", defaultSpot: 18, sector: "Telecom", liquid: true },
  { symbol: "VZ", name: "Verizon", defaultSpot: 40, sector: "Telecom", liquid: true },
  { symbol: "KO", name: "Coca-Cola", defaultSpot: 62, sector: "Staples", liquid: true },
  { symbol: "PFE", name: "Pfizer", defaultSpot: 28, sector: "Healthcare", liquid: true },
  { symbol: "XOM", name: "Exxon", defaultSpot: 110, sector: "Energy", liquid: true },
  { symbol: "CVX", name: "Chevron", defaultSpot: 148, sector: "Energy", liquid: true },
  { symbol: "XLF", name: "Financial Select", defaultSpot: 44, sector: "ETF", liquid: true },
  { symbol: "XLE", name: "Energy Select", defaultSpot: 88, sector: "ETF", liquid: true },
  { symbol: "IWM", name: "Russell 2000 ETF", defaultSpot: 210, sector: "ETF", liquid: true },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", defaultSpot: 480, sector: "ETF", liquid: true },
  { symbol: "SPY", name: "S&P 500 ETF", defaultSpot: 550, sector: "ETF", liquid: true },
  { symbol: "EEM", name: "Emerging Mkts ETF", defaultSpot: 42, sector: "ETF", liquid: true },
  { symbol: "GLD", name: "Gold ETF", defaultSpot: 230, sector: "ETF", liquid: true },
  { symbol: "SLV", name: "Silver ETF", defaultSpot: 28, sector: "ETF", liquid: true },
  { symbol: "BITO", name: "Bitcoin Strategy ETF", defaultSpot: 22, sector: "ETF", liquid: true },
  { symbol: "MSTY", name: "YieldMax MSTR Opt Inc", defaultSpot: 24, sector: "Yield ETF", liquid: true },
  { symbol: "ULTY", name: "YieldMax Ultra Opt Inc", defaultSpot: 39, sector: "Yield ETF", liquid: true },
  { symbol: "YMAX", name: "YieldMax Universe", defaultSpot: 8, sector: "Yield ETF", liquid: true },
  { symbol: "SOXL", name: "Semis Bull 3x", defaultSpot: 28, sector: "Levered ETF", liquid: true },
  { symbol: "TQQQ", name: "Nasdaq Bull 3x", defaultSpot: 55, sector: "Levered ETF", liquid: true },
  { symbol: "AAPL", name: "Apple", defaultSpot: 212, sector: "Mega-cap", liquid: true },
  { symbol: "MSFT", name: "Microsoft", defaultSpot: 420, sector: "Mega-cap", liquid: true },
  { symbol: "NVDA", name: "NVIDIA", defaultSpot: 120, sector: "Semis", liquid: true },
  { symbol: "AMZN", name: "Amazon", defaultSpot: 185, sector: "Mega-cap", liquid: true },
  { symbol: "META", name: "Meta", defaultSpot: 510, sector: "Mega-cap", liquid: true },
  { symbol: "GOOGL", name: "Alphabet", defaultSpot: 175, sector: "Mega-cap", liquid: true },
  { symbol: "TSLA", name: "Tesla", defaultSpot: 245, sector: "Auto", liquid: true },
  { symbol: "NFLX", name: "Netflix", defaultSpot: 680, sector: "Media", liquid: true },
  { symbol: "DIS", name: "Disney", defaultSpot: 98, sector: "Media", liquid: true },
  { symbol: "BA", name: "Boeing", defaultSpot: 175, sector: "Industrial", liquid: true },
  { symbol: "JPM", name: "JPMorgan", defaultSpot: 198, sector: "Banks", liquid: true },
  { symbol: "WMT", name: "Walmart", defaultSpot: 95, sector: "Retail", liquid: true },
  { symbol: "NKE", name: "Nike", defaultSpot: 78, sector: "Consumer", liquid: true },
  { symbol: "SBUX", name: "Starbucks", defaultSpot: 92, sector: "Consumer", liquid: true },
  { symbol: "PYPL", name: "PayPal", defaultSpot: 68, sector: "Fintech", liquid: true },
  { symbol: "CRM", name: "Salesforce", defaultSpot: 270, sector: "Software", liquid: true },
  { symbol: "AMD", name: "AMD", defaultSpot: 155, sector: "Semis", liquid: true },
  { symbol: "ORCL", name: "Oracle", defaultSpot: 145, sector: "Software", liquid: true },
  { symbol: "CSCO", name: "Cisco", defaultSpot: 52, sector: "Tech", liquid: true },
  { symbol: "IBM", name: "IBM", defaultSpot: 185, sector: "Tech", liquid: true },
  { symbol: "GE", name: "GE Aerospace", defaultSpot: 165, sector: "Industrial", liquid: true },
  { symbol: "CAT", name: "Caterpillar", defaultSpot: 340, sector: "Industrial", liquid: true },
  { symbol: "DAL", name: "Delta", defaultSpot: 48, sector: "Airlines", liquid: true },
  { symbol: "AAL", name: "American Air", defaultSpot: 14, sector: "Airlines", liquid: true },
  { symbol: "CCL", name: "Carnival", defaultSpot: 22, sector: "Travel", liquid: true },
  { symbol: "NCLH", name: "Norwegian Cruise", defaultSpot: 19, sector: "Travel", liquid: true },
  { symbol: "DKNG", name: "DraftKings", defaultSpot: 38, sector: "Gaming", liquid: true },
  { symbol: "PENN", name: "Penn Ent.", defaultSpot: 16, sector: "Gaming", liquid: true },
  { symbol: "RBLX", name: "Roblox", defaultSpot: 42, sector: "Gaming", liquid: true },
  { symbol: "U", name: "Unity", defaultSpot: 24, sector: "Software", liquid: true },
  { symbol: "NET", name: "Cloudflare", defaultSpot: 95, sector: "Software", liquid: true },
  { symbol: "SNOW", name: "Snowflake", defaultSpot: 140, sector: "Software", liquid: true },
  { symbol: "CRWD", name: "CrowdStrike", defaultSpot: 320, sector: "Cyber", liquid: true },
  { symbol: "PANW", name: "Palo Alto", defaultSpot: 180, sector: "Cyber", liquid: true },
  { symbol: "ZM", name: "Zoom", defaultSpot: 72, sector: "Software", liquid: true },
  { symbol: "ROKU", name: "Roku", defaultSpot: 68, sector: "Media", liquid: true },
  { symbol: "ETSY", name: "Etsy", defaultSpot: 55, sector: "Commerce", liquid: true },
  { symbol: "ABNB", name: "Airbnb", defaultSpot: 135, sector: "Travel", liquid: true },
  { symbol: "DASH", name: "DoorDash", defaultSpot: 145, sector: "Delivery", liquid: true },
  { symbol: "RBLX", name: "Roblox", defaultSpot: 42, sector: "Gaming", liquid: true },
];

/** Deduped universe by symbol */
export const SCANNER_UNIVERSE_UNIQUE: ScannerCandidate[] = (() => {
  const m = new Map<string, ScannerCandidate>();
  for (const c of SCANNER_UNIVERSE) {
    if (!m.has(c.symbol)) m.set(c.symbol, c);
  }
  return [...m.values()];
})();

export const DEFAULT_SCANNER_FILTERS: ScannerFilters = {
  strategyId: "bull_put_credit",
  minPrice: 8,
  maxPrice: 150,
  maxResults: 15,
  bias: "any",
  minFitScore: 0.42,
  seedMode: true,
  useRhHistory: true,
};

type StrategyMeta = {
  thesis: "bullish" | "bearish" | "neutral" | "volatile";
  preferIv: "elevated" | "low" | "any";
  riskLabel: string;
  definedRisk: boolean;
  growthFriendly: boolean;
};

const STRATEGY_META: Record<string, StrategyMeta> = {
  bull_put_credit: {
    thesis: "bullish",
    preferIv: "elevated",
    riskLabel: "defined credit",
    definedRisk: true,
    growthFriendly: true,
  },
  bear_call_credit: {
    thesis: "bearish",
    preferIv: "elevated",
    riskLabel: "defined credit",
    definedRisk: true,
    growthFriendly: true,
  },
  iron_condor: {
    thesis: "neutral",
    preferIv: "elevated",
    riskLabel: "defined credit",
    definedRisk: true,
    growthFriendly: true,
  },
  cash_secured_put: {
    thesis: "bullish",
    preferIv: "elevated",
    riskLabel: "cash secured",
    definedRisk: false,
    growthFriendly: true,
  },
  covered_call: {
    thesis: "neutral",
    preferIv: "elevated",
    riskLabel: "shares + short call",
    definedRisk: false,
    growthFriendly: true,
  },
  bull_call_debit: {
    thesis: "bullish",
    preferIv: "low",
    riskLabel: "defined debit",
    definedRisk: true,
    growthFriendly: true,
  },
  bear_put_debit: {
    thesis: "bearish",
    preferIv: "low",
    riskLabel: "defined debit",
    definedRisk: true,
    growthFriendly: true,
  },
  long_call: {
    thesis: "bullish",
    preferIv: "low",
    riskLabel: "long premium",
    definedRisk: false,
    growthFriendly: false,
  },
  long_put: {
    thesis: "bearish",
    preferIv: "low",
    riskLabel: "long premium",
    definedRisk: false,
    growthFriendly: false,
  },
  long_straddle: {
    thesis: "volatile",
    preferIv: "low",
    riskLabel: "long vol",
    definedRisk: false,
    growthFriendly: false,
  },
  long_strangle: {
    thesis: "volatile",
    preferIv: "low",
    riskLabel: "long vol",
    definedRisk: false,
    growthFriendly: false,
  },
  money_press_put_diagonal: {
    thesis: "neutral",
    preferIv: "elevated",
    riskLabel: "diagonal income",
    definedRisk: true,
    growthFriendly: true,
  },
};

export function scannerStrategies(): StrategyPickerItem[] {
  return STRATEGY_PICKER.filter((s) => STRATEGY_META[s.id] != null || true);
}

function hashSpotNoise(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/** Stable demo proxies when live IV/trend unavailable. */
function proxies(symbol: string, spot: number): {
  ivRank: number;
  trend: "up" | "sideways" | "down";
} {
  const n = hashSpotNoise(symbol);
  const ivRank = 0.25 + n * 0.55;
  const t = (n + spot * 0.001) % 1;
  const trend: "up" | "sideways" | "down" =
    t < 0.38 ? "up" : t < 0.68 ? "sideways" : "down";
  return { ivRank, trend };
}

function metaFor(strategyId: string): StrategyMeta {
  return (
    STRATEGY_META[strategyId] ?? {
      thesis: "neutral",
      preferIv: "any",
      riskLabel: "structure",
      definedRisk: true,
      growthFriendly: true,
    }
  );
}

export function labelForStrategy(strategyId: string): string {
  return STRATEGY_PICKER.find((s) => s.id === strategyId)?.label ?? strategyId;
}

/**
 * Score universe for strategy. Optional liveSpots map overrides defaultSpot.
 */
export function runStrategyScan(
  filters: Partial<ScannerFilters> & { strategyId: string },
  liveSpots?: Record<string, number>
): ScannerResult {
  const f: ScannerFilters = {
    ...DEFAULT_SCANNER_FILTERS,
    ...filters,
    minPrice: Math.max(0.5, filters.minPrice ?? DEFAULT_SCANNER_FILTERS.minPrice),
    maxPrice: Math.max(
      filters.minPrice ?? DEFAULT_SCANNER_FILTERS.minPrice,
      filters.maxPrice ?? DEFAULT_SCANNER_FILTERS.maxPrice
    ),
    maxResults: Math.min(15, Math.max(1, filters.maxResults ?? 15)),
    minFitScore: Math.min(0.95, Math.max(0.1, filters.minFitScore ?? 0.42)),
  };

  const meta = metaFor(f.strategyId);
  const strategyLabel = labelForStrategy(f.strategyId);
  const hitsRaw: Omit<ScannerHit, "rank">[] = [];
  let scanned = 0;

  for (const c of SCANNER_UNIVERSE_UNIQUE) {
    const spot = liveSpots?.[c.symbol] ?? c.defaultSpot;
    if (spot < f.minPrice || spot > f.maxPrice) continue;
    if (!c.liquid) continue;
    scanned++;

    const { ivRank, trend } = proxies(c.symbol, spot);
    let score = 0.35;
    const reasons: string[] = [];

    // Thesis vs trend
    if (meta.thesis === "bullish") {
      if (trend === "up") {
        score += 0.22;
        reasons.push("Uptrend proxy fits bullish strategy");
      } else if (trend === "sideways") {
        score += 0.1;
        reasons.push("Sideways OK for mild bull credit/debit");
      } else {
        score -= 0.12;
        reasons.push("Downtrend conflicts with bullish thesis");
      }
    } else if (meta.thesis === "bearish") {
      if (trend === "down") {
        score += 0.22;
        reasons.push("Downtrend proxy fits bearish strategy");
      } else if (trend === "sideways") {
        score += 0.08;
        reasons.push("Sideways mild fit for bear credit");
      } else {
        score -= 0.12;
        reasons.push("Uptrend conflicts with bearish thesis");
      }
    } else if (meta.thesis === "neutral") {
      if (trend === "sideways") {
        score += 0.2;
        reasons.push("Range/sideways fits neutral premium");
      } else {
        score += 0.05;
        reasons.push("Trend day — manage condor/diagonal tighter");
      }
    } else {
      // volatile
      score += 0.12;
      reasons.push("Vol strategy — needs expansion; check IV crush risk");
    }

    // IV preference
    if (meta.preferIv === "elevated") {
      if (ivRank >= 0.55) {
        score += 0.18;
        reasons.push(`IV rank proxy ${(ivRank * 100).toFixed(0)}% elevated — good for selling premium`);
      } else if (ivRank >= 0.4) {
        score += 0.08;
        reasons.push("IV rank mid — acceptable credit entry");
      } else {
        score -= 0.08;
        reasons.push("IV rank low — credit less attractive");
      }
    } else if (meta.preferIv === "low") {
      if (ivRank <= 0.4) {
        score += 0.16;
        reasons.push("IV rank not elevated — better for debit/long premium");
      } else {
        score -= 0.1;
        reasons.push("IV elevated — debit/long premium more expensive");
      }
    }

    // User bias filter
    if (f.bias === "bullish" && meta.thesis === "bearish") continue;
    if (f.bias === "bearish" && meta.thesis === "bullish") continue;
    if (f.bias === "neutral" && (meta.thesis === "bullish" || meta.thesis === "bearish")) {
      score -= 0.05;
    }
    if (f.bias === "bullish" && meta.thesis === "bullish") score += 0.05;
    if (f.bias === "bearish" && meta.thesis === "bearish") score += 0.05;

    // Seed path → prefer defined risk
    if (f.seedMode) {
      if (meta.definedRisk) {
        score += 0.1;
        reasons.push("Seed→$20k path: defined-risk structure preferred");
      } else if (f.strategyId === "long_call" || f.strategyId === "long_put") {
        score -= 0.15;
        reasons.push("Seed path: naked long premium often bled in your RH history — caution");
      } else if (f.strategyId === "cash_secured_put" && spot > 40) {
        score -= 0.08;
        reasons.push("CSP cash-heavy at this price for small accounts — prefer credit spreads");
      }
    }

    // Liquidity / name quality
    if (c.sector === "ETF") {
      score += 0.06;
      reasons.push("ETF liquidity / cleaner chain typically");
    }
    if (c.sector.includes("Levered")) {
      score -= 0.1;
      reasons.push("Levered ETF — option spreads can be toxic; advanced only");
    }
    if (c.sector.includes("Yield")) {
      if (f.strategyId.includes("credit") || f.strategyId.includes("condor")) {
        score += 0.04;
        reasons.push("Yield ETF — active options; still check distribution risk");
      }
    }

    // Price band comfort for seed
    if (spot >= 10 && spot <= 80) {
      score += 0.06;
      reasons.push("Price band friendly for small defined-risk width");
    }

    if (f.useRhHistory) {
      const rh = rhHistoryScoreAdjust(c.symbol, f.strategyId);
      score += rh.delta;
      reasons.push(...rh.reasons);
    }

    // Clamp
    score = Math.max(0, Math.min(0.99, score));
    if (score < f.minFitScore) continue;

    hitsRaw.push({
      symbol: c.symbol,
      name: c.name,
      spot: Number(spot.toFixed(2)),
      fitScore: Number(score.toFixed(4)),
      fitPct: Math.round(score * 100),
      strategyId: f.strategyId,
      strategyLabel,
      thesis: meta.thesis,
      riskLabel: meta.riskLabel,
      trendProxy: trend,
      ivRankProxy: Number(ivRank.toFixed(3)),
      reasons: reasons.slice(0, 6),
      openLabHref: `/builder?symbol=${encodeURIComponent(c.symbol)}&strategy=${encodeURIComponent(f.strategyId)}`,
    });
  }

  hitsRaw.sort((a, b) => b.fitScore - a.fitScore);
  const top = hitsRaw.slice(0, f.maxResults).map((h, i) => ({ ...h, rank: i + 1 }));

  const note =
    top.length < f.maxResults
      ? `Only ${top.length} tickers met filters (max ${f.maxResults}). No padding.`
      : `Top ${top.length} of ${hitsRaw.length} qualified in universe.`;

  return {
    strategyId: f.strategyId,
    strategyLabel,
    filters: f,
    hits: top,
    qualifiedCount: hitsRaw.length,
    scannedCount: scanned,
    note,
    growthPath:
      "Empire path seed → $20k: scan defined-risk → size in Trade Lab → journal → Lessons stops RH mistakes.",
    disclaimer:
      "Educational shortlist only. Fit% is a model score, not a guarantee. Not trade advice. No auto-orders.",
  };
}

export function scannerFilterPresets() {
  return {
    defaults: DEFAULT_SCANNER_FILTERS,
    strategies: STRATEGY_PICKER,
    maxResultsCap: 15,
    priceHint: "Default $8–$150 for seed→$20k liquidity band; widen for mega-caps if needed.",
    rhLessonsLoaded: Boolean(RH_HISTORY_LESSONS.n_matched_trades),
  };
}
