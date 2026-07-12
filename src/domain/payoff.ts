import Decimal from "decimal.js";
import {
  D, ZERO, add, sub, mul, maxD, toNumber,
  intrinsicCall, intrinsicPut,
} from "./money";
import type {
  Leg, OptionLeg, StockLeg, StrategyInput,
  PayoffResult, Breakpoint,
} from "./types";

/** Signed premium cash flow at entry for one option leg (after fees), in $.
 *  Long pays (negative), short receives (positive). */
function optionEntryCash(leg: OptionLeg): Decimal.Value {
  const gross = mul(leg.premiumPerShare, leg.contracts, leg.multiplier);
  const signed = leg.side === "long" ? gross.neg() : gross;
  return sub(signed, leg.feesTotal);
}

/** Signed entry cash for a stock leg (buying = negative). Fees subtracted. */
function stockEntryCash(leg: StockLeg): Decimal.Value {
  const gross = mul(leg.entryPrice, leg.shares);
  const signed = leg.side === "long" ? gross.neg() : gross;
  return sub(signed, leg.feesTotal);
}

/** Value of an option leg's INTRINSIC settlement at expiration price s, in $.
 *  This is the payoff of exercise/assignment only (premium handled at entry). */
function optionExpiryValue(leg: OptionLeg, s: Decimal.Value): Decimal {
  const intr =
    leg.optionType === "call" ? intrinsicCall(s, leg.strike) : intrinsicPut(s, leg.strike);
  const gross = mul(intr, leg.contracts, leg.multiplier);
  // Long owns the intrinsic (positive); short owes it (negative).
  return leg.side === "long" ? D(gross) : D(gross).neg();
}

/** Value of a stock leg at expiration price s, in $ (mark-to-market of shares). */
function stockExpiryValue(leg: StockLeg, s: Decimal.Value): Decimal {
  const gross = mul(s, leg.shares);
  return leg.side === "long" ? D(gross) : D(gross).neg();
}

/** Total strategy P/L at expiration price s (in dollars). */
export function plAtExpiration(legs: Leg[], s: number): number {
  let total = ZERO;
  for (const leg of legs) {
    if (leg.assetType === "option") {
      total = add(total, optionEntryCash(leg), optionExpiryValue(leg, s));
    } else {
      total = add(total, stockEntryCash(leg), stockExpiryValue(leg, s));
    }
  }
  return toNumber(total);
}

/** Net entry cash flow across all legs (+credit / -debit), after fees. */
export function netEntryCash(legs: Leg[]): number {
  let total = ZERO;
  for (const leg of legs) {
    total = add(total, leg.assetType === "option" ? optionEntryCash(leg) : stockEntryCash(leg));
  }
  return toNumber(total);
}

/** Sorted unique breakpoints where the piecewise-linear payoff can kink. */
function collectBreakpoints(legs: Leg[]): Breakpoint[] {
  const pts: Breakpoint[] = [];
  for (const leg of legs) {
    if (leg.assetType === "option") pts.push({ price: leg.strike, source: "strike" });
    else pts.push({ price: leg.entryPrice, source: "stockEntry" });
  }
  const seen = new Set<number>();
  const uniq: Breakpoint[] = [];
  for (const p of pts.sort((a, b) => a.price - b.price)) {
    if (!seen.has(p.price)) { seen.add(p.price); uniq.push(p); }
  }
  return uniq;
}

/** Slope (d P/L / d S) of the payoff for S below the lowest and above the
 *  highest strike. Determines unlimited/undefined tails without a chart range. */
function tailSlopes(legs: Leg[]): { lower: number; upper: number } {
  let lower = 0; // slope as S -> 0+
  let upper = 0; // slope as S -> +inf
  for (const leg of legs) {
    if (leg.assetType === "stock") {
      const s = (leg.side === "long" ? 1 : -1) * leg.shares;
      lower += s; upper += s;
    } else {
      const size = leg.contracts * leg.multiplier;
      const dir = leg.side === "long" ? 1 : -1;
      if (leg.optionType === "call") {
        // call intrinsic slope is 0 below strike, +1 above
        upper += dir * size;
      } else {
        // put intrinsic slope is -1 below strike, 0 above
        lower += dir * -1 * size;
      }
    }
  }
  return { lower, upper };
}

/** Bisection root finder on f between a and b (f(a),f(b) opposite signs). */
function bisect(f: (x: number) => number, a: number, b: number, iters = 80): number {
  let lo = a, hi = b, flo = f(lo);
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (fm === 0 || (hi - lo) / 2 < 1e-9) return mid;
    if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; }
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Break-evens: scan intervals between breakpoints (and a tail region on each
 *  side), detect sign changes in net P/L, bisect each. Returns sorted, deduped. */
