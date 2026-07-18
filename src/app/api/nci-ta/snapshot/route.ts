/**
 * GET /api/nci-ta/snapshot?symbol=AAPL
 * Returns the latest NCI TA snapshot (from webhook or prior compute).
 */

import { NextResponse } from "next/server";
import { getSnapshot, listSnapshots } from "@/indicators/nciTa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ ok: true, snapshots: listSnapshots() });
  }
  const snap = getSnapshot(symbol);
  if (!snap) {
    return NextResponse.json(
      {
        ok: false,
        error: "no_snapshot",
        hint: "Load NCI TA on TradingView and fire a webhook, or POST bars to compute engine.",
      },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, snapshot: snap });
}
