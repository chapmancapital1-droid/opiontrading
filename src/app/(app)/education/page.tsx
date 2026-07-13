import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = { title: "Education — OptionScope" };

export default function EducationPage() {
  return (
    <article className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-medium">Education &amp; risk</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Personal field manual for the empire companion. Process over prediction. See · Trust · Own.
        </p>
      </div>

      <section className="rounded-xl border border-[var(--border-warning)] bg-[var(--bg-warning)] p-4">
        <h2 className="text-base font-medium text-[var(--text-warning)]">Read this first</h2>
        <ul className="text-sm text-[var(--text-warning)] list-disc pl-5 space-y-1 mt-2">
          <li>Options involve significant risk and are not suitable for every investor.</li>
          <li>You can lose the entire premium. Some structures can lose more than the debit paid.</li>
          <li>
            <strong>Model PoP / EV are estimates</strong> under assumptions — not guarantees.
          </li>
          <li>
            <strong>Delta is not probability of profit.</strong>
          </li>
          <li>This app does not place trades. You own every fill.</li>
          <li>Educational tool for your process — not personalized advice to others.</li>
        </ul>
      </section>

      <Concept title="Capital ladder (empire)">
        Seed (~$500) → Stage 1 ($5k) → Stage 2 ($25k). At seed, 1% risk is tiny — many 1-lots correctly
        size to <strong>zero</strong>. Prefer defined-risk micro structures. Cash-secured puts often need
        strike × 100 in cash — usually impossible at $500. Survival beats boldness.
      </Concept>

      <Concept title="Daily ritual">
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            <Link className="underline text-[var(--text-accent)]" href="/dashboard">
              Command
            </Link>{" "}
            — ladder, account truth, journal pulse
          </li>
          <li>
            <Link className="underline text-[var(--text-accent)]" href="/builder">
              Trade Lab
            </Link>{" "}
            — live chain, brain ranks, payoff, model MC, order checklist
          </li>
          <li>
            <Link className="underline text-[var(--text-accent)]" href="/journal">
              Journal
            </Link>{" "}
            — plan before entry; close with realized P/L
          </li>
          <li>
            <Link className="underline text-[var(--text-accent)]" href="/compare">
              Compare
            </Link>{" "}
            — side-by-side structures under same assumptions
          </li>
        </ol>
      </Concept>

      <Concept title="Core structures (plain English)">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Long call / put</strong> — buy premium; risk = debit; needs directional move.
          </li>
          <li>
            <strong>Vertical debit</strong> — buy one option, sell another same type; defined risk/reward.
          </li>
          <li>
            <strong>Vertical credit</strong> — sell premium with a wing; defined risk; thrives when IV
            elevated and underlying cooperates.
          </li>
          <li>
            <strong>Iron condor</strong> — credit put spread + credit call spread; range thesis.
          </li>
          <li>
            <strong>CSP / covered call</strong> — capital-heavy; assignment path; often later-stage.
          </li>
          <li>
            <strong>Money Press calendars</strong> — sell near-term premium, buy further same strike;
            harvest front theta while the long hedges. Usually net debit; max loss ≈ debit. Use Trade Lab
            → Strategy group <em>Money Press</em>.
          </li>
        </ul>
      </Concept>

      <Concept title="Greeks in one breath">
        <strong>Δ</strong> price sensitivity · <strong>Γ</strong> how delta changes · <strong>Θ</strong>{" "}
        time decay · <strong>ν (vega)</strong> IV sensitivity · <strong>ρ</strong> rates. Never treat
        absolute delta as win probability.
      </Concept>

      <Concept title="What the brain does">
        Market context (IV, trend, liquidity, events) + book rules + optional chart bias → rank and size
        under empire policy → you verify checklist and execute elsewhere manually.
      </Concept>

      <Concept title="Full written guide">
        Longer personal curriculum:{" "}
        <code className="text-xs">docs/empire/book/01-OPTIONS-EDUCATION-GUIDE.md</code> in the repo.
        Graphic prompts for dashboards:{" "}
        <code className="text-xs">docs/empire/book/02-FEATURE-GRAPHICS-PROMPT-BOOK.md</code>.
      </Concept>

      <p className="text-sm">
        Industry disclosure:{" "}
        <a
          className="underline"
          href="https://www.theocc.com/company-information/documents-and-archives/options-disclosure-document"
          target="_blank"
          rel="noreferrer"
        >
          Characteristics and Risks of Standardized Options (OCC)
        </a>
        .
      </p>
    </article>
  );
}

function Concept({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <h2 className="text-base font-medium mb-2">{title}</h2>
      <div className="text-sm text-[var(--text-secondary)] space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}
