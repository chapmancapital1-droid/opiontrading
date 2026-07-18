/**
 * Personal empire account profile — localStorage (browser).
 * Lets the brain size against YOUR equity ($500 seed) not demo $25k.
 */

export type EquitySource = "manual_seed" | "alpaca_paper" | "robinhood_paste";

export interface PersonalAccountProfile {
  /** Display name */
  label: string;
  /** Source of truth for equity */
  equitySource: EquitySource;
  /** Manual seed equity (used when equitySource=manual_seed or as RH paste override) */
  manualEquity: number;
  manualCash: number;
  /** Capital ladder seed target */
  ladderSeed: number;
  ladderStage1: number;
  ladderStage2: number;
  approvalProfile: "level2_basic" | "level3_spreads" | "sandbox_undefined";
  /** Force empire overlay always (recommended true) */
  empireMode: boolean;
  updatedAt: string;
}

const KEY = "optionscope.personalAccount.v1";

export const DEFAULT_PERSONAL_ACCOUNT: PersonalAccountProfile = {
  label: "Empire seed",
  equitySource: "manual_seed",
  manualEquity: 500,
  manualCash: 500,
  ladderSeed: 500,
  ladderStage1: 5_000,
  ladderStage2: 25_000,
  approvalProfile: "level3_spreads",
  empireMode: true,
  updatedAt: new Date(0).toISOString(),
};

export function loadPersonalAccount(): PersonalAccountProfile {
  if (typeof window === "undefined") return { ...DEFAULT_PERSONAL_ACCOUNT };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PERSONAL_ACCOUNT };
    const parsed = JSON.parse(raw) as Partial<PersonalAccountProfile>;
    return {
      ...DEFAULT_PERSONAL_ACCOUNT,
      ...parsed,
      manualEquity: Number(parsed.manualEquity) > 0 ? Number(parsed.manualEquity) : 500,
      manualCash: Number(parsed.manualCash) >= 0 ? Number(parsed.manualCash) : 500,
    };
  } catch {
    return { ...DEFAULT_PERSONAL_ACCOUNT };
  }
}

export function savePersonalAccount(p: PersonalAccountProfile): void {
  if (typeof window === "undefined") return;
  const next = { ...p, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(next));
}
