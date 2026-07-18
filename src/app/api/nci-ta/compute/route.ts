/**
 * POST /api/nci-ta/compute
 * Body: { symbol, timeframe?, bars: Bar[], multiTf?, sessionOk? }
 * Runs the TypeScript NCI TA engine and stores the snapshot for the brain.
 */

import { NextResponse } from "next/server";
import { computeNciTa, putSnapshot, type Bar, type MultiTfSeries } from "@/indicators/nciTa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    symbol?: string;
    timeframe?: string;
    bars?: Bar[];
    multiTf?: MultiTfSeries;
    sessionOk?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!body.symbol || !Array.isArray(body.bars) || body.bars.length < 30) {
    return NextResponse.json(
      { ok: false, error: "need symbol and bars (>=30)" },
      { status: 400 }
    );
  }
  const snap = computeNciTa({
    symbol: body.symbol,
    bars: body.bars,
    ...(body.timeframe != null ? { timeframe: body.timeframe } : {}),
    ...(body.multiTf != null ? { multiTf: body.multiTf } : {}),
    ...(body.sessionOk != null ? { sessionOk: body.sessionOk } : {}),
  });
  putSnapshot(snap);
  return NextResponse.json({ ok: true, snapshot: snap });
}
