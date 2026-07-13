/**
 * Portfolio growth allocator — locks how option profits compound into
 * (1) options float for the next trade and (2) core portfolio holdings.
 *
 * Robinhood path: advisory numbers only; user executes manually.
 */

import { PORTFOLIO_POLICY } from "@/knowledge/portfolioPolicy";
import type { GrowthMode } from "@/knowledge/types";
import type { AccountState, ProfitAllocation, SizedTrade } from "./types";
import { remainingRiskBudget } from "./riskGates";

/**
 * Size contracts so that modeled max loss ≤ per-trade risk target/cap
 * and remaining open-risk budget. Cash-secured structures also limited by cash.
 *
 * @param maxLossPerContract positive dollars of max loss for 1 contract (1-lot)
 * @param collateralPerContract optional collateral lock for 1-lot (CSP / spread width)
 */
export function sizePosition(args: {
  account: AccountState;
  maxLossPerContract: number;
  collateralPerContract?: number | null;
  growthMode?: GrowthMode;
}): SizedTrade {
  const mode = args.growthMode ?? args.account.growthMode;
  const g = PORTFOLIO_POLICY.growthModes[mode];
  const equity = args.account.equity;

  if (!(equity > 0) || !(args.maxLossPerContract > 0) || !Number.isFinite(args.maxLossPerContract)) {
    return {
      contracts: 0,
      riskDollars: 0,
      riskPctOfEquity: 0,
      collateralRequired: null,
      cappedBy: "zero",
    };
  }

  const perTradeCap = equity * g.perTradeRiskCapPct;
  const perTradeTarget = equity * g.perTradeRiskPct;
  const riskLimit = Math.min(perTradeCap, perTradeTarget);
  const remBudget = remainingRiskBudget(args.account, mode);
  const riskCeiling = Math.min(riskLimit, remBudget);

  // Absolute hard gate: single trade max loss never > absoluteMaxLossPct of equity
  const absoluteCap = equity * PORTFOLIO_POLICY.hardGates.absoluteMaxLossPct;
  const hardCeiling = Math.min(riskCeiling, absoluteCap);

  let byRisk = Math.floor(hardCeiling / args.maxLossPerContract);
  let cappedBy: SizedTrade["cappedBy"] = "risk_budget";

  if (byRisk < 1) {
    // If even 1 lot exceeds target but is under absolute hard cap AND rem budget, still 0
    // (we never force oversized risk). Exception: if 1 lot fits absolute+remaining but
    // exceeds soft target, still reject — growth lock prefers missing trades over oversize.
    return {
      contracts: 0,
      riskDollars: 0,
      riskPctOfEquity: 0,
      collateralRequired: args.collateralPerContract ?? null,
      cappedBy: hardCeiling < args.maxLossPerContract ? "remaining_budget" : "per_trade_cap",
    };
  }

  if (riskCeiling === remBudget) cappedBy = "remaining_budget";
  else if (riskLimit === perTradeCap) cappedBy = "per_trade_cap";
  else cappedBy = "risk_budget";

  // Cash / collateral limit
  if (args.collateralPerContract != null && args.collateralPerContract > 0) {
    const byCash = Math.floor(args.account.cash / args.collateralPerContract);
    if (byCash < byRisk) {
      byRisk = byCash;
      cappedBy = "cash";
    }
  }

  if (byRisk < 1) {
    return {
      contracts: 0,
      riskDollars: 0,
      riskPctOfEquity: 0,
      collateralRequired: args.collateralPerContract ?? null,
      cappedBy: "cash",
    };
  }

  const riskDollars = Number((byRisk * args.maxLossPerContract).toFixed(2));
  return {
    contracts: byRisk,
    riskDollars,
    riskPctOfEquity: Number((riskDollars / equity).toFixed(6)),
    collateralRequired:
      args.collateralPerContract != null
        ? Number((byRisk * args.collateralPerContract).toFixed(2))
        : null,
    cappedBy,
  };
}

/**
 * Split a closed winning trade's realized profit into options float vs portfolio core.
 * Losses reduce options float first (never invent portfolio deposits from losses).
 */
