import { describe, it, expect } from "vitest";
import { computeMarketContext, atmImpliedVol, type MarketContextInput } from "@/lib/marketContext";
import type { OptionChain, OptionQuote, UnderlyingQuote } from "@/data/types";
import type { IvSnapshot } from "@/data/ivHistory";
import type { NewsItem } from "@/data/news/types";
import type { OptionType } from "@/domain/types";

const NOW = Date.parse("2026-07-11T00:00:00.000Z");
const EXPIRY = "2026-08-08"; // 28 days out

function meta() {
  return { source: "test", timestamp: "2026-07-11T00:00:00.000Z", freshness: "delayed" as const };
}

function optQuote(
  strike: number, type: OptionType, iv: number, mark: number, spreadPct: number
): OptionQuote {
  const half = (mark * spreadPct) / 2;
  return {
    contract: {
      underlying: "TEST", expiration: EXPIRY, strike, optionType: type,
      multiplier: 100, isAdjusted: false,
    },
    bid: Number((mark - half).toFixed(2)),
    ask: Number((mark + half).toFixed(2)),
    mark,
    impliedVol: iv,
    volume: 500,
    openInterest: 2000,
    exerciseStyle: "american",
    meta: meta(),
  };
}

function makeChain(opts: {
  spot: number; iv: number; mark?: number; spreadPct?: number; strikes?: number[];
}): OptionChain {
  const { spot, iv, mark = 5, spreadPct = 0.06 } = opts;
  const strikes = opts.strikes ?? [spot - 10, spot - 5, spot, spot + 5, spot + 10];
  const quotes = strikes.flatMap((k) =>
    (["call", "put"] as OptionType[]).map((t) => optQuote(k, t, iv, mark, spreadPct))
  );
  return { underlying: "TEST", expiration: EXPIRY, quotes, meta: meta() };
}

function makeQuote(price: number): UnderlyingQuote {
  return { symbol: "TEST", price, meta: meta() };
}

function ivSeries(vals: Array<{ iv: number; spot?: number }>): IvSnapshot[] {
  return vals.map((v, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
    atmIv: v.iv,
    ...(v.spot != null ? { spot: v.spot } : {}),
  }));
}

function newsItem(title: string, sentiment: number | null): NewsItem {
  return {
    id: title, title, url: null, source: "test", provider: "test",
    published: "2026-07-10T00:00:00.000Z", symbols: ["TEST"], summary: null, sentiment,
  };
}

function baseInput(over: Partial<MarketContextInput>): MarketContextInput {
  return {
    symbol: "test",
    quote: makeQuote(100),
    chain: makeChain({ spot: 100, iv: 0.3 }),
    ivHistory: [],
    events: { nextEarnings: null, exDividend: null },
    news: [],
    now: NOW,
    ...over,
  };
}

describe("atmImpliedVol", () => {
  it("averages the ATM call/put IV", () => {
    expect(atmImpliedVol(makeChain({ spot: 100, iv: 0.42 }), 100)).toBeCloseTo(0.42, 10);
  });
  it("returns null for an empty chain", () => {
    expect(atmImpliedVol({ underlying: "X", expiration: EXPIRY, quotes: [], meta: meta() }, 100)).toBeNull();
  });
});

describe("computeMarketContext — IV signals", () => {
  it("flags elevated IV when current IV tops its history", () => {
    const ctx = computeMarketContext(baseInput({
      chain: makeChain({ spot: 100, iv: 0.6 }),
      ivHistory: ivSeries([{ iv: 0.2 }, { iv: 0.25 }, { iv: 0.22 }]),
    }));
    expect(ctx.ivRank).toBe(1);
    expect(ctx.ivTrend).toBe("elevated");
  });

  it("flags low IV at the bottom of its range", () => {
    const ctx = computeMarketContext(baseInput({
      chain: makeChain({ spot: 100, iv: 0.4 }),
      ivHistory: ivSeries([{ iv: 0.4 }, { iv: 0.5 }, { iv: 0.45 }]),
    }));
    expect(ctx.ivRank).toBe(0);
    expect(ctx.ivTrend).toBe("low");
  });

  it("is neutral mid-range and reports sample size", () => {
    const ctx = computeMarketContext(baseInput({
      chain: makeChain({ spot: 100, iv: 0.35 }),
      ivHistory: ivSeries([{ iv: 0.2 }, { iv: 0.3 }, { iv: 0.4 }, { iv: 0.5 }]),
    }));
    expect(ctx.ivRank).toBeCloseTo(0.5, 10);
    expect(ctx.ivTrend).toBe("neutral");
    expect(ctx.sampleSize).toBe(4);
  });

  it("defaults IV rank to 0.5 with a note when history is too short", () => {
    const ctx = computeMarketContext(baseInput({ chain: makeChain({ spot: 100, iv: 0.3 }) }));
    expect(ctx.ivRank).toBe(0.5);
    expect(ctx.notes.some((n) => /IV rank/i.test(n))).toBe(true);
  });
});

