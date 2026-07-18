"use client";

/**
 * Evolve Lab — first-class tool (workspace-0890ad1c scientific-method engine).
 * IA: tools rail · synthetic stress lab · hive brain knowledge growth · never auto-trade.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EvolutionLabPanel } from "@/components/EvolutionLabPanel";

const TOOL_STRIP = [
  {
    href: "/builder",
    icon: "ti-tools",
    label: "Trade Lab",
    blurb: "Live chain · brain · checklist",
  },
  {
    href: "/scanner",
    icon: "ti-filter",
    label: "Scanner",
    blurb: "Strategy shortlist ≤15",
  },
  {
    href: "/evolve",
    icon: "ti-flask",
    label: "Evolve",
    blurb: "Synthetic self-improve lab",
    active: true,
  },
  {
    href: "/compare",
    icon: "ti-columns",
    label: "Compare",
    blurb: "Structures side-by-side",
  },
  {
    href: "/journal",
    icon: "ti-notebook",
    label: "Journal",
    blurb: "Plan → open → close",
  },
] as const;

type HiveSnap = {
  ok: boolean;
  brain?: {
    totalSuccessfulRuns: number;
    totalRejectedRuns: number;
    updatedAt: string;
    improvementLessons: string[];
    lastChampion?: {
      strategyId: string;
      ticker: string;
      dte: number;
      winRate: number;
      sharpe: number;
      at: string;
    };
  };
  winRates?: {
    strategies: Array<{
      strategyId: string;
      runs: number;
      avgWinRate: number;
      bestWinRate: number;
      avgSharpe: number;
      lastRunAt: string;
    }>;
  };
  successThresholds?: Record<string, number>;
  growOnGithub?: string;
};

function HiveStatusPanel() {
  const [snap, setSnap] = useState<HiveSnap | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/hive", { cache: "no-store" });
      const j = (await res.json()) as HiveSnap;
      if (!j.ok) throw new Error("hive_fetch_failed");
      setSnap(j);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load hive");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 12000);
    return () => clearInterval(t);
  }, [load]);

  const rows = snap?.winRates?.strategies ?? [];

  return (
    <section className="os-panel p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="os-kicker">Hive brain · git-tracked knowledge</div>
          <h2 className="text-base font-medium m-0">Strategy win rates & improvements</h2>
          <p className="text-xs text-[var(--text-muted)] m-0 mt-1 max-w-2xl">
            Successful Evolve champions auto-write{" "}
            <code className="text-[10px]">src/knowledge/catalog/hive/</code>. Push those files to
            GitHub so every install inherits grown option knowledge. Synthetic only — not live fills.
          </p>
        </div>
        <button type="button" className="os-btn text-xs" onClick={() => void load()}>
          Refresh hive
        </button>
      </div>

      {err && <p className="text-xs text-red-400 m-0">{err}</p>}

      <div className="grid gap-2 sm:grid-cols-3 text-sm">
        <div className="rounded-lg border border-[var(--border)] p-3">
          <div className="text-[10px] uppercase text-[var(--text-muted)]">Successful runs</div>
          <div className="text-xl font-medium">
            {snap?.brain?.totalSuccessfulRuns ?? "—"}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3">
          <div className="text-[10px] uppercase text-[var(--text-muted)]">Rejected (gate)</div>
          <div className="text-xl font-medium">
            {snap?.brain?.totalRejectedRuns ?? "—"}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3">
          <div className="text-[10px] uppercase text-[var(--text-muted)]">Updated</div>
          <div className="text-sm font-medium">
            {snap?.brain?.updatedAt && snap.brain.updatedAt !== "1970-01-01T00:00:00.000Z"
              ? snap.brain.updatedAt.slice(0, 19).replace("T", " ")
              : "— empty hive —"}
          </div>
        </div>
      </div>

      {snap?.brain?.lastChampion && (
        <p className="text-xs text-[var(--text-secondary)] m-0">
          Last champion: <strong>{snap.brain.lastChampion.strategyId}</strong> ·{" "}
          {snap.brain.lastChampion.ticker} · {snap.brain.lastChampion.dte}DTE · WR{" "}
          {(snap.brain.lastChampion.winRate * 100).toFixed(0)}% · Sharpe{" "}
          {snap.brain.lastChampion.sharpe.toFixed(2)}
        </p>
      )}

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-1.5 pr-2 font-medium">Strategy</th>
                <th className="py-1.5 pr-2 font-medium">Runs</th>
                <th className="py-1.5 pr-2 font-medium">Avg WR</th>
                <th className="py-1.5 pr-2 font-medium">Best WR</th>
                <th className="py-1.5 font-medium">Avg Sharpe</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((r) => (
                <tr key={r.strategyId} className="border-b border-[var(--border)]">
                  <td className="py-1.5 pr-2 font-medium text-[var(--text-primary)]">
                    {r.strategyId}
                  </td>
                  <td className="py-1.5 pr-2">{r.runs}</td>
                  <td className="py-1.5 pr-2">{(r.avgWinRate * 100).toFixed(0)}%</td>
                  <td className="py-1.5 pr-2">{(r.bestWinRate * 100).toFixed(0)}%</td>
                  <td className="py-1.5">{r.avgSharpe.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] m-0">
          No successful hive rows yet. Run evolution below — champions meeting WR/Sharpe/edge/DD
          gates are written automatically.
        </p>
      )}

      {snap?.brain?.improvementLessons && snap.brain.improvementLessons.length > 0 && (
        <div>
          <div className="text-[10px] uppercase text-[var(--text-muted)] mb-1">
            Improvement lessons
          </div>
          <ul className="m-0 pl-4 list-disc text-xs text-[var(--text-secondary)] space-y-0.5">
            {snap.brain.improvementLessons.slice(0, 6).map((l) => (
              <li key={l.slice(0, 60)}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {snap?.growOnGithub && (
        <pre className="text-[10px] m-0 p-2 rounded-lg overflow-x-auto border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)]">
          {snap.growOnGithub}
        </pre>
      )}
    </section>
  );
}

export default function EvolvePage() {
  return (
    <div className="flex flex-col gap-4 max-w-[1400px]">
      {/* Tool IA header */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="os-kicker">Tools · Scientific method · workspace-0890ad1c</div>
            <h1 className="text-2xl font-medium tracking-tight m-0">Evolve Lab</h1>
            <p className="text-xs text-[var(--text-muted)] m-0 mt-1 max-w-2xl">
              Self-improving options engine on <strong>synthetic</strong> markets (regime stress
              lab). Use champions to harden rules — then validate on{" "}
              <Link href="/builder" className="underline text-[var(--text-secondary)]">
                Trade Lab
              </Link>{" "}
              live data before any real capital. Educational only · no broker · no auto-trade.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="os-badge os-badge-accent text-[10px]">SYNTHETIC</span>
            <span className="os-badge text-[10px]">NO AUTO-TRADE</span>
            <span className="os-badge text-[10px]">NOT LIVE SIGNALS</span>
          </div>
        </div>

        {/* Cross-tool strip */}
        <nav
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
          aria-label="OptionScope tools"
        >
          {TOOL_STRIP.map((t) => {
            const active = "active" in t && t.active;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`os-panel p-3 no-underline transition-colors ${
                  active
                    ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/40"
                    : "hover:border-[var(--text-muted)]"
                }`}
                style={{ borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <i
                    className={`ti ${t.icon} text-base ${
                      active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                    }`}
                    aria-hidden
                  />
                  <span
                    className={`text-sm font-medium ${
                      active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {t.label}
                  </span>
                  {active && (
                    <span className="ml-auto text-[9px] uppercase tracking-wider text-[var(--accent)]">
                      Here
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] m-0 mt-1">{t.blurb}</p>
              </Link>
            );
          })}
        </nav>

        {/* Honest rails */}
        <div
          className="rounded-xl border px-3 py-2.5 text-[11px] text-[var(--text-secondary)] leading-relaxed"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <strong className="text-[var(--text-primary)]">How to use in the live money loop:</strong>{" "}
          Run evolve → note champion risk knobs (not strikes) → open Trade Lab with live Alpaca chain
          → brain sizes off <em>your real equity</em> (Settings manual seed) → checklist → you enter
          in Robinhood → journal. “400 years” here means synthetic stress years, not real SPY history.
        </div>
      </header>

      <HiveStatusPanel />

      {/* Engine surface */}
      <EvolutionLabPanel />

      {/* Footer IA */}
      <footer
        className="os-panel p-4 text-xs text-[var(--text-muted)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
      >
        <div>
          Source: <code className="text-[10px]">src/testlab/trading</code> · API{" "}
          <code className="text-[10px]">/api/testlab/evolve</code> · Offline twin{" "}
          <code className="text-[10px]">python/ota</code>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/education" className="os-btn text-xs no-underline">
            How Evolve works (Education)
          </Link>
          <Link href="/dashboard" className="os-btn text-xs no-underline">
            Command
          </Link>
          <Link href="/builder" className="os-btn os-btn-primary text-xs no-underline">
            Open Trade Lab →
          </Link>
        </div>
      </footer>
    </div>
  );
}
