"use client";

/**
 * Personal Robinhood history lessons — wins, losses, patterns, how to improve.
 */

import {
  RH_HISTORY_LESSONS,
  rhCoachLinesForSymbol,
} from "@/knowledge/rhHistoryLessons";

export default function RhHistoryLessonsPanel({ symbol }: { symbol?: string }) {
  const L = RH_HISTORY_LESSONS;
  const bare = (symbol ?? "").includes(":")
    ? symbol!.split(":").pop()!
    : symbol ?? "";
  const coach = bare ? rhCoachLinesForSymbol(bare) : [];

  if (!L.n_matched_trades) {
    return (
      <section className="os-panel p-4 text-sm text-[var(--text-muted)]">
        No Robinhood history lessons loaded. Place activity CSVs in
        <code className="mx-1">Desktop\NERDCOMMAND_TRADING_BRAIN\robinhoodhistory</code>
        then run:
        <pre className="mt-2 text-[11px] whitespace-pre-wrap">
          {`cd opiontrading\\python
python -m ota.rh_history_learn`}
        </pre>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="os-panel p-4">
        <div className="os-kicker">Learn from your book</div>
        <h2 className="text-lg font-medium m-0 tracking-tight">
          Robinhood history · {L.n_matched_trades} matched option trades
        </h2>
        <p className="text-xs text-[var(--text-muted)] m-0 mt-1">
          Reconstructed from activity CSVs (BTO/STO/BTC/STC/OEXP/OASGN). Educational — fees and
          multi-leg nets can skew P/L. Path:{" "}
          <code className="text-[10px]">{L.source_path ?? "robinhoodhistory"}</code>
        </p>
        <div
          className="grid gap-2 mt-3 text-xs"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}
        >
          <Stat label="Win rate" value={`${((L.win_rate ?? 0) * 100).toFixed(1)}%`} />
          <Stat
            label="Total P/L"
            value={`$${L.total_pnl ?? 0}`}
            tone={(L.total_pnl ?? 0) >= 0 ? "pos" : "neg"}
          />
          <Stat label="Avg win" value={`$${L.avg_win ?? 0}`} tone="pos" />
          <Stat label="Avg loss" value={`$${L.avg_loss ?? 0}`} tone="neg" />
          <Stat label="Profit factor" value={String(L.profit_factor ?? "—")} />
          <Stat label="Assignments" value={String(L.assignment_count ?? 0)} />
          <Stat label="Expirations" value={String(L.expiration_count ?? 0)} />
        </div>
        {L.by_side && (
          <div className="mt-3 text-xs text-[var(--text-secondary)]">
            <strong>By style:</strong>{" "}
            {Object.entries(L.by_side).map(([k, v]) => (
              <span key={k} className="mr-3">
                {k.replace("_", " ")}: wr {(v.win_rate * 100).toFixed(0)}% · ${v.pnl} (n={v.n})
              </span>
            ))}
          </div>
        )}
      </section>

      {bare && (
        <section className="os-panel p-3 border border-[var(--border-accent)]">
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-accent)] font-medium">
            Coach for {bare.toUpperCase()}
          </div>
          <ul className="m-0 mt-1 pl-4 list-disc text-xs text-[var(--text-secondary)] space-y-0.5">
            {coach.map((c) => (
              <li key={c.slice(0, 48)}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="os-panel p-4">
          <h3 className="text-sm font-medium m-0 mb-2">Consistent patterns (wins & losses)</h3>
          <ul className="m-0 pl-4 list-disc text-sm text-[var(--text-secondary)] space-y-1.5">
            {(L.patterns ?? []).map((p) => (
              <li key={p.slice(0, 60)}>{p}</li>
            ))}
          </ul>
        </section>
        <section className="os-panel p-4">
          <h3 className="text-sm font-medium m-0 mb-2">How you could do better</h3>
          <ul className="m-0 pl-4 list-disc text-sm text-[var(--text-secondary)] space-y-1.5">
            {(L.how_could_do_better ?? []).map((p) => (
              <li key={p.slice(0, 60)}>{p}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="os-panel p-4">
          <h3 className="text-sm font-medium m-0 mb-2">Build on wins</h3>
          <ul className="m-0 pl-4 list-disc text-sm text-[var(--text-secondary)] space-y-1">
            {(L.build_on_wins ?? ["Keep journaling process on winners."]).map((p) => (
              <li key={p.slice(0, 60)}>{p}</li>
            ))}
          </ul>
          <h4 className="text-xs font-medium mt-3 mb-1 text-[var(--text-muted)]">Best symbols</h4>
          <SymbolTable rows={L.best_symbols ?? []} good />
        </section>
        <section className="os-panel p-4">
          <h3 className="text-sm font-medium m-0 mb-2">Mistakes to stop repeating</h3>
          <h4 className="text-xs font-medium mb-1 text-[var(--text-muted)]">Worst symbols</h4>
          <SymbolTable rows={L.worst_symbols ?? []} good={false} />
        </section>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] m-0">
        Re-run learner after new RH exports:{" "}
        <code>python -m ota.rh_history_learn --path &quot;…\robinhoodhistory&quot;</code>
        · Full report:{" "}
        <code>Desktop\NERDCOMMAND_TRADING_BRAIN\robinhoodhistory\LESSONS_FROM_YOUR_TRADES.md</code>
      </p>
    </div>
  );
}

function Stat({
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

function SymbolTable({
  rows,
  good,
}: {
  rows: { symbol: string; n: number; win_rate: number; pnl: number }[];
  good: boolean;
}) {
  if (!rows.length) return <p className="text-xs text-[var(--text-muted)]">—</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[var(--text-muted)] text-left">
            <th className="py-1">Symbol</th>
            <th>n</th>
            <th>WR</th>
            <th>P/L</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((r) => (
            <tr key={r.symbol} className="border-t" style={{ borderColor: "var(--border)" }}>
              <td className="py-1 font-medium">{r.symbol}</td>
              <td>{r.n}</td>
              <td>{(r.win_rate * 100).toFixed(0)}%</td>
              <td style={{ color: good ? "var(--text-success)" : "var(--text-danger)" }}>
                ${r.pnl.toFixed(0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
