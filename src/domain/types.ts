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
