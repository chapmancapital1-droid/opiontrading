/**
 * Phase 4.1 — Instantiate strategy legs from a live (or demo) option chain.
 *
 * Maps a strategyId + MarketContext spot to concrete strikes/premiums using
 * listed contracts. Delta targets use a simple moneyness proxy when IV is
 * available (not a full BS delta — good enough for strike selection).
 *
 * Educational tooling only — not investment advice.
 */

import type { Leg, OptionLeg, OptionType, Side } from "@/domain/types";
import type { OptionChain, OptionQuote } from "@/data/types";
import { analyzePayoff } from "@/domain/payoff";

export interface ChainRow {
  strike: number;
  type: OptionType;
  mark: number | null;
  iv: number | null;
}

export interface InstantiateInput {
  strategyId: string;
  symbol: string;
  spot: number;
  expiration: string;
  /** Listed chain quotes (from data layer or builder live rows). */
  chain: readonly ChainRow[];
  /** Preferred short-leg |delta| when selling premium (default 0.25). */
  shortDeltaTarget?: number;
  /** Spread width in $ when building verticals (default 5). */
  width?: number;
  /** Wing width for iron condor beyond short strikes (default 5). */
  wingWidth?: number;
}

export interface InstantiatedStrategy {
  strategyId: string;
  legs: Leg[];
  notes: string[];
  /** Modeled max loss per 1-lot (positive dollars), or null if undefined. */
  maxLossPerContract: number | null;
  /** Collateral / cash needed for CSP-style structures. */
  collateralPerContract: number | null;
  ok: boolean;
}

function roundStrike(x: number, step = 1): number {
  return Math.round(x / step) * step;
}

function strikeStep(chain: readonly ChainRow[]): number {
  const strikes = [...new Set(chain.map((c) => c.strike))].sort((a, b) => a - b);
  if (strikes.length < 2) return 1;
  let min = Infinity;
  for (let i = 1; i < strikes.length; i++) {
    const d = strikes[i]! - strikes[i - 1]!;
    if (d > 0 && d < min) min = d;
  }
  return Number.isFinite(min) ? min : 1;
}

function nearest(
  chain: readonly ChainRow[],
  type: OptionType,
  target: number
): ChainRow | null {
  const cands = chain.filter((c) => c.type === type && c.mark != null && c.mark > 0);
  if (!cands.length) return null;
  return cands.reduce((b, c) =>
    Math.abs(c.strike - target) < Math.abs(b.strike - target) ? c : b
  );
}

/** Rough |delta| proxy from moneyness + IV (ATM ~0.5). */
function approxAbsDelta(spot: number, strike: number, type: OptionType, iv: number | null): number {
  const vol = iv && iv > 0.01 ? iv : 0.3;
  const m = Math.log(spot / Math.max(strike, 0.01)) / Math.max(vol, 0.05);
  // logistic-ish mapping of log-moneyness → [0.05, 0.95]
  const callDelta = 1 / (1 + Math.exp(-2.2 * m));
  const d = type === "call" ? callDelta : 1 - callDelta;
  return Math.min(0.95, Math.max(0.05, d));
}

function pickByDelta(
  chain: readonly ChainRow[],
  type: OptionType,
  spot: number,
  targetAbsDelta: number,
  side: "otm" | "atm" | "itm" = "otm"
): ChainRow | null {
  const cands = chain.filter((c) => c.type === type && c.mark != null && c.mark > 0);
  if (!cands.length) return null;
  const scored = cands.map((c) => {
    const ad = approxAbsDelta(spot, c.strike, type, c.iv);
    let sidePenalty = 0;
    if (side === "otm") {
      if (type === "put" && c.strike > spot) sidePenalty = 0.15;
      if (type === "call" && c.strike < spot) sidePenalty = 0.15;
    }
    return { c, err: Math.abs(ad - targetAbsDelta) + sidePenalty };
  });
  scored.sort((a, b) => a.err - b.err);
  return scored[0]!.c;
}

function optLeg(
  side: Side,
  optionType: OptionType,
  row: ChainRow,
  expiration: string,
  contracts = 1
): OptionLeg {
  return {
    assetType: "option",
    side,
    optionType,
    contracts,
    strike: row.strike,
    expiration,
    premiumPerShare: row.mark ?? 0,
    multiplier: 100,
    impliedVol: row.iv,
    exerciseStyle: "american",
    feesTotal: 0,
    quoteTimestamp: null,
    mark: row.mark,
  };
}

function stockLeg(spot: number, shares = 100): Leg {
  return {
    assetType: "stock",
    side: "long",
    shares,
    entryPrice: spot,
    feesTotal: 0,
    quoteTimestamp: null,
  };
}

function maxLossOf(legs: Leg[], symbol: string, spot: number): number | null {
  const p = analyzePayoff({ underlying: symbol, legs, currentPrice: spot });
  if (p.maxLoss === "undefined") return null;
  return Math.abs(p.maxLoss);
}

/**
 * Build concrete 1-lot legs for a known strategyId from listed chain rows.
 */