export function findBreakEvens(legs: Leg[]): number[] {
  const bpsFull = collectBreakpoints(legs).map((b) => b.price);
  if (bpsFull.length === 0) return [];

  const lo0 = Math.min(...bpsFull);
  const hi0 = Math.max(...bpsFull);

  // Dynamically size the scan window: a nonzero tail must travel far enough to
  // cover the worst-case P/L magnitude, guaranteeing we bracket every root
  // even when all strikes are equal (straddle) or spread is tiny.
  const { lower, upper } = tailSlopes(legs);
  const probe = Math.max(
    Math.abs(plAtExpiration(legs, lo0)),
    Math.abs(plAtExpiration(legs, hi0)),
    1
  );
  const reachUp = upper !== 0 ? probe / Math.abs(upper) + 5 : 0;
  const reachDn = lower !== 0 ? probe / Math.abs(lower) + 5 : 0;
  const span = Math.max(hi0 - lo0, 1);
  const start = Math.max(0, lo0 - reachDn - span);
  const end = hi0 + reachUp + span;

  const steps = 800;
  const grid: number[] = [];
  for (let i = 0; i <= steps; i++) grid.push(start + ((end - start) * i) / steps);

  const f = (x: number) => plAtExpiration(legs, x);
  const roots: number[] = [];
  for (let i = 1; i < grid.length; i++) {
    const x0 = grid[i - 1]!, x1 = grid[i]!;
    const y0 = f(x0), y1 = f(x1);
    if (y0 === 0) roots.push(x0);
    else if (Math.sign(y0) !== Math.sign(y1)) roots.push(bisect(f, x0, x1));
  }
  const out: number[] = [];
  for (const r of roots.sort((a, b) => a - b)) {
    if (!out.some((v) => Math.abs(v - r) < 0.005)) out.push(Number(r.toFixed(4)));
  }
  return out;
}

/** Max profit / max loss. Evaluates every breakpoint plus tail behaviour.
 *  Unlimited upside if upper tail slope > 0; undefined loss if the upper tail
 *  falls forever (upper < 0). Equity S>=0 bounds lower-tail loss at S=0. */
export function extrema(legs: Leg[]): {
  maxProfit: number | "unlimited";
  maxLoss: number | "undefined";
  hasUnlimitedUpside: boolean;
  hasUnlimitedDownside: boolean;
} {
  const { upper } = tailSlopes(legs);
  const bps = collectBreakpoints(legs).map((b) => b.price);

  const testPts = new Set<number>([0, ...bps]);
  const hi = (bps.length ? Math.max(...bps) : 100) * 3 + 100;
  testPts.add(hi);

  let maxP = -Infinity, minP = Infinity;
  for (const x of testPts) {
    const y = plAtExpiration(legs, x);
    if (y > maxP) maxP = y;
    if (y < minP) minP = y;
  }

  const hasUnlimitedUpside = upper > 0;
  const hasUnlimitedDownside = upper < 0;
  return {
    maxProfit: hasUnlimitedUpside ? "unlimited" : Number(maxP.toFixed(2)),
    maxLoss: hasUnlimitedDownside ? "undefined" : Number(minP.toFixed(2)),
    hasUnlimitedUpside,
    hasUnlimitedDownside,
  };
}

/** Top-level payoff analysis assembling the PayoffResult. */
export function analyzePayoff(input: StrategyInput): PayoffResult {
  const { legs } = input;
  const net = netEntryCash(legs);
  const breakEvens = findBreakEvens(legs);
  const ex = extrema(legs);
  const bps = collectBreakpoints(legs);

  // Representative size for a per-share proxy (largest option leg notional).
  let repShares = 0;
  for (const leg of legs) {
    if (leg.assetType === "option") repShares = Math.max(repShares, leg.contracts * leg.multiplier);
    else repShares = Math.max(repShares, leg.shares);
  }
  const netPerShareApprox = repShares > 0 ? net / repShares : net;

  return {
    netCashFlow: Number(net.toFixed(2)),
    netPerShareApprox: Number(netPerShareApprox.toFixed(4)),
    totalDebit: net < 0 ? Number((-net).toFixed(2)) : 0,
    totalCredit: net > 0 ? Number(net.toFixed(2)) : 0,
    maxProfit: ex.maxProfit,
    maxLoss: ex.maxLoss,
    breakEvens,
    plAtPrice: (price: number) => plAtExpiration(legs, price),
    plAtCurrent:
      input.currentPrice != null ? Number(plAtExpiration(legs, input.currentPrice).toFixed(2)) : null,
    hasUnlimitedUpside: ex.hasUnlimitedUpside,
    hasUnlimitedDownside: ex.hasUnlimitedDownside,
    breakpoints: bps,
  };
}
