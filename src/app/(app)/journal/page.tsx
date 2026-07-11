export const metadata = { title: "Trade journal — OptionScope" };

export default function JournalPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-medium">Trade journal</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Log opening and closing fills, then score the original probability forecast against the
        realized outcome. Persistence is backed by Supabase (<code>src/db/journalRepo.ts</code>).
      </p>
      <div className="rounded-xl border border-[var(--border-warning)] bg-[var(--bg-warning)] p-4 text-sm text-[var(--text-warning)]">
        Connect Supabase to enable the journal — set <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and <code>SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
        <code>.env.local</code>.
      </div>
    </div>
  );
}
