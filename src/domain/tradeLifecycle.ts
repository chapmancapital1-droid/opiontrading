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
