import type { Leg, OptionLeg } from "@/domain/types";
import type { ForecastSnapshot } from "@/db/types";

export interface ChecklistLegLine {
  action: "Buy to open" | "Sell to open";
  optionType: "call" | "put" | "stock";
  strike: number | null;
  quantity: number;
  expiration: string | null;
}

export interface OrderChecklist {
  underlying: string;
  strategyName: string;
  contracts: number;              // spreads / contract count
  expiration: string | null;
  legs: ChecklistLegLine[];
  netLimitPerShare: number;       // + credit / - debit
  netLimitLabel: string;          // "Net credit $1.40" | "Net debit $3.10"
  estTotal: number;
  maxModeledLoss: number | "undefined";
  estCollateral: number | null;
  breakEvens: number[];
  quoteTimestamp: string | null;
  plannedProfitTarget: number | null;
  plannedLossLimit: number | null;
  plannedExitDate: string | null;
  reviewConfirmedLabel: string;   // the checkbox text
}

function legLine(l: Leg): ChecklistLegLine {
  if (l.assetType === "stock") {
    return { action: l.side === "long" ? "Buy to open" : "Sell to open", optionType: "stock", strike: null, quantity: l.shares, expiration: null };
  }
  const o = l as OptionLeg;
  return {
    action: o.side === "long" ? "Buy to open" : "Sell to open",
    optionType: o.optionType, strike: o.strike, quantity: o.contracts, expiration: o.expiration,
  };
}

export function buildChecklist(args: {
  underlying: string;
  strategyName: string;
  legs: Leg[];
  netCashFlow: number;            // dollars, + credit / - debit
  perShareNet: number;            // + credit / - debit per share
  maxLoss: number | "undefined";
  collateral: number | null;
  breakEvens: number[];
  quoteTimestamp: string | null;
  forecast?: ForecastSnapshot;
  plannedProfitTarget?: number | null;
  plannedLossLimit?: number | null;
  plannedExitDate?: string | null;
  /** Override contract count (e.g. brain suggestedContracts, including 0). */
  contracts?: number;
}): OrderChecklist {
  const optionLegs = args.legs.filter((l): l is OptionLeg => l.assetType === "option");
  const fromLegs = optionLegs.length ? Math.min(...optionLegs.map((l) => l.contracts)) : 1;
  const contracts =
    args.contracts != null && Number.isFinite(args.contracts)
      ? Math.max(0, Math.floor(args.contracts))
      : fromLegs;
  const expiration = optionLegs[0]?.expiration ?? null;
  const credit = args.perShareNet >= 0;

  // When contracts override differs from leg template, scale option leg qty for journal/copy
  const scale = fromLegs > 0 && args.contracts != null ? contracts / fromLegs : 1;
  const legs: ChecklistLegLine[] = args.legs.map((l) => {
    const line = legLine(l);
    if (l.assetType === "option" && args.contracts != null) {
      return { ...line, quantity: contracts };
    }
    return line;
  });
  const estTotal = Number((Math.abs(args.netCashFlow) * (args.contracts != null ? scale : 1)).toFixed(2));
  const maxModeledLoss: number | "undefined" =
    args.maxLoss === "undefined"
      ? "undefined"
      : Number((Math.abs(args.maxLoss) * (args.contracts != null ? scale : 1)).toFixed(2));

  return {
    underlying: args.underlying,
    strategyName: args.strategyName,
    contracts,
    expiration,
    legs,
    netLimitPerShare: Number(Math.abs(args.perShareNet).toFixed(2)),
    netLimitLabel: `${credit ? "Net credit" : "Net debit"} $${Math.abs(args.perShareNet).toFixed(2)} / share`,
    estTotal,
    maxModeledLoss,
    estCollateral:
      args.collateral != null && args.contracts != null
        ? Number((args.collateral * scale).toFixed(2))
        : args.collateral,
    breakEvens: args.breakEvens,
    quoteTimestamp: args.quoteTimestamp,
    plannedProfitTarget: args.plannedProfitTarget ?? null,
    plannedLossLimit: args.plannedLossLimit ?? null,
    plannedExitDate: args.plannedExitDate ?? null,
    reviewConfirmedLabel: "I reviewed the order details in Robinhood.",
  };
}

/** Plain-text render for copy-to-clipboard. */
export function checklistToText(c: OrderChecklist): string {
  const lines: string[] = [];
  lines.push(`OPTIONSCOPE ORDER CHECKLIST — verify in Robinhood before entering`);
  lines.push(`Underlying: ${c.underlying}`);
  lines.push(`Strategy: ${c.strategyName}  (${c.contracts}x)`);
  if (c.expiration) lines.push(`Expiration: ${c.expiration}`);
  lines.push(`—`);
  c.legs.forEach((l, i) => {
    const strike = l.strike != null ? ` $${l.strike} ${l.optionType}` : ` ${l.optionType}`;
    lines.push(`${i + 1}. ${l.action}${strike} × ${l.quantity}`);
  });
  lines.push(`—`);
  lines.push(c.netLimitLabel);
  lines.push(`Est. total: $${c.estTotal}`);
  lines.push(`Max modeled loss: ${c.maxModeledLoss === "undefined" ? "UNDEFINED" : "$" + c.maxModeledLoss}`);
  if (c.estCollateral != null) lines.push(`Est. collateral: $${c.estCollateral}`);
  if (c.breakEvens.length) lines.push(`Break-even(s): ${c.breakEvens.map((b) => "$" + b).join(", ")}`);
  if (c.quoteTimestamp) lines.push(`Quote time: ${c.quoteTimestamp}`);
  if (c.plannedProfitTarget != null) lines.push(`Profit target: $${c.plannedProfitTarget}`);
  if (c.plannedLossLimit != null) lines.push(`Loss limit: $${c.plannedLossLimit}`);
  if (c.plannedExitDate) lines.push(`Planned exit: ${c.plannedExitDate}`);
  lines.push(`—`);
  lines.push(`[ ] ${c.reviewConfirmedLabel}`);
  lines.push(`Estimates only. Not a fill guarantee. Not investment advice. Not affiliated with Robinhood.`);
  return lines.join("\n");
}
