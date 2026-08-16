/**
 * NCI Runner — orchestrator.
 *
 *   npx tsx runner/daily.ts london
 *   npx tsx runner/daily.ts premarket
 *   npx tsx runner/daily.ts open
 *   npx tsx runner/daily.ts review
 *   npx tsx runner/daily.ts status
 *
 * Each session is a separate invocation so cron owns the clock, not a
 * long-lived process that can silently die at 2am and take the day with it.
 */

import { CONFIG, LIVE_ARM_FILE, resolveMode } from "./config";
import { computePerformance, liveReadiness, loadState, readJournal, saveState } from "./state";
import { advanceDay, paperBroker, resolveBracket, simFeed } from "./simMarket";
import {
  runLondonSession,
  runOpenSession,
  runPremarketSession,
  runReviewSession,
  type Broker,
  type DataFeed,
  type Snapshot,
} from "./sessions";

/* -------------------------------------------------------------------------- */
/* Simulated feed + paper broker — the default, and the whole point for now    */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */

function banner(mode: string) {
  const bar = "─".repeat(58);
  console.log(`\n${bar}\nNERDCOMMAND · NCI DAILY RUNNER · MODE: ${mode.toUpperCase()}\n${bar}`);
  if (mode === "paper") {
    console.log("Simulated fills. No real orders. No real money.\n");
  } else {
    console.log("!! LIVE MODE — real orders against real capital.\n");
  }
}

async function main() {
  const session = process.argv[2] ?? "status";
  const mode = resolveMode();
  banner(mode);

  if (session === "advance") {
    const c = advanceDay();
    // Weekly halt counter rolls every 5 sim sessions.
    if (c.day % 5 === 0) {
      const st = loadState();
      st.stats.weeklyRealizedPL = 0;
      st.stats.dailyRealizedPL = 0;
      saveState(st);
    }
    console.log(`Sim clock advanced to day ${c.day}.`);
    return;
  }

  switch (session) {
    case "london": {
      const s = await runLondonSession(simFeed);
      console.log(`Staged ${s.watchlist.length} name(s):`);
      s.watchlist.forEach((w) => console.log(`  ${w.symbol.padEnd(6)} ${w.reason}`));
      console.log("\nScan-only session. Nothing was traded.");
      break;
    }

    case "premarket": {
      const c = await runPremarketSession(simFeed);
      if (!c.length) {
        console.log("No candidates cleared the screen. No trade is a position.");
        break;
      }
      console.log(`Today's ${c.length} candidate(s):\n`);
      c.forEach((x, i) => {
        console.log(`${i + 1}. ${x.symbol}  ${x.score}/6`);
        console.log(`   entry $${x.entry.toFixed(2)}  stop $${x.stop.toFixed(2)}  target $${x.target.toFixed(2)}  R:R ${x.rr.toFixed(2)}`);
        console.log(`   ${x.signals.join(", ")}\n`);
      });
      break;
    }

    case "open": {
      const c = await runPremarketSession(simFeed);
      const placed = await runOpenSession(c, paperBroker, mode);
      console.log(`Placed ${placed.length} of ${c.length} candidate(s).`);
      placed.forEach((t) =>
        console.log(
          `  ${t.symbol}  ${t.qty} sh @ $${t.entryPrice.toFixed(2)}  stop $${t.stopPrice.toFixed(2)}  risk $${t.riskDollars.toFixed(2)}`,
        ),
      );
      const skipped = c.length - placed.length;
      if (skipped > 0) console.log(`\n${skipped} rejected by gates — see journal for the reason on each.`);
      break;
    }

    case "review": {
      const { summary } = await runReviewSession(paperBroker, simFeed, resolveBracket);
      console.log(summary);
      break;
    }

    case "status":
    default: {
      const state = loadState();
      const perf = computePerformance(state, readJournal());
      const ready = liveReadiness(perf);
      const pl = state.equity - state.startingEquity;

      console.log(`Equity        $${state.equity.toFixed(2)}  (start $${state.startingEquity.toFixed(2)}, ${pl >= 0 ? "+" : ""}$${pl.toFixed(2)})`);
      console.log(`Open          ${state.openPositions.length}/${CONFIG.risk.maxConcurrentPositions}`);
      console.log(`Trades        ${perf.trades}`);
      console.log(`Win rate      ${(perf.winRate * 100).toFixed(1)}%`);
      console.log(`Avg win/loss  $${perf.avgWin.toFixed(2)} / $${perf.avgLoss.toFixed(2)}`);
      console.log(`Expectancy    $${perf.expectancy.toFixed(2)} per trade`);
      console.log(`Profit factor ${perf.profitFactor === Infinity ? "—" : perf.profitFactor.toFixed(2)}`);
      console.log(`Max drawdown  ${(perf.maxDrawdownPct * 100).toFixed(1)}%`);
      console.log(`Forecast acc  ${(perf.forecastAccuracy * 100).toFixed(1)}%`);

      console.log(`\nLIVE READINESS: ${ready.ready ? "PASSED" : "NOT READY"}`);
      ready.reasons.forEach((r) => console.log(`  · ${r}`));
      if (ready.ready) {
        console.log(`\n  To arm live: create ${LIVE_ARM_FILE} and set NCI_RUNNER_MODE=live`);
      }
      break;
    }
  }
  console.log("");
}

main().catch((e) => {
  console.error("Runner failed:", e);
  process.exit(1);
});
