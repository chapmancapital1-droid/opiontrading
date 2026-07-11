import type { Leg } from "@/domain/types";

export type StrategyKind =
  | "long_call" | "long_put" | "covered_call" | "cash_secured_put"
  | "bull_call_debit" | "bear_put_debit" | "bull_put_credit" | "bear_call_credit"
  | "long_straddle" | "long_strangle" | "iron_condor" | "iron_butterfly"
  | "call_butterfly" | "put_butterfly" | "custom_same_expiration";

export type LifecycleState =
  | "planned" | "opened" | "adjusted" | "closed" | "expired" | "exercised" | "assigned";

export type ExitReason =
  | "target_hit" | "stop_hit" | "time_exit" | "expired_worthless" | "expired_itm"
  | "assigned" | "exercised" | "manual" | "other";

export type CashEventKind =
  | "premium_in" | "premium_out" | "stock_buy" | "stock_sell" | "fee" | "dividend";

/** The forecast snapshot captured at entry — never mutated afterward. */
export interface ForecastSnapshot {
  probProfit: number;
  probLoss: number;
  expectedPL: number;
  median: number;
  p5: number;
  p95: number;
  maxProfit: number | "unlimited";
  maxLoss: number | "undefined";
  breakEvens: number[];
  assumptions: {
    model: "black-scholes" | "binomial-crr" | "mixed";
    sigma: number;
    r: number;
    q: number;
    driftMode: "risk-neutral" | "user";
    driftUsed: number;
    simulations: number;
    seed: number;
    ci95Prob: [number, number];
  };
  quoteMeta: { source: string; timestamp: string; freshness: string };
}

export interface TradeRow {
  id: string;
  user_id: string;
  underlying: string;
  strategy: StrategyKind;
  title: string | null;
  state: LifecycleState;
  legs: Leg[];
  forecast: ForecastSnapshot;
  planned_entry_price: number | null;
  planned_profit_target: number | null;
  planned_loss_limit: number | null;
  planned_exit_date: string | null;
  assignment_willing: boolean;
  thesis: string | null;
  actual_entry_price: number | null;
  actual_exit_price: number | null;
  realized_pl: number | null;
  exit_reason: ExitReason | null;
  opened_at: string | null;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashEventRow {
  id: string;
  trade_id: string;
  user_id: string;
  seq: number;
  label: string;
  kind: CashEventKind;
  amount: number;
  occurred_at: string;
  meta: Record<string, unknown> | null;
}
