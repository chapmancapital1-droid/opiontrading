/**
 * TypeScript port of NCI Complete Trading Assistant v2 core math.
 * Source of truth for formulas: pine/NCI_Complete_Trading_Assistant_v2.pine
 *
 * Not a pixel-perfect multi-TF clone when only chart bars are supplied —
 * HTF series should be passed via MultiTfSeries for full fidelity.
 * Educational / decision-support only.
 */

import {
  adxApprox,
  atr,
  cci,
  ema,
  highest,
  lastFinite,
  lowest,
  macd,
  momentum,
  rsi,
  sma,
  stochK,
} from "./math";
import type {
  AbcStage,
  Bar,
  MasterDir,
  MultiTfSeries,
  NciTaConfig,
  NciTaSnapshot,
  TriggerState,
} from "./types";
import { DEFAULT_NCI_TA_CONFIG } from "./types";

function closes(bars: readonly Bar[]): number[] {
  return bars.map((b) => b.close);
}
function highs(bars: readonly Bar[]): number[] {
  return bars.map((b) => b.high);
}
function lows(bars: readonly Bar[]): number[] {
  return bars.map((b) => b.low);
}
function vols(bars: readonly Bar[]): number[] {
  return bars.map((b) => b.volume);
}

function emaLast(bars: readonly Bar[] | undefined, period: number): number | null {
  if (!bars || bars.length < period) return null;
  const e = ema(closes(bars), period);
  const v = e[e.length - 1];
  return v != null && Number.isFinite(v) ? v : null;
}

function voteEmaCross(bars: readonly Bar[] | undefined, fast: number, slow: number): 1 | -1 | 0 {
  const f = emaLast(bars, fast);
  const s = emaLast(bars, slow);
  if (f == null || s == null) return 0;
  return f > s ? 1 : -1;
}

export interface ComputeNciTaInput {
  symbol: string;
  timeframe?: string;
  bars: readonly Bar[];
  multiTf?: MultiTfSeries;
  config?: Partial<NciTaConfig>;
  /** Session open flag — when unknown, pass true. */
  sessionOk?: boolean;
  asOf?: string;
}

/**
 * Compute the NCI TA snapshot the brain consumes.
 * Requires at least ~60 bars for stable indicators; fewer → degraded=true.
 */
