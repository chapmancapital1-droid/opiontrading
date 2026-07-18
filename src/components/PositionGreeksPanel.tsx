"use client";

import type { Greeks } from "@/domain/blackScholes";

const fmt = (n: number, d = 2) =>
  Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—";

export default function PositionGreeksPanel({
  greeks,
  engine = "domain",
}: {
  greeks: Greeks | null;
  engine?: string;
}) {
  if (!greeks) {
    return (
      <section className="os-panel p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Position Greeks</span>
          <span className="os-badge text-[10px]">DOMAIN</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] m-0">Add option legs to see model Greeks.</p>
      </section>
    );
  }

  const cells: { label: string; value: string; hint: string }[] = [
    { label: "Δ Delta", value: fmt(greeks.delta, 3), hint: "shares equiv." },
    { label: "Γ Gamma", value: fmt(greeks.gamma, 4), hint: "Δ per $1" },
    { label: "Θ Theta", value: fmt(greeks.theta, 2), hint: "$ / day" },
    { label: "ν Vega", value: fmt(greeks.vega, 2), hint: "$ / vol pt" },
    { label: "ρ Rho", value: fmt(greeks.rho, 2), hint: "rate sens." },
    { label: "Model $", value: fmt(greeks.price, 0), hint: "theo mark" },
  ];

  return (
    <section className="os-panel p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Position Greeks</span>
        <span className="os-badge text-[10px]">{engine.toUpperCase()}</span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
        {cells.map((c) => (
          <div key={c.label} className="os-metric">
            <div className="os-metric-label">{c.label}</div>
            <div className="os-metric-value text-base font-mono">{c.value}</div>
            <div className="text-[10px] text-[var(--text-muted)]">{c.hint}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mt-2 m-0">
        Black-Scholes / CRR (American) via <code className="text-[10px]">src/domain</code>. Educational
        model — not a fill price.
      </p>
    </section>
  );
}
