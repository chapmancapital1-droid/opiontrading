/**
 * Build demo domain legs for Compare UI (no live chain required).
 * Educational templates — marks are illustrative.
 */

import type { Leg } from "@/domain/types";

function round5(x: number): number {
  return Math.round(x / 5) * 5;
}

function opt(
  side: "long" | "short",
  optionType: "call" | "put",
  strike: number,
  prem: number,
  expiration: string
): Leg {
  return {
    assetType: "option",
    side,
    optionType,
    contracts: 1,
    strike,
    expiration,
    premiumPerShare: prem,
    multiplier: 100,
    impliedVol: 0.3,
    exerciseStyle: "american",
    feesTotal: 0,
    quoteTimestamp: null,
  };
}

function stk(spot: number): Leg {
  return {
    assetType: "stock",
    side: "long",
    shares: 100,
    entryPrice: spot,
    feesTotal: 0,
    quoteTimestamp: null,
  };
}

export const COMPARE_STRATEGY_IDS = [
  "long_call",
  "long_put",
  "bull_call_debit",
  "bear_put_debit",
  "bull_put_credit",
  "bear_call_credit",
  "iron_condor",
  "long_straddle",
  "cash_secured_put",
  "covered_call",
] as const;

export type CompareStrategyId = (typeof COMPARE_STRATEGY_IDS)[number];

export const COMPARE_STRATEGY_LABELS: Record<CompareStrategyId, string> = {
  long_call: "Long call",
  long_put: "Long put",
  bull_call_debit: "Bull call debit",
  bear_put_debit: "Bear put debit",
  bull_put_credit: "Bull put credit",
  bear_call_credit: "Bear call credit",
  iron_condor: "Iron condor",
  long_straddle: "Long straddle",
  cash_secured_put: "Cash-secured put",
  covered_call: "Covered call",
};

export function buildDemoLegs(
  strategyId: CompareStrategyId,
  spot: number,
  dte: number
): Leg[] {
  const S = round5(spot);
  const exp = new Date(Date.now() + Math.max(1, dte) * 864e5).toISOString().slice(0, 10);
  const w = Math.max(5, Math.round(S * 0.025));

  switch (strategyId) {
    case "long_call":
      return [opt("long", "call", S, 5.0, exp)];
    case "long_put":
      return [opt("long", "put", S, 4.8, exp)];
    case "bull_call_debit":
      return [opt("long", "call", S, 6.2, exp), opt("short", "call", S + w * 2, 3.1, exp)];
    case "bear_put_debit":
      return [opt("long", "put", S, 6.0, exp), opt("short", "put", S - w * 2, 3.0, exp)];
    case "bull_put_credit":
      return [opt("short", "put", S - w, 1.8, exp), opt("long", "put", S - w * 3, 0.6, exp)];
    case "bear_call_credit":
      return [opt("short", "call", S + w, 1.7, exp), opt("long", "call", S + w * 3, 0.55, exp)];
    case "iron_condor":
      return [
        opt("long", "put", S - w * 3, 0.5, exp),
        opt("short", "put", S - w * 2, 1.2, exp),
        opt("short", "call", S + w * 2, 1.1, exp),
        opt("long", "call", S + w * 3, 0.4, exp),
      ];
    case "long_straddle":
      return [opt("long", "call", S, 4.0, exp), opt("long", "put", S, 3.5, exp)];
    case "cash_secured_put":
      return [opt("short", "put", S - w, 2.0, exp)];
    case "covered_call":
      return [stk(S), opt("short", "call", S + w, 2.5, exp)];
    default:
      return [opt("long", "call", S, 5.0, exp)];
  }
}