export function instantiateStrategy(input: InstantiateInput): InstantiatedStrategy {
  const {
    strategyId,
    symbol,
    spot,
    expiration,
    chain,
    shortDeltaTarget = 0.25,
    width: widthIn,
    wingWidth: wingIn,
  } = input;
  const notes: string[] = [];
  const step = strikeStep(chain);
  const width = widthIn ?? Math.max(step * 5, 5);
  const wingWidth = wingIn ?? width;

  if (!chain.length) {
    return {
      strategyId,
      legs: [],
      notes: ["No chain rows — cannot instantiate"],
      maxLossPerContract: null,
      collateralPerContract: null,
      ok: false,
    };
  }

  const fail = (msg: string): InstantiatedStrategy => ({
    strategyId,
    legs: [],
    notes: [msg],
    maxLossPerContract: null,
    collateralPerContract: null,
    ok: false,
  });

  let legs: Leg[] = [];
  let collateral: number | null = null;

  switch (strategyId) {
    case "cash_secured_put": {
      const short =
        pickByDelta(chain, "put", spot, shortDeltaTarget, "otm") ??
        nearest(chain, "put", spot - width);
      if (!short) return fail("No put contracts listed");
      legs = [optLeg("short", "put", short, expiration)];
      collateral = short.strike * 100 - (short.mark ?? 0) * 100;
      notes.push(`CSP short put strike ${short.strike} (~|Δ| target ${shortDeltaTarget})`);
      break;
    }
    case "covered_call": {
      const short =
        pickByDelta(chain, "call", spot, shortDeltaTarget + 0.05, "otm") ??
        nearest(chain, "call", spot + width);
      if (!short) return fail("No call contracts listed");
      legs = [stockLeg(spot), optLeg("short", "call", short, expiration)];
      notes.push(`Covered call short ${short.strike} over long 100 shares`);
      break;
    }
    case "bull_put_credit": {
      const short =
        pickByDelta(chain, "put", spot, shortDeltaTarget, "otm") ??
        nearest(chain, "put", spot - width);
      if (!short) return fail("No short put");
      const long = nearest(chain, "put", short.strike - width);
      if (!long) return fail("No long put wing");
      legs = [optLeg("short", "put", short, expiration), optLeg("long", "put", long, expiration)];
      notes.push(`Bull put ${long.strike}/${short.strike}`);
      break;
    }
    case "bear_call_credit": {
      const short =
        pickByDelta(chain, "call", spot, shortDeltaTarget, "otm") ??
        nearest(chain, "call", spot + width);
      if (!short) return fail("No short call");
      const long = nearest(chain, "call", short.strike + width);
      if (!long) return fail("No long call wing");
      legs = [optLeg("short", "call", short, expiration), optLeg("long", "call", long, expiration)];
      notes.push(`Bear call ${short.strike}/${long.strike}`);
      break;
    }
    case "bull_call_debit": {
      const long = nearest(chain, "call", roundStrike(spot, step));
      if (!long) return fail("No long call");
      const short = nearest(chain, "call", long.strike + width);
      if (!short) return fail("No short call");
      legs = [optLeg("long", "call", long, expiration), optLeg("short", "call", short, expiration)];
      notes.push(`Bull call debit ${long.strike}/${short.strike}`);
      break;
    }
    case "bear_put_debit": {
      const long = nearest(chain, "put", roundStrike(spot, step));
      if (!long) return fail("No long put");
      const short = nearest(chain, "put", long.strike - width);
      if (!short) return fail("No short put");
      legs = [optLeg("long", "put", long, expiration), optLeg("short", "put", short, expiration)];
      notes.push(`Bear put debit ${short.strike}/${long.strike}`);
      break;
    }
    case "iron_condor": {
      const shortPut =
        pickByDelta(chain, "put", spot, shortDeltaTarget, "otm") ??
        nearest(chain, "put", spot - width);
      const shortCall =
        pickByDelta(chain, "call", spot, shortDeltaTarget, "otm") ??
        nearest(chain, "call", spot + width);
      if (!shortPut || !shortCall) return fail("Missing short legs for iron condor");
      const longPut = nearest(chain, "put", shortPut.strike - wingWidth);
      const longCall = nearest(chain, "call", shortCall.strike + wingWidth);
      if (!longPut || !longCall) return fail("Missing wing legs for iron condor");
      legs = [
        optLeg("long", "put", longPut, expiration),
        optLeg("short", "put", shortPut, expiration),
        optLeg("short", "call", shortCall, expiration),
        optLeg("long", "call", longCall, expiration),
      ];
      notes.push(
        `Iron condor ${longPut.strike}/${shortPut.strike} // ${shortCall.strike}/${longCall.strike}`
      );
      break;
    }
    case "long_call": {
      const long = nearest(chain, "call", roundStrike(spot, step));
      if (!long) return fail("No call listed");
      legs = [optLeg("long", "call", long, expiration)];
      notes.push(`Long call ${long.strike}`);
      break;
    }
    case "long_put": {
      const long = nearest(chain, "put", roundStrike(spot, step));
      if (!long) return fail("No put listed");
      legs = [optLeg("long", "put", long, expiration)];
      notes.push(`Long put ${long.strike}`);
      break;
    }
    case "long_straddle": {
      const k = roundStrike(spot, step);
      const c = nearest(chain, "call", k);
      const p = nearest(chain, "put", k);
      if (!c || !p) return fail("Need ATM call + put for straddle");
      legs = [optLeg("long", "call", c, expiration), optLeg("long", "put", p, expiration)];
      notes.push(`Long straddle ~${c.strike}/${p.strike}`);
      break;
    }
    default:
      return fail(`No instantiator for strategyId=${strategyId}`);
  }

  const maxLoss = maxLossOf(legs, symbol, spot);
  return {
    strategyId,
    legs,
    notes,
    maxLossPerContract: maxLoss,
    collateralPerContract: collateral,
    ok: legs.length > 0,
  };
}

/** Convert data-layer OptionChain into ChainRow[]. */
export function chainToRows(chain: OptionChain): ChainRow[] {
  return chain.quotes.map((q: OptionQuote) => ({
    strike: q.contract.strike,
    type: q.contract.optionType,
    mark: q.mark,
    iv: q.impliedVol,
  }));
}
