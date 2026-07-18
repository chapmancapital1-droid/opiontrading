"use client";

/**
 * Command Center ritual strip — empire ladder, account truth, brain pulse.
 * Visual language aligned with design/mocks/dashboard-command-center.html
 * W1-F04: honesty pass — seed badge, refresh, no fake live P/L.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { loadPersonalAccount, type PersonalAccountProfile } from "@/lib/personalAccount";
import { getEmpirePhaseLimits, ladderProgress } from "@/knowledge/empirePolicy";
import { journalStats, loadJournal } from "@/lib/localJournal";
import { loadRhImport } from "@/lib/rhImport";
import { evaluateAccountGates, seedAccount, allPassed } from "@/brain";
import type { LiveAccountClient } from "@/brain/liveAccount";

const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function CommandRitual() {
  const [profile, setProfile] = useState<PersonalAccountProfile | null>(null);
  const [live, setLive] = useState<LiveAccountClient | null>(null);
  const [jStats, setJStats] = useState(journalStats([]));
  const [rhRows, setRhRows] = useState(0);
  const [refreshAt, setRefreshAt] = useState<string | null>(null);
  const [gateLabel, setGateLabel] = useState("…");

  const refresh = useCallback(() => {
    const p = loadPersonalAccount();
    setProfile(p);
    setJStats(journalStats(loadJournal()));
    const rh = loadRhImport();
    setRhRows(rh?.rows?.length ?? 0);

    // Account-gate pulse without full chain load (seed honesty)
    try {
      const acct = seedAccount(p.manualEquity, {
        cash: p.manualCash,
        approvalProfile: p.approvalProfile,
      });
      const gates = evaluateAccountGates(acct);
      setGateLabel(allPassed(gates) ? "Gates ready" : "Gate check");
    } catch {
      setGateLabel("Gates n/a");
    }

    setRefreshAt(new Date().toISOString());

    fetch("/api/alpaca/account")
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j.account) setLive(j.account as LiveAccountClient);
        else setLive(null);
      })
      .catch(() => setLive(null));
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (
        !e.key ||
        e.key.startsWith("optionscope.") ||
        e.key.includes("personalAccount") ||
        e.key.includes("journal") ||
        e.key.includes("rhImport")
      ) {
        refresh();
      }
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  if (!profile) {
    return (
      <section className="os-panel p-4 text-sm text-[var(--text-muted)]">
        Loading empire command strip…
      </section>
    );
  }

  const paperFeedOk = live?.source === "alpaca";
  const useAlpacaEquity = profile.equitySource === "alpaca_paper" && paperFeedOk && live?.equity != null;

  const equity = useAlpacaEquity ? live!.equity : profile.manualEquity;
  const cash =
    useAlpacaEquity && live?.cash != null ? live.cash : profile.manualCash;

  const emp = getEmpirePhaseLimits(equity);
  const ladder = ladderProgress(equity);

  const sourceLabel =
    profile.equitySource === "alpaca_paper"
      ? paperFeedOk
        ? "Alpaca paper"
        : "Alpaca paper (feed off)"
      : profile.equitySource === "robinhood_paste"
        ? "Broker paste"
        : "Manual seed";

  const isSeed = equity < 5_000;
  // Never show LIVE on command strip — Lab owns chain LIVE/HYBRID/DEMO badges
  const feedBadge = paperFeedOk ? "PAPER FEED" : "PAPER OFF";

  return (
    <section className="os-panel-accent p-4 md:p-5 flex flex-col gap-4" aria-label="Empire command ritual">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="os-kicker">Command · Empire ritual</div>
          <h2 className="text-xl font-medium m-0 mt-1 tracking-tight">
            {profile.label}
            <span className="text-[var(--text-muted)] font-normal text-base ml-2">
              {emp.label}
            </span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] m-0 mt-1 max-w-xl">
            See the trade. Trust the process. Own the decision. Capital truth first — no fake live P/L.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="os-badge os-badge-ok">{sourceLabel}</span>
          {isSeed && (
            <span className="os-badge os-badge-warn" title={emp.note}>
              Seed mode · defined-risk bias
            </span>
          )}
          <span className="os-badge os-badge-accent">Equity {usd(equity)}</span>
          <span className="os-badge">Cash {usd(cash)}</span>
          <span className={`os-badge ${paperFeedOk ? "os-badge-ok" : ""}`}>{feedBadge}</span>
          <button
            type="button"
            className="os-badge cursor-pointer border-0"
            onClick={refresh}
            title="Re-read local seed, journal, RH import + paper feed"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Capital ladder */}
      <div className="os-well p-3">
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
          <span>
            Ladder {usd(ladder.from)} → {usd(ladder.to)}
          </span>
          <span className="font-medium text-[var(--text-accent)]">{ladder.pct.toFixed(0)}%</span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "var(--surface-1)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${ladder.pct}%`,
              background: "linear-gradient(90deg, var(--brand), var(--brand-bright))",
            }}
          />
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] mt-2 m-0 leading-relaxed">
          {emp.note}
        </p>
        {profile.equitySource === "alpaca_paper" && !paperFeedOk && (
          <p className="text-[11px] text-[var(--text-warning)] mt-1 m-0">
            Paper feed unavailable — showing manual seed equity {usd(profile.manualEquity)} (not a live
            balance).
          </p>
        )}
        {refreshAt && (
          <p className="text-[10px] text-[var(--text-muted)] mt-1 m-0">
            Strip refreshed {new Date(refreshAt).toLocaleTimeString()} · no claimed day P/L without
            broker activity.
          </p>
        )}
      </div>

      {/* Pulse tiles */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))" }}
      >
        <PulseTile
          label="Brain pulse"
          value="Trade Lab"
          hint="Rank · size · explain · checklist"
          href="/builder"
          icon="ti-brain"
        />
        <PulseTile
          label="Journal"
          value={`${jStats.closed} closed`}
          hint={`${jStats.planned} planned · ${jStats.open} open · closed P/L ${usd(jStats.totalPl)}`}
          href="/journal"
          icon="ti-notebook"
        />
        <PulseTile
          label="History import"
          value={rhRows ? `${rhRows} rows` : "None"}
          hint="CSV / paste — not live RH sync"
          href="/settings"
          icon="ti-file-import"
        />
        <PulseTile
          label="Risk / gates"
          value={`${(emp.perTradeRiskPct * 100).toFixed(1)}% · ${gateLabel}`}
          hint={`Cap ${(emp.perTradeRiskCapPct * 100).toFixed(1)}% · max ${emp.maxOpenCampaigns} campaigns`}
          href="/education"
          icon="ti-shield"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/builder" className="os-btn os-btn-primary">
          <i className="ti ti-tools" aria-hidden />
          Open Trade Lab
        </Link>
        <Link href="/journal" className="os-btn">
          <i className="ti ti-notebook" aria-hidden />
          Journal ritual
        </Link>
        <Link href="/settings" className="os-btn">
          <i className="ti ti-adjustments" aria-hidden />
          Seed equity
        </Link>
        <Link href="/compare" className="os-btn">
          <i className="ti ti-columns" aria-hidden />
          Compare
        </Link>
      </div>
    </section>
  );
}

function PulseTile({
  label,
  value,
  hint,
  href,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="os-well px-3 py-2.5 no-underline transition-colors hover:border-[var(--border-accent)] block"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        <i className={`ti ${icon} text-xs`} aria-hidden />
        {label}
      </div>
      <div className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{value}</div>
      <div className="text-[11px] text-[var(--text-secondary)] leading-snug mt-0.5">{hint}</div>
    </Link>
  );
}
