import { describe, it, expect } from "vitest";
import { STRATEGY_RULES, getRuleById } from "@/knowledge/strategyRules";
import { BOOK_INGEST_RULES, BOOK_INGEST_META } from "@/knowledge/bookIngestRules";
import {
  searchCatalog,
  listCatalogCategories,
  listIngestedSources,
  getIngestMeta,
} from "@/knowledge/catalog";

describe("PDF ingest meta", () => {
  it("records a successful multi-book ingest", () => {
    expect(BOOK_INGEST_META.booksOk).toBeGreaterThanOrEqual(50);
    expect(BOOK_INGEST_META.entryCount).toBeGreaterThanOrEqual(500);
    expect(BOOK_INGEST_META.seedCount).toBeGreaterThanOrEqual(20);
    expect(getIngestMeta().version).toBe("1.0.0");
  });
});

describe("BOOK_INGEST_RULES", () => {
  it("exports valid StrategyRule objects wired into STRATEGY_RULES", () => {
    expect(BOOK_INGEST_RULES.length).toBeGreaterThanOrEqual(20);
    for (const r of BOOK_INGEST_RULES) {
      expect(r.id.startsWith("ingest_")).toBe(true);
      expect(r.bookSource.length).toBeGreaterThan(5);
      expect(r.entryRules.length).toBeGreaterThan(0);
      expect(r.dteMin).toBeLessThanOrEqual(r.dteMax);
      expect(getRuleById(r.id)?.name).toBe(r.name);
    }
    // all ingest rules present in master list
    const ids = new Set(STRATEGY_RULES.map((r) => r.id));
    for (const r of BOOK_INGEST_RULES) {
      expect(ids.has(r.id)).toBe(true);
    }
  });

  it("covers primary growth strategies from the book library", () => {
    const sids = new Set(BOOK_INGEST_RULES.map((r) => r.strategyId));
    expect(sids.has("cash_secured_put")).toBe(true);
    expect(sids.has("covered_call")).toBe(true);
    expect(sids.has("bull_put_credit")).toBe(true);
    expect(sids.has("iron_condor")).toBe(true);
  });
});

describe("knowledge catalog search", () => {
  it("lists categories from OTA catalog", () => {
    const cats = listCatalogCategories();
    expect(cats).toContain("Trading Strategies");
    expect(cats).toContain("Risk Management");
    expect(cats).toContain("Core Foundations");
  });

  it("finds IV / spread related knowledge", () => {
    const hits = searchCatalog("implied volatility", 8);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.hits.length > 0)).toBe(true);
  });

  it("lists ingested sources with entry counts", () => {
    const sources = listIngestedSources();
    expect(sources.length).toBeGreaterThan(20);
    expect(sources[0]!.entries).toBeGreaterThan(0);
  });
});
