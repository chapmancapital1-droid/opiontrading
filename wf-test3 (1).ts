// runner/wider-universe.ts
// Test 3 (handoff Section 4, "wider-universe test"): expand to 50-100 symbols
// and check whether the mean-reversion edge holds, weakens, or strengthens.
//
// WHY THIS TEST IS THE MOST SURVIVORSHIP-DANGEROUS OF THE THREE:
//   Test 1's universe was recoverable from repo history. Test 3 asks you to
//   CONSTRUCT a 50-100 name list including names that "fell hard, not just
//   current large-caps." The instant you build a 2020-era list of fallen names
//   and pull bars via the MCP, every name that DIED (delisted, acquired,
//   bankrupt) returns nothing and silently vanishes — leaving you with exactly
//   the survivors-only universe the handoff forbids (Ground Rule #3). The wider
//   you go, the worse this gets, because more of the "fell hard" names you
//   deliberately included are the ones most likely to have delisted.
//   So this file's reconciliation step is not boilerplate — it is the test's
//   main integrity control. A Test 3 result with unreconciled missing names is
//   worthless, or worse, misleading in the optimistic direction.
//
// DESIGN CONTRACT: orchestrates only; reuses Test 1's fold + regime + replay
// machinery so the comparison to Test 1 is apples-to-apples. Does NOT redefine
// any of that logic. TODO(verify against repo) on every assumed signature.

import { runReplay } from "./replay";            // TODO(verify)
import { loadConfig } from "./config";            // read-only (Ground Rule #6)
import { loadBars } from "./data";                // TODO(verify)
import { scoreMeanReversion } from "./sessions";  // TODO(verify)
// Reuse Test 1's building blocks. These must be EXPORTED from walk-forward.ts
// (currently private). Export them or lift into a shared module — do NOT
// duplicate, or Test 3's folds/labels won't match Test 1's and the comparison
// the handoff asks for becomes meaningless.
import {
  buildFoldsExported as buildFolds,
  labelRegimeExported as labelRegime,
  reconcileUniverseExported as reconcileUniverse,
  summarizeTradesExported as summarizeTrades,
} from "./walk-forward";
// TODO(verify against repo): add these exports to walk-forward.ts:
//   export { buildFolds as buildFoldsExported,
//            labelRegime as labelRegimeExported,
//            reconcileUniverse as reconcileUniverseExported,
//            summarizeTrades as summarizeTradesExported };

interface DateWindow { start: string; end: string; }
type ExitPlan = "ladder" | "fixed";

// ---------------------------------------------------------------------------
// Universe size guard. Handoff Section 4: 50-100 symbols. Enforce loudly so a
// too-small "wider" universe doesn't get reported as if it satisfied the test.
// ---------------------------------------------------------------------------

const MIN_WIDER = 50;
const MAX_WIDER = 100;

// ---------------------------------------------------------------------------
// Test 3 uses the SAME exit plan as the Test 1 comparison baseline. The
// handoff compares against "test1 10-30 symbol result", so run Test 3 on the
// exit plan that was Test 1's primary read (ladder — the prior winner). Pass
// the other plan too if you want the fuller picture, but ladder is the one the
// comparison hangs on. TODO(confirm): run both, or ladder only?
// ---------------------------------------------------------------------------

export interface Test3Config {
  intendedWiderUniverse: string[]; // 50-100 names, INCLUDING fallen ones
  range: DateWindow;               // same >=2020 range as Test 1
  exitPlan: ExitPlan;              // default "ladder" for the comparison
  // The aggregate OOS expectancy from Test 1 on the SAME exit plan, so the
  // comparison string is computed, not eyeballed. Pass it in from the Test 1
  // run rather than hardcoding — the extended Test 1 has its own number, NOT
  // the +$1.23 from the old 2-fold run (NCI_MEMORY 7c).
  test1ComparisonExpectancy: number | null;
  test1ComparisonWinRate: number | null;
  test1UniverseSize: number;
}

// ---------------------------------------------------------------------------
// Run: pool ALL folds' OOS trades across the wider universe, then aggregate.
// Test 3's output schema (Section 5) is lighter than Test 1 — it wants a single
// aggregate OOS expectancy + win rate + a comparison, not per-fold detail. But
// we still run per-fold internally (a) to reuse the no-lookahead machinery and
// (b) so we can flag if the wider result is carried by one regime.
// ---------------------------------------------------------------------------

