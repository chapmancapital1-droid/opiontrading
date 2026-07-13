/**
 * NCI Complete Trading Assistant — TypeScript contract.
 * Mirrors pine/NCI_Complete_Trading_Assistant_v2.pine so OptionScope brain
 * can consume the same signal language TradingView shows on-chart.
 *
 * Live path A: computeNciTa() from OHLCV (server-side port of Pine logic).
 * Live path B: POST /api/nci-ta/webhook from TradingView alerts (event stream).
 */

export interface Bar {
  time: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Optional multi-timeframe series (chart TF is always `bars`). */
export interface MultiTfSeries {
  m1?: readonly Bar[];
  m5?: readonly Bar[];
  m15?: readonly Bar[];
  h1?: readonly Bar[];
  h4?: readonly Bar[];
  d1?: readonly Bar[];
  w1?: readonly Bar[];
}

export type MasterDir = "BULL" | "BEAR" | "FLAT";
export type TriggerState = "WAITING" | "ARM_BUY" | "ARM_SELL" | "FIRE_BUY" | "FIRE_SELL";
export type AbcStage = "A_CONSOLIDATION" | "B_EXPANSION" | "C_CONTRACTION";
export type SnapshotSource = "typescript_engine" | "tradingview_webhook" | "manual";

export interface NciTaConfig {
  armNet: number; // default 18
  fireNet: number; // default 20
  armTimeoutBars: number; // default 5
  skipThroughFire: boolean;
  companionGate: number; // of 7
  confluenceGate: number; // of 6
  minAdx: number;
  minFer: number;
  minKinetic: number;
  minPortVotes: number; // of 11
  roboTrickOn: boolean;
  roboTrickVotes: number; // of 4
}

export const DEFAULT_NCI_TA_CONFIG: NciTaConfig = {
  armNet: 18,
  fireNet: 20,
  armTimeoutBars: 5,
  skipThroughFire: true,
  companionGate: 5,
  confluenceGate: 4,
  minAdx: 22,
  minFer: 0.35,
  minKinetic: 0.5,
  minPortVotes: 5,
  roboTrickOn: true,
  roboTrickVotes: 3,
};

/** What the OptionScope brain reads — one symbol, one as-of. */
export interface NciTaSnapshot {
  version: "NCI-TA-2.0";
  symbol: string;
  timeframe: string;
  asOf: string;
  source: SnapshotSource;

  // Master composite (-1..+1 and %)
  master: number;
  masterPct: number;
  masterDir: MasterDir;

  // SuperBias 24
  sbBull: number;
  sbBear: number;
  sbNet: number;

  // Companion 7
  companionBuy: number;
  companionSell: number;

  // ConfluenceBridge 6
  cbBull: number;
  cbBear: number;

  // SuperBrain ports 11 + voters 15
  portBull: number;
  portBear: number;
  voterBull: number;
  voterBear: number;

  // Gates
  fer: number;
  kinetic: number;
  adx: number;
  abcStage: AbcStage;
  allGatesPass: boolean;
  sessionOk: boolean;

  // Trigger
  trigger: TriggerState;
  fireBuy: boolean;
  fireSell: boolean;
  armActive: boolean;

  // RoboTrick fade
  rtSig: -1 | 0 | 1;
  rtFireBuy: boolean;
  rtFireSell: boolean;

  // Layer scores (-1..+1) for diagnostics
  layerScores: {
    superBias: number;
    companion: number;
    confluence: number;
    ports: number;
    voters: number;
  };

  notes: string[];
  /** True when multi-TF data was incomplete and single-TF proxies were used. */
  degraded: boolean;
}

export interface TradingViewAlertPayload {
  symbol?: string;
  ticker?: string;
  event?: string; // FIRE_BUY | FIRE_SELL | ARM_BUY | ARM_SELL | FADE_BUY | FADE_SELL | HEARTBEAT
  master?: number;
  master_pct?: number;
  masterPct?: number;
  sb_net?: number;
  sbNet?: number;
  sb_bull?: number;
  sb_bear?: number;
  port_bull?: number;
  port_bear?: number;
  voter_bull?: number;
  voter_bear?: number;
  companion_buy?: number;
  companion_sell?: number;
  cb_bull?: number;
  cb_bear?: number;
  fer?: number;
  kinetic?: number;
  adx?: number;
  abc?: string;
  timeframe?: string;
  interval?: string;
  time?: string;
  // allow extra TV template fields
  [key: string]: unknown;
}
