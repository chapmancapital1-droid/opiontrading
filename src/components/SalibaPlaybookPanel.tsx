"use client";

import {
  SALIBA_HYGIENE,
  SALIBA_META,
  SALIBA_REGIME_MATRIX,
  SALIBA_REJECT_SEED,
  SALIBA_RULES,
} from "@/knowledge/salibaPlaybook";

/**
 * Saliba Option Spread Strategies (2009) — regime matrix + chapter rules in Library.
 */
export function SalibaPlaybookPanel() {
  return (
    <section className="os-panel p-4 flex flex-col gap-3">
      <div>
        <div className="os-kicker">Primary structure book</div>
        <h2 className="text-lg font-medium m-0">{SALIBA_META.title}</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
          {SALIBA_META.authors} · {SALIBA_META.year} · {SALIBA_META.pages} pages · ISBN{" "}
          {SALIBA_META.isbn}
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1 m-0 break-all">
          Source: <code>{SALIBA_META.paths[0]}</code>
        </p>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
          Match structure to market (up / down / sideways)
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {SALIBA_REGIME_MATRIX.map((row) => (
            <div
              key={row.regime}
              className="rounded-lg border border-[var(--border)] p-3 bg-[var(--surface-2)]"
            >
              <div className="font-medium text-sm">{row.label}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                Prefer: {row.prefer.join(", ")}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1">
                Avoid: {row.avoid.join(", ")}
              </div>
              <p className="text-xs mt-2 m-0 text-[var(--text-secondary)]">{row.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
          Chapters → empire stance
        </div>
        <ul className="m-0 pl-4 text-sm text-[var(--text-secondary)] space-y-1">
          {SALIBA_META.chapters.map((c) => (
            <li key={c.n}>
              <strong>Ch.{c.n}</strong> {c.title}{" "}
              <span className="text-[var(--text-tertiary)]">
                (pp {c.pages}) · {c.empire}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
          Brain rules from this book ({SALIBA_RULES.length})
        </div>
        <ul className="m-0 pl-4 text-sm space-y-1">
          {SALIBA_RULES.map((r) => (
            <li key={r.id}>
              <code className="text-xs">{r.strategyId}</code> — {r.name}
            </li>
          ))}
        </ul>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-[var(--text-secondary)]">
          Hygiene + seed rejects
        </summary>
        <ul className="mt-2 pl-4 text-[var(--text-secondary)] space-y-1">
          {SALIBA_HYGIENE.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <p className="text-xs text-[var(--color-danger, #c44)] mt-2">
          Seed rejects: {SALIBA_REJECT_SEED.join(" · ")}
        </p>
      </details>
    </section>
  );
}