export async function runTest3(cfg: Test3Config): Promise<any> {
  const caveats: string[] = [];

  // Size guard.
  const n = cfg.intendedWiderUniverse.length;
  if (n < MIN_WIDER) {
    caveats.push(
      `Universe has ${n} symbols; handoff Section 4 wants ${MIN_WIDER}-${MAX_WIDER}. ` +
      `This does NOT satisfy the wider-universe test — report as under-sized, do not compare as equal.`
    );
  }
  if (n > MAX_WIDER) {
    caveats.push(`Universe has ${n} symbols, above the ${MAX_WIDER} guideline — fine, but note it.`);
  }

  const baseConfig = loadConfig(); // read-only
  const barsBySymbol: Map<string, any[]> = await loadBars(cfg.intendedWiderUniverse, cfg.range);

  // THE integrity control: reconcile intended vs data-present BEFORE running.
  const reconciliation = reconcileUniverse(cfg.intendedWiderUniverse, barsBySymbol, cfg.range);
  if (reconciliation.missing.length > 0) {
    caveats.push(
      `SURVIVORSHIP — CRITICAL FOR THIS TEST: ${reconciliation.missing.length} of ${n} intended symbols ` +
      `returned no bars: [${reconciliation.missing.join(", ")}]. Because Test 3 deliberately includes ` +
      `"fell hard" names, missing ones are DISPROPORTIONATELY likely to be real deaths (delisted/acquired/ ` +
      `bankrupt), not data gaps. Each must be checked by hand. Until then, this Test 3 result is ` +
      `survivorship-biased UPWARD and cannot be trusted to say the edge "holds" on a wider universe.`
    );
  }
  if (reconciliation.partial.length > 0) {
    caveats.push(
      `${reconciliation.partial.length} symbols have bars starting late (absent from early folds): ` +
      `[${reconciliation.partial.join(", ")}]. Early-fold universe is smaller than late-fold — the ` +
      `"wider universe" is only fully wide in the recent folds.`
    );
  }

  const folds = buildFolds(cfg.range);

  // Run every fold, pool the trades, and keep a per-regime breakdown.
  const allTrades: any[] = [];
  const byRegime: Record<string, any[]> = { bull: [], bear: [], choppy: [] };

  for (const f of folds) {
    // TODO(verify against repo): runReplay signature — same as the other files.
    const trades: any[] = await runReplay({
      barsBySymbol,
      window: f.test,
      scoreFn: scoreMeanReversion,
      exitPlan: cfg.exitPlan,
      config: baseConfig,
    } as any);
    const { label } = labelRegime(barsBySymbol, f.test);
    allTrades.push(...trades);
    (byRegime[label] ??= []).push(...trades);
  }

  const agg = summarizeTrades(allTrades); // reuse Test 1's metric definitions

  // Is the wider-universe result carried by a single regime? If, say, all the
  // edge is in bull folds and bear folds are flat/negative, "the edge holds on
  // a wider universe" is misleading — it holds in bull markets on more names.
  const regimeBreakdown = Object.fromEntries(
    Object.entries(byRegime).map(([label, trades]) => {
      const m = summarizeTrades(trades);
      return [label, { oos_trades: m.oos_trades, oos_expectancy: m.oos_expectancy_per_trade }];
    })
  );
  const positiveRegimes = Object.values(regimeBreakdown).filter((r: any) => r.oos_expectancy > 0 && r.oos_trades > 0).length;
  const activeRegimes = Object.values(regimeBreakdown).filter((r: any) => r.oos_trades > 0).length;
  if (activeRegimes > 1 && positiveRegimes === 1) {
    caveats.push(
      `The wider-universe edge is carried by ONE regime only ` +
      `(${JSON.stringify(regimeBreakdown)}). "Holds on a wider universe" would overstate it — ` +
      `it holds in that regime on more names. State this in the comparison.`
    );
  }

  // Comparison string, computed against the Test 1 number PASSED IN.
  let comparison: string;
  if (cfg.test1ComparisonExpectancy == null) {
    comparison =
      "Cannot compute — test1ComparisonExpectancy was not provided. Wire the extended Test 1 aggregate " +
      "OOS expectancy (same exit plan) in before this string means anything. Do NOT substitute the old " +
      "2-fold +$1.23 figure.";
  } else {
    const delta = round2(agg.oos_expectancy_per_trade - cfg.test1ComparisonExpectancy);
    const dir =
      Math.abs(delta) < 0.05 ? "holds (roughly unchanged)"
        : delta > 0 ? "STRENGTHENS"
        : "WEAKENS";
    comparison =
      `Wider universe (${reconciliation.used.length} symbols with data) OOS expectancy ` +
      `${agg.oos_expectancy_per_trade} vs Test 1 (${cfg.test1UniverseSize} symbols) ${cfg.test1ComparisonExpectancy} ` +
      `→ edge ${dir} (Δ ${delta}/trade). ` +
      (reconciliation.missing.length > 0
        ? "⚠ BUT see survivorship caveat — missing fallen names bias this comparison upward."
        : "");
  }

  // Section 5 test3_wider_universe shape.
  return {
    universe_size: reconciliation.used.length, // report ACTUAL used, not intended
    intended_universe_size: n,
    symbols: reconciliation.used,
    aggregate_oos_expectancy_per_trade: agg.oos_expectancy_per_trade,
    aggregate_win_rate_pct: agg.win_rate_pct,
    "comparison_to_test1_10-30_symbol_result": comparison,
    _regime_breakdown: regimeBreakdown, // internal detail; helps NCI spot single-regime carry
    _exit_plan: cfg.exitPlan,
    _caveats: caveats, // merged into the file-level caveats by the emitter
    _all_trades_for_csv: allTrades, // if you want a test3 CSV too
  };
}

function round2(x: number): number { return Math.round(x * 100) / 100; }
