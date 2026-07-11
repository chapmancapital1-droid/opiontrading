export const metadata = { title: "Saved trades — OptionScope" };

export default function SavedPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-medium">Saved trades</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Saved analyses you can reopen, tweak, and turn into a Robinhood order checklist.
      </p>
      <div className="rounded-xl border border-[var(--border-warning)] bg-[var(--bg-warning)] p-4 text-sm text-[var(--text-warning)]">
        Connect Supabase to persist saved trades (see Settings and{" "}
        <code>docs/OPENBB_SETUP.md</code> for data setup).
      </div>
    </div>
  );
}
