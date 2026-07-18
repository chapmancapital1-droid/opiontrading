/**
 * NerdCommand free-user lead capture (client helpers).
 * Server persistence: POST /api/leads → .data/leads.jsonl
 */

export const LEAD_STORAGE_KEY = "optionscope.nerdcommand.lead.v1";

export type LeadRole =
  | "beginner_trader"
  | "student"
  | "coach_creator"
  | "developer"
  | "other";

export type LeadPayload = {
  name: string;
  email: string;
  role: LeadRole;
  experience: "none" | "some" | "active";
  capitalBand: "under_500" | "500_5k" | "5k_25k" | "25k_plus" | "prefer_not";
  source: string;
  marketingOptIn: boolean;
  termsAccepted: boolean;
  company?: string;
};

export type StoredLead = LeadPayload & {
  id: string;
  unlockedAt: string;
  product: "optionscope";
  companyBrand: "nerdcommand";
};

export function isValidEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;
}

export function readStoredLead(): StoredLead | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEAD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLead;
    if (!parsed?.email || !parsed?.termsAccepted) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredLead(lead: StoredLead): void {
  localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(lead));
}

export function clearStoredLead(): void {
  localStorage.removeItem(LEAD_STORAGE_KEY);
}
