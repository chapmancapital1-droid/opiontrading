/**
 * GET /api/alpaca/account
 * Returns sanitized paper/live Alpaca equity for brain sizing.
 * Never returns API keys. Never places orders.
 */

import { NextResponse } from "next/server";
import { fetchLiveBrokerSnapshot } from "@/data/alpacaTrading";
import type { LiveAccountClient } from "@/brain/liveAccount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snap = await fetchLiveBrokerSnapshot();

  if (!snap.ok) {
    return NextResponse.json(
      {
        ok: false,
        configured: snap.configured,
        error: snap.error,
        account: null as LiveAccountClient | null,
      },
      { status: snap.configured ? 502 : 503 }
    );
  }

  const openRisk = Math.max(
    0,
    snap.openOptionsMarketValue,
    // If no option MV, keep 0 — equity positions aren't "open option risk"
  );
  const openCampaigns = Math.max(
    0,
    Math.ceil(snap.openOptionContracts / 1) // 1 contract ≈ 1 campaign unit
  );

  const account: LiveAccountClient = {
    source: "alpaca",
    mode: snap.account.mode,
    status: snap.account.status,
    equity: snap.account.equity,
    cash: snap.account.cash,
    buyingPower: snap.account.buyingPower,
    sharesHeld: snap.sharesHeld,
    openOptionContracts: snap.openOptionContracts,
    openOptionsMarketValue: snap.openOptionsMarketValue,
    openRiskDollars: openRisk,
    openCampaigns: Math.min(openCampaigns, 20),
    dailyRealizedPL: 0, // activity API can refine later
    asOf: snap.account.asOf,
    note:
      snap.account.mode === "paper"
        ? "Alpaca PAPER account — educational sizing only; no auto-trade"
        : "Alpaca LIVE account — educational sizing only; no auto-trade",
  };

  return NextResponse.json({
    ok: true,
    account,
    positionsCount: snap.positions.length,
    // Small position summary for UI (no secrets)
    positions: snap.positions.slice(0, 40).map((p) => ({
      symbol: p.symbol,
      qty: p.qty,
      side: p.side,
      marketValue: p.marketValue,
      assetClass: p.assetClass,
    })),
  });
}
