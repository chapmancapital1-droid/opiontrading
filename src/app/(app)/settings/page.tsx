"use client";

import { useEffect, useState } from "react";
import {
  loadPersonalAccount,
  savePersonalAccount,
  DEFAULT_PERSONAL_ACCOUNT,
  type PersonalAccountProfile,
  type EquitySource,
} from "@/lib/personalAccount";
import { parseRhPaste, saveRhImport, loadRhImport } from "@/lib/rhImport";
import { getEmpirePhaseLimits, ladderProgress } from "@/knowledge/empirePolicy";

const ENV_ROWS: [string, string, string][] = [
  ["Market data provider", "MARKET_DATA_PROVIDER", "demo | polygon | openbb | alpaca"],
  ["Alpaca key id (server)", "ALPACA_API_KEY_ID", "paper or live — never NEXT_PUBLIC_"],
  ["OpenBB base URL", "OPENBB_BASE_URL", "http://localhost:8000"],
  ["News provider", "NEWS_PROVIDER", "none | openbb"],
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<PersonalAccountProfile>(DEFAULT_PERSONAL_ACCOUNT);
  const [saved, setSaved] = useState(false);
  const [rhText, setRhText] = useState("");
  const [rhMsg, setRhMsg] = useState("");
  const [rhHints, setRhHints] = useState<string[]>([]);

  useEffect(() => {
    setProfile(loadPersonalAccount());
    const prev = loadRhImport();
    if (prev?.summary) setRhMsg(`Last import: ${prev.summary}`);
    if (prev?.processHints) setRhHints(prev.processHints);
  }, []);

  const emp = getEmpirePhaseLimits(profile.manualEquity);
  const ladder = ladderProgress(profile.manualEquity);

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

        <div className="text-xs text-[var(--text-secondary)]">
          Empire phase: <strong>{emp.label}</strong> · risk target{" "}
          {(emp.perTradeRiskPct * 100).toFixed(1)}% · ladder {ladder.from}→{ladder.to} (
          {ladder.pct.toFixed(0)}%)
        </div>
        <p className="text-[11px] text-[var(--text-muted)] m-0">{emp.note}</p>

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

      {/* RH import */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-3">
        <h2 className="text-sm font-medium m-0">Broker history (CSV / paste)</h2>
        <p className="text-xs text-[var(--text-secondary)] m-0">
          Official export or activity paste only. <strong>Never</strong> enter broker passwords here.
          Used for process fix-list hints — optional.
        </p>
        <textarea
          className="w-full text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-2 min-h-[120px]"
          placeholder={"Symbol,Side,Quantity,Price,Date\nAAPL,buy,1,3.50,2026-07-01"}
          value={rhText}
          onChange={(e) => setRhText(e.target.value)}
        />
        <button
          type="button"
          className="self-start text-sm rounded-lg border border-[var(--border)] px-3 py-1.5"
          onClick={() => {
            const result = parseRhPaste(rhText);
            saveRhImport({
              ...result,
              importedAt: new Date().toISOString(),
              sourceNote: "manual_paste",
            });
            setRhMsg(result.summary + (result.errors[0] ? ` · ${result.errors[0]}` : ""));
            setRhHints(result.processHints);
            if (profile.equitySource === "robinhood_paste" && result.rows.length) {
              // optional: don't invent equity from RH CSV
            }
          }}
        >
          Import paste
        </button>
        {rhMsg && <p className="text-xs text-[var(--text-secondary)] m-0">{rhMsg}</p>}
        {rhHints.length > 0 && (
          <ul className="text-[11px] text-[var(--text-warning)] m-0 pl-4 list-disc">
            {rhHints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
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
