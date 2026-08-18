// runner/score-swing-dip.ts
// A watchlist "buy-low" swing-entry scanner. Scores each symbol on price/
// volume/EMA structure and ranks candidates. This is scoreMeanReversion's
// cousin, built so it competes on the SAME harness (Test 1 walk-forward),
// not as a new unvalidated system bolted on.
//
// ⚠ STATUS: UNVALIDATED HYPOTHESIS. Until this clears walk-forward on the same
// 2020-extended data, no-lookahead, and gates as scoreMeanReversion, it is a
// story, not an edge. The last "clean story" (scoreBullish) died OOS. Do not
// wire this into any order path. Do not call it "safe" or "predictable" until
// the harness says so — that word is exactly what the data has refused to hand
// out so far (small-win strategies keep losing to the payoff ratio).
//
// DESIGN CONTRACT:
//   - Reuses the REAL indicator functions from the repo. Reimplementing RSI/
//     EMA/ATR here would make the comparison to scoreMeanReversion invalid
//     (different math = not a level field). Every indicator is TODO(verify).
//   - Scores are RELATIVE and RANKED; the runner picks top-N that clear a
//     minimum AND pass gates. This file does NOT place orders and does NOT
//     bypass any gate.
//   - The weights below are a STARTING GUESS grounded in NCI_MEMORY 7c's
//     conditional-edge scan (volume-2x-red-bar and RSI<25 were the strongest
//     rows). They are sweep targets for Test 2, not settled values.

// --- Real repo indicators. VERIFY names/signatures before running. -----------
// TODO(verify against repo): these almost certainly already exist wherever
// scoreMeanReversion computes its inputs (runner/sessions.ts or an indicators
// module). Import the SAME ones scoreMeanReversion uses — do not add a parallel
// set.
import { rsi, ema, atr, sma } from "./indicators"; // TODO(verify) module + names

// TODO(verify against repo): the Bar shape must match bars-daily.json exactly.
interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ---------------------------------------------------------------------------
// Tunable parameters. ALL are Test 2 sweep targets — none are trusted yet.
// Defaults are seeded from NCI_MEMORY 7c where the data actually spoke:
//   - RSI<25 deep-oversold was the strongest oscillator row (+0.48%, 54.1%)
//   - "volume 2x + red bar" was the single strongest condition (+1.01%, 54.1%)
//   - a LONG-trend filter matters: buying oversold in a real downtrend is the
//     CHPT/LCID/PLUG falling-knife failure the universe deliberately includes.
// ---------------------------------------------------------------------------
export interface SwingDipParams {
  rsiPeriod: number;          // TODO(verify): match scoreMeanReversion's RSI period
  rsiOversold: number;        // default 25 per 7c (sweep 20..35)
  emaFast: number;            // stretch reference, e.g. 20
  emaTrend: number;           // trend filter, e.g. 200
  atrPeriod: number;          // for normalizing stretch across price levels
  volPeriod: number;          // volume baseline window, e.g. 20
  volSpikeMult: number;       // "2x average" per 7c (sweep 1.5..3)
  minStretchAtr: number;      // how far below emaFast (in ATRs) counts as a dip
  requireUptrend: boolean;    // price > emaTrend required? default TRUE (safety)
  requireRedBar: boolean;     // today's close < open? 7c's volume row was red-bar
  // Score weights — relative importance of each component. Sweep these too.
  wStretch: number;
  wOversold: number;
  wVolume: number;
}

export const DEFAULT_SWING_DIP_PARAMS: SwingDipParams = {
  rsiPeriod: 14,      // TODO(verify): scoreMeanReversion may use a different period
  rsiOversold: 25,
  emaFast: 20,
  emaTrend: 200,
  atrPeriod: 14,
  volPeriod: 20,
  volSpikeMult: 2.0,
  minStretchAtr: 1.0,
  requireUptrend: true,
  requireRedBar: true,
  wStretch: 1.0,
  wOversold: 1.0,
  wVolume: 1.0,
};

