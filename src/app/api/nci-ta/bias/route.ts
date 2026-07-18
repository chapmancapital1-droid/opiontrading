/**
 * GET /api/nci-ta/bias?symbol=AAPL
 *
 * Returns NCI direction-bias snapshot for any ticker:
 * 1) Prefer latest webhook/compute store snapshot
 * 2) Else synthesize OHLCV around live/demo quote and run computeNciTa
 *
 * Educational co-pilot only — not an entry order.
 */

import { NextResponse } from "next/server";
import {
  computeNciTa,
  getSnapshot,
  putSnapshot,
  type Bar,
  type NciTaSnapshot,
} from "@/indicators/nciTa";
import { getServerProvider } from "@/data/serverProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bare(symbol: string): string {
  const t = symbol.includes(":") ? symbol.split(":").pop()! : symbol;
  return t.trim().toUpperCase().replace(/[^A-Z0-9.]/g, "") || "SPY";
}

/** GBM-ish bars seeded from spot so SuperBias/voters can fire without TV webhook. */
function synthBarsFromSpot(spot: number, n = 180, seed = 42): Bar[] {
  const bars: Bar[] = [];
  let px = spot * 0.97;
  let s = seed >>> 0;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const drift = (spot - px) * 0.04;
    const shock = (rnd() - 0.48) * spot * 0.004;
    const o = px;
    const c = Math.max(0.5, o + drift + shock);
    const h = Math.max(o, c) * (1 + rnd() * 0.002);
    const l = Math.min(o, c) * (1 - rnd() * 0.002);
    bars.push({
      time: now - (n - i) * 3600_000,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: 1_000_000 + Math.floor(rnd() * 500_000),
    });
    px = c;
  }
  // pin last bar near live spot
  const last = bars[bars.length - 1]!;
  bars[bars.length - 1] = {
    ...last,
    close: spot,
    high: Math.max(last.high, spot),
    low: Math.min(last.low, spot),
  };
  return bars;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("symbol") || "SPY";
  const symbol = bare(raw);
  const force = url.searchParams.get("recompute") === "1";

  let snap: NciTaSnapshot | null = force ? null : getSnapshot(symbol);
  let fromStore = !!snap;

  if (!snap) {
    let spot = 100;
    try {
      const provider = getServerProvider();
      const q = await provider.getUnderlyingQuote(symbol);
      if (q.ok && q.data?.price && q.data.price > 0) spot = q.data.price;
    } catch {
      /* demo path */
    }
    const bars = synthBarsFromSpot(spot, 200, symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
    snap = computeNciTa({
      symbol,
      timeframe: "60",
      bars,
      sessionOk: true,
    });
    // Mark notes so UI knows path
    snap = {
      ...snap,
      notes: [
        ...snap.notes,
        fromStore
          ? "Loaded from prior snapshot store."
          : "Computed from quote-seeded synthetic bars (no TV webhook). For live FIRE fidelity, attach Pine + webhook.",
      ],
      source: "typescript_engine",
    };
    putSnapshot(snap);
  }

  return NextResponse.json({
    ok: true,
    symbol,
    fromStore,
    snapshot: snap,
    ui: {
      title: "NCI direction bias",
      masterLabel: `${snap.masterDir} ${Math.abs(snap.masterPct)}%`,
      trigger: snap.trigger,
      gates: snap.allGatesPass ? "ALL GATES PASS" : "GATES BLOCK",
      voters: `${snap.voterBull}B / ${snap.voterBear}S of 15`,
      ports: `${snap.portBull}B / ${snap.portBear}S of 11`,
      superBias: `${snap.sbBull}B / ${snap.sbBear}S · net ${snap.sbNet}`,
      disclaimer:
        "Co-pilot bias only. Not auto-entry. Forex FIRE alone is not a proven money printer — use with book rules + risk gates.",
    },
  });
}
