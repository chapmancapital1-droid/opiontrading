/**
 * Default educational / empire seed account for the builder brain panel.
 * Personal companion default is $500 seed — not a fake $25k demo.
 */

import { getEmpirePhaseLimits } from "@/knowledge/empirePolicy";
import type { AccountState } from "./types";

/** Legacy large demo (tests / sandbox only). */
export const DEFAULT_DEMO_ACCOUNT: AccountState = {
  equity: 25_000,
  cash: 20_000,
  optionsFloat: 12_000,
  portfolioCore: 8_000,
  openRiskDollars: 0,
  openCampaigns: 0,
  dailyRealizedPL: 0,
  approvalProfile: "level3_spreads",
  growthMode: "balanced",
  sharesHeld: { AAPL: 100, MSFT: 100, SPY: 100 },
};

/** Empire seed default — matches personal ladder start. */
export const DEFAULT_SEED_ACCOUNT: AccountState = {
  equity: 500,
  cash: 500,
  optionsFloat: 400,
  portfolioCore: 100,
  openRiskDollars: 0,
  openCampaigns: 0,
  dailyRealizedPL: 0,
  approvalProfile: "level3_spreads",
  growthMode: "income_preservation",
  sharesHeld: {},
};

export function demoAccount(over: Partial<AccountState> = {}): AccountState {
  const base = { ...DEFAULT_SEED_ACCOUNT, ...over };
  const emp = getEmpirePhaseLimits(base.equity);
  // Align growth mode with empire phase unless explicitly overridden
  if (over.growthMode == null) {
    base.growthMode = emp.growthMode;
  }
  return base;
}

export function seedAccount(equity = 500, over: Partial<AccountState> = {}): AccountState {
  const cash = over.cash ?? equity;
  return demoAccount({
    equity,
    cash,
    optionsFloat: Math.min(cash, equity * 0.8),
    portfolioCore: Math.max(0, equity - Math.min(cash, equity * 0.8)),
    sharesHeld: {},
    ...over,
  });
}
