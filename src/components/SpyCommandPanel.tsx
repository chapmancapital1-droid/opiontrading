"use client";

/**
 * Command Center — SPY tab.
 * Advanced 1DTE / defined-risk playbook + live brain recommend for SPY.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import BrainRecommendPanel from "@/components/BrainRecommendPanel";
import MarketSnapshot from "@/components/MarketSnapshot";
import MarketContextPanel from "@/components/MarketContextPanel";
import TradingViewChart from "@/components/TradingViewChart";
import {
  buildSpyAdvancedPlaybook,
  isSpySymbol,
  type SpyBias,
} from "@/knowledge/spyPlaybook";

export default function SpyCommandPanel({
  symbol,
  onUseSpy,
}: {
  /** Current command symbol (may not be SPY). */
  symbol: string;
  /** Parent can force ticker to SPY. */
  onUseSpy?: () => void;
}) {
  const bare = useMemo(() => {
    const t = symbol.includes(":") ? symbol.split(":").pop()! : symbol;
    return t.trim().toUpperCase();
  }, [symbol]);
  const isSpy = isSpySymbol(bare);
  const [bias, setBias] = useState<SpyBias>("neutral");

  const playbook = useMemo(
    () =>
      buildSpyAdvancedPlaybook({
        bias,
        spot: null,
        atmIv: null,
      }),
    [bias]
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="os-panel p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="os-kicker">SPY special strategy</div>
            <h2 className="text-lg font-medium m-0 tracking-tight">
              1DTE · high-POP · defined-risk companion
            </h2>
            <p className="text-xs text-[var(--text-muted)] m-0 mt-1 max-w-2xl">
              Selective entry (score ≥70), ≤4 high-POP strikes, safe credit/debit structures, and the
              professional adjustment ladder. Educational only — no auto-trade.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["bullish", "neutral", "bearish"] as SpyBias[]).map((b) => (
              <button
                key={b}
                type="button"
                className={`os-btn text-xs ${bias === b ? "os-btn-primary" : ""}`}
                onClick={() => setBias(b)}
              >
                {b}
              </button>
            ))}
            {!isSpy && (
              <button type="button" className="os-btn os-btn-primary text-xs" onClick={onUseSpy}>
                Load SPY ticker
              </button>
            )}
          </div>
        </div>

        {!isSpy && (
          <div
            className="text-sm rounded-lg px-3 py-2 border"
            style={{ borderColor: "var(--border-accent)", background: "var(--surface-3)" }}
          >
            Command symbol is <strong>{bare}</strong>. Load <strong>SPY</strong> to run live chain
            recommendations with advanced SPY instructions, or keep reading the static playbook
            below.
          </div>
        )}

        <p className="text-sm text-[var(--text-secondary)] m-0">{playbook.summary}</p>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] m-0 mb-1.5">
              When to trade
            </h3>
            <ul className="text-sm m-0 pl-4 list-disc space-y-1 text-[var(--text-secondary)]">
              {playbook.whenToTrade.map((x) => (
                <li key={x.slice(0, 48)}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] m-0 mb-1.5">
              When not to trade
            </h3>
            <ul className="text-sm m-0 pl-4 list-disc space-y-1 text-[var(--text-secondary)]">
              {playbook.whenNotToTrade.map((x) => (
                <li key={x.slice(0, 48)}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="os-panel p-4">
        <h3 className="text-base font-medium m-0 mb-2">
          High-POP strike guides (≤4) · bias {bias}
        </h3>
        <p className="text-xs text-[var(--text-muted)] m-0 mb-3">
          Fewer than 4 if market is thin — never force junk strikes. Confirm on live chain + brain
          Recommend.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {playbook.highPopStrikeGuides.map((g, i) => (
            <div
              key={g.label}
              className="rounded-lg border p-3 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  #{i + 1} {g.label}
                </span>
                <span className="os-badge text-[10px]">{g.estPopBand}</span>
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{g.offsetHint}</div>
              <div className="mt-2 text-[var(--text-secondary)]">
                <div>
                  <strong className="text-[var(--text-primary)]">Structure:</strong> {g.structure}
                </div>
                <div className="mt-1">
                  <strong className="text-[var(--text-primary)]">When:</strong> {g.when}
                </div>
                <div className="mt-1">
                  <strong className="text-[var(--text-primary)]">How:</strong> {g.how}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="os-panel p-4">
          <h3 className="text-base font-medium m-0 mb-2">Safe / cheap structures</h3>
          <div className="flex flex-col gap-2">
            {playbook.safeCheapStructures.map((s) => (
              <div
                key={s.id}
                className="text-sm border rounded-lg p-2.5"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-[var(--text-secondary)] mt-1">{s.how}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">
                  {s.capitalNote} · Target: {s.target}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="os-panel p-4 flex flex-col gap-3">
          <div>
            <h3 className="text-base font-medium m-0 mb-2">Adjustment ladder</h3>
            <ol className="text-sm m-0 pl-4 list-decimal space-y-1 text-[var(--text-secondary)]">
              {playbook.adjustmentLadder.map((x) => (
                <li key={x.slice(0, 40)}>{x}</li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="text-base font-medium m-0 mb-2">Session checklist</h3>
            <ul className="text-sm m-0 pl-4 list-disc space-y-1 text-[var(--text-secondary)]">
              {playbook.sessionChecklist.map((x) => (
                <li key={x.slice(0, 40)}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-medium m-0 mb-2">Robinhood advanced</h3>
            <ul className="text-sm m-0 pl-4 list-disc space-y-1 text-[var(--text-secondary)]">
              {playbook.robinhoodAdvanced.map((x) => (
                <li key={x.slice(0, 40)}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1.05fr]">
        <div className="flex flex-col gap-3">
          <MarketSnapshot symbol={isSpy ? symbol : "AMEX:SPY"} />
          <MarketContextPanel symbol={isSpy ? symbol : "AMEX:SPY"} />
          <div className="os-panel p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-medium">SPY chart</span>
              <span className="os-badge text-[10px]">TradingView</span>
            </div>
            <TradingViewChart symbol={isSpy ? symbol : "AMEX:SPY"} height={360} />
          </div>
          <Link href="/builder" className="os-btn os-btn-primary text-center no-underline">
            Open Trade Lab with SPY structure
          </Link>
        </div>
        <div>
          <div className="os-kicker mb-2 px-1">Live SPY brain · advanced instructions on</div>
          <BrainRecommendPanel symbol={isSpy ? bare : "SPY"} />
        </div>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] m-0">{playbook.disclaimer}</p>
    </div>
  );
}
