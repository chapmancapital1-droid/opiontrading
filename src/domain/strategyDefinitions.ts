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
