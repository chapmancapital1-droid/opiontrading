/**
 * TradingView → OptionScope live bridge.
 *
 * TV cannot stream custom Pine plot series into our iframe widget.
 * Instead, set TV alerts on NCI TA FIRE/ARM/FADE with a JSON message body
 * that POSTs here. Brain reads getSnapshot(symbol) on the next decision.
 *
 * Alert message template (TradingView):
 * {
 *   "symbol":"{{ticker}}",
 *   "event":"FIRE_BUY",
 *   "master":0.62,
 *   "master_pct":62,
 *   "sb_net":18,
 *   "timeframe":"{{interval}}",
 *   "time":"{{timenow}}"
 * }
 *
 * Optional auth: set NCI_TA_WEBHOOK_SECRET and send header x-nci-ta-secret.
 */

import { NextResponse } from "next/server";
import { putSnapshot, snapshotFromAlert } from "@/indicators/nciTa";
import type { TradingViewAlertPayload } from "@/indicators/nciTa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.NCI_TA_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers.get("x-nci-ta-secret");
    if (got !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  let body: TradingViewAlertPayload;
  try {
    const text = await req.text();
    // TV sometimes double-encodes or sends plain text
    body = JSON.parse(text) as TradingViewAlertPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const snap = snapshotFromAlert(body);
  putSnapshot(snap);

  return NextResponse.json({
    ok: true,
    symbol: snap.symbol,
    trigger: snap.trigger,
    masterDir: snap.masterDir,
    masterPct: snap.masterPct,
    asOf: snap.asOf,
    brainHint:
      snap.fireBuy
        ? "Bias FIRE BUY — prefer bullish defined-risk or CSP/wheel if IV elevated"
        : snap.fireSell
          ? "Bias FIRE SELL — prefer bearish defined-risk or credit call spreads"
          : snap.masterDir === "FLAT"
            ? "Master FLAT — prefer iron condor / range income"
            : `Master ${snap.masterDir} — condition strategies to bias`,
  });
}
