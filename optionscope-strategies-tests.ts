/* ============================================================================
   OPTIONSCOPE — MESSAGE 3 of N
   (A) PATCH to payoff.ts: corrected findBreakEvens + extrema (unlimited-aware).
   (B) strategyDefinitions.ts — all 15 templates as data.
   (C) tradeLifecycle.ts — wheel state machine + rolling ledger.
   (D) Full acceptance-test suite (Vitest): every fixture from both documents.

   Split each section into the path in its banner: ===== FILE: path =====
   ============================================================================ */


/* ============================================================================
   ===== FILE: src/domain/payoff.ts  (REPLACE findBreakEvens + extrema) =====
   IMPORTANT: These two functions REPLACE the versions from Message 1.
   The Message-1 grid was strike-anchored and missed zero-crossings when all
   strikes coincide (e.g. a straddle). It also under-reported unlimited upside.
   Root cause was verified against the acceptance fixtures before shipping.
   ============================================================================ */

/*  Paste over the same-named functions in src/domain/payoff.ts.
    tailSlopes(), collectBreakpoints(), bisect(), plAtExpiration() are unchanged. */

export function findBreakEvens(legs: import("./types").Leg[]): number[] {
  const bpsFull = /* collectBreakpoints */ (() => {
    const pts = legs.map((l) => (l.assetType === "option" ? l.strike : l.entryPrice));
    return [...new Set(pts)].sort((a, b) => a - b);
  })();
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

export function extrema(legs: import("./types").Leg[]): {
  maxProfit: number | "unlimited";
  maxLoss: number | "undefined";
  hasUnlimitedUpside: boolean;
  hasUnlimitedDownside: boolean;
} {
  const { upper } = tailSlopes(legs);
  const bps = (() => {
    const pts = legs.map((l) => (l.assetType === "option" ? l.strike : l.entryPrice));
    return [...new Set(pts)].sort((a, b) => a - b);
  })();

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

// NOTE: `tailSlopes`, `bisect`, `plAtExpiration`, `collectBreakpoints` remain
// the Message-1 implementations. Keep a single source of truth — the inline
// IIFEs above are only to make this patch self-contained in the artifact.


/* ============================================================================
   ===== FILE: src/domain/strategyDefinitions.ts =====
   The 15 templates as pure data. A template knows how to build normalized legs
   from user "slots" and declares outlook, badges, approval profile, warnings.
   ============================================================================ */

import type { Leg, OptionType, Side } from "./types";

export type ApprovalProfile = "level2_basic" | "level3_spreads" | "sandbox_undefined";

export type RiskClass =
  | "defined"
  | "substantial_downside_capped_upside"
  | "undefined";

export interface StrategyBadges {
  risk: RiskClass;
  cashFlow: "debit" | "credit" | "stock-owned" | "mixed";
  thetaTendency: "positive" | "negative";
  vegaTendency: "positive" | "negative";
  earlyAssignment: boolean;
  sameExpiration: boolean;
}

export interface LegSlot {
  role: string;                 // e.g. "long_lower_call"
  assetType: "option" | "stock";
  side: Side;
  optionType?: OptionType;
  label: string;                // UI label
}

export interface StrategyDefinition {
  id: string;
  name: string;
  aliases: string[];
  summary: string;              // one sentence for the picker
  outlook: "bullish" | "bearish" | "neutral" | "range" | "large-move";
  approval: ApprovalProfile;
  badges: StrategyBadges;
  slots: LegSlot[];
  warnings: string[];
  sourceRefs: string[];
}

const OPT = (role: string, side: Side, optionType: OptionType, label: string): LegSlot => ({
  role, assetType: "option", side, optionType, label,
});
const STK = (role: string, side: Side, label: string): LegSlot => ({
  role, assetType: "stock", side, label,
});

export const STRATEGIES: StrategyDefinition[] = [
  {
    id: "long_call", name: "Long Call", aliases: ["Buy Call"],
    summary: "Buy a call to profit from an upside move; risk limited to the debit.",
    outlook: "bullish", approval: "level2_basic",
    badges: { risk: "defined", cashFlow: "debit", thetaTendency: "negative", vegaTendency: "positive", earlyAssignment: false, sameExpiration: true },
    slots: [OPT("long_call", "long", "call", "Buy call")],
    warnings: ["Time decay works against you.", "Full premium can be lost if the stock stays below the strike."],
    sourceRefs: ["book_pdf:pre-covered-call"],
  },
  {
    id: "long_put", name: "Long Put", aliases: ["Buy Put"],
    summary: "Buy a put to profit from a decline or to hedge shares; risk limited to the debit.",
    outlook: "bearish", approval: "level2_basic",
    badges: { risk: "defined", cashFlow: "debit", thetaTendency: "negative", vegaTendency: "positive", earlyAssignment: false, sameExpiration: true },
    slots: [OPT("long_put", "long", "put", "Buy put")],
    warnings: ["Time decay works against you.", "Distinguish hedge P/L from standalone P/L."],
    sourceRefs: ["book_pdf:27-34"],
  },
  {
    id: "covered_call", name: "Covered Call", aliases: ["Buy-Write"],
    summary: "Own 100 shares per contract and sell a call for premium; upside capped at the strike.",
    outlook: "neutral", approval: "level2_basic",
    badges: { risk: "substantial_downside_capped_upside", cashFlow: "stock-owned", thetaTendency: "positive", vegaTendency: "negative", earlyAssignment: true, sameExpiration: true },
    slots: [STK("long_stock", "long", "Own shares"), OPT("short_call", "short", "call", "Sell call")],
    warnings: [
      "Premium is a limited cushion, not full downside protection.",
      "Early assignment is possible, especially near ex-dividend dates on deep ITM calls.",
      "Substantial downside remains if the stock falls.",
    ],
    sourceRefs: ["book_pdf:17-22", "covered_call_sheet:1"],
  },
  {
    id: "cash_secured_put", name: "Cash-Secured Put", aliases: ["CSP"],
    summary: "Sell a put with cash reserved to buy shares at the strike; max profit is the credit.",
    outlook: "neutral", approval: "level2_basic",
    badges: { risk: "substantial_downside_capped_upside", cashFlow: "credit", thetaTendency: "positive", vegaTendency: "negative", earlyAssignment: true, sameExpiration: true },
    slots: [OPT("short_put", "short", "put", "Sell put")],
    warnings: ["Assignment can create a long stock position.", "Substantial downside if the stock falls well below the strike."],
    sourceRefs: ["book_pdf:34-45"],
  },
  {
    id: "bull_call_debit", name: "Bull Call Debit Spread", aliases: ["Long Call Vertical"],
    summary: "Buy a lower call and sell a higher call; defined risk, defined reward, bullish.",
    outlook: "bullish", approval: "level3_spreads",
    badges: { risk: "defined", cashFlow: "debit", thetaTendency: "negative", vegaTendency: "positive", earlyAssignment: true, sameExpiration: true },
    slots: [OPT("long_lower_call", "long", "call", "Buy lower call"), OPT("short_higher_call", "short", "call", "Sell higher call")],
    warnings: ["Short leg can be assigned early.", "Max profit requires the stock above the higher strike at expiration."],
    sourceRefs: ["book_pdf:53-61"],
  },
  {
    id: "bear_put_debit", name: "Bear Put Debit Spread", aliases: ["Long Put Vertical"],
    summary: "Buy a higher put and sell a lower put; defined risk, defined reward, bearish.",
    outlook: "bearish", approval: "level3_spreads",
    badges: { risk: "defined", cashFlow: "debit", thetaTendency: "negative", vegaTendency: "positive", earlyAssignment: true, sameExpiration: true },
    slots: [OPT("long_higher_put", "long", "put", "Buy higher put"), OPT("short_lower_put", "short", "put", "Sell lower put")],
    warnings: ["Short leg can be assigned early.", "Assignment/exercise mismatch risk near expiration."],
    sourceRefs: ["book_pdf:61-66"],
  },
  {
    id: "bull_put_credit", name: "Bull Put Credit Spread", aliases: ["Short Put Vertical"],
    summary: "Sell a higher put and buy a lower put; collect credit, neutral-to-bullish, defined risk.",
    outlook: "bullish", approval: "level3_spreads",
    badges: { risk: "defined", cashFlow: "credit", thetaTendency: "positive", vegaTendency: "negative", earlyAssignment: true, sameExpiration: true },
    slots: [OPT("short_higher_put", "short", "put", "Sell higher put"), OPT("long_lower_put", "long", "put", "Buy lower put")],
    warnings: ["Short put can be assigned; long put defines downside risk.", "Max loss = width − credit."],
    sourceRefs: ["book_pdf:61-66"],
  },
  {
    id: "bear_call_credit", name: "Bear Call Credit Spread", aliases: ["Short Call Vertical"],
    summary: "Sell a lower call and buy a higher call; collect credit, neutral-to-bearish, defined risk.",
    outlook: "bearish", approval: "level3_spreads",
    badges: { risk: "defined", cashFlow: "credit", thetaTendency: "positive", vegaTendency: "negative", earlyAssignment: true, sameExpiration: true },
    slots: [OPT("short_lower_call", "short", "call", "Sell lower call"), OPT("long_higher_call", "long", "call", "Buy higher call")],
    warnings: ["Short call can be assigned early; long call defines upside risk.", "Max loss = width − credit."],
    sourceRefs: ["book_pdf:53-61"],
  },
  {
    id: "long_straddle", name: "Long Straddle", aliases: [],
    summary: "Buy a call and a put at the same strike; profit from a large move in either direction.",
    outlook: "large-move", approval: "level3_spreads",
    badges: { risk: "defined", cashFlow: "debit", thetaTendency: "negative", vegaTendency: "positive", earlyAssignment: false, sameExpiration: true },
    slots: [OPT("long_call", "long", "call", "Buy call"), OPT("long_put", "long", "put", "Buy put")],
    warnings: ["High cost; needs a big move to overcome combined premium.", "IV crush after earnings can hurt even if the stock moves."],
    sourceRefs: ["book_pdf:50-52"],
  },
  {
    id: "long_strangle", name: "Long Strangle", aliases: [],
    summary: "Buy an OTM put and an OTM call; cheaper than a straddle but needs a larger move.",
    outlook: "large-move", approval: "level3_spreads",
    badges: { risk: "defined", cashFlow: "debit", thetaTendency: "negative", vegaTendency: "positive", earlyAssignment: false, sameExpiration: true },
    slots: [OPT("long_put", "long", "put", "Buy lower put"), OPT("long_call", "long", "call", "Buy higher call")],
    warnings: ["Wider no-profit region than a straddle.", "Liquidity and skew can differ between the two legs."],
    sourceRefs: ["book_pdf:50-52"],
  },
  {
    id: "iron_condor", name: "Iron Condor", aliases: [],
    summary: "Sell a put spread and a call spread; profit if the stock stays in a range. Defined risk.",
    outlook: "range", approval: "level3_spreads",
    badges: { risk: "defined", cashFlow: "credit", thetaTendency: "positive", vegaTendency: "negative", earlyAssignment: true, sameExpiration: true },
    slots: [
      OPT("long_lower_put", "long", "put", "Buy lowest put"),
      OPT("short_put", "short", "put", "Sell lower put"),
      OPT("short_call", "short", "call", "Sell higher call"),
      OPT("long_higher_call", "long", "call", "Buy highest call"),
    ],
    warnings: ["A wide profit zone does not eliminate gap, IV-expansion, or pin risk.", "Show probability of profit AND expected value together."],
    sourceRefs: ["book_pdf:66-69"],
  },
  {
    id: "iron_butterfly", name: "Iron Butterfly", aliases: [],
    summary: "Sell an ATM straddle and buy protective wings; narrow range, higher credit than a condor.",
    outlook: "range", approval: "level3_spreads",
    badges: { risk: "defined", cashFlow: "credit", thetaTendency: "positive", vegaTendency: "negative", earlyAssignment: true, sameExpiration: true },
    slots: [
      OPT("long_lower_put", "long", "put", "Buy lower put wing"),
      OPT("short_put", "short", "put", "Sell center put"),
      OPT("short_call", "short", "call", "Sell center call"),
      OPT("long_higher_call", "long", "call", "Buy higher call wing"),
    ],
    warnings: ["Narrow profit zone.", "Pin risk at the center strike near expiration."],
    sourceRefs: ["book_pdf:66-69"],
  },
  {
    id: "call_butterfly", name: "Call Butterfly", aliases: ["Long Call Butterfly"],
    summary: "Buy 1 lower call, sell 2 middle calls, buy 1 higher call; defined risk, pins a target price.",
    outlook: "neutral", approval: "level3_spreads",
    badges: { risk: "defined", cashFlow: "debit", thetaTendency: "positive", vegaTendency: "negative", earlyAssignment: true, sameExpiration: true },
    slots: [
      OPT("long_lower_call", "long", "call", "Buy lower call"),
      OPT("short_middle_call", "short", "call", "Sell 2 middle calls"),
      OPT("long_higher_call", "long", "call", "Buy higher call"),
    ],
    warnings: ["Max profit only near the middle strike at expiration.", "Requires the center leg quantity to be double the wings."],
    sourceRefs: ["book_pdf:derived"],
  },
  {
    id: "put_butterfly", name: "Put Butterfly", aliases: ["Long Put Butterfly"],
    summary: "Buy 1 higher put, sell 2 middle puts, buy 1 lower put; defined risk, pins a target price.",
    outlook: "neutral", approval: "level3_spreads",
    badges: { risk: "defined", cashFlow: "debit", thetaTendency: "positive", vegaTendency: "negative", earlyAssignment: true, sameExpiration: true },
    slots: [
      OPT("long_higher_put", "long", "put", "Buy higher put"),
      OPT("short_middle_put", "short", "put", "Sell 2 middle puts"),
      OPT("long_lower_put", "long", "put", "Buy lower put"),
    ],
    warnings: ["Max profit only near the middle strike at expiration.", "Requires the center leg quantity to be double the wings."],
    sourceRefs: ["book_pdf:derived"],
  },
  {
    id: "custom_same_expiration", name: "Custom (Same Expiration)", aliases: ["Custom Multi-Leg"],
    summary: "Build any same-expiration combination of option and stock legs.",
    outlook: "neutral", approval: "level3_spreads",
    badges: { risk: "defined", cashFlow: "mixed", thetaTendency: "positive", vegaTendency: "negative", earlyAssignment: true, sameExpiration: true },
    slots: [],
    warnings: ["Custom builds can create undefined risk — the engine will detect and warn.", "All legs must share one expiration in the MVP."],
    sourceRefs: [],
  },
];

/** Companion-mode guard: block naked short calls/puts outside the sandbox. */
export function isBlockedInCompanionMode(legs: Leg[]): { blocked: boolean; reason?: string } {
  const shortCalls = legs.filter((l) => l.assetType === "option" && l.side === "short" && l.optionType === "call");
  const shortPuts = legs.filter((l) => l.assetType === "option" && l.side === "short" && l.optionType === "put");
  const longCalls = legs.filter((l) => l.assetType === "option" && l.side === "long" && l.optionType === "call");
  const hasStockCover = legs.some((l) => l.assetType === "stock" && l.side === "long");

  // Naked short call: short call with no long call at higher strike and no stock cover.
  for (const sc of shortCalls) {
    const covered = hasStockCover || longCalls.some((lc) => l4(lc) >= l4(sc));
    if (!covered) return { blocked: true, reason: "Uncovered short call has undefined risk. Use the educational sandbox." };
  }
  // Naked short put with no long put protection and no reserved-cash framing is
  // allowed as cash-secured (defined economic risk to zero), so we do not block CSPs.
  void shortPuts;
  return { blocked: false };
}
function l4(l: Leg): number { return l.assetType === "option" ? l.strike : 0; }


/* ============================================================================
   ===== FILE: src/domain/tradeLifecycle.ts =====
   Wheel state machine + rolling ledger. A roll is TWO trades: realize old,
   open new. Cumulative cash flow never hides the prior realized loss.
   ============================================================================ */

export interface CashEvent {
  label: string;
  amount: number;     // + inflow / - outflow
  kind: "premium_in" | "premium_out" | "stock_buy" | "stock_sell" | "fee";
  timestamp?: string;
}

export interface Ledger { events: CashEvent[]; }

export const emptyLedger = (): Ledger => ({ events: [] });

export function record(ledger: Ledger, e: CashEvent): Ledger {
  return { events: [...ledger.events, e] };
}

/** Cumulative option cash flow = sale proceeds − purchase costs − fees. */
export function cumulativeOptionCashFlow(ledger: Ledger): number {
  return ledger.events.reduce((t, e) => {
    if (e.kind === "premium_in") return t + e.amount;
    if (e.kind === "premium_out") return t + e.amount; // amount already negative
    if (e.kind === "fee") return t + e.amount;
    return t;
  }, 0);
}

/** Realized P/L on a single closed option = open proceeds + close cost. */
export function realizedOnRoll(openProceeds: number, closeCost: number): number {
  return openProceeds + closeCost; // closeCost is negative (a buy-back)
}

/** Total campaign P/L = realized (closed legs) + stock P/L + open unrealized. */
export function campaignPL(ledger: Ledger, openUnrealized = 0): number {
  const stockAndOptions = ledger.events.reduce((t, e) => t + e.amount, 0);
  return Number((stockAndOptions + openUnrealized).toFixed(2));
}

export type WheelState = "cash_secured_put" | "long_shares" | "covered_call" | "complete";
export interface WheelStep { from: WheelState; trigger: string; to: WheelState; event: CashEvent; }


/* ============================================================================
   ===== FILE: tests/domain/strategyPayoffs.test.ts =====
   Vitest. Every acceptance fixture from Document 1 & Document 2.
   Run: npm test
   ============================================================================ */

/*
import { describe, it, expect } from "vitest";
import { analyzePayoff } from "@/domain/payoff";
import type { Leg } from "@/domain/types";

const call = (side, strike, prem, extra = {}) => ({
  assetType: "option", side, optionType: "call", contracts: 1, strike,
  expiration: "2026-01-16", premiumPerShare: prem, multiplier: 100,
  impliedVol: 0.3, exerciseStyle: "american", feesTotal: 0, quoteTimestamp: null, ...extra,
});
const put = (side, strike, prem, extra = {}) => ({ ...call(side, strike, prem, extra), optionType: "put" });
const stock = (side, shares, entry, extra = {}) => ({
  assetType: "stock", side, shares, entryPrice: entry, feesTotal: 0, quoteTimestamp: null, ...extra,
});
const A = (legs) => analyzePayoff({ underlying: "TEST", legs });

describe("Acceptance fixtures — expiration payoff", () => {
  it("Bull call spread 500/510 (headline)", () => {
    const r = A([call("long", 500, 6.20), call("short", 510, 3.10)]);
    expect(r.netCashFlow).toBe(-310);   // net debit $310
    expect(r.totalDebit).toBe(310);
    expect(r.maxLoss).toBe(-310);
    expect(r.maxProfit).toBe(690);
    expect(r.breakEvens).toEqual([503.1]);
  });

  it("Covered call: 100 sh @100, short 105c @2.50", () => {
    const r = A([stock("long", 100, 100), call("short", 105, 2.50)]);
    expect(r.breakEvens).toEqual([97.5]);
    expect(r.maxProfit).toBe(750);
    expect(r.maxLoss).toBe(-9750);
    expect(r.plAtPrice(90)).toBe(-750);
    expect(r.plAtPrice(103)).toBe(550);
    expect(r.plAtPrice(110)).toBe(750);
  });

  it("Cash-secured put: short 95p @2.00", () => {
    const r = A([put("short", 95, 2.00)]);
    expect(r.maxProfit).toBe(200);
    expect(r.breakEvens).toEqual([93]);
    expect(r.maxLoss).toBe(-9300);
    expect(r.plAtPrice(90)).toBe(-300);
  });

  it("Bull call debit 100/110", () => {
    const r = A([call("long", 100, 6.00), call("short", 110, 2.00)]);
    expect(r.totalDebit).toBe(400);
    expect(r.breakEvens).toEqual([104]);
    expect(r.maxProfit).toBe(600);
    expect(r.maxLoss).toBe(-400);
  });

  it("Bear call credit 105/110", () => {
    const r = A([call("short", 105, 3.00), call("long", 110, 1.20)]);
    expect(r.totalCredit).toBe(180);
    expect(r.breakEvens).toEqual([106.8]);
    expect(r.maxProfit).toBe(180);
    expect(r.maxLoss).toBe(-320);
  });

  it("Bull put credit 95/90", () => {
    const r = A([put("short", 95, 2.70), put("long", 90, 1.10)]);
    expect(r.totalCredit).toBe(160);
    expect(r.breakEvens).toEqual([93.4]);
    expect(r.maxProfit).toBe(160);
    expect(r.maxLoss).toBe(-340);
  });

  it("Long straddle @100 (unlimited upside, two BEs)", () => {
    const r = A([call("long", 100, 4.00), put("long", 100, 3.50)]);
    expect(r.maxLoss).toBe(-750);
    expect(r.maxProfit).toBe("unlimited");
    expect(r.breakEvens).toEqual([92.5, 107.5]);
    expect(r.plAtPrice(80)).toBe(1250);
    expect(r.plAtPrice(120)).toBe(1250);
  });

  it("Iron condor 85/90/110/115 (two BEs)", () => {
    const r = A([
      put("long", 85, 0.50), put("short", 90, 1.20),
      call("short", 110, 1.10), call("long", 115, 0.40),
    ]);
    expect(r.totalCredit).toBe(140);
    expect(r.breakEvens).toEqual([88.6, 111.4]);
    expect(r.maxProfit).toBe(140);
    expect(r.maxLoss).toBe(-360);
  });
});

describe("Risk classification (no chart-range dependence)", () => {
  it("Long call: unlimited upside, loss capped at debit", () => {
    const r = A([call("long", 500, 6.20)]);
    expect(r.maxProfit).toBe("unlimited");
    expect(r.hasUnlimitedUpside).toBe(true);
    expect(r.maxLoss).toBe(-620);
  });
  it("Naked short call: undefined loss detected structurally", () => {
    const r = A([call("short", 100, 5.00)]);
    expect(r.hasUnlimitedDownside).toBe(true);
    expect(r.maxLoss).toBe("undefined");
  });
});

describe("Edge cases", () => {
  it("Multiple contracts scale linearly", () => {
    const r = A([call("long", 500, 6.20, { contracts: 3 }), call("short", 510, 3.10, { contracts: 3 })]);
    expect(r.totalDebit).toBe(930);
    expect(r.maxProfit).toBe(2070);
  });
  it("Fees reduce credit / increase debit", () => {
    const r = A([put("short", 95, 2.00, { feesTotal: 1.30 })]);
    expect(r.netCashFlow).toBe(198.70);
  });
  it("Zero DTE still yields intrinsic payoff", () => {
    const r = A([call("long", 100, 1.00, { expiration: "2026-01-16" })]);
    expect(r.plAtPrice(105)).toBe(400);
  });
  it("Adjusted multiplier (e.g. 50) honored", () => {
    const r = A([call("long", 100, 2.00, { multiplier: 50 })]);
    expect(r.netCashFlow).toBe(-100);
    expect(r.plAtPrice(110)).toBe(400);
  });
});
*/


/* ============================================================================
   ===== FILE: tests/domain/lifecycle.test.ts =====
   Wheel campaign (+$450) and rolling ledger (+$300, not +$450).
   ============================================================================ */

/*
import { describe, it, expect } from "vitest";
import { emptyLedger, record, campaignPL, cumulativeOptionCashFlow, realizedOnRoll } from "@/domain/tradeLifecycle";

describe("Wheel state machine cash flow", () => {
  it("sums to +$450 before fees", () => {
    let L = emptyLedger();
    L = record(L, { label: "Sell 95 put", amount: +200, kind: "premium_in" });
    L = record(L, { label: "Assigned: buy 100 @95", amount: -9500, kind: "stock_buy" });
    L = record(L, { label: "Sell 96 covered call", amount: +150, kind: "premium_in" });
    L = record(L, { label: "Called away @96", amount: +9600, kind: "stock_sell" });
    expect(campaignPL(L)).toBe(450);
  });
});

describe("Rolling ledger", () => {
  it("cumulative option cash flow is +$300, not +$450, and old-leg loss is -$150", () => {
    let L = emptyLedger();
    L = record(L, { label: "Sell call (open)", amount: +200, kind: "premium_in" });
    L = record(L, { label: "Buy back old call", amount: -350, kind: "premium_out" });
    L = record(L, { label: "Sell replacement call", amount: +450, kind: "premium_in" });
    expect(cumulativeOptionCashFlow(L)).toBe(300);
    expect(realizedOnRoll(200, -350)).toBe(-150);
  });
});
*/


/* ============================================================================
   ===== FILE: vitest.config.ts =====
   ============================================================================ */
/*
import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
*/
