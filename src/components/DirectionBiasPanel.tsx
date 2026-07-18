"use client";

/**
 * Small Direction Bias panel — NCI SuperBias / ports / voters for any ticker.
 * Uses GET /api/nci-ta/bias which loads webhook snapshot or compute engine.
 */

import { useCallback, useEffect, useState } from "react";
import type { NciLayerRow, NciTaSnapshot, NciVoterRow } from "@/indicators/nciTa";

function bare(symbol: string): string {
  const t = symbol.includes(":") ? symbol.split(":").pop()! : symbol;
  return t.trim().toUpperCase() || "SPY";
}

function sideLabel(v: -1 | 0 | 1): string {
  if (v === 1) return "BULL";
  if (v === -1) return "BEAR";
  return "FLAT";
}

function sideColor(v: -1 | 0 | 1): string {
  if (v === 1) return "var(--text-success)";
  if (v === -1) return "var(--text-danger)";
  return "var(--text-muted)";
}

function LayerBar({ layer }: { layer: NciLayerRow }) {
  const bullPct = layer.total > 0 ? (layer.bull / layer.total) * 100 : 50;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px]">
        <span className="font-medium">{layer.name}</span>
        <span className="text-[var(--text-muted)]">
          {layer.bull}B · {layer.bear}S · score {(layer.score * 100).toFixed(0)}%
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden flex"
        style={{ background: "var(--surface-3)" }}
        title={`${layer.bull} bull / ${layer.bear} bear of ${layer.total}`}
      >
        <div style={{ width: `${bullPct}%`, background: "var(--text-success)", opacity: 0.75 }} />
        <div style={{ width: `${100 - bullPct}%`, background: "var(--text-danger)", opacity: 0.55 }} />
      </div>
    </div>
  );
}

function VoteChip({ row }: { row: NciVoterRow }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] rounded-md px-1.5 py-0.5 border"
      style={{
        borderColor: "var(--border)",
        color: sideColor(row.vote),
        background: "var(--surface-2)",
      }}
      title={row.name}
    >
      <span className="opacity-70">{row.name}</span>
      <strong>{sideLabel(row.vote)}</strong>
    </span>
  );
}

