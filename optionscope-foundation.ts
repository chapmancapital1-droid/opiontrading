/* ============================================================================
   OPTIONSCOPE — MESSAGE 1 of N
   Foundation + Calculation Engine (payoff, break-evens, max P/L)

   This file bundles multiple project files separated by clear banners.
   Split each section into the path shown in its banner:  ===== FILE: path =====
   ============================================================================ */


/* ===== FILE: package.json ===== */
/*
{
  "name": "optionscope",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "decimal.js": "10.4.3"
  },
  "devDependencies": {
    "@types/node": "20.14.10",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "autoprefixer": "10.4.19",
    "postcss": "8.4.39",
    "tailwindcss": "3.4.6",
    "typescript": "5.5.3",
    "vitest": "2.0.3"
  }
}
*/


/* ===== FILE: tsconfig.json ===== */
/*
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES2020", "webworker"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
*/


/* ===== FILE: next.config.mjs ===== */
/*
/** @type {import('next').NextConfig} *\/
const nextConfig = {
  reactStrictMode: true,
  // Market-data secrets live only in server env; never NEXT_PUBLIC_*.
  env: {},
};
export default nextConfig;
*/


/* ===== FILE: .env.example ===== */
/*
# ---- Server-only secrets. NEVER prefix market-data keys with NEXT_PUBLIC_ ----
MARKET_DATA_PROVIDER=demo          # demo | polygon | tradier | ...
MARKET_DATA_API_KEY=               # your licensed provider key (server only)
MARKET_DATA_BASE_URL=

# ---- Supabase (added in Message 5) ----
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # server only

# ---- App ----
NEXT_PUBLIC_APP_NAME=OptionScope
*/


/* ============================================================================
   ===== FILE: src/domain/money.ts =====
   Decimal-safe money math. All engine arithmetic goes through Decimal;
   rounding happens ONLY at the presentation layer (fmtUSD / toNumber).
   ============================================================================ */

import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

export type Money = Decimal;
export const D = (v: Decimal.Value): Decimal => new Decimal(v);
export const ZERO = D(0);

export const add = (...xs: Decimal.Value[]): Decimal =>
  xs.reduce<Decimal>((a, b) => a.plus(b), ZERO);
export const sub = (a: Decimal.Value, b: Decimal.Value): Decimal => D(a).minus(b);
export const mul = (...xs: Decimal.Value[]): Decimal =>
  xs.reduce<Decimal>((a, b) => a.times(b), D(1));
export const div = (a: Decimal.Value, b: Decimal.Value): Decimal => D(a).div(b);
export const neg = (a: Decimal.Value): Decimal => D(a).neg();
export const maxD = (a: Decimal.Value, b: Decimal.Value): Decimal =>
  Decimal.max(D(a), D(b));
export const minD = (a: Decimal.Value, b: Decimal.Value): Decimal =>
  Decimal.min(D(a), D(b));

/** Intrinsic payoff of one long option contract-share at price s. */
export const intrinsicCall = (s: Decimal.Value, k: Decimal.Value): Decimal =>
  maxD(sub(s, k), ZERO);
export const intrinsicPut = (s: Decimal.Value, k: Decimal.Value): Decimal =>
  maxD(sub(k, s), ZERO);

export const toNumber = (a: Decimal.Value): number => D(a).toNumber();