export function allocateProfit(args: {
  realizedPL: number;
  growthMode: GrowthMode;
}): ProfitAllocation {
  const g = PORTFOLIO_POLICY.growthModes[args.growthMode];
  const pl = args.realizedPL;

  if (!Number.isFinite(pl)) {
    return {
      realizedProfit: 0,
      toOptionsFloat: 0,
      toPortfolioCore: 0,
      reinvestOptionsPct: g.reinvestOptionsPct,
      portfolioCorePct: g.portfolioCorePct,
      growthMode: args.growthMode,
      note: "Non-finite P/L ignored.",
    };
  }

  if (pl <= 0) {
    return {
      realizedProfit: pl,
      toOptionsFloat: pl, // loss hits options float
      toPortfolioCore: 0,
      reinvestOptionsPct: g.reinvestOptionsPct,
      portfolioCorePct: g.portfolioCorePct,
      growthMode: args.growthMode,
      note: "Loss applied to options float only — core portfolio not raided for option losses.",
    };
  }

  const toOptions = Number((pl * g.reinvestOptionsPct).toFixed(2));
  const toCore = Number((pl - toOptions).toFixed(2)); // residual avoids 0.01 drift

  return {
    realizedProfit: pl,
    toOptionsFloat: toOptions,
    toPortfolioCore: toCore,
    reinvestOptionsPct: g.reinvestOptionsPct,
    portfolioCorePct: g.portfolioCorePct,
    growthMode: args.growthMode,
    note: `Profit split ${g.reinvestOptionsPct * 100}% options float / ${g.portfolioCorePct * 100}% portfolio core (${args.growthMode}).`,
  };
}

/**
 * Apply allocation to account balances (pure function — returns new state).
 */
export function applyAllocation(account: AccountState, alloc: ProfitAllocation): AccountState {
  if (alloc.realizedProfit <= 0) {
    // Loss: reduce options float and equity; cash follows options float for simplicity
    const loss = Math.abs(alloc.realizedProfit);
    const newFloat = Math.max(0, account.optionsFloat - loss);
    return {
      ...account,
      equity: Number((account.equity - loss).toFixed(2)),
      cash: Number((Math.max(0, account.cash - loss)).toFixed(2)),
      optionsFloat: Number(newFloat.toFixed(2)),
      dailyRealizedPL: Number((account.dailyRealizedPL + alloc.realizedProfit).toFixed(2)),
    };
  }

  return {
    ...account,
    equity: Number((account.equity + alloc.realizedProfit).toFixed(2)),
    cash: Number((account.cash + alloc.realizedProfit).toFixed(2)),
    optionsFloat: Number((account.optionsFloat + alloc.toOptionsFloat).toFixed(2)),
    portfolioCore: Number((account.portfolioCore + alloc.toPortfolioCore).toFixed(2)),
    dailyRealizedPL: Number((account.dailyRealizedPL + alloc.realizedProfit).toFixed(2)),
  };
}

/**
 * Project account path under a sequence of realized P/L events (for validation / sim).
 */
export function projectGrowthPath(
  start: AccountState,
  realizedSeries: number[],
  growthMode?: GrowthMode
): AccountState[] {
  const mode = growthMode ?? start.growthMode;
  const path: AccountState[] = [];
  let cur: AccountState = { ...start, growthMode: mode, sharesHeld: { ...start.sharesHeld } };
  for (const pl of realizedSeries) {
    const alloc = allocateProfit({ realizedPL: pl, growthMode: mode });
    cur = applyAllocation(cur, alloc);
    path.push({ ...cur, sharesHeld: { ...cur.sharesHeld } });
  }
  return path;
}

/** Core portfolio suggestion: park allocated core dollars into policy universe. */
export function suggestCoreParking(dollars: number): { ticker: string; note: string }[] {
  if (!(dollars > 0)) return [];
  const u = PORTFOLIO_POLICY.corePortfolioUniverse;
  // Simple equal-weight suggestion across top 3 core names
  const picks = u.slice(0, 3);
  const each = Number((dollars / picks.length).toFixed(2));
  return picks.map((ticker) => ({
    ticker,
    note: `Park ~$${each} in ${ticker} (manual Robinhood buy). DRIP optional.`,
  }));
}
