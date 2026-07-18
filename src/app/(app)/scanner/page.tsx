"use client";

/**
 * Strategy Scanner — Finviz-style option strategy shortlist.
 * Filter by strategy + $8–$150 (editable) → ≤15 tickers that fit now.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { STRATEGY_PICKER } from "@/lib/strategyCatalog";
import type { ScannerHit, ScannerResult, ScannerBias } from "@/lib/strategyScanner";

const GROUPS = (() => {
  const m = new Map<string, typeof STRATEGY_PICKER>();
  for (const s of STRATEGY_PICKER) {
    const arr = m.get(s.group) ?? [];
    arr.push(s);
    m.set(s.group, arr);
  }
  return [...m.entries()];
})();

export default function ScannerPage() {
  const [strategyId, setStrategyId] = useState("bull_put_credit");
  const [minPrice, setMinPrice] = useState(8);
  const [maxPrice, setMaxPrice] = useState(150);
  const [maxResults, setMaxResults] = useState(15);
  const [bias, setBias] = useState<ScannerBias>("any");
  const [seedMode, setSeedMode] = useState(true);
  const [useRhHistory, setUseRhHistory] = useState(true);
  const [result, setResult] = useState<ScannerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<ScannerHit | null>(null);

  const strategyLabel = useMemo(
    () => STRATEGY_PICKER.find((s) => s.id === strategyId)?.label ?? strategyId,
    [strategyId]
  );

  const runScan = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({
        strategy: strategyId,
        minPrice: String(minPrice),
        maxPrice: String(maxPrice),
        maxResults: String(maxResults),
        bias,
        seedMode: seedMode ? "1" : "0",
        useRhHistory: useRhHistory ? "1" : "0",
      });
      const res = await fetch(`/api/scanner?${qs}`);
      const j = await res.json();
      if (!j.ok || !j.result) throw new Error(j.error || "scan_failed");
      setResult(j.result as ScannerResult);
      setSelected(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Scan failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [strategyId, minPrice, maxPrice, maxResults, bias, seedMode, useRhHistory]);

  useEffect(() => {
    void runScan();
  }, [runScan]);

  return (
    <div className="flex flex-col gap-4 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="os-kicker">Finviz-for-options · Empire scanner</div>
          <h1 className="text-2xl font-medium tracking-tight m-0">Strategy Scanner</h1>
          <p className="text-xs text-[var(--text-muted)] m-0 mt-1 max-w-2xl">
            Pick a strategy → shortlist up to <strong>15</strong> tickers in your price band (default{" "}
            <strong>$8–$150</strong>). Fewer if not enough qualify — never padded. Path: seed → $20k.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="os-badge text-[10px]">Educational shortlist</span>
          <Link href="/dashboard" className="os-btn text-xs no-underline">
            Command
          </Link>
          <Link href="/builder" className="os-btn os-btn-primary text-xs no-underline">
            Trade Lab
          </Link>
        </div>
      </div>

      {/* Growth path banner */}
      <div
        className="rounded-xl border px-4 py-3 text-sm"
        style={{ borderColor: "var(--border-accent)", background: "var(--surface-2)" }}
      >
        <strong className="text-[var(--text-accent)]">Seed → $20k:</strong>{" "}
        <span className="text-[var(--text-secondary)]">
          Prefer defined-risk credits/debits → size in Trade Lab → journal → Lessons blocks RH
          mistakes → Bias co-pilots direction. Scanner only ranks candidates.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* FILTER RAIL */}
        <aside className="os-panel p-4 flex flex-col gap-4 h-fit lg:sticky lg:top-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Strategy filter
            </div>
            <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {GROUPS.map(([group, items]) => (
                <div key={group}>
                  <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
                    {group}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {items.map((s) => {
                      const on = strategyId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStrategyId(s.id)}
                          className={`text-[11px] px-2 py-1 rounded-lg border cursor-pointer ${
                            on ? "os-btn-primary border-transparent" : ""
                          }`}
                          style={
                            on
                              ? undefined
                              : {
                                  borderColor: "var(--border)",
                                  background: "var(--surface-1)",
                                  color: "var(--text-secondary)",
                                }
                          }
                          title={s.label}
                        >
                          {s.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Price range ($)
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                className="os-input w-20 text-sm"
                value={minPrice}
                min={1}
                max={maxPrice}
                onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                aria-label="Min price"
              />
              <span className="text-[var(--text-muted)]">–</span>
              <input
                type="number"
                className="os-input w-20 text-sm"
                value={maxPrice}
                min={minPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value) || 150)}
                aria-label="Max price"
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] m-0 mt-1">
              Default 8–150 for seed liquidity. Raise max for AAPL/SPY-class.
            </p>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Market bias
            </div>
            <div className="flex flex-wrap gap-1">
              {(["any", "bullish", "bearish", "neutral"] as ScannerBias[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`os-btn text-[11px] py-1 ${bias === b ? "os-btn-primary" : ""}`}
                  onClick={() => setBias(b)}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={seedMode}
                onChange={(e) => setSeedMode(e.target.checked)}
              />
              Seed → $20k mode (prefer defined-risk)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useRhHistory}
                onChange={(e) => setUseRhHistory(e.target.checked)}
              />
              Use my RH lessons (soft coach)
            </label>
            <label className="flex items-center gap-2">
              Max results
              <input
                type="number"
                className="os-input w-16 text-sm"
                min={1}
                max={15}
                value={maxResults}
                onChange={(e) =>
                  setMaxResults(Math.min(15, Math.max(1, Number(e.target.value) || 15)))
                }
              />
              <span className="text-[var(--text-muted)]">(cap 15)</span>
            </label>
          </div>

          <button
            type="button"
            className="os-btn os-btn-primary w-full"
            onClick={() => void runScan()}
            disabled={loading}
          >
            {loading ? "Scanning…" : "Run strategy filter"}
          </button>
        </aside>

        {/* RESULTS */}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="os-panel p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <strong>{strategyLabel}</strong>
              <span className="text-[var(--text-muted)]">
                {" "}
                · ${minPrice}–${maxPrice}
                {result
                  ? ` · ${result.hits.length} shown / ${result.qualifiedCount} qualified · scanned ${result.scannedCount}`
                  : ""}
              </span>
            </div>
            {result && (
              <span className="text-[11px] text-[var(--text-secondary)]">{result.note}</span>
            )}
          </div>

          {err && (
            <div className="text-sm text-[var(--text-danger)] os-panel p-3">{err}</div>
          )}

          {loading && !result && (
            <div className="os-panel p-6 text-[var(--text-muted)] text-sm">Running scan…</div>
          )}

          {result && result.hits.length === 0 && (
            <div className="os-panel p-6 text-sm text-[var(--text-secondary)]">
              No tickers met this strategy + filters. Widen price band, lower min fit, or switch
              strategy.
            </div>
          )}

          {result && result.hits.length > 0 && (
            <div className="os-panel overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr
                    className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Ticker</th>
                    <th className="p-2.5">Spot</th>
                    <th className="p-2.5">Fit%</th>
                    <th className="p-2.5">Trend</th>
                    <th className="p-2.5">IVR~</th>
                    <th className="p-2.5">Risk</th>
                    <th className="p-2.5">Thesis</th>
                    <th className="p-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.hits.map((h) => {
                    const on = selected?.symbol === h.symbol;
                    return (
                      <tr
                        key={h.symbol}
                        className="cursor-pointer hover:bg-[var(--surface-2)]"
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: on ? "var(--surface-2)" : undefined,
                        }}
                        onClick={() => setSelected(h)}
                      >
                        <td className="p-2.5 text-[var(--text-muted)]">{h.rank}</td>
                        <td className="p-2.5">
                          <div className="font-medium text-sm">{h.symbol}</div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[120px]">
                            {h.name}
                          </div>
                        </td>
                        <td className="p-2.5">${h.spot.toFixed(2)}</td>
                        <td className="p-2.5">
                          <span
                            className="font-medium"
                            style={{
                              color:
                                h.fitPct >= 70
                                  ? "var(--text-success)"
                                  : h.fitPct >= 50
                                    ? "var(--text-primary)"
                                    : "var(--text-muted)",
                            }}
                          >
                            {h.fitPct}%
                          </span>
                        </td>
                        <td className="p-2.5 capitalize">{h.trendProxy}</td>
                        <td className="p-2.5">{(h.ivRankProxy * 100).toFixed(0)}%</td>
                        <td className="p-2.5">{h.riskLabel}</td>
                        <td className="p-2.5 capitalize">{h.thesis}</td>
                        <td className="p-2.5" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={h.openLabHref}
                            className="os-btn text-[10px] py-0.5 px-2 no-underline"
                          >
                            Lab
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Detail drawer */}
          {selected && (
            <section
              className="os-panel p-4 border"
              style={{ borderColor: "var(--border-accent)" }}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="os-kicker">Why this fits</div>
                  <h2 className="text-lg font-medium m-0">
                    {selected.symbol} · {selected.strategyLabel}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] m-0 mt-0.5">
                    Fit {selected.fitPct}% · ${selected.spot} · {selected.riskLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className="os-btn text-xs"
                  onClick={() => setSelected(null)}
                >
                  Close
                </button>
              </div>
              <ul className="mt-3 pl-4 list-disc text-sm text-[var(--text-secondary)] space-y-1">
                {selected.reasons.map((r) => (
                  <li key={r.slice(0, 48)}>{r}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link
                  href={selected.openLabHref}
                  className="os-btn os-btn-primary text-xs no-underline"
                >
                  Open Trade Lab
                </Link>
                <Link
                  href={`/dashboard?symbol=${encodeURIComponent(selected.symbol)}`}
                  className="os-btn text-xs no-underline"
                >
                  Command + Brain
                </Link>
                <Link href="/dashboard" className="os-btn text-xs no-underline">
                  Lessons / Bias
                </Link>
              </div>
            </section>
          )}

          <p className="text-[11px] text-[var(--text-muted)] m-0">
            {result?.disclaimer ??
              "Educational shortlist. Fit% is a model score, not a probability guarantee. No auto-orders."}
          </p>
        </div>
      </div>
    </div>
  );
}
