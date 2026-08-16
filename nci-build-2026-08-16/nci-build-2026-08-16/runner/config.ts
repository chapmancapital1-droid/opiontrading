/**
 * NCI Daily Runner — configuration.
 * ---------------------------------------------------------------------------
 * One file holds every number the runner is allowed to act on. Nothing else
 * in the runner may hardcode a risk value; if it isn't here, it isn't a rule.
 *
 * MODE is the master switch. It defaults to "paper" and can only become "live"
 * when BOTH the env var is set AND the live-arm file exists on disk. Two keys,
 * two hands — an accidental env var alone cannot arm real money.
 */

import fs from "node:fs";
import path from "node:path";

export type RunnerMode = "paper" | "live";

export const ROOT = path.resolve(process.cwd(), ".nci-runner");
export const STATE_FILE = path.join(ROOT, "state.json");
export const JOURNAL_FILE = path.join(ROOT, "journal.jsonl");
export const LESSONS_FILE = path.join(ROOT, "lessons.md");
export const LIVE_ARM_FILE = path.join(ROOT, "LIVE_ARMED");

/** Master execution mode. Paper unless explicitly and doubly armed. */
export function resolveMode(): RunnerMode {
  const envWants = process.env.NCI_RUNNER_MODE === "live";
  const armed = fs.existsSync(LIVE_ARM_FILE);
  return envWants && armed ? "live" : "paper";
}

export const CONFIG = {
  /** Account baseline. Overridden by the live account read when armed. */
  startingEquity: Number(process.env.NCI_START_EQUITY ?? 300),

  risk: {
    /**
     * Fixed dollar risk per trade. At $300 this is the honest sizing choice:
     * percentage sizing produces sub-$5 risk units that spreads eat alive.
     */
    riskPerTradeDollars: 15,
    /** Runner refuses to open anything new past this many concurrent trades. */
    maxConcurrentPositions: 2,
    /** Realized loss in one day that halts all new entries until tomorrow. */
    dailyLossHaltDollars: 30,
    /** Realized loss over a rolling week that halts entries for 3 sessions. */
    weeklyLossHaltDollars: 60,
    /** Equity floor. Below this the runner stops trading and says why. */
    equityFloorDollars: 200,
    /** Hard stop distance as a fraction of entry. Always applied. */
    stopLossPct: 0.05,
    /** First scale-out target. Mirrors the Pair -> Pare board. */
    target1Pct: 0.05,
    /** Runner target once the first rung is booked. */
    target2Pct: 0.1,
    /** Skip anything whose spread exceeds this fraction of price. */
    maxSpreadPct: 0.006,
  },

  screen: {
    /** Candidates the pre-market pass hands to the open. */
    candidateCount: 3,
    /** Price band — cheap enough to size at $300, liquid enough to exit. */
    minPrice: 5,
    maxPrice: 60,
    /** Minimum average daily volume. Below this, slippage is the strategy. */
    minAvgVolume: 2_000_000,
    /** Reject anything reporting earnings inside this window. */
    earningsBlackoutDays: 2,
  },

  sessions: {
    /**
     * London overlap. NOTE: for US equities on Robinhood this is extended-hours
     * or 24-hour-market territory — thin books and wide spreads. The runner
     * SCANS here and stages ideas, but will not place equity orders in this
     * window unless allowExecution is flipped on deliberately.
     */
    london: {
      label: "London overlap",
      startEt: "03:00",
      endEt: "06:00",
      chartInterval: "30min",
      bias: "bullish" as const,
      allowExecution: false,
      note: "Scan + stage only. Pre-market equity books are thin; see runner/SCHEDULE.md.",
    },
    /** Pre-market prep — screens and writes the day's candidate list. */
    premarket: {
      label: "Pre-market prep",
      startEt: "08:00",
      endEt: "09:25",
      chartInterval: "15min",
      allowExecution: false,
    },
    /** US open. This is the only window that may place equity orders. */
    usOpen: {
      label: "US open",
      startEt: "09:30",
      endEt: "11:00",
      chartInterval: "5min",
      allowExecution: true,
      /** No entries in the first N minutes — the open is noise, not signal. */
      settleMinutes: 5,
    },
    /** End of day: close intraday positions, score forecasts, write lessons. */
    review: {
      label: "Close + review",
      startEt: "15:45",
      endEt: "16:15",
      allowExecution: true,
    },
  },

  /** Validation gate. The runner will not recommend arming live below this. */
  validation: {
    minTradesBeforeLive: 100,
    minExpectancyDollars: 0,
    maxDrawdownPctBeforeReview: 0.2,
  },
} as const;

export type SessionKey = keyof typeof CONFIG.sessions;
