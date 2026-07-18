/**
 * Local saved analyses — personal app, no Supabase required.
 */

export interface SavedAnalysis {
  id: string;
  title: string;
  underlying: string;
  strategy: string;
  spot: number;
  sigma: number;
  dte: number;
  notes: string;
  /** Builder-style leg snapshot (JSON) */
  legsJson: string;
  netCash: number | null;
  maxProfit: number | string | null;
  maxLoss: number | string | null;
  modelPoP: number | null;
  createdAt: string;
  updatedAt: string;
}

const KEY = "optionscope.saved.v1";

function uid(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadSaved(): SavedAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedAnalysis[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persist(rows: SavedAnalysis[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rows));
}

export function saveAnalysis(partial: Omit<SavedAnalysis, "id" | "createdAt" | "updatedAt">): SavedAnalysis {
  const rows = loadSaved();
  const now = new Date().toISOString();
  const row: SavedAnalysis = {
    ...partial,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  };
  rows.unshift(row);
  persist(rows.slice(0, 200));
  return row;
}

export function deleteSaved(id: string): void {
  persist(loadSaved().filter((r) => r.id !== id));
}

export function getSaved(id: string): SavedAnalysis | null {
  return loadSaved().find((r) => r.id === id) ?? null;
}
