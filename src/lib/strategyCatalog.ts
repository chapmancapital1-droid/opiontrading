/**
 * Shared strategy picker catalog — human labels for every UI strategy tab.
 * IDs match domain strategyDefinitions + Trade Lab TEMPLATES.
 */

export type StrategyPickerItem = {
  id: string;
  label: string;
  /** Short label for dense selects */
  short: string;
  group: string;
};

/** Canonical list for Command / Journal / Saved / Compare-style pickers. */
export const STRATEGY_PICKER: StrategyPickerItem[] = [
  {
    id: "money_press_put_diagonal",
    label: "Money Press — Put diagonal (weekly + protection)",
    short: "Money Press put diagonal",
    group: "Money Press",
  },
  {
    id: "bull_put_credit",
    label: "Put credit spread (bull put vertical)",
    short: "Put credit spread",
    group: "Credit income",
  },
  {
    id: "bear_call_credit",
    label: "Call credit spread (bear call vertical)",
    short: "Call credit spread",
    group: "Credit income",
  },
  {
    id: "iron_condor",
    label: "Iron condor (put credit + call credit)",
    short: "Iron condor",
    group: "Credit income",
  },
  {
    id: "cash_secured_put",
    label: "Cash-secured put",
    short: "Cash-secured put",
    group: "Stock + option",
  },
  {
    id: "covered_call",
    label: "Covered call",
    short: "Covered call",
    group: "Stock + option",
  },
  {
    id: "bull_call_debit",
    label: "Bull call debit spread",
    short: "Bull call debit",
    group: "Debit verticals",
  },
  {
    id: "bear_put_debit",
    label: "Bear put debit spread",
    short: "Bear put debit",
    group: "Debit verticals",
  },
  {
    id: "long_call",
    label: "Long call",
    short: "Long call",
    group: "Directional",
  },
  {
    id: "long_put",
    label: "Long put",
    short: "Long put",
    group: "Directional",
  },
  {
    id: "long_straddle",
    label: "Long straddle",
    short: "Long straddle",
    group: "Volatility",
  },
];

export const STRATEGY_PICKER_GROUPS = [
  "Money Press",
  "Credit income",
  "Stock + option",
  "Debit verticals",
  "Directional",
  "Volatility",
] as const;

export function strategyLabel(id: string): string {
  return STRATEGY_PICKER.find((s) => s.id === id)?.label ?? id;
}

export function strategyShort(id: string): string {
  return STRATEGY_PICKER.find((s) => s.id === id)?.short ?? id;
}