export default function DirectionBiasPanel({ symbol }: { symbol: string }) {
  const ticker = bare(symbol);
  const [snap, setSnap] = useState<NciTaSnapshot | null>(null);
  const [ui, setUi] = useState<Record<string, string> | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [fromStore, setFromStore] = useState(false);

  const load = useCallback(
    async (recompute = false) => {
      setLoading(true);
      setErr("");
      try {
        const q = recompute ? "&recompute=1" : "";
        const res = await fetch(
          `/api/nci-ta/bias?symbol=${encodeURIComponent(ticker)}${q}`
        );
        const j = await res.json();
        if (!j.ok || !j.snapshot) throw new Error(j.error || "bias_failed");
        setSnap(j.snapshot as NciTaSnapshot);
        setUi((j.ui as Record<string, string>) || null);
        setFromStore(!!j.fromStore);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load bias");
        setSnap(null);
      } finally {
        setLoading(false);
      }
    },
    [ticker]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  if (loading && !snap) {
    return (
      <section className="os-panel p-4 text-sm text-[var(--text-muted)]">
        Loading NCI direction bias for {ticker}…
      </section>
    );
  }

  if (err && !snap) {
    return (
      <section className="os-panel p-4">
        <div className="text-sm text-[var(--text-danger)]">{err}</div>
        <button type="button" className="os-btn text-xs mt-2" onClick={() => void load(true)}>
          Retry compute
        </button>
      </section>
    );
  }

  if (!snap) return null;

  const layers: NciLayerRow[] =
    snap.layerBreakdown?.length
      ? [...snap.layerBreakdown]
      : [
          {
            id: "superbias",
            name: "SuperBias 24",
            bull: snap.sbBull,
            bear: snap.sbBear,
            total: 24,
            score: snap.layerScores.superBias,
          },
          {
            id: "companion",
            name: "Companion 7",
            bull: snap.companionBuy,
            bear: snap.companionSell,
            total: 7,
            score: snap.layerScores.companion,
          },
          {
            id: "confluence",
            name: "Confluence 6",
            bull: snap.cbBull,
            bear: snap.cbBear,
            total: 6,
            score: snap.layerScores.confluence,
          },
          {
            id: "ports",
            name: "Ports 11",
            bull: snap.portBull,
            bear: snap.portBear,
            total: 11,
            score: snap.layerScores.ports,
          },
          {
            id: "voters",
            name: "Voters 15",
            bull: snap.voterBull,
            bear: snap.voterBear,
            total: 15,
            score: snap.layerScores.voters,
          },
        ];

  const masterColor =
    snap.masterDir === "BULL"
      ? "var(--text-success)"
      : snap.masterDir === "BEAR"
        ? "var(--text-danger)"
        : "var(--text-muted)";

  return (
    <div className="flex flex-col gap-3">
      <section className="os-panel p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="os-kicker">NCI direction bias · any ticker</div>
            <h2 className="text-lg font-medium m-0 tracking-tight">
              {ticker}{" "}
              <span style={{ color: masterColor }}>
                {snap.masterDir} {Math.abs(snap.masterPct)}%
              </span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] m-0 mt-1">
              SuperBias · Companion · Confluence · Ports · Voters — same language as your forex
              trade assistant / Pine panel. Co-pilot only.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="os-btn text-xs" onClick={() => void load(true)}>
              Recompute
            </button>
            <span className="os-badge text-[10px]">
              {fromStore ? "store/webhook" : "engine"} · {snap.source}
            </span>
          </div>
        </div>

        <div
          className="grid gap-2 text-xs"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}
        >
          <Metric
            label="Master"
            value={`${snap.masterDir} ${Math.abs(snap.masterPct)}%`}
            {...(snap.masterDir === "BULL"
              ? { tone: "pos" as const }
              : snap.masterDir === "BEAR"
                ? { tone: "neg" as const }
                : {})}
          />
          <Metric label="Trigger" value={snap.trigger.replace(/_/g, " ")} />
          <Metric
            label="FIRE gates"
            value={snap.allGatesPass ? "PASS" : "SOFT FAIL"}
            {...(snap.allGatesPass ? { tone: "pos" as const } : { tone: "neg" as const })}
          />
          <Metric label="ABC" value={snap.abcStage.replace(/_/g, " ")} />
          <Metric label="ADX" value={snap.adx.toFixed(1)} />
          <Metric label="Voters" value={`${snap.voterBull}B / ${snap.voterBear}S`} />
          <Metric label="Ports" value={`${snap.portBull}B / ${snap.portBear}S`} />
          <Metric label="SB net" value={String(snap.sbNet)} />
        </div>

        {/* Per-gate breakdown — forex FIRE filters used as options context only */}
        <div
          className="rounded-lg border p-3 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <div className="font-medium text-[var(--text-primary)] mb-1">
            What “FIRE gates” means (options)
          </div>
          <p className="text-[var(--text-muted)] m-0 mb-2">
            These are <strong>forex NCI FIRE-entry filters</strong> (trend energy / expansion). They
            do <strong>not</strong> block options recommendations. On options they are a{" "}
            <strong>co-pilot caution</strong>: directional / growth-tactical structures get a soft
            penalty when gates fail; credit/defined-risk income can still rank. Premium-selling often
            prefers quieter regimes that fail these gates.
          </p>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
          >
            {(
              [
                {
                  key: "adx",
                  label: `ADX ≥ ${snap.gateDetail?.minAdx ?? 22}`,
                  ok: snap.gateDetail?.adx ?? snap.adx >= 22,
                  val: snap.adx.toFixed(1),
                  opt: "Trend strength — helps directional longs; not required for credit spreads",
                },
                {
                  key: "fer",
                  label: `FER ≥ ${snap.gateDetail?.minFer ?? 0.35}`,
                  ok: snap.gateDetail?.fer ?? snap.fer >= 0.35,
                  val: snap.fer.toFixed(2),
                  opt: "Path efficiency — chop fails this; fine for range/IC days",
                },
                {
                  key: "kinetic",
                  label: `Kinetic ≥ ${snap.gateDetail?.minKinetic ?? 0.5}`,
                  ok: snap.gateDetail?.kinetic ?? snap.kinetic >= 0.5,
                  val: snap.kinetic.toFixed(2),
                  opt: "Move+volume energy — stocks need real volume; synthetic bars often fail",
                },
                {
                  key: "abc",
                  label: "ABC not C",
                  ok: snap.gateDetail?.abc ?? snap.abcStage !== "C_CONTRACTION",
                  val: snap.abcStage.replace(/_/g, " "),
                  opt: "C contraction: skip new FIRE entries; options may still sell premium carefully",
                },
                {
                  key: "session",
                  label: "Session",
                  ok: snap.gateDetail?.session ?? snap.sessionOk,
                  val: snap.sessionOk ? "open" : "closed",
                  opt: "RTH for stocks/ETFs; not forex London/NY scalp window",
                },
              ] as const
            ).map((g) => (
              <div
                key={g.key}
                className="rounded-md border px-2 py-1.5"
                style={{
                  borderColor: g.ok ? "var(--border)" : "var(--border-accent)",
                  background: "var(--surface-1)",
                }}
              >
                <div className="flex justify-between gap-1">
                  <span className="font-medium">{g.label}</span>
                  <span style={{ color: g.ok ? "var(--text-success)" : "var(--text-danger)" }}>
                    {g.ok ? "OK" : "FAIL"} · {g.val}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{g.opt}</div>
              </div>
            ))}
          </div>
        </div>

        {(snap.fireBuy || snap.fireSell || snap.armActive) && (
          <div
            className="text-sm rounded-lg px-3 py-2 border"
            style={{ borderColor: "var(--border-accent)", background: "var(--surface-2)" }}
          >
            {snap.fireBuy && (
              <strong style={{ color: "var(--text-success)" }}>◆ FIRE BUY context</strong>
            )}
            {snap.fireSell && (
              <strong style={{ color: "var(--text-danger)" }}>◆ FIRE SELL context</strong>
            )}
            {snap.armActive && !snap.fireBuy && !snap.fireSell && (
              <strong>○ ARMED — wait for FIRE + your PA check</strong>
            )}
            <span className="text-xs text-[var(--text-muted)] ml-2">
              Not an order — confirm structure + risk gates
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {layers.map((L) => (
            <LayerBar key={L.id} layer={L} />
          ))}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="os-panel p-4">
          <h3 className="text-sm font-medium m-0 mb-2">
            Direction voters ({snap.voterBreakdown?.length ?? 15})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(snap.voterBreakdown ?? []).map((v) => (
              <VoteChip key={v.id} row={v} />
            ))}
            {!snap.voterBreakdown?.length && (
              <p className="text-xs text-[var(--text-muted)] m-0">
                Aggregates only (webhook snapshot). Recompute for named voters.
              </p>
            )}
          </div>
        </section>
        <section className="os-panel p-4">
          <h3 className="text-sm font-medium m-0 mb-2">
            SuperBrain ports ({snap.portBreakdown?.length ?? 11})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(snap.portBreakdown ?? []).map((v) => (
              <VoteChip key={v.id} row={v} />
            ))}
            {!snap.portBreakdown?.length && (
              <p className="text-xs text-[var(--text-muted)] m-0">
                Aggregates only. Click Recompute for port names.
              </p>
            )}
          </div>
        </section>
      </div>

      {snap.notes?.length > 0 && (
        <section className="os-panel p-3">
          <ul className="m-0 pl-4 list-disc text-[11px] text-[var(--text-muted)] space-y-0.5">
            {snap.notes.slice(0, 6).map((n) => (
              <li key={n.slice(0, 48)}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[11px] text-[var(--text-muted)] m-0">
        {ui?.disclaimer ??
          "Educational NCI bias from your trade-assistant stack. Forex FIRE alone is not a proven autopilot."}
        {snap.degraded ? " · Degraded multi-TF (chart proxies)." : ""}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  const color =
    tone === "pos"
      ? "var(--text-success)"
      : tone === "neg"
        ? "var(--text-danger)"
        : "var(--text-primary)";
  return (
    <div className="rounded-md bg-[var(--surface-2)] px-2 py-1.5">
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
      <div className="text-sm font-medium" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