// ---------------------------------------------------------------------------
// The score for ONE symbol at the CURRENT (last visible) bar.
// CRITICAL: `bars` MUST be the no-lookahead visible slice from visibleBars() —
// the caller passes only bars up to and including "today". This function must
// NEVER receive future bars. It reads the last element as "today".
// Returns null if the symbol does not qualify (below thresholds / wrong trend /
// insufficient history) — null means "not a candidate", not "score 0".
// ---------------------------------------------------------------------------
export function scoreSwingDip(
  bars: Bar[],
  p: SwingDipParams = DEFAULT_SWING_DIP_PARAMS
): { score: number; reasons: string[] } | null {
  // Need enough history for the longest lookback (trend EMA dominates).
  const minBars = Math.max(p.emaTrend, p.volPeriod, p.rsiPeriod, p.atrPeriod) + 2;
  if (bars.length < minBars) return null; // fail closed (Ground Rule #2)

  const today = bars[bars.length - 1];

  // TODO(verify against repo): each of these calls must match the real
  // indicator signatures. Assumed here: they take a numeric series (or bars)
  // and a period, and return the CURRENT value (no future leakage).
  const closes = bars.map((b) => b.close);
  const rsiNow = rsi(closes, p.rsiPeriod);
  const emaFastNow = ema(closes, p.emaFast);
  const emaTrendNow = ema(closes, p.emaTrend);
  const atrNow = atr(bars, p.atrPeriod);
  const volAvg = sma(bars.map((b) => b.volume), p.volPeriod);

  // Guard against degenerate values (thin/again fail closed).
  if (!isFinite(atrNow) || atrNow <= 0 || !isFinite(volAvg) || volAvg <= 0) return null;

  const reasons: string[] = [];

  // --- HARD FILTERS (disqualify, not just down-weight) ---
  // Trend filter: only buy dips inside an uptrend. This is the falling-knife
  // guard. Turning it off (requireUptrend=false) is a legitimate Test 2 sweep
  // arm, but the DEFAULT is on because the universe includes real collapses.
  if (p.requireUptrend && today.close <= emaTrendNow) return null;

  // Red-bar filter: NCI_MEMORY 7c's strongest volume row was red bars.
  if (p.requireRedBar && !(today.close < today.open)) return null;

  // Stretch: how far below the fast EMA, in ATR units (price-level neutral).
  const stretchAtr = (emaFastNow - today.close) / atrNow;
  if (stretchAtr < p.minStretchAtr) return null; // not actually a dip
  reasons.push(`stretch ${stretchAtr.toFixed(2)} ATR below EMA${p.emaFast}`);

  // Oversold: RSI at/below cutoff.
  if (rsiNow > p.rsiOversold) return null;
  reasons.push(`RSI ${rsiNow.toFixed(1)} <= ${p.rsiOversold}`);

  // Volume confirmation: today's volume vs its own baseline.
  const volRatio = today.volume / volAvg;
  if (volRatio < p.volSpikeMult) return null;
  reasons.push(`volume ${volRatio.toFixed(2)}x avg`);

  // --- SOFT SCORE (rank among the qualifiers) ---
  // Each component normalized to a roughly 0..~2 range, then weighted.
  // Deeper stretch, more oversold, bigger volume spike => higher score.
  const stretchComponent = p.wStretch * stretchAtr;                    // already in ATRs
  const oversoldComponent = p.wOversold * ((p.rsiOversold - rsiNow) / 10); // pts below cutoff
  const volumeComponent = p.wVolume * (volRatio - p.volSpikeMult);     // excess over threshold

  const score = stretchComponent + oversoldComponent + volumeComponent;

  return { score, reasons };
}

// ---------------------------------------------------------------------------
// WATCHLIST SCANNER. Ranks all symbols that qualify at the current bar.
// ⚠ SURVIVORSHIP: the watchlist passed here MUST be the list as it stood ON
// THE ENTRY DATE, not a list chosen today. A watchlist of "names that dip and
// recover" assembled with hindsight will make any backtest look brilliant and
// mean nothing. In the replay harness, feed the frozen historical universe,
// never a curated survivor list. (Same trap as Test 3.)
// ---------------------------------------------------------------------------
export interface ScanCandidate {
  symbol: string;
  score: number;
  reasons: string[];
}

export function scanWatchlist(
  visibleBarsBySymbol: Map<string, Bar[]>, // each value already no-lookahead sliced
  p: SwingDipParams = DEFAULT_SWING_DIP_PARAMS,
  topN: number | null = null
): ScanCandidate[] {
  const candidates: ScanCandidate[] = [];

  for (const [symbol, bars] of visibleBarsBySymbol) {
    const result = scoreSwingDip(bars, p);
    if (result === null) continue;
    candidates.push({ symbol, score: result.score, reasons: result.reasons });
  }

  candidates.sort((a, b) => b.score - a.score); // highest score first

  // NOTE: topN here is only a ranking cut. The RUNNER still applies gates
  // (max concurrent = 2, $15 sizing, spread, earnings blackout) on top of
  // this. Do not treat "top N" as "trade N" — gates come after. And do NOT
  // let this scanner override the earnings blackout: single-name overnight
  // earnings gaps are the specific way $15 risk becomes a $60 loss on one bar.
  return topN == null ? candidates : candidates.slice(0, topN);
}

// ---------------------------------------------------------------------------
// HOW TO VALIDATE THIS (the whole point):
//   1. Register scoreSwingDip as a strategy the replay harness can run, the
//      same way scoreMeanReversion is wired (TODO(verify): where the harness
//      dispatches on strategy).
//   2. Run it through runTest1() in walk-forward.ts — same folds, same
//      2020-extended data, same ladder+fixed exits, same gates.
//   3. Run it through runTest2() param-sweep.ts — sweep rsiOversold,
//      volSpikeMult, minStretchAtr, and requireUptrend (on/off). If turning
//      OFF the uptrend filter improves the number, be suspicious: that usually
//      means the "edge" is buying falling knives that happened to bounce in a
//      bull-only window — the exact thing a bear fold should punish.
//   4. Compare its OOS expectancy head-to-head against scoreMeanReversion on
//      the SAME folds. If it doesn't beat (or at least match) the already-
//      validated strategy, it does not earn a slot. Two mediocre strategies
//      are worse than one validated one.
//   5. Only a SURVIVED verdict here makes "fallen apples" a real ingredient.
//      Until then it stays out of the compounding engine — the index position
//      is the compounder; this is at most a small, gated, validated garnish.
// ---------------------------------------------------------------------------
