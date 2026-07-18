"use client";

import { useMemo, useState } from "react";
import {
  COMPARE_STRATEGY_IDS,
  COMPARE_STRATEGY_LABELS,
  buildDemoLegs,
  type CompareStrategyId,
} from "@/lib/demoStrategyLegs";
import { compareStrategies, sortCompare, type SortKey } from "@/lib/compare";
import Link from "next/link";

const usd = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (f: number) => (f * 100).toFixed(1) + "%";

const EMPTY: (CompareStrategyId | "")[] = ["bull_put_credit", "bear_call_credit", "iron_condor"];

export default function ComparePage() {
  const [slots, setSlots] = useState<(CompareStrategyId | "")[]>([...EMPTY]);
  const [spot, setSpot] = useState(100);
  const [sigma, setSigma] = useState(0.28);
  const [dte, setDte] = useState(35);
  const [sortKey, setSortKey] = useState<SortKey>("probProfit");

  const rows = useMemo(() => {
    const items = slots
      .filter((s): s is CompareStrategyId => Boolean(s))
      .map((id) => ({
        label: COMPARE_STRATEGY_LABELS[id],
        legs: buildDemoLegs(id, spot, dte),
      }));
    if (!items.length) return [];
    const compared = compareStrategies(items, {
      spot,
      tYears: Math.max(1 / 365, dte / 365),
      sigma,
      r: 0.045,
      q: 0.005,
      drift: { kind: "risk-neutral" },
      simulations: 6_000,
      seed: 42,
    });
    return sortCompare(compared, sortKey, "desc");
  }, [slots, spot, sigma, dte, sortKey]);

  return (
    <div className="zone-cockpit flex flex-col gap-4">
      <div>
        <div className="os-kicker">Analysis</div>
        <h1 className="text-2xl font-medium tracking-tight m-0">Compare</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Side-by-side payoff + Monte Carlo (model estimates). Up to three structures. Demo marks —
          load live chain in{" "}
          <Link href="/builder" className="underline text-[var(--text-accent)]">
            Trade Lab
          </Link>{" "}
          for listed strikes.
        </p>
      </div>

      {/* Controls */}
      <section className="os-panel p-4 flex flex-col gap-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {[0, 1, 2].map((i) => (
            <label key={i} className="text-xs text-[var(--text-secondary)]">
              Slot {i + 1}
              <select
                className="mt-1 w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
                value={slots[i] ?? ""}
                onChange={(e) => {
                  const next = [...slots] as (CompareStrategyId | "")[];
                  next[i] = e.target.value as CompareStrategyId | "";
                  setSlots(next);
                }}
              >
                <option value="">— empty —</option>
                {COMPARE_STRATEGY_IDS.map((id) => (
                  <option key={id} value={id}>
                    {COMPARE_STRATEGY_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <label className="text-xs text-[var(--text-secondary)]">
            Spot ${spot}
            <input
              type="range"
              min={50}
              max={500}
              step={5}
              value={spot}
              onChange={(e) => setSpot(+e.target.value)}
              className="w-full mt-1"
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            IV {(sigma * 100).toFixed(0)}%
            <input
              type="range"
              min={0.08}
              max={0.8}
              step={0.01}
              value={sigma}
              onChange={(e) => setSigma(+e.target.value)}
              className="w-full mt-1"
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            DTE {dte}
            <input
              type="range"
              min={7}
              max={90}
              step={1}
              value={dte}
              onChange={(e) => setDte(+e.target.value)}
              className="w-full mt-1"
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Sort by
            <select
              className="mt-1 w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="probProfit">Model PoP</option>
              <option value="expectedPL">Model EV</option>
              <option value="returnOnRisk">Payoff RoR</option>
              <option value="maxLoss">Max loss</option>
              <option value="netCashFlow">Net cash</option>
            </select>
          </label>
        </div>
      </section>

      {/* Results */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--text-muted)]">
          Pick at least one strategy slot to compare.
        </div>
      ) : (
        <div className="overflow-x-auto os-panel">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="p-3 font-medium">Strategy</th>
                <th className="p-3 font-medium">Net cash</th>
                <th className="p-3 font-medium">Max profit</th>
                <th className="p-3 font-medium">Max loss</th>
                <th className="p-3 font-medium">Break-evens</th>
                <th className="p-3 font-medium">Model PoP</th>
                <th className="p-3 font-medium">Model EV</th>
                <th className="p-3 font-medium">Payoff RoR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3 font-medium">{r.label}</td>
                  <td className="p-3">{usd(r.netCashFlow)}</td>
                  <td className="p-3 text-[var(--text-success)]">
                    {r.maxProfit === "unlimited" ? "Unlimited" : usd(r.maxProfit)}
                  </td>
                  <td className="p-3 text-[var(--text-danger)]">
                    {r.maxLoss === "undefined" ? "Undefined" : usd(Math.abs(r.maxLoss as number))}
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">
                    {r.breakEvens.length ? r.breakEvens.map((b) => `$${b.toFixed(0)}`).join(", ") : "—"}
                  </td>
                  <td className="p-3">{pct(r.probProfit)}</td>
                  <td
                    className="p-3"
                    style={{
                      color: r.expectedPL >= 0 ? "var(--text-success)" : "var(--text-danger)",
                    }}
                  >
                    {usd(r.expectedPL)}
                  </td>
                  <td className="p-3">{r.returnOnRisk == null ? "—" : r.returnOnRisk.toFixed(2) + "x"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)]">
        PoP and EV are Monte Carlo model estimates under fixed vol and risk-neutral drift — not
        guarantees. Educational analysis only.
      </p>
    </div>
  );
}
