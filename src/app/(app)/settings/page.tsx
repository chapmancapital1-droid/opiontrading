"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadPersonalAccount,
  savePersonalAccount,
  DEFAULT_PERSONAL_ACCOUNT,
  type PersonalAccountProfile,
  type EquitySource,
} from "@/lib/personalAccount";
import {
  parseRhPaste,
  saveRhImport,
  loadRhImport,
  rowsToSharesHeld,
  estimateOpenRiskProxy,
  type RhImportRow,
} from "@/lib/rhImport";
import { getEmpirePhaseLimits, ladderProgress } from "@/knowledge/empirePolicy";

const ENV_ROWS: [string, string, string][] = [
  ["Market data provider", "MARKET_DATA_PROVIDER", "demo | polygon | openbb | alpaca"],
  ["Alpaca key id (server)", "ALPACA_API_KEY_ID", "paper or live — never NEXT_PUBLIC_"],
  ["OpenBB base URL", "OPENBB_BASE_URL", "http://localhost:8000"],
  ["News provider", "NEWS_PROVIDER", "none | openbb"],
];

/** Ladder seed presets — one click, no source edits. */
const SEED_PRESETS = [
  { equity: 500, label: "$500", hint: "Seed start" },
  { equity: 1_000, label: "$1,000", hint: "Micro seed" },
  { equity: 5_000, label: "$5,000", hint: "Stage 1 gate" },
] as const;

