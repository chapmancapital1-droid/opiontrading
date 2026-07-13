/**
 * Map live broker snapshot → AccountState for the trading brain.
 * Educational sizing only — never places orders.
 */

import type { ApprovalProfile } from "@/domain/strategyDefinitions";
import type { GrowthMode } from "@/knowledge/types";
import type { AccountState } from "./types";
import { DEFAULT_DEMO_ACCOUNT } from "./demoAccount";

/** Sanitized client-facing live account (from /api/alpaca/account). */
export interface LiveAccountClient {
  source: "alpaca" | "demo";
  mode?: "paper" | "live";
  status?: string;
  equity: number;
  cash: number;
  buyingPower?: number;
  sharesHeld: Record<string, number>;
  openOptionContracts?: number;
  openOptionsMarketValue?: number;
  /** Sum of modeled risk — we use abs option market value as rough proxy when live */
  openRiskDollars: number;
  openCampaigns: number;
  dailyRealizedPL: number;
  asOf?: string;
  note?: string;
}

export interface MapLiveAccountOpts {
  approvalProfile?: ApprovalProfile;
  growthMode?: GrowthMode;
  /** Override daily P/L if known */
  dailyRealizedPL?: number;
}

/**
 * Convert live Alpaca-style snapshot into brain AccountState.
 * optionsFloat ≈ cash available for option collateral (min cash, equity * 0.6).
 * portfolioCore ≈ equity − optionsFloat (ETFs/shares parked).
 */
export function mapLiveToAccountState(
  live: LiveAccountClient,
  opts: MapLiveAccountOpts = {}
): AccountState {
  const equity = Math.max(0, live.equity);
  const cash = Math.max(0, live.cash);
  // Collateral budget: prefer settled cash; floor at 0
  const optionsFloat = Math.min(cash, equity * 0.8);
  const portfolioCore = Math.max(0, equity - optionsFloat);

  return {
    equity,
    cash,
    optionsFloat,
    portfolioCore,
    openRiskDollars: Math.max(0, live.openRiskDollars),
    openCampaigns: Math.max(0, live.openCampaigns),
    dailyRealizedPL: opts.dailyRealizedPL ?? live.dailyRealizedPL ?? 0,
    approvalProfile: opts.approvalProfile ?? "level3_spreads",
    growthMode: opts.growthMode ?? "balanced",
    sharesHeld: { ...live.sharesHeld },
  };
}

/** Fallback demo when live broker unavailable. */
export function demoAsLiveClient(): LiveAccountClient {
  const d = DEFAULT_DEMO_ACCOUNT;
  return {
    source: "demo",
    equity: d.equity,
    cash: d.cash,
    sharesHeld: { ...(d.sharesHeld ?? {}) },
    openRiskDollars: d.openRiskDollars,
    openCampaigns: d.openCampaigns,
    dailyRealizedPL: d.dailyRealizedPL,
    note: "Demo account — Alpaca not connected",
  };
}
