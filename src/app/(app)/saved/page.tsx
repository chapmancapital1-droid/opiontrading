"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSaved, saveAnalysis, deleteSaved, type SavedAnalysis } from "@/lib/localSaved";

const usd = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function SavedPage() {
  const [rows, setRows] = useState<SavedAnalysis[]>([]);
  const [title, setTitle] = useState("");
  const [underlying, setUnderlying] = useState("AAPL");
  const [strategy, setStrategy] = useState("bull_put_credit");
  const [notes, setNotes] = useState("");

  const refresh = () => setRows(loadSaved());

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-medium">Saved</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Local saved analyses (this browser). Reopen ideas in{" "}
          <Link href="/builder" className="underline text-[var(--text-accent)]">
            Trade Lab
          </Link>{" "}
          or log them in the journal.
        </p>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-3">
        <h2 className="text-sm font-medium m-0">Quick save</h2>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <label className="text-xs text-[var(--text-secondary)]">
            Title
            <input
              className="mt-1 w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AAPL 30Δ put credit idea"
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Underlying
            <input
              className="mt-1 w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
              value={underlying}
              onChange={(e) => setUnderlying(e.target.value.toUpperCase())}
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Strategy
            <input
              className="mt-1 w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            />
          </label>
        </div>
        <label className="text-xs text-[var(--text-secondary)]">
          Notes
          <textarea
            className="mt-1 w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5 min-h-[56px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="self-start text-sm rounded-lg border border-[var(--border-accent)] bg-[var(--bg-accent)] text-[var(--text-accent)] px-3 py-1.5"
          onClick={() => {
            saveAnalysis({
              title: title || `${strategy} ${underlying}`,
              underlying,
              strategy,
              spot: 0,
              sigma: 0,
              dte: 0,
              notes,
              legsJson: "[]",
              netCash: null,
              maxProfit: null,
              maxLoss: null,
              modelPoP: null,
            });
            setTitle("");
            setNotes("");
            refresh();
          }}
        >
          Save
        </button>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--text-muted)]">
          No saved analyses yet. Save from here or from Trade Lab journal after a checklist plan.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <article
              key={r.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-wrap justify-between gap-2"
            >
              <div>
                <div className="font-medium text-sm">{r.title}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {r.underlying} · {r.strategy}
                  {r.modelPoP != null ? ` · model PoP ${(r.modelPoP * 100).toFixed(0)}%` : ""}
                  {r.maxLoss != null && typeof r.maxLoss === "number"
                    ? ` · max loss ${usd(Math.abs(r.maxLoss))}`
                    : ""}
                </div>
                {r.notes && (
                  <div className="text-xs text-[var(--text-muted)] mt-1">{r.notes}</div>
                )}
                <div className="text-[10px] text-[var(--text-muted)] mt-1">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <Link
                  href="/builder"
                  className="text-xs border border-[var(--border-accent)] text-[var(--text-accent)] rounded-lg px-2 py-1"
                >
                  Open Lab
                </Link>
                <button
                  type="button"
                  className="text-xs border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--text-danger)]"
                  onClick={() => {
                    deleteSaved(r.id);
                    refresh();
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
