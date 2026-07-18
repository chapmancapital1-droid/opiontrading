/**
 * Strategy Scanner API — Finviz-style option strategy shortlist.
 * GET /api/scanner?strategy=bull_put_credit&minPrice=8&maxPrice=150&maxResults=15&bias=any
 */

import { NextResponse } from "next/server";
import {
  DEFAULT_SCANNER_FILTERS,
  runStrategyScan,
  scannerFilterPresets,
  type ScannerBias,
} from "@/lib/strategyScanner";
import { getServerProvider } from "@/data/serverProvider";
import { SCANNER_UNIVERSE_UNIQUE } from "@/lib/strategyScanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseBias(s: string | null): ScannerBias {
  if (s === "bullish" || s === "bearish" || s === "neutral" || s === "any") return s;
  return "any";
}

async function enrichSpots(limit = 40): Promise<Record<string, number>> {
  const spots: Record<string, number> = {};
  try {
    const provider = getServerProvider();
    // Sample a subset to stay fast — rest use defaults
    const sample = SCANNER_UNIVERSE_UNIQUE.slice(0, limit);
    await Promise.all(
      sample.map(async (c) => {
        try {
          const q = await provider.getUnderlyingQuote(c.symbol);
          if (q.ok && q.data?.price && q.data.price > 0) {
            spots[c.symbol] = q.data.price;
          }
        } catch {
          /* keep default */
        }
      })
    );
  } catch {
    /* demo defaults only */
  }
  return spots;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("meta") === "1") {
    return NextResponse.json({ ok: true, ...scannerFilterPresets() });
  }

  const strategy =
    url.searchParams.get("strategy") ||
    url.searchParams.get("strategyId") ||
    DEFAULT_SCANNER_FILTERS.strategyId;
  const minPrice = Number(url.searchParams.get("minPrice") ?? DEFAULT_SCANNER_FILTERS.minPrice);
  const maxPrice = Number(url.searchParams.get("maxPrice") ?? DEFAULT_SCANNER_FILTERS.maxPrice);
  const maxResults = Number(url.searchParams.get("maxResults") ?? 15);
  const bias = parseBias(url.searchParams.get("bias"));
  const seedMode = url.searchParams.get("seedMode") !== "0";
  const useRhHistory = url.searchParams.get("useRhHistory") !== "0";
  const minFitScore = Number(
    url.searchParams.get("minFitScore") ?? DEFAULT_SCANNER_FILTERS.minFitScore
  );
  const live = url.searchParams.get("live") !== "0";

  const liveSpots = live ? await enrichSpots(35) : {};
  const result = runStrategyScan(
    {
      strategyId: strategy,
      minPrice: Number.isFinite(minPrice) ? minPrice : 8,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : 150,
      maxResults: Number.isFinite(maxResults) ? maxResults : 15,
      bias,
      seedMode,
      useRhHistory,
      minFitScore: Number.isFinite(minFitScore) ? minFitScore : 0.42,
    },
    liveSpots
  );

  return NextResponse.json({
    ok: true,
    liveQuotes: Object.keys(liveSpots).length,
    result,
  });
}

export async function POST(req: Request) {
  let body: {
    strategyId?: string;
    minPrice?: number;
    maxPrice?: number;
    maxResults?: number;
    bias?: ScannerBias;
    seedMode?: boolean;
    useRhHistory?: boolean;
    minFitScore?: number;
    live?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const liveSpots = body.live === false ? {} : await enrichSpots(35);
  const result = runStrategyScan(
    {
      strategyId: body.strategyId || DEFAULT_SCANNER_FILTERS.strategyId,
      minPrice: body.minPrice ?? 8,
      maxPrice: body.maxPrice ?? 150,
      maxResults: body.maxResults ?? 15,
      bias: body.bias ?? "any",
      seedMode: body.seedMode ?? true,
      useRhHistory: body.useRhHistory ?? true,
      minFitScore: body.minFitScore ?? 0.42,
    },
    liveSpots
  );
  return NextResponse.json({ ok: true, result });
}
