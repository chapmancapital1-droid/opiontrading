export const metadata = { title: "Settings — OptionScope" };

const ROWS: [string, string, string][] = [
  ["Market data provider", "MARKET_DATA_PROVIDER", "demo | polygon | openbb"],
  ["OpenBB base URL", "OPENBB_BASE_URL", "http://localhost:8000"],
  ["OpenBB downstream provider", "OPENBB_API_PROVIDER", "cboe (free), polygon, tradier, …"],
  ["News provider", "NEWS_PROVIDER", "none | openbb"],
  ["Supabase URL", "NEXT_PUBLIC_SUPABASE_URL", "for journal & saved trades"],
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-medium">Settings</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Data sources are configured via server-side environment variables (never exposed to the
        browser). See <code>.env.example</code> and <code>docs/OPENBB_SETUP.md</code>.
      </p>
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
            {ROWS.map(([label, env, vals]) => (
              <tr key={env} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3">{label}</td>
                <td className="p-3"><code>{env}</code></td>
                <td className="p-3 text-[var(--text-secondary)]">{vals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