export function computeNciTa(input: ComputeNciTaInput): NciTaSnapshot {
  const cfg: NciTaConfig = { ...DEFAULT_NCI_TA_CONFIG, ...input.config };
  const bars = input.bars;
  const n = bars.length;
  const notes: string[] = [];
  let degraded = false;

  if (n < 60) {
    notes.push(`Only ${n} bars — indicators degraded (want ≥60, ideally ≥250).`);
    degraded = true;
  }

  const c = closes(bars);
  const h = highs(bars);
  const l = lows(bars);
  const v = vols(bars);
  const i = n - 1;
  const i1 = Math.max(0, i - 1);

  // --- Fundamentals: FER, Kinetic, ABC, ADX ---
  const ferNet = n > 11 ? Math.abs(c[i1]! - c[Math.max(0, i1 - 10)]!) : 0;
  let ferSum = 0;
  for (let k = 1; k <= 10 && i1 - k >= 0; k++) {
    ferSum += Math.abs(c[i1 - k + 1]! - c[i1 - k]!);
  }
  const fer = ferSum > 0 ? ferNet / ferSum : 0;

  const atrSeries = atr(h, l, c, 14);
  const atr1 = lastFinite(atrSeries, i1);
  const dpKin = n > 2 ? Math.abs(c[i1]! - c[Math.max(0, i1 - 1)]!) : 0;
  const moveN = atr1 > 0 ? Math.min(dpKin / atr1, 1) : 0;
  const volSma = sma(v, 20);
  const volAvg = lastFinite(volSma, i1);
  const volN = volAvg > 0 ? Math.min(v[i1]! / (2 * volAvg), 1) : 0.5;
  const kinetic = 0.5 * moveN + 0.5 * volN;

  const adxSeries = adxApprox(h, l, c, 14);
  const adxCur = lastFinite(adxSeries, i);
  const atrCur = lastFinite(atrSeries, i);
  const atrPrev6 = lastFinite(atrSeries, Math.max(0, i - 5));
  const adxPrev3 = lastFinite(adxSeries, Math.max(0, i - 2));
  let abcStage: AbcStage = "A_CONSOLIDATION";
  if (adxCur < 18) abcStage = "A_CONSOLIDATION";
  else if (atrCur > atrPrev6 && adxCur >= adxPrev3) abcStage = "B_EXPANSION";
  else abcStage = "C_CONTRACTION";
  const abcOk = abcStage !== "C_CONTRACTION";

  // --- MTF proxies ---
  const mtf = input.multiTf ?? {};
  const chartAs = bars;
  // When HTF missing, reuse chart bars as proxy (degraded)
  const use = (series: readonly Bar[] | undefined, label: string): readonly Bar[] => {
    if (series && series.length >= 20) return series;
    degraded = true;
    notes.push(`${label} series missing — using chart TF proxy.`);
    return chartAs;
  };
  const m15 = use(mtf.m15, "M15");
  const h1 = use(mtf.h1, "H1");
  const h4 = use(mtf.h4, "H4");
  const d1 = use(mtf.d1, "D1");
  const w1 = use(mtf.w1, "W1");
  const m5 = use(mtf.m5, "M5");
  const m1 = use(mtf.m1, "M1");

  // --- SuperBias 24 (all +1/0 tallies as in Pine) ---
  const e8 = ema(c, 8);
  const e21 = ema(c, 21);
  const e55 = ema(c, 55);
  const e100 = ema(c, 100);
  const s200 = sma(c, 200);
  const e5 = ema(c, 5);
  const e13 = ema(c, 13);
  const rsi14 = rsi(c, 14);
  const macdC = macd(c, 12, 26, 9);
  const stk = stochK(h, l, c, 8);
  const cci14 = cci(h, l, c, 14);
  const mom14 = momentum(c, 14);

  const m15e21 = emaLast(m15, 21);
  const m15e55 = emaLast(m15, 55);
  const h1e21 = emaLast(h1, 21);
  const h1e55 = emaLast(h1, 55);
  const h4e21 = emaLast(h4, 21);
  const h4e55 = emaLast(h4, 55);
  const d1e21 = emaLast(d1, 21);
  const d1e55 = emaLast(d1, 55);
  const h1Rsi = lastFinite(rsi(closes(h1), 14), h1.length - 1);
  const h4Rsi = lastFinite(rsi(closes(h4), 14), h4.length - 1);
  const h1Macd = macd(closes(h1), 12, 26, 9);
  const h4Macd = macd(closes(h4), 12, 26, 9);
  const h1MacdZ = lastFinite(h1Macd.main, h1.length - 1) > 0;
  const h4MacdZ = lastFinite(h4Macd.main, h4.length - 1) > 0;
  const h1e100 = emaLast(h1, 100);
  const h4e50 = emaLast(h4, 50);

  // Daily pivot from last completed daily-like bar
  const dCloses = closes(d1);
  const dHighs = highs(d1);
  const dLows = lows(d1);
  const dIdx = Math.max(0, d1.length - 2);
  const d1PrevH = dHighs[dIdx] ?? h[i]!;
  const d1PrevL = dLows[dIdx] ?? l[i]!;
  const d1PrevC = dCloses[dIdx] ?? c[i]!;
  const d1Pivot = (d1PrevH + d1PrevL + d1PrevC) / 3;
  const d1Cl1 = dCloses[dIdx] ?? c[Math.max(0, i - 1)]!;

  // +DM/-DM proxy for DI via adx series already; for SuperBias use price vs DI via RSI/ADX side
  // Pine uses DMI +DI > -DI — approximate with close vs ema34 slope when ADX present
  const e34 = ema(c, 34);
  const diBull = lastFinite(e34, i) > lastFinite(e34, Math.max(0, i - 2));

  const sbFlags = [
    c[i]! > lastFinite(e21, i),
    lastFinite(e8, i) > lastFinite(e21, i),
    lastFinite(e21, i) > lastFinite(e55, i),
    lastFinite(e55, i) > lastFinite(e100, i),
    c[i]! > lastFinite(s200, i),
    lastFinite(rsi14, i) > 50,
    lastFinite(macdC.main, i) > lastFinite(macdC.signal, i),
    diBull,
    (m15e21 ?? 0) > (m15e55 ?? 0),
    (h1e21 ?? 0) > (h1e55 ?? 0),
    (h4e21 ?? 0) > (h4e55 ?? 0),
    (d1e21 ?? 0) > (d1e55 ?? 0),
    h1Rsi > 50,
    h4Rsi > 50,
    lastFinite(stk, i) > 50,
    lastFinite(cci14, i) > 0,
    lastFinite(mom14, i) > 0,
    c[i]! > d1Cl1,
    c[i]! > d1Pivot,
    lastFinite(e5, i) > lastFinite(e13, i),
    h1MacdZ,
    h4MacdZ,
    h1e100 != null ? c[i]! > h1e100 : c[i]! > lastFinite(e100, i),
    h4e50 != null ? c[i]! > h4e50 : c[i]! > lastFinite(e55, i),
  ];
  const sbBull = sbFlags.filter(Boolean).length;
  const sbBear = 24 - sbBull;
  const sbNet = sbBull - sbBear;

  // --- Companion 7 ---
  const cvW1 = voteEmaCross(w1, 20, 50);
  const cvD1 = voteEmaCross(d1, 20, 50);
  const cvH4 = voteEmaCross(h4, 20, 50);
  const cvH1 = voteEmaCross(h1, 20, 50);
  const rsiNow = lastFinite(rsi14, i);
  const stkNow = lastFinite(stk, i);
  const cci20 = lastFinite(cci(h, l, c, 20), i);
  let companionBuy =
    (cvW1 === 1 ? 1 : 0) +
    (cvD1 === 1 ? 1 : 0) +
    (cvH4 === 1 ? 1 : 0) +
    (cvH1 === 1 ? 1 : 0) +
    (rsiNow > 52 ? 1 : 0) +
    (stkNow > 50 ? 1 : 0) +
    (cci20 > 100 ? 1 : 0);
  let companionSell =
    (cvW1 === -1 ? 1 : 0) +
    (cvD1 === -1 ? 1 : 0) +
    (cvH4 === -1 ? 1 : 0) +
    (cvH1 === -1 ? 1 : 0) +
    (rsiNow < 48 ? 1 : 0) +
    (stkNow <= 50 ? 1 : 0) +
    (cci20 < -100 ? 1 : 0);
  const bullishCandle = c[i]! > bars[i]!.open;
  const bearishCandle = c[i]! < bars[i]!.open;
  const compOkBuy = companionBuy >= cfg.companionGate && bullishCandle;
  const compOkSell = companionSell >= cfg.companionGate && bearishCandle;

  // --- ConfluenceBridge 6 ---
  const cbM1 = voteEmaCross(m1, 21, 55);
  const cbM5 = voteEmaCross(m5, 21, 55);
  const cbM15 = voteEmaCross(m15, 21, 55);
  const cbH1 = voteEmaCross(h1, 21, 55);
  const cbH4 = voteEmaCross(h4, 21, 55);
  const cbD1 = voteEmaCross(d1, 21, 55);
  const cbVotes = [cbM1, cbM5, cbM15, cbH1, cbH4, cbD1];
  const cbBull = cbVotes.filter((x) => x === 1).length;
  const cbBear = 6 - cbBull;
  const cbOkBuy = cbBull >= cfg.confluenceGate;
  const cbOkSell = cbBear >= cfg.confluenceGate;

  // --- SuperBrain 11 ports (chart TF) ---
  const donHh = highest(h, 21, Math.max(0, i1));
  const donLl = lowest(l, 21, Math.max(0, i1));
  const p1 = c[i1]! > donHh ? 1 : c[i1]! < donLl ? -1 : 0;
  const p2 = kinetic >= cfg.minKinetic ? (c[i1]! > c[Math.max(0, i1 - 2)]! ? 1 : -1) : 0;
  // PRISM dual ST simplified
  const mid = (h[i1]! + l[i1]!) / 2;
  const stA = mid + 3 * atr1;
  const stDnA = mid - 3 * atr1;
  const stB = mid + 2 * atr1;
  const stDnB = mid - 2 * atr1;
  const sdirA = c[i1]! > stA ? 1 : c[i1]! < stDnA ? -1 : lastFinite(e8, i1) > lastFinite(e8, Math.max(0, i1 - 2)) ? 1 : -1;
  const sdirB = c[i1]! > stB ? 1 : c[i1]! < stDnB ? -1 : lastFinite(e21, i1) > lastFinite(e21, Math.max(0, i1 - 2)) ? 1 : -1;
  const p3 = sdirA === sdirB ? sdirA : 0;
  const p4 = adxCur >= 18 ? (lastFinite(e34, i1) > lastFinite(e34, Math.max(0, i1 - 3)) ? 1 : -1) : 0;
  const p5 =
    lastFinite(e8, i1) > lastFinite(e21, i1) && lastFinite(e21, i1) > lastFinite(e55, i1)
      ? 1
      : lastFinite(e8, i1) < lastFinite(e21, i1) && lastFinite(e21, i1) < lastFinite(e55, i1)
        ? -1
        : 0;
  const p6 = (h4e21 ?? 0) > (emaLast(h4, 20) ?? 0) ? 1 : -1;
  const p7 = c[i1]! > d1Pivot ? 1 : -1;
  // VWAP proxy: cumulative typical price volume on chart
  let vwapNum = 0;
  let vwapDen = 0;
  for (let k = 0; k <= i1; k++) {
    const tp = (h[k]! + l[k]! + c[k]!) / 3;
    vwapNum += tp * (v[k]! || 1);
    vwapDen += v[k]! || 1;
  }
  const vwap = vwapDen > 0 ? vwapNum / vwapDen : c[i1]!;
  const p8 = c[i1]! > vwap ? 1 : -1;
  const p9 = v[i1]! > volAvg ? (c[i1]! > bars[i1]!.open ? 1 : -1) : 0;
  // candle pattern
  const o1 = bars[i1]!.open;
  const c1 = c[i1]!;
  const h1b = h[i1]!;
  const l1b = l[i1]!;
  const o2 = bars[Math.max(0, i1 - 1)]!.open;
  const c2 = c[Math.max(0, i1 - 1)]!;
  const body = Math.abs(c1 - o1);
  const rng = h1b - l1b;
  const bullEng = c1 > o1 && c2 < o2 && c1 >= o2 && o1 <= c2;
  const bearEng = c1 < o1 && c2 > o2 && c1 <= o2 && o1 >= c2;
  const upW = h1b - Math.max(o1, c1);
  const dnW = Math.min(o1, c1) - l1b;
  const bullPin = rng > 0 && dnW > 2 * body && c1 > o1;
  const bearPin = rng > 0 && upW > 2 * body && c1 < o1;
  const p10 = bullEng || bullPin ? 1 : bearEng || bearPin ? -1 : 0;
  const p11 = (h4e21 ?? 0) > (h4e55 ?? 0) ? 1 : -1;
  const ports = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11];
  const portBull = ports.filter((x) => x === 1).length;
  const portBear = ports.filter((x) => x === -1).length;
  const portsOkBuy = portBull >= cfg.minPortVotes && portBull > portBear;
  const portsOkSell = portBear >= cfg.minPortVotes && portBear > portBull;

  // --- 15 voters (subset full fidelity; HTF slopes use multi-tf) ---
  const vDma = c[i1]! > lastFinite(sma(c, 21), Math.max(0, i1 - 3)) ? 1 : -1;
  const stkS = sma(
    stk.map((x) => (Number.isFinite(x) ? x : 50)),
    3
  );
  const vStoch = lastFinite(stk, i1) > lastFinite(stkS, i1) ? 1 : -1;
  let vDiv = 0;
  if (n > 6) {
    if (c[i1]! > c[i1 - 4]! && lastFinite(rsi14, i1) < lastFinite(rsi14, i1 - 4)) vDiv = -1;
    else if (c[i1]! < c[i1 - 4]! && lastFinite(rsi14, i1) > lastFinite(rsi14, i1 - 4)) vDiv = 1;
  }
  const vCandle = p10;
  const vAtr =
    lastFinite(atrSeries, i1) > lastFinite(atrSeries, Math.max(0, i1 - 4))
      ? c[i1]! > bars[i1]!.open
        ? 1
        : -1
      : 0;
  const h1e34 = ema(closes(h1), 34);
  const vHtf =
    lastFinite(h1e34, h1.length - 1) > lastFinite(h1e34, Math.max(0, h1.length - 3)) ? 1 : -1;
  const vRobot = lastFinite(e5, i1) > lastFinite(e13, i1) ? 1 : -1;
  const vVol = v[i1]! > volAvg ? (c[i1]! > bars[i1]!.open ? 1 : -1) : 0;
  const vRsis = lastFinite(rsi14, i1) > lastFinite(rsi14, Math.max(0, i1 - 2)) ? 1 : -1;
  const vMacd = lastFinite(macdC.main, i1) > lastFinite(macdC.signal, i1) ? 1 : -1;
  const d1Rng = d1PrevH - d1PrevL;
  const d1Pos = d1Rng > 0 ? (c[i1]! - d1PrevL) / d1Rng : 0.5;
  const vDrange = d1Pos > 0.55 ? 1 : d1Pos < 0.45 ? -1 : 0;
  const mtfM15 = (m15e21 ?? 0) > (m15e55 ?? 0) ? 1 : -1;
  const mtfH1 = (h1e21 ?? 0) > (h1e55 ?? 0) ? 1 : -1;
  const mtfH4 = (h4e21 ?? 0) > (h4e55 ?? 0) ? 1 : -1;
  const vMtf = mtfM15 === mtfH1 && mtfH1 === mtfH4 ? mtfM15 : 0;
  const ttfHh = highest(h, 15, i1);
  const ttfLl = lowest(l, 15, i1);
  const ttfHh2 = highest(h, 15, Math.max(0, i1 - 14));
  const ttfLl2 = lowest(l, 15, Math.max(0, i1 - 14));
  const ttfBp = ttfHh - ttfLl2;
  const ttfSp = ttfHh2 - ttfLl;
  const ttfD = 0.5 * (ttfBp + ttfSp);
  const ttfVal = ttfD > 0 ? (100 * (ttfBp - ttfSp)) / ttfD : 0;
  const vTtf = ttfVal > 30 ? 1 : ttfVal < -30 ? -1 : 0;
  const h4e144 = emaLast(h4, 144);
  const h4e169 = emaLast(h4, 169);
  const h4Close = closes(h4)[h4.length - 1] ?? c[i]!;
  const vVegas =
    h4e144 != null && h4e169 != null
      ? h4Close > h4e144 && h4Close > h4e169
        ? 1
        : h4Close < h4e144 && h4Close < h4e169
          ? -1
          : 0
      : 0;
  const vFer = fer >= cfg.minFer ? (c[i1]! > c[Math.max(0, i1 - 5)]! ? 1 : -1) : 0;
  const voters = [
    vDma, vStoch, vDiv, vCandle, vAtr, vHtf, vRobot, vVol, vRsis, vMacd, vDrange, vMtf, vTtf, vVegas, vFer,
  ];
  const voterBull = voters.filter((x) => x === 1).length;
  const voterBear = voters.filter((x) => x === -1).length;

  // --- Gates & master ---
  const sessionOk = input.sessionOk ?? true;
  const gateAdx = adxCur >= cfg.minAdx;
  const gateFer = fer >= cfg.minFer;
  const gateKin = kinetic >= cfg.minKinetic;
  const allGatesPass = gateAdx && gateFer && gateKin && sessionOk && abcOk;
  const fullOkBuy = compOkBuy && cbOkBuy && portsOkBuy && allGatesPass;
  const fullOkSell = compOkSell && cbOkSell && portsOkSell && allGatesPass;

  const msSb = sbNet / 24;
  const msCo = (companionBuy - companionSell) / 7;
  const msCb = (cbBull - cbBear) / 6;
  const msPorts = (portBull - portBear) / 11;
  const msVoters = (voterBull - voterBear) / 15;
  const master = (msSb + msCo + msCb + msPorts + msVoters) / 5;
  const masterPct = Math.round(master * 100);
  const masterDir: MasterDir = master > 0.15 ? "BULL" : master < -0.15 ? "BEAR" : "FLAT";

  // --- ARM/FIRE (stateless bar evaluation — no multi-bar sm persistence across calls) ---
  // For full ARM timeout machine, use webhook live events or pass state externally.
  const sbArmB = sbNet >= cfg.armNet;
  const sbFireB = sbNet >= cfg.fireNet;
  const sbArmS = sbNet <= -cfg.armNet;
  const sbFireS = sbNet <= -cfg.fireNet;
  let fireBuy = false;
  let fireSell = false;
  let trigger: TriggerState = "WAITING";
  if (cfg.skipThroughFire && sbFireB && fullOkBuy) {
    fireBuy = true;
    trigger = "FIRE_BUY";
  } else if (cfg.skipThroughFire && sbFireS && fullOkSell) {
    fireSell = true;
    trigger = "FIRE_SELL";
  } else if (sbArmB && !sbFireB) {
    trigger = "ARM_BUY";
  } else if (sbArmS && !sbFireS) {
    trigger = "ARM_SELL";
  } else if (sbFireB && fullOkBuy) {
    fireBuy = true;
    trigger = "FIRE_BUY";
  } else if (sbFireS && fullOkSell) {
    fireSell = true;
    trigger = "FIRE_SELL";
  }
  const armActive = trigger === "ARM_BUY" || trigger === "ARM_SELL";

  // --- RoboTrick fade (4 voters) ---
  // BB(20,2)
  const midBb = sma(c, 20);
  const stdWin = (end: number): number => {
    const start = Math.max(0, end - 19);
    const slice = c.slice(start, end + 1);
    const m = slice.reduce((a, b) => a + b, 0) / slice.length;
    const varr = slice.reduce((a, b) => a + (b - m) ** 2, 0) / slice.length;
    return Math.sqrt(varr);
  };
  const bbMid = lastFinite(midBb, i);
  const bbSd = stdWin(i);
  const bbUp = bbMid + 2 * bbSd;
  const bbLo = bbMid - 2 * bbSd;
  const rtVBb = c[i]! <= bbLo ? 1 : c[i]! >= bbUp ? -1 : 0;
  const rtCci = lastFinite(cci(h, l, c, 14), i);
  const rtCciPrev = lastFinite(cci(h, l, c, 14), i1);
  const rtVCci =
    rtCci < -100 && rtCci > rtCciPrev ? 1 : rtCci > 100 && rtCci < rtCciPrev ? -1 : 0;
  const rtStk = lastFinite(sma(stochK(h, l, c, 14).map((x) => (Number.isFinite(x) ? x : 50)), 3), i);
  const rtVStk = rtStk < 20 ? 1 : rtStk > 80 ? -1 : 0;
  const rtMacd = macd(c, 12, 26, 9);
  const rtM = lastFinite(rtMacd.main, i);
  const rtMp = lastFinite(rtMacd.main, i1);
  const rtVMacd = rtM > rtMp && rtM < 0 ? 1 : rtM < rtMp && rtM > 0 ? -1 : 0;
  const rtE20 = lastFinite(ema(c, 20), i);
  const rtE50 = lastFinite(ema(c, 50), i);
  const rtTrend = rtE20 > rtE50 ? 1 : rtE20 < rtE50 ? -1 : 0;
  const rtBuyV =
    (rtVBb === 1 ? 1 : 0) + (rtVCci === 1 ? 1 : 0) + (rtVStk === 1 ? 1 : 0) + (rtVMacd === 1 ? 1 : 0);
  const rtSellV =
    (rtVBb === -1 ? 1 : 0) + (rtVCci === -1 ? 1 : 0) + (rtVStk === -1 ? 1 : 0) + (rtVMacd === -1 ? 1 : 0);
  let rtSig: -1 | 0 | 1 = 0;
  if (cfg.roboTrickOn) {
    if (rtBuyV >= cfg.roboTrickVotes && rtTrend !== 1) rtSig = 1;
    else if (rtSellV >= cfg.roboTrickVotes && rtTrend !== -1) rtSig = -1;
  }

  if (!allGatesPass) notes.push("Hard gates not all passing (ADX/FER/Kinetic/Session/ABC).");
  if (masterDir === "FLAT") notes.push("Master FLAT — prefer range/premium-selling over directional.");
  if (abcStage === "C_CONTRACTION") notes.push("ABC C CONTRACTION — avoid new entries (Pine rule).");

  return {
    version: "NCI-TA-2.0",
    symbol: input.symbol.toUpperCase(),
    timeframe: input.timeframe ?? "chart",
    asOf: input.asOf ?? new Date().toISOString(),
    source: "typescript_engine",
    master: Number(master.toFixed(4)),
    masterPct,
    masterDir,
    sbBull,
    sbBear,
    sbNet,
    companionBuy,
    companionSell,
    cbBull,
    cbBear,
    portBull,
    portBear,
    voterBull,
    voterBear,
    fer: Number(fer.toFixed(4)),
    kinetic: Number(kinetic.toFixed(4)),
    adx: Number(adxCur.toFixed(2)),
    abcStage,
    allGatesPass,
    sessionOk,
    trigger,
    fireBuy,
    fireSell,
    armActive,
    rtSig,
    rtFireBuy: rtSig === 1,
    rtFireSell: rtSig === -1,
    layerScores: {
      superBias: Number(msSb.toFixed(4)),
      companion: Number(msCo.toFixed(4)),
      confluence: Number(msCb.toFixed(4)),
      ports: Number(msPorts.toFixed(4)),
      voters: Number(msVoters.toFixed(4)),
    },
    notes,
    degraded,
  };
}
