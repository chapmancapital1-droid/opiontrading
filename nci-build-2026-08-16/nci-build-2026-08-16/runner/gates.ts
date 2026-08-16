/**
 * NCI Runner — pre-trade gates.
 * ---------------------------------------------------------------------------
 * Nothing reaches a broker without passing every gate here. These run at the
 * runner level, in front of the app's own riskGates, because the app assumes a
 * human is typing the order and this runner removes that human.
 *
 * Design rule: gates fail CLOSED. An error, a missing number, an unparseable
 * quote — all of it blocks the trade. The runner may only lose money by being
 * wrong about the market, never by being confused about its own state.
 */

import { CONFIG } from "./config";
import type { RunnerState } from "./state";

export interface GateResult {
  code: string;
  passed: boolean;
  message: string;
}

export interface TradeIntent {
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  bid: number;
  ask: number;
  session: string;
  sessionAllowsExecution: boolean;
  probability: number;
  earningsWithinDays: number | null;
}

export function runGates(state: RunnerState, intent: TradeIntent, nowEt: Date): GateResult[] {
  const out: GateResult[] = [];
  const R = CONFIG.risk;
  const push = (code: string, passed: boolean, message: string) =>
    out.push({ code, passed, message });

  /* --- Session authority --------------------------------------------------- */
  push(
    "SESSION_EXECUTION",
    intent.sessionAllowsExecution,
    intent.sessionAllowsExecution
      ? `${intent.session} is cleared to execute.`
      : `${intent.session} is scan-only. Idea staged, not traded.`,
  );

  /* --- Account health ------------------------------------------------------ */
  push(
    "EQUITY_FLOOR",
    state.equity > R.equityFloorDollars,
    state.equity > R.equityFloorDollars
      ? `Equity $${state.equity.toFixed(2)} above floor.`
      : `Equity $${state.equity.toFixed(2)} at or below $${R.equityFloorDollars} floor. Trading stopped — this is the line where you stop and reassess, not add money.`,
  );

  const dailyOk = state.stats.dailyRealizedPL > -R.dailyLossHaltDollars;
  push(
    "DAILY_LOSS_HALT",
    dailyOk,
    dailyOk
      ? `Down $${Math.abs(Math.min(0, state.stats.dailyRealizedPL)).toFixed(2)} today, within limit.`
      : `Daily loss halt: $${state.stats.dailyRealizedPL.toFixed(2)}. No new entries today.`,
  );

  const weeklyOk = state.stats.weeklyRealizedPL > -R.weeklyLossHaltDollars;
  push(
    "WEEKLY_LOSS_HALT",
    weeklyOk,
    weeklyOk ? "Weekly loss within limit." : `Weekly loss halt: $${state.stats.weeklyRealizedPL.toFixed(2)}.`,
  );

  const slotsOk = state.openPositions.length < R.maxConcurrentPositions;
  push(
    "POSITION_SLOTS",
    slotsOk,
    slotsOk
      ? `${state.openPositions.length}/${R.maxConcurrentPositions} slots used.`
      : `All ${R.maxConcurrentPositions} position slots full.`,
  );

  const dupe = state.openPositions.some((p) => p.symbol === intent.symbol);
  push("NO_DUPLICATE", !dupe, dupe ? `Already holding ${intent.symbol}.` : "No existing position.");

  /* --- Active halts -------------------------------------------------------- */
  const active = state.halts.filter((h) => new Date(h.until) > nowEt);
  push(
    "NO_ACTIVE_HALT",
    active.length === 0,
    active.length === 0 ? "No active halts." : `Halt in force: ${active.map((h) => h.code).join(", ")}.`,
  );

  /* --- Trade structure ----------------------------------------------------- */
  const priced =
    Number.isFinite(intent.entryPrice) &&
    Number.isFinite(intent.stopPrice) &&
    Number.isFinite(intent.targetPrice) &&
    intent.entryPrice > 0;
  push("PRICES_VALID", priced, priced ? "Prices parse." : "Bad or missing price data — refusing to guess.");

  const stopBelow = intent.side === "long" ? intent.stopPrice < intent.entryPrice : intent.stopPrice > intent.entryPrice;
  push(
    "STOP_PRESENT",
    priced && stopBelow,
    stopBelow ? `Stop at $${intent.stopPrice.toFixed(2)}.` : "Stop is missing or on the wrong side of entry.",
  );

  const risk = Math.abs(intent.entryPrice - intent.stopPrice);
  const reward = Math.abs(intent.targetPrice - intent.entryPrice);
  const rr = risk > 0 ? reward / risk : 0;
  push(
    "REWARD_RISK",
    rr >= 1.5,
    rr >= 1.5
      ? `Reward:risk ${rr.toFixed(2)}:1.`
      : `Reward:risk only ${rr.toFixed(2)}:1. Below 1.5 the win rate has to be unrealistic to profit.`,
  );

  /* --- Liquidity ----------------------------------------------------------- */
  const mid = (intent.bid + intent.ask) / 2;
  const spreadPct = mid > 0 ? (intent.ask - intent.bid) / mid : 1;
  push(
    "SPREAD",
    spreadPct <= R.maxSpreadPct,
    spreadPct <= R.maxSpreadPct
      ? `Spread ${(spreadPct * 100).toFixed(2)}%.`
      : `Spread ${(spreadPct * 100).toFixed(2)}% exceeds ${(R.maxSpreadPct * 100).toFixed(2)}% — the spread would be a large share of the target.`,
  );

  /* --- Event risk ---------------------------------------------------------- */
  const earningsClear =
    intent.earningsWithinDays === null || intent.earningsWithinDays > CONFIG.screen.earningsBlackoutDays;
  push(
    "EARNINGS_BLACKOUT",
    earningsClear,
    earningsClear ? "No earnings in window." : `Earnings in ${intent.earningsWithinDays} days — gap risk jumps the stop.`,
  );

  /* --- Sizing feasibility -------------------------------------------------- */
  const qty = positionSize(intent);
  push(
    "SIZE_FEASIBLE",
    qty >= 1,
    qty >= 1
      ? `Sized ${qty} shares risking ~$${(qty * risk).toFixed(2)}.`
      : `Cannot size even 1 share within $${R.riskPerTradeDollars} risk — stop is too wide for this account.`,
  );

  const cost = qty * intent.entryPrice;
  push(
    "CASH_AVAILABLE",
    cost <= state.equity,
    cost <= state.equity
      ? `Cost $${cost.toFixed(2)} within equity.`
      : `Cost $${cost.toFixed(2)} exceeds equity $${state.equity.toFixed(2)}.`,
  );

  return out;
}

/** Fixed-dollar risk sizing. Shares = risk budget / distance to stop. */
export function positionSize(intent: TradeIntent): number {
  const perShareRisk = Math.abs(intent.entryPrice - intent.stopPrice);
  if (!(perShareRisk > 0)) return 0;
  return Math.floor(CONFIG.risk.riskPerTradeDollars / perShareRisk);
}

export function gatesPassed(results: GateResult[]): boolean {
  return results.every((r) => r.passed);
}

export function failedGates(results: GateResult[]): GateResult[] {
  return results.filter((r) => !r.passed);
}
