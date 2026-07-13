/**
 * Default educational account snapshot for the builder brain panel.
 * Not a live brokerage balance — editable later via Settings.
 */

import type { AccountState } from "./types";

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

export function demoAccount(over: Partial<AccountState> = {}): AccountState {
  return { ...DEFAULT_DEMO_ACCOUNT, ...over };
}