describe("computeMarketContext — spot trend", () => {
  it("reads 'up' when spot rose vs the history window", () => {
    const ctx = computeMarketContext(baseInput({
      quote: makeQuote(110),
      ivHistory: ivSeries([{ iv: 0.3, spot: 100 }, { iv: 0.3, spot: 102 }]),
    }));
    expect(ctx.spotTrend).toBe("up");
  });
  it("reads 'down' when spot fell vs the history window", () => {
    const ctx = computeMarketContext(baseInput({
      quote: makeQuote(90),
      ivHistory: ivSeries([{ iv: 0.3, spot: 100 }, { iv: 0.3, spot: 99 }]),
    }));
    expect(ctx.spotTrend).toBe("down");
  });
  it("defaults to 'sideways' without spot history", () => {
    const ctx = computeMarketContext(baseInput({ quote: makeQuote(100) }));
    expect(ctx.spotTrend).toBe("sideways");
  });
});

describe("computeMarketContext — expected move & liquidity", () => {
  it("expected move equals the ATM straddle price", () => {
    const ctx = computeMarketContext(baseInput({ chain: makeChain({ spot: 100, iv: 0.3, mark: 4 }) }));
    expect(ctx.expectedMove).toBeCloseTo(8, 10); // call mark 4 + put mark 4
    expect(ctx.expectedMovePct).toBeCloseTo(0.08, 10);
  });
  it("classifies tight / normal / wide from ATM spread", () => {
    const tight = computeMarketContext(baseInput({ chain: makeChain({ spot: 100, iv: 0.3, spreadPct: 0.02 }) }));
    const normal = computeMarketContext(baseInput({ chain: makeChain({ spot: 100, iv: 0.3, spreadPct: 0.08 }) }));
    const wide = computeMarketContext(baseInput({ chain: makeChain({ spot: 100, iv: 0.3, spreadPct: 0.2 }) }));
    expect(tight.liquidity).toBe("tight");
    expect(normal.liquidity).toBe("normal");
    expect(wide.liquidity).toBe("wide");
  });
});

describe("computeMarketContext — event proximity", () => {
  it("flags earnings before expiry", () => {
    const ctx = computeMarketContext(baseInput({ events: { nextEarnings: "2026-07-20", exDividend: null } }));
    expect(ctx.eventProximity).toBe("earnings");
  });
  it("flags ex-div before expiry when no earnings", () => {
    const ctx = computeMarketContext(baseInput({ events: { nextEarnings: null, exDividend: "2026-07-15" } }));
    expect(ctx.eventProximity).toBe("ex-div");
  });
  it("is clear when events fall after expiry", () => {
    const ctx = computeMarketContext(baseInput({ events: { nextEarnings: "2026-09-01", exDividend: null } }));
    expect(ctx.eventProximity).toBe("clear");
  });
});

describe("computeMarketContext — news sentiment", () => {
  it("uses numeric sentiment when available", () => {
    const ctx = computeMarketContext(baseInput({ news: [newsItem("a", 0.5), newsItem("b", 0.4)] }));
    expect(ctx.newsSentiment).toBe("positive");
  });
  it("falls back to headline keywords", () => {
    const ctx = computeMarketContext(baseInput({
      news: [newsItem("Shares plunge after surprise downgrade", null)],
    }));
    expect(ctx.newsSentiment).toBe("negative");
  });
  it("is neutral with no news", () => {
    expect(computeMarketContext(baseInput({})).newsSentiment).toBe("neutral");
  });
});

describe("computeMarketContext — resilience", () => {
  it("degrades gracefully on an empty chain without throwing", () => {
    const ctx = computeMarketContext(baseInput({
      chain: { underlying: "TEST", expiration: EXPIRY, quotes: [], meta: meta() },
    }));
    expect(ctx.atmIv).toBeNull();
    expect(ctx.ivRank).toBe(0.5);
    expect(ctx.expectedMove).toBe(0);
    expect(ctx.confidence).toBe("low");
    expect(ctx.notes.length).toBeGreaterThan(0);
  });

  it("uppercases the symbol and stamps asOf from `now`", () => {
    const ctx = computeMarketContext(baseInput({}));
    expect(ctx.symbol).toBe("TEST");
    expect(ctx.asOf).toBe(new Date(NOW).toISOString());
  });
});
