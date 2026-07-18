"use client";

/**
 * Evolve Lab — first-class tool (workspace-0890ad1c scientific-method engine).
 * IA: tools rail · synthetic stress lab · never live signals / never auto-trade.
 */

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
