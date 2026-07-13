/**
 * Local-first trade journal (personal empire). No Supabase required for P0.
 */

export type JournalState = "planned" | "opened" | "closed";

export interface LocalJournalEntry {
  id: string;
  underlying: string;
  strategy: string;
  title: string;
  state: JournalState;
  thesis: string;
  /** JSON-serialized legs or free text legs */
  legsNote: string;
  plannedMaxLoss: number | null;
  plannedContracts: number;
  forecastPoP: number | null;
  forecastEV: number | null;
  actualEntry: number | null;
  actualExit: number | null;
  realizedPl: number | null;
  processFlags: string[];
  checklistText: string | null;
  createdAt: string;
  openedAt: string | null;
  closedAt: string | null;
  notes: string;
}

const KEY = "optionscope.journal.v1";

function uid(): string {
  return `j_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadJournal(): LocalJournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as LocalJournalEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persist(entries: LocalJournalEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function addJournalPlan(partial: {
  underlying: string;
  strategy: string;
  title?: string;
  thesis?: string;
  legsNote?: string;
  plannedMaxLoss?: number | null;
  plannedContracts?: number;
  forecastPoP?: number | null;
  forecastEV?: number | null;
  checklistText?: string | null;
}): LocalJournalEntry {
  const entries = loadJournal();
  const row: LocalJournalEntry = {
    id: uid(),
    underlying: partial.underlying.toUpperCase(),
    strategy: partial.strategy,
    title: partial.title ?? `${partial.strategy} ${partial.underlying}`,
    state: "planned",
    thesis: partial.thesis ?? "",
    legsNote: partial.legsNote ?? "",
    plannedMaxLoss: partial.plannedMaxLoss ?? null,
    plannedContracts: partial.plannedContracts ?? 1,
    forecastPoP: partial.forecastPoP ?? null,
    forecastEV: partial.forecastEV ?? null,
    actualEntry: null,
    actualExit: null,
    realizedPl: null,
    processFlags: [],
    checklistText: partial.checklistText ?? null,
    createdAt: new Date().toISOString(),
    openedAt: null,
    closedAt: null,
    notes: "",
  };
  entries.unshift(row);
  persist(entries);
  return row;
}

export function updateJournalEntry(id: string, patch: Partial<LocalJournalEntry>): LocalJournalEntry | null {
  const entries = loadJournal();
  const i = entries.findIndex((e) => e.id === id);
  if (i < 0) return null;
  const next = { ...entries[i]!, ...patch, id };
  entries[i] = next;
  persist(entries);
  return next;
}

export function markOpened(id: string, actualEntry?: number): LocalJournalEntry | null {
  return updateJournalEntry(id, {
    state: "opened",
    openedAt: new Date().toISOString(),
    actualEntry: actualEntry ?? null,
  });
}

export function markClosed(
  id: string,
  args: { realizedPl: number; actualExit?: number; notes?: string }
): LocalJournalEntry | null {
  const cur = loadJournal().find((e) => e.id === id);
  const flags = [...(cur?.processFlags ?? [])];
  if (cur?.state === "planned") flags.push("closed_without_open_mark");
  if (cur && cur.forecastPoP == null) flags.push("no_forecast_snapshot");
  return updateJournalEntry(id, {
    state: "closed",
    closedAt: new Date().toISOString(),
    realizedPl: args.realizedPl,
    actualExit: args.actualExit ?? null,
    notes: args.notes ?? cur?.notes ?? "",
    processFlags: flags,
  });
}

export function journalStats(entries: LocalJournalEntry[] = loadJournal()): {
  planned: number;
  open: number;
  closed: number;
  winRate: number | null;
  totalPl: number;
  adherenceHint: string;
} {
  const planned = entries.filter((e) => e.state === "planned").length;
  const open = entries.filter((e) => e.state === "opened").length;
  const closed = entries.filter((e) => e.state === "closed");
  const wins = closed.filter((e) => (e.realizedPl ?? 0) > 0).length;
  const totalPl = closed.reduce((s, e) => s + (e.realizedPl ?? 0), 0);
  const winRate = closed.length ? wins / closed.length : null;
  return {
    planned,
    open,
    closed: closed.length,
    winRate,
    totalPl,
    adherenceHint:
      closed.length < 5
        ? "Need ≥5 closed planned trades before trusting win-rate."
        : "Sample growing — still model noise; process flags matter more.",
  };
}
