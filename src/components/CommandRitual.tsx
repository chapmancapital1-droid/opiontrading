"use client";

/**
 * Command Center ritual strip — empire ladder, account truth, brain pulse.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadPersonalAccount, type PersonalAccountProfile } from "@/lib/personalAccount";
import { getEmpirePhaseLimits, ladderProgress } from "@/knowledge/empirePolicy";
import { journalStats, loadJournal } from "@/lib/localJournal";
import { loadRhImport } from "@/lib/rhImport";
import type { LiveAccountClient } from "@/brain/liveAccount";

const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function CommandRitual() {
  const [profile, setProfile] = useState<PersonalAccountProfile | null>(null);
  const [live, setLive] = useState<LiveAccountClient | null>(null);
  const [jStats, setJStats] = useState(journalStats([]));
  const [rhRows, setRhRows] = useState(0);

  useEffect(() => {
    setProfile(loadPersonalAccount());
    setJStats(journalStats(loadJournal()));
    const rh = loadRhImport();
    setRhRows(rh?.rows?.length ?? 0);
    fetch("/api/alpaca/account")
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j.account) setLive(j.account as LiveAccountClient);
      })
      .catch(() => null);
  }, []);

  if (!profile) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--text-muted)]">
        Loading empire command strip…
      </section>
    );
  }

  const equity =
    profile.equitySource === "alpaca_paper" && live?.equity
      ? live.equity
      : profile.manualEquity;
  const cash =
    profile.equitySource === "alpaca_paper" && live?.cash != null
      ? live.cash
      : profile.manualCash;
  const emp = getEmpirePhaseLimits(equity);
  const ladder = ladderProgress(equity);
  const sourceLabel =
    profile.equitySource === "alpaca_paper"
      ? `Alpaca ${live?.mode ?? "paper"}`
      : profile.equitySource === "robinhood_paste"
        ? "Robinhood paste"
        : "Manual seed";

  return (
    <section
      className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface-2)] p-4 flex flex-col gap-3"
      aria-label="Empire command ritual"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs text-[var(--text-accent)] font-medium tracking-wide">
            COMMAND · EMPIRE RITUAL
          </div>
          <h2 className="text-lg font-medium m-0">
            {profile.label} · {emp.label}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge text={`${sourceLabel}`} ok />
          <Badge text={`Equity ${usd(equity)}`} ok={equity >= 500} />
          <Badge text={`Cash ${usd(cash)}`} ok />
          <Badge text={live?.source === "alpaca" ? "PAPER FEED ON" : "PAPER FEED OFF"} ok={live?.source === "alpaca"} />
        </div>
      </div>

      {/* Capital ladder */}
      <div>
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
          <span>
            Ladder {usd(ladder.from)} → {usd(ladder.to)}
          </span>
          <span>{ladder.pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--surface-1)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--text-accent)]"
            style={{ width: `${ladder.pct}%` }}
          />
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] mt-1 m-0">{emp.note}</p>
      </div>

      {/* Brain pulse + journal */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <PulseTile
          label="Brain pulse"
          value="Trade Lab"
          hint="Rank · size · explain · checklist"
          href="/builder"
        />
        <PulseTile
          label="Journal"
          value={`${jStats.closed} closed`}
          hint={`${jStats.planned} planned · ${jStats.open} open · P/L ${usd(jStats.totalPl)}`}
          href="/journal"
        />
        <PulseTile
          label="RH import"
          value={rhRows ? `${rhRows} rows` : "None"}
          hint="CSV/paste only — no password"
          href="/settings"
        />
        <PulseTile
          label="Risk target"
          value={`${(emp.perTradeRiskPct * 100).toFixed(1)}%`}
          hint={`Cap ${(emp.perTradeRiskCapPct * 100).toFixed(1)}% · max ${emp.maxOpenCampaigns} campaigns`}
          href="/education"
        />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/builder"
          className="rounded-lg border border-[var(--border-accent)] bg-[var(--bg-accent)] text-[var(--text-accent)] px-3 py-1.5"
        >
          Open Trade Lab
        </Link>
        <Link
          href="/journal"
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--text-secondary)]"
        >
          Journal ritual
        </Link>
        <Link
          href="/settings"
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--text-secondary)]"
        >
          Set seed equity
        </Link>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] m-0">
        See the trade. Trust the process. Own the decision. Educational companion only — not investment
        advice. No auto-trade. Long live the empire.
      </p>
    </section>
  );
}

function Badge({ text, ok }: { text: string; ok?: boolean }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 font-medium"
      style={{
        background: ok ? "var(--bg-success, rgba(29,158,117,0.12))" : "var(--surface-1)",
        color: ok ? "var(--text-success)" : "var(--text-secondary)",
      }}
    >
      {text}
    </span>
  );
}

function PulseTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 hover:border-[var(--border-accent)] transition-colors"
    >
      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</div>
      <div className="text-sm font-medium">{value}</div>
      <div className="text-[11px] text-[var(--text-secondary)]">{hint}</div>
    </Link>
  );
}
