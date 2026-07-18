"use client";

import { useEffect, useState } from "react";
import {
  loadJournal,
  addJournalPlan,
  markOpened,
  markClosed,
  journalStats,
  type LocalJournalEntry,
} from "@/lib/localJournal";
import {
  STRATEGY_PICKER,
  STRATEGY_PICKER_GROUPS,
} from "@/lib/strategyCatalog";

const usd = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function JournalPage() {
  const [entries, setEntries] = useState<LocalJournalEntry[]>([]);
  const [underlying, setUnderlying] = useState("AAPL");
  const [strategy, setStrategy] = useState("bull_put_credit");
  const [thesis, setThesis] = useState("");
  const [maxLoss, setMaxLoss] = useState("50");
  const [closePl, setClosePl] = useState<Record<string, string>>({});

  const refresh = () => setEntries(loadJournal());

  useEffect(() => {
    refresh();
  }, []);

  const stats = journalStats(entries);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-medium">Journal ritual</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Plan before Robinhood. Close with truth. Local-only for P0 — process memory for the empire.
          Not investment advice.
        </p>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
        <Stat label="Planned" value={String(stats.planned)} />
        <Stat label="Open" value={String(stats.open)} />
        <Stat label="Closed" value={String(stats.closed)} />
        <Stat
          label="Win rate"
          value={stats.winRate == null ? "—" : `${(stats.winRate * 100).toFixed(0)}%`}
        />
        <Stat label="Realized P/L" value={usd(stats.totalPl)} />
      </div>
      <p className="text-xs text-[var(--text-muted)] m-0">{stats.adherenceHint}</p>

      {/* New plan */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-3">
        <h2 className="text-sm font-medium m-0">New plan (before RH)</h2>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <Field label="Underlying">
            <input
              className="w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
              value={underlying}
              onChange={(e) => setUnderlying(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Strategy">
            <select
              className="w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            >
              {STRATEGY_PICKER_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {STRATEGY_PICKER.filter((s) => s.group === g).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Planned max loss $">
            <input
              className="w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
              value={maxLoss}
              onChange={(e) => setMaxLoss(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Thesis">
          <textarea
            className="w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5 min-h-[60px]"
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder="Why this trade under empire rules?"
          />
        </Field>
        <button
          type="button"
          className="self-start text-sm rounded-lg border border-[var(--border-accent)] bg-[var(--bg-accent)] text-[var(--text-accent)] px-3 py-1.5"
          onClick={() => {
            addJournalPlan({
              underlying,
              strategy,
              thesis,
              plannedMaxLoss: Number(maxLoss) || null,
              plannedContracts: 1,
            });
            setThesis("");
            refresh();
          }}
        >
          Save plan
        </button>
      </section>

      {/* Entries */}
      <div className="flex flex-col gap-2">
        {entries.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--text-muted)]">
            No journal entries yet. Plan a trade in Trade Lab (checklist → Save to journal) or add a plan
            above.
          </div>
        ) : (
          entries.map((e) => (
            <article
              key={e.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {e.underlying} · {e.strategy}{" "}
                    <span className="text-xs text-[var(--text-muted)]">[{e.state}]</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {e.thesis || "—"} · max loss{" "}
                    {e.plannedMaxLoss != null ? usd(e.plannedMaxLoss) : "—"}
                    {e.forecastPoP != null ? ` · model PoP ${(e.forecastPoP * 100).toFixed(0)}%` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {e.state === "planned" && (
                    <button
                      type="button"
                      className="text-xs border border-[var(--border)] rounded-lg px-2 py-1"
                      onClick={() => {
                        markOpened(e.id);
                        refresh();
                      }}
                    >
                      Mark opened
                    </button>
                  )}
                  {(e.state === "planned" || e.state === "opened") && (
                    <span className="flex items-center gap-1">
                      <input
                        className="w-20 text-xs rounded border border-[var(--border)] bg-[var(--surface-1)] px-1 py-1"
                        placeholder="P/L $"
                        value={closePl[e.id] ?? ""}
                        onChange={(ev) => setClosePl((m) => ({ ...m, [e.id]: ev.target.value }))}
                      />
                      <button
                        type="button"
                        className="text-xs border border-[var(--border)] rounded-lg px-2 py-1"
                        onClick={() => {
                          const pl = Number(closePl[e.id]);
                          if (!Number.isFinite(pl)) return;
                          markClosed(e.id, { realizedPl: pl });
                          refresh();
                        }}
                      >
                        Close
                      </button>
                    </span>
                  )}
                  {e.state === "closed" && e.realizedPl != null && (
                    <span
                      className={
                        e.realizedPl >= 0 ? "text-[var(--text-success)]" : "text-[var(--text-danger)]"
                      }
                    >
                      {usd(e.realizedPl)}
                    </span>
                  )}
                </div>
              </div>
              {e.processFlags.length > 0 && (
                <div className="text-[11px] text-[var(--text-warning)] mt-2">
                  Fix flags: {e.processFlags.join(" · ")}
                </div>
              )}
              {e.checklistText && (
                <details className="mt-2 text-[11px] text-[var(--text-secondary)]">
                  <summary className="cursor-pointer text-[var(--text-accent)]">
                    Order checklist ({e.plannedContracts}×) — from Trade Lab
                  </summary>
                  <pre className="mt-1 p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] whitespace-pre-wrap font-mono text-[10px] overflow-x-auto m-0">
                    {e.checklistText}
                  </pre>
                </details>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-[var(--text-secondary)]">
      <span className="block mb-1">{label}</span>
      {children}
    </label>
  );
}