const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function SettingsPage() {
  const [profile, setProfile] = useState<PersonalAccountProfile>(DEFAULT_PERSONAL_ACCOUNT);
  const [saved, setSaved] = useState(false);
  const [rhText, setRhText] = useState("");
  const [rhMsg, setRhMsg] = useState("");
  const [rhHints, setRhHints] = useState<string[]>([]);
  const [rhErrors, setRhErrors] = useState<string[]>([]);
  const [rhRows, setRhRows] = useState(0);
  const [rhImportedAt, setRhImportedAt] = useState<string | null>(null);
  const [rhSourceNote, setRhSourceNote] = useState<string | null>(null);
  const [sharesPreview, setSharesPreview] = useState<Record<string, number>>({});
  const [riskProxy, setRiskProxy] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(loadPersonalAccount());
    const prev = loadRhImport();
    if (prev) {
      const meta: { importedAt?: string; sourceNote?: string } = {};
      if (prev.importedAt) meta.importedAt = prev.importedAt;
      if (prev.sourceNote) meta.sourceNote = prev.sourceNote;
      applyRhState(prev.rows ?? [], prev.summary ?? "", prev.processHints ?? [], prev.errors ?? [], meta);
    }
  }, []);

  function applyRhState(
    rows: RhImportRow[],
    summary: string,
    hints: string[],
    errors: string[],
    meta?: { importedAt?: string; sourceNote?: string }
  ) {
    setRhMsg(summary);
    setRhHints(hints);
    setRhErrors(errors);
    setRhRows(rows.length);
    setRhImportedAt(meta?.importedAt ?? null);
    setRhSourceNote(meta?.sourceNote ?? null);
    setSharesPreview(rowsToSharesHeld(rows));
    setRiskProxy(estimateOpenRiskProxy(rows));
  }

  function runImport(text: string, sourceNote: string) {
    const result = parseRhPaste(text);
    const importedAt = new Date().toISOString();
    saveRhImport({
      ...result,
      importedAt,
      sourceNote,
    });
    applyRhState(result.rows, result.summary, result.processHints, result.errors, {
      importedAt,
      sourceNote,
    });
    // When source is broker paste, keep equity manual — import never invents equity
    if (result.rows.length && profile.equitySource !== "robinhood_paste") {
      // user can switch source manually; we do not force it
    }
  }

  const emp = getEmpirePhaseLimits(profile.manualEquity);
  const ladder = ladderProgress(profile.manualEquity);

  function applyPreset(equity: number) {
    setProfile((p) => ({
      ...p,
      equitySource: p.equitySource === "alpaca_paper" ? p.equitySource : "manual_seed",
      manualEquity: equity,
      manualCash: equity,
      label: equity <= 500 ? "Empire seed" : equity < 5_000 ? "Empire micro" : "Empire stage-1",
    }));
  }

  const shareLines = Object.entries(sharesPreview)
    .filter(([, q]) => q > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">Settings · Empire seed</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Tell the brain your real equity. Default seed is <strong>$500</strong> — never fake $25k demo
          for ladder work. No Robinhood passwords. Ever.
        </p>
      </div>

      {/* Personal equity */}
      <section className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface-2)] p-4 flex flex-col gap-3">
        <h2 className="text-sm font-medium m-0">Capital truth</h2>

        {/* W1-F02 seed presets */}
        <div>
          <div className="text-xs text-[var(--text-secondary)] mb-1.5">Seed presets (one click)</div>
          <div className="flex flex-wrap gap-2">
            {SEED_PRESETS.map((p) => {
              const active = profile.manualEquity === p.equity;
              return (
                <button
                  key={p.equity}
                  type="button"
                  className={`text-sm rounded-lg border px-3 py-1.5 transition-colors ${
                    active
                      ? "border-[var(--border-accent)] bg-[var(--bg-accent)] text-[var(--text-accent)]"
                      : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:border-[var(--border-accent)]"
                  }`}
                  onClick={() => applyPreset(p.equity)}
                  title={p.hint}
                >
                  {p.label}
                  <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">{p.hint}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] m-0 mt-1.5">
            Sets equity + cash. Default companion path is $500 seed — not $25k demo fiction.
          </p>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <label className="text-xs text-[var(--text-secondary)]">
            Label
            <input
              className="mt-1 w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
              value={profile.label}
              onChange={(e) => setProfile({ ...profile, label: e.target.value })}
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Equity source
            <select
              className="mt-1 w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
              value={profile.equitySource}
              onChange={(e) =>
                setProfile({ ...profile, equitySource: e.target.value as EquitySource })
              }
            >
              <option value="manual_seed">Manual seed (recommended for $500)</option>
              <option value="alpaca_paper">Alpaca paper (live feed)</option>
              <option value="robinhood_paste">Robinhood paste snapshot</option>
            </select>
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Manual equity $
            <input
              type="number"
              min={1}
              className="mt-1 w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
              value={profile.manualEquity}
              onChange={(e) =>
                setProfile({ ...profile, manualEquity: Math.max(1, Number(e.target.value) || 500) })
              }
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Manual cash $
            <input
              type="number"
              min={0}
              className="mt-1 w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5"
              value={profile.manualCash}
              onChange={(e) =>
                setProfile({ ...profile, manualCash: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          <div>
            Empire phase: <strong className="text-[var(--text-primary)]">{emp.label}</strong>
            {" · "}
            risk target {(emp.perTradeRiskPct * 100).toFixed(1)}%
            {" · "}
            hard cap {(emp.perTradeRiskCapPct * 100).toFixed(1)}%
            {" · "}
            max {emp.maxOpenCampaigns} campaigns
          </div>
          <div className="mt-1">
            Ladder {usd(ladder.from)} → {usd(ladder.to)} ({ladder.pct.toFixed(0)}%) · growth{" "}
            <strong>{emp.growthMode}</strong>
            {emp.phase === "seed" ? " · aggressive growth locked out" : ""}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] m-0 mt-1.5 leading-relaxed">{emp.note}</p>
        </div>

        <button
          type="button"
          className="self-start text-sm rounded-lg border border-[var(--border-accent)] bg-[var(--bg-accent)] text-[var(--text-accent)] px-3 py-1.5"
          onClick={() => {
            savePersonalAccount(profile);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
        >
          {saved ? "Saved" : "Save capital profile"}
        </button>
      </section>

      {/* RH import — W1-F03 */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-3">
        <h2 className="text-sm font-medium m-0">Broker history (official export / CSV only)</h2>
        <div
          className="rounded-lg px-3 py-2 text-xs leading-relaxed"
          style={{
            background: "var(--bg-warning, rgba(180,140,40,0.12))",
            border: "1px solid var(--border-warning, var(--border))",
            color: "var(--text-secondary)",
          }}
        >
          <strong className="text-[var(--text-primary)]">Doctrine:</strong> Official Robinhood
          export or activity CSV / paste only.{" "}
          <strong className="text-[var(--text-danger)]">Never passwords. Never 2FA. Never “connect Robinhood.”</strong>{" "}
          RH import is <em>user-provided</em> — not live broker sync. Equity stays manual (or Alpaca
          paper); paste is for process audit + optional share detection.
        </div>

        <textarea
          className="w-full text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-2 min-h-[120px]"
          placeholder={"Symbol,Side,Quantity,Price,Date\nAAPL,buy,100,185.00,2026-07-01"}
          value={rhText}
          onChange={(e) => setRhText(e.target.value)}
          aria-label="Robinhood export paste"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            className="text-sm rounded-lg border border-[var(--border)] px-3 py-1.5"
            onClick={() => runImport(rhText, "manual_paste")}
          >
            Import paste
          </button>
          <button
            type="button"
            className="text-sm rounded-lg border border-[var(--border)] px-3 py-1.5"
            onClick={() => fileRef.current?.click()}
          >
            Choose CSV file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 500_000) {
                setRhMsg("File too large (max 500KB). Split the export.");
                setRhErrors(["File too large (max 500KB)."]);
                e.target.value = "";
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const text = String(reader.result ?? "");
                setRhText(text);
                runImport(text, `csv_file:${file.name}`);
              };
              reader.readAsText(file);
              e.target.value = "";
            }}
          />
          {profile.equitySource !== "robinhood_paste" && (
            <button
              type="button"
              className="text-xs rounded-lg border border-[var(--border-accent)] px-2 py-1.5 text-[var(--text-accent)]"
              onClick={() =>
                setProfile((p) => ({ ...p, equitySource: "robinhood_paste" as EquitySource }))
              }
            >
              Set source → Broker paste
            </button>
          )}
        </div>

        {/* Import result surface */}
        {(rhMsg || rhRows > 0 || rhErrors.length > 0) && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 flex flex-col gap-2 text-xs">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="os-badge os-badge-accent">{rhRows} row(s)</span>
              {rhImportedAt && (
                <span className="text-[var(--text-muted)]">
                  Imported {new Date(rhImportedAt).toLocaleString()}
                </span>
              )}
              {rhSourceNote && (
                <span className="text-[var(--text-muted)]">· {rhSourceNote}</span>
              )}
            </div>
            {rhMsg && (
              <p className="m-0 text-[var(--text-secondary)]">
                <strong>Summary:</strong> {rhMsg}
              </p>
            )}
            {rhErrors.length > 0 && (
              <div>
                <div className="text-[var(--text-danger)] font-medium mb-0.5">Errors</div>
                <ul className="m-0 pl-4 list-disc text-[var(--text-danger)]">
                  {rhErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            {shareLines.length > 0 && (
              <div>
                <div className="font-medium text-[var(--text-primary)] mb-0.5">
                  Shares detected (best-effort, not live sync)
                </div>
                <p className="m-0 text-[var(--text-secondary)]">
                  {shareLines.map(([sym, q]) => `${sym} ${q}`).join(" · ")}
                </p>
              </div>
            )}
            {riskProxy > 0 && (
              <p className="m-0 text-[var(--text-muted)]">
                Open risk proxy (qty×price when present): {usd(riskProxy)} — rough only.
              </p>
            )}
            {rhHints.length > 0 && (
              <div>
                <div className="text-[var(--text-warning)] font-medium mb-0.5">Process hints</div>
                <ul className="m-0 pl-4 list-disc text-[var(--text-warning)]">
                  {rhHints.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Server env reference */}
      <section>
        <h2 className="text-sm font-medium mb-2">Server env (reference)</h2>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="p-3 font-medium">Setting</th>
                <th className="p-3 font-medium">Env var</th>
                <th className="p-3 font-medium">Values</th>
              </tr>
            </thead>
            <tbody>
              {ENV_ROWS.map(([label, env, vals]) => (
                <tr key={env} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3">{label}</td>
                  <td className="p-3">
                    <code>{env}</code>
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">{vals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
