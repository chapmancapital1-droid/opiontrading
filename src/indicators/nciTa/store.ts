/**
 * Latest NCI TA snapshot store (in-memory + optional JSONL append for audit).
 * Webhook alerts and TS engine both write here; brain / API read.
 */

import fs from "node:fs";
import path from "node:path";
import type { NciTaSnapshot, TradingViewAlertPayload } from "./types";

const g = globalThis as unknown as { __nciTaStore?: Map<string, NciTaSnapshot> };

function store(): Map<string, NciTaSnapshot> {
  if (!g.__nciTaStore) g.__nciTaStore = new Map();
  return g.__nciTaStore;
}

export function putSnapshot(snap: NciTaSnapshot): void {
  store().set(snap.symbol.toUpperCase(), snap);
  appendAudit(snap);
}

export function getSnapshot(symbol: string): NciTaSnapshot | null {
  return store().get(symbol.toUpperCase()) ?? null;
}

export function listSnapshots(): NciTaSnapshot[] {
  return [...store().values()];
}

function appendAudit(snap: NciTaSnapshot): void {
  try {
    const dir = path.join(process.cwd(), ".data");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "nci_ta_snapshots.jsonl");
    fs.appendFileSync(file, JSON.stringify(snap) + "\n", "utf8");
  } catch {
    // non-fatal in serverless / read-only envs
  }
}

/** Map a TradingView alert JSON body into a partial-then-filled snapshot. */
export function snapshotFromAlert(body: TradingViewAlertPayload): NciTaSnapshot {
  const symbol = String(body.symbol ?? body.ticker ?? "UNKNOWN").toUpperCase();
  const event = String(body.event ?? "").toUpperCase();
  const masterPct = Number(body.master_pct ?? body.masterPct ?? (body.master != null ? Number(body.master) * 100 : 0));
  const master = body.master != null ? Number(body.master) : masterPct / 100;
  const sbNet = Number(body.sb_net ?? body.sbNet ?? 0);
  const sbBull = Number(body.sb_bull ?? Math.max(0, Math.round((24 + sbNet) / 2)));
  const sbBear = Number(body.sb_bear ?? 24 - sbBull);
  const masterDir = master > 0.15 ? "BULL" : master < -0.15 ? "BEAR" : "FLAT";

  const fireBuy = event === "FIRE_BUY" || event.includes("FIRE_BUY");
  const fireSell = event === "FIRE_SELL" || event.includes("FIRE_SELL");
  const armBuy = event === "ARM_BUY";
  const armSell = event === "ARM_SELL";

  return {
    version: "NCI-TA-2.0",
    symbol,
    timeframe: String(body.timeframe ?? body.interval ?? "tv"),
    asOf: String(body.time ?? new Date().toISOString()),
    source: "tradingview_webhook",
    master: Number(master.toFixed(4)),
    masterPct: Math.round(masterPct),
    masterDir,
    sbBull,
    sbBear,
    sbNet,
    companionBuy: Number(body.companion_buy ?? 0),
    companionSell: Number(body.companion_sell ?? 0),
    cbBull: Number(body.cb_bull ?? 0),
    cbBear: Number(body.cb_bear ?? 0),
    portBull: Number(body.port_bull ?? 0),
    portBear: Number(body.port_bear ?? 0),
    voterBull: Number(body.voter_bull ?? 0),
    voterBear: Number(body.voter_bear ?? 0),
    fer: Number(body.fer ?? 0),
    kinetic: Number(body.kinetic ?? 0),
    adx: Number(body.adx ?? 0),
    abcStage:
      body.abc === "B" || body.abc === "B_EXPANSION"
        ? "B_EXPANSION"
        : body.abc === "C" || body.abc === "C_CONTRACTION"
          ? "C_CONTRACTION"
          : "A_CONSOLIDATION",
    allGatesPass: true, // alert implies trader/TV already filtered
    sessionOk: true,
    trigger: fireBuy
      ? "FIRE_BUY"
      : fireSell
        ? "FIRE_SELL"
        : armBuy
          ? "ARM_BUY"
          : armSell
            ? "ARM_SELL"
            : "WAITING",
    fireBuy,
    fireSell,
    armActive: armBuy || armSell,
    rtSig: event.includes("FADE_BUY") ? 1 : event.includes("FADE_SELL") ? -1 : 0,
    rtFireBuy: event.includes("FADE_BUY"),
    rtFireSell: event.includes("FADE_SELL"),
    layerScores: {
      superBias: sbNet / 24,
      companion: 0,
      confluence: 0,
      ports: 0,
      voters: 0,
    },
    notes: [`Ingested from TradingView alert event=${event || "HEARTBEAT"}`],
    degraded: false,
  };
}
