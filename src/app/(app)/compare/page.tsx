export const metadata = { title: "Compare — OptionScope" };

export default function ComparePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-medium">Compare strategies</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Put up to three strategies side by side on net cost, max profit/loss, break-evens,
        probability of profit, expected value, and return-on-risk. Backed by{" "}
        <code>src/lib/compare.ts</code> (payoff engine + Monte Carlo).
      </p>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--text-muted)]">
        Comparison UI is being wired to the shared engine. In the meantime, analyze individual
        strategies in the{" "}
        <a className="underline text-[var(--text-accent)]" href="/builder">
          strategy builder
        </a>
        .
      </div>
    </div>
  );
}