/** Presentation-layer formatting only. */
export const fmtUSD = (a: Decimal.Value, dp = 2): string => {
  const n = D(a).toDecimalPlaces(dp, Decimal.ROUND_HALF_EVEN);
  const sign = n.isNegative() ? "-" : "";
  const abs = n.abs().toFixed(dp);
  const [intPart, frac] = abs.split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${withCommas}${frac ? "." + frac : ""}`;
};

export const fmtPct = (frac01: number, dp = 1): string =>
  `${(frac01 * 100).toFixed(dp)}%`;


/* ============================================================================
   ===== FILE: src/domain/types.ts =====
   Normalized trade-leg model. Every downstream calc reads from these types.
   ============================================================================ */

export type AssetType = "option" | "stock";
export type Side = "long" | "short";
export type OptionType = "call" | "put";
export type ExerciseStyle = "american" | "european";

/** Normalized contract identity — distinguishes adjusted / non-standard OCC. */
export interface ContractId {
  underlying: string;
  expiration: string;   // ISO date (YYYY-MM-DD)
  strike: number;
  optionType: OptionType;
  multiplier: number;   // usually 100; adjusted contracts differ
  isAdjusted: boolean;
  occSymbol?: string;
}

export interface OptionLeg {
  assetType: "option";
  side: Side;
  optionType: OptionType;
  contracts: number;          // count of contracts (can be >1)
  strike: number;
  expiration: string;         // ISO
  premiumPerShare: number;    // expected fill (mark or user override), per share
  multiplier: number;         // default 100
  impliedVol: number | null;  // decimal (0.30 = 30%); null => flag invalid
  exerciseStyle: ExerciseStyle;
  feesTotal: number;          // total $ fees allocated to this leg
  quoteTimestamp: string | null;
  bid?: number | null;
  ask?: number | null;
  mark?: number | null;
  contractId?: ContractId;
}

export interface StockLeg {
  assetType: "stock";
  side: Side;
  shares: number;             // positive count
  entryPrice: number;         // per share cost basis
  feesTotal: number;
  quoteTimestamp: string | null;
}

export type Leg = OptionLeg | StockLeg;

export interface StrategyInput {
  underlying: string;
  legs: Leg[];
  /** Optional: reference current price for "P/L at current price". */
  currentPrice?: number | null;
}

/** A breakpoint on the payoff curve (strikes create kinks). */
export interface Breakpoint {
  price: number;
  source: "strike" | "stockEntry";
}

export interface PayoffResult {
  netCashFlow: number;          // + = credit received, - = debit paid (after fees)
  netPerShareApprox: number;    // per-share proxy (net / representative multiplier·qty)
  totalDebit: number;           // positive if net debit, else 0
  totalCredit: number;          // positive if net credit, else 0
  maxProfit: number | "unlimited";
  maxLoss: number | "undefined";   // negative number, or "undefined" if unlimited loss
  breakEvens: number[];
  plAtPrice: (price: number) => number;
  plAtCurrent: number | null;
  hasUnlimitedUpside: boolean;
  hasUnlimitedDownside: boolean;
  breakpoints: Breakpoint[];
}


/* ============================================================================
   ===== FILE: src/domain/payoff.ts =====
   Expiration payoff engine.
   - Per-leg intrinsic P/L at expiration
   - Aggregate net cash flow (credit/debit) after fees
   - Break-even detection via strike-interval scan + bisection on the net curve
   - Max profit / max loss by evaluating breakpoints AND both tails
     (correctly identifies unlimited/undefined risk — never chart-bound)
   ============================================================================ */

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
  const bps = collectBreakpoints(legs).map((b) => b.price);
  if (bps.length === 0) return [];
  const lo0 = Math.max(0, Math.min(...bps));
  const hi0 = Math.max(...bps);
  const span = Math.max(hi0 - lo0, 1);
  // Scan grid: below lowest, between each pair, above highest.
  const grid: number[] = [];
  const start = Math.max(0, lo0 - span - 5);
  const end = hi0 + span + 5;
  const steps = 400;
  for (let i = 0; i <= steps; i++) grid.push(start + ((end - start) * i) / steps);

  const f = (x: number) => plAtExpiration(legs, x);
  const roots: number[] = [];
  for (let i = 1; i < grid.length; i++) {
    const x0 = grid[i - 1]!, x1 = grid[i]!;
    const y0 = f(x0), y1 = f(x1);
    if (y0 === 0) roots.push(x0);
    else if (Math.sign(y0) !== Math.sign(y1)) roots.push(bisect(f, x0, x1));
  }
  // Dedup within a cent.
  const out: number[] = [];
  for (const r of roots.sort((a, b) => a - b)) {
    if (!out.some((v) => Math.abs(v - r) < 0.005)) out.push(Number(r.toFixed(4)));
  }
  return out;
}

/** Max profit / max loss. Evaluates every breakpoint plus tail behaviour.
 *  Unlimited upside if upper tail slope > 0; undefined loss if a tail slope
 *  drives P/L to -inf (upper slope < 0, or lower slope > 0 as S->0). */
export function extrema(legs: Leg[]): {
  maxProfit: number | "unlimited";
  maxLoss: number | "undefined";
  hasUnlimitedUpside: boolean;
  hasUnlimitedDownside: boolean;
} {
  const bps = collectBreakpoints(legs).map((b) => b.price);
  const { lower, upper } = tailSlopes(legs);

  const testPts = new Set<number>([0]);
  for (const p of bps) testPts.add(p);
  // A couple of far points to catch monotone regions.
  const hi = (bps.length ? Math.max(...bps) : 100) * 3 + 100;
  testPts.add(hi);

  let maxP = -Infinity, minP = Infinity;
  for (const x of testPts) {
    const y = plAtExpiration(legs, x);
    if (y > maxP) maxP = y;
    if (y < minP) minP = y;
  }

  const hasUnlimitedUpside = upper > 0;
  // Downside is unbounded if the upper tail falls forever (upper<0)
  // or the lower tail rises toward S=0 in a way that... for equities S>=0,
  // so lower-tail loss is bounded at S=0. Undefined loss => upper<0.
  const hasUnlimitedDownside = upper < 0;

  const maxProfit: number | "unlimited" = hasUnlimitedUpside ? "unlimited" : Number(maxP.toFixed(2));
  const maxLoss: number | "undefined" = hasUnlimitedDownside ? "undefined" : Number(minP.toFixed(2));
  return { maxProfit, maxLoss, hasUnlimitedUpside, hasUnlimitedDownside };
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


/* ============================================================================
   ===== FILE: src/domain/collateral.ts =====
   Broker collateral / capital-at-risk estimates (educational; label clearly).
   Real Robinhood requirements can differ — this is a modeled estimate.
   ============================================================================ */

import type { Leg, OptionLeg } from "./types";

/** Estimate defined-risk collateral for common cases. Returns null when the
 *  position is undefined-risk (should be blocked in companion mode anyway). */
export function estimateCollateral(legs: Leg[]): number | null {
  // Cash-secured put: reserve strike * multiplier * contracts - premium.
  const shorts = legs.filter(
    (l): l is OptionLeg => l.assetType === "option" && l.side === "short"
  );
  const longs = legs.filter(
    (l): l is OptionLeg => l.assetType === "option" && l.side === "long"
  );

  // Vertical spread (same type, opposite sides): collateral ~= width * mult * qty.
  if (shorts.length === 1 && longs.length === 1) {
    const s = shorts[0]!, l = longs[0]!;
    if (s.optionType === l.optionType) {
      const width = Math.abs(s.strike - l.strike);
      const qty = Math.min(s.contracts, l.contracts);
      return Number((width * s.multiplier * qty).toFixed(2));
    }
  }

  // Single cash-secured put.
  if (shorts.length === 1 && longs.length === 0) {
    const s = shorts[0]!;
    if (s.optionType === "put") {
      const reserve = s.strike * s.multiplier * s.contracts - s.premiumPerShare * s.multiplier * s.contracts;
      return Number(reserve.toFixed(2));
    }
  }

  return null; // covered call collateral = the shares themselves; handled in UI
}
