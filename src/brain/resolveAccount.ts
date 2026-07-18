/**
 * Pure personal/empire account resolution for the trading brain.
 * Never invents $25k demo equity on the personal path.
 * Educational sizing only — never places orders.
 */

import { getEmpirePhaseLimits } from "@/knowledge/empirePolicy";
import type { PersonalAccountProfile } from "@/lib/personalAccount";
import { DEFAULT_PERSONAL_ACCOUNT } from "@/lib/personalAccount";
import type { AccountState } from "./types";
import { seedAccount } from "./demoAccount";
import { mapLiveToAccountState, type LiveAccountClient } from "./liveAccount";

export interface ResolvePersonalAccountArgs {
  /** Personal profile (defaults to empire seed $500). */
  profile?: PersonalAccountProfile | null | undefined;
  /** Alpaca paper snapshot when available. */
  live?: LiveAccountClient | null | undefined;
  /**
   * Shares derived from Robinhood paste/import (rowsToSharesHeld).
   * Merged when equitySource is robinhood_paste (and supplemental elsewhere).
   */
  rhSharesHeld?: Record<string, number> | undefined;
  /** Optional open-risk proxy dollars from import. */
  openRiskProxy?: number | undefined;
  /** Explicit overrides (tests / panel props). */
  accountOver?: Partial<AccountState> | undefined;
}

/**
 * Resolve AccountState used by selector / sizing.
 *
 * Order:
 * 1. alpaca_paper + live source=alpaca → map live (else fall back to seed)
 * 2. robinhood_paste → seed from manualEquity + RH sharesHeld
 * 3. manual_seed (default) → seedAccount(manualEquity)
 *
 * Never uses DEFAULT_DEMO_ACCOUNT ($25k) on the personal empire path.
 */
export function resolvePersonalAccountState(
  args: ResolvePersonalAccountArgs = {}
): AccountState {
  const profile = args.profile ?? { ...DEFAULT_PERSONAL_ACCOUNT };
  const over = args.accountOver ?? {};
  const equity = Number(profile.manualEquity) > 0 ? Number(profile.manualEquity) : 500;
  const cash =
    Number(profile.manualCash) >= 0 && Number.isFinite(Number(profile.manualCash))
      ? Number(profile.manualCash)
      : equity;
  const approval = over.approvalProfile ?? profile.approvalProfile ?? "level3_spreads";
  const empGrowth = getEmpirePhaseLimits(equity).growthMode;

  // Alpaca paper path: only when live feed is actually Alpaca
  if (profile.equitySource === "alpaca_paper" && args.live?.source === "alpaca") {
    const sharesHeld = {
      ...args.live.sharesHeld,
      ...(args.rhSharesHeld ?? {}),
      ...(over.sharesHeld ?? {}),
    };
    const mapOpts: Parameters<typeof mapLiveToAccountState>[1] = {
      approvalProfile: approval,
      growthMode: over.growthMode ?? getEmpirePhaseLimits(args.live.equity).growthMode,
    };
    if (over.dailyRealizedPL != null) mapOpts.dailyRealizedPL = over.dailyRealizedPL;
    const mapped = mapLiveToAccountState({ ...args.live, sharesHeld }, mapOpts);
    return {
      ...mapped,
      ...over,
      sharesHeld,
      growthMode: over.growthMode ?? mapped.growthMode,
    };
  }

  // Shares: RH import + explicit overrides (robinhood_paste prioritizes import)
  const sharesHeld = {
    ...(profile.equitySource === "robinhood_paste" ? args.rhSharesHeld ?? {} : {}),
    // manual_seed may still merge RH shares if provided (awareness)
    ...(profile.equitySource !== "robinhood_paste" ? args.rhSharesHeld ?? {} : {}),
    ...(over.sharesHeld ?? {}),
  };

  const openRiskDollars =
    over.openRiskDollars ??
    (profile.equitySource === "robinhood_paste" &&
    args.openRiskProxy != null &&
    args.openRiskProxy > 0
      ? args.openRiskProxy
      : 0);

  return seedAccount(equity, {
    cash,
    approvalProfile: approval,
    growthMode: over.growthMode ?? empGrowth,
    openRiskDollars,
    openCampaigns: over.openCampaigns ?? 0,
    dailyRealizedPL: over.dailyRealizedPL ?? 0,
    ...over,
    sharesHeld,
  });
}

/** True when account equity is in empire seed band. */
export function isSeedSizedAccount(account: AccountState): boolean {
  return account.equity > 0 && account.equity < 5_000;
}
