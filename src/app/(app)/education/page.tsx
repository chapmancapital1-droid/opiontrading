export default function EducationPage() {
  return (
    <article className="prose-sm max-w-none space-y-6">
      <h1 className="text-2xl font-medium">Education & risk disclosures</h1>

      <section className="rounded-xl border border-[var(--border-warning)] bg-[var(--bg-warning)] p-4">
        <h2 className="text-base font-medium text-[var(--text-warning)]">Read this first</h2>
        <ul className="text-sm text-[var(--text-warning)] list-disc pl-5 space-y-1 mt-2">
          <li>Options involve significant risk and are not suitable for every investor.</li>
          <li>You can lose the entire premium paid. Some strategies can lose more than the initial amount.</li>
          <li>Probability figures are model estimates based on the assumptions you select — not guarantees.</li>
          <li>Implied volatility, liquidity, interest rates, dividends, and prices change constantly.</li>
          <li>Simulated results are not actual results.</li>
          <li>This product does not provide personalized investment, legal, or tax advice.</li>
          <li>Not affiliated with or endorsed by Robinhood.</li>
        </ul>
      </section>

      <Concept title="Probability of profit is an estimate, not a promise">
        We simulate thousands of possible ending prices and count how many make money under
        the full strategy payoff. Change the volatility or expected-return assumption and the
        number changes. Always read it alongside expected value and the confidence interval.
      </Concept>

      <Concept title="Delta is not your win probability">
        Delta measures price sensitivity. Under some assumptions it approximates the chance of
        finishing in the money, but it is not the probability of profit, of being touched, or of
        assignment. We show those as separate metrics.
      </Concept>

      <Concept title="A credit is not free money">
        Selling premium collects cash today but takes on obligation. Rolling a losing option
        realizes the loss even when you collect a new credit — we show the realized loss and the
        cumulative result separately so the ledger stays honest.
      </Concept>

      <Concept title="A wide profit zone is not low risk">
        Range strategies like iron condors can still suffer from gaps, volatility expansion,
        illiquidity, early assignment, and pin risk. Probability and expected value belong together.
      </Concept>

      <p className="text-sm">
        Full options risk disclosure:{" "}
        <a className="underline" href="https://www.theocc.com/company-information/documents-and-archives/options-disclosure-document" target="_blank" rel="noreferrer">
          Characteristics and Risks of Standardized Options (OCC)
        </a>.
      </p>
    </article>
  );
}
function Concept({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-medium">{title}</h2>
      <p className="text-sm text-[var(--text-secondary)] mt-1">{children}</p>
    </section>
  );
}
