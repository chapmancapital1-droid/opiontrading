import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = { title: "Education — OptionScope" };

/**
 * In-app field manual: how to use every nav surface + Command tabs.
 * Companion to docs/training/OPTIONSCOPE_VIDEO_EDUCATION_PACK.txt
 */

export default function EducationPage() {
  return (
    <article className="space-y-6 max-w-3xl pb-12">
      <div>
        <h1 className="text-2xl font-medium m-0">Education · How to use OptionScope</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Tab-by-tab operating manual for your empire companion. Process over prediction. See · Trust ·
          Own. Goal path: seed capital → <strong>$20,000</strong> with defined-risk discipline.
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-2 m-0">
          Recording pack (avatar + screen-share scripts):{" "}
          <code className="text-[11px]">docs/training/OPTIONSCOPE_VIDEO_EDUCATION_PACK.txt</code>
        </p>
      </div>

      <section className="rounded-xl border border-[var(--border-warning)] bg-[var(--bg-warning)] p-4">
        <h2 className="text-base font-medium text-[var(--text-warning)] m-0">Read this first</h2>
        <ul className="text-sm text-[var(--text-warning)] list-disc pl-5 space-y-1 mt-2 mb-0">
          <li>Options involve significant risk; you can lose the full premium (or more on some structures).</li>
          <li>
            <strong>Model PoP / EV / Fit%</strong> are estimates under assumptions — not guarantees.
          </li>
          <li>
            <strong>Delta is not probability of profit.</strong>
          </li>
          <li>
            OptionScope does <strong>not</strong> place trades. You execute on Robinhood (or broker)
            after checklist.
          </li>
          <li>Educational process tool — not personalized advice for third parties.</li>
        </ul>
      </section>

      <Concept title="5-minute daily ritual (seed → $20k)">
        <ol className="list-decimal pl-5 space-y-1.5 mb-0">
          <li>
            <Link className="underline text-[var(--text-accent)]" href="/dashboard">
              Command → Bias
            </Link>{" "}
            — NCI direction co-pilot for your ticker (not autopilot).
          </li>
          <li>
            <Link className="underline text-[var(--text-accent)]" href="/scanner">
              Scanner
            </Link>{" "}
            — filter by strategy; shortlist ≤15 names in $8–$150 (or your band).
          </li>
          <li>
            <Link className="underline text-[var(--text-accent)]" href="/builder">
              Trade Lab
            </Link>{" "}
            — Recommend, lock structure, model PoP/EV, order checklist.
          </li>
          <li>
            <Link className="underline text-[var(--text-accent)]" href="/dashboard">
              Command → Lessons
            </Link>{" "}
            — check your RH history coach before repeating a mistake.
          </li>
          <li>
            <Link className="underline text-[var(--text-accent)]" href="/journal">
              Journal
            </Link>{" "}
            — plan before entry; close with realized P/L after.
          </li>
          <li className="text-[var(--text-muted)]">
            Optional (off-hours / weekend):{" "}
            <Link className="underline text-[var(--text-accent)]" href="/evolve">
              Evolve
            </Link>{" "}
            — synthetic self-improve lab to stress-test rules (not live signals).
          </li>
        </ol>
      </Concept>

      {/* ═══════════ NAV SURFACES ═══════════ */}
      <h2 className="text-lg font-medium m-0 pt-2 border-t border-[var(--border)] pt-4">
        Navigation surfaces (left sidebar)
      </h2>

      <HowTo
        title="Command (main dashboard)"
        href="/dashboard"
        summary="Mission control: market, brain, SPY playbook, bias, lessons, playbooks."
      >
        <Sub title="Header controls">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>
              <strong>Symbol box + Load</strong> — set ticker (e.g. <code>SOFI</code>,{" "}
              <code>AMEX:SPY</code>). Loading <strong>SPY</strong> auto-opens the SPY tab.
            </li>
            <li>
              <strong>SPY button</strong> — jumps to SPY advanced 1DTE playbook.
            </li>
            <li>
              <strong>Strategy filter</strong> — opens Scanner (Finviz-for-options shortlist).
            </li>
          </ul>
        </Sub>
        <Sub title="Tab: Cockpit">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>
              <strong>Command ritual</strong> — account truth, seed ladder pulse, RH import status.
            </li>
            <li>
              <strong>Market snapshot / context</strong> — price, IV context, notes for the symbol.
            </li>
            <li>
              <strong>TradingView chart + news timeline</strong> — visual PA + headlines; you still own
              the trade decision.
            </li>
            <li>
              <strong>Quick links</strong> — Scanner, Trade Lab,{" "}
              <Link className="underline text-[var(--text-accent)]" href="/evolve">
                Evolve Lab
              </Link>
              , Library, Journal, Education.
            </li>
          </ul>
        </Sub>
        <Sub title="Tab: Bias">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>
              <strong>NCI direction bias</strong> for any loaded ticker — SuperBias, ports, 15 voters,
              Master BULL/BEAR/FLAT, ARM/FIRE language from your forex trade assistant.
            </li>
            <li>
              <strong>FIRE gates SOFT FAIL</strong> — forex-style filters (ADX, FER, Kinetic, ABC).
              They do <em>not</em> hard-block options. Use as caution for directional trades; credit
              structures often like quieter regimes.
            </li>
            <li>
              <strong>Recompute</strong> — refresh engine from quote-seeded bars (or webhook store if
              you send TV alerts).
            </li>
            <li>
              Use: confirm chart bias before Trade Lab Recommend — never as “buy now.”
            </li>
          </ul>
        </Sub>
        <Sub title="Tab: SPY">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>
              <strong>Bias switcher</strong> (bullish / neutral / bearish) reshapes high-POP strike
              guides (≤4).
            </li>
            <li>
              <strong>When / when-not</strong>, safe/cheap structures (credit spreads, IC), adjustment
              ladder (long → debit spread at −40%).
            </li>
            <li>
              <strong>Live brain panel</strong> injects SPY advanced instructions on every rec when
              symbol is SPY.
            </li>
            <li>
              Use: SPY/1DTE days only with checklist; prefer defined-risk for seed capital.
            </li>
          </ul>
        </Sub>
        <Sub title="Tab: Lessons">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>
              Lessons from <strong>your Robinhood history</strong> (activity CSVs in{" "}
              <code>robinhoodhistory</code>).
            </li>
            <li>
              Shows win rate, long vs short premium stats, worst/best symbols, assignment/expiration
              patterns, “how you could do better,” build-on-wins.
            </li>
            <li>
              <strong>Coach for current symbol</strong> when that ticker appears in history.
            </li>
            <li>
              Re-run learner after new exports:{" "}
              <code className="text-[11px]">python -m ota.rh_history_learn</code>
            </li>
          </ul>
        </Sub>
        <Sub title="Tab: Brain">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>
              <strong>Profit charter</strong> — empire co-pilot rules (defined risk when small).
            </li>
            <li>
              <strong>Recommend panel</strong> — ranks structures from market context + book rules +
              NCI + RH soft coach; sizes under empire caps.
            </li>
            <li>
              Open details on a rec: why ranked, entry/exit, Robinhood next step (manual).
            </li>
            <li>
              SPY search adds advanced instruction block. Size 0 = honesty (cash/risk ceiling) — not a
              bug.
            </li>
          </ul>
        </Sub>
        <Sub title="Tab: Library (Command mini)">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>Quick status of ingested book/rules count; link to full Library nav.</li>
          </ul>
        </Sub>
        <Sub title="Tab: Playbook">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>
              <strong>Pre-trade form</strong> — thesis, max loss, DTE, exit plan, event clear, size.
              Save locally before entry.
            </li>
            <li>
              <strong>Post-trade form</strong> — realized P/L, what worked/failed, rule to keep.
            </li>
            <li>
              Optional <strong>TradingAgents / VibeTrading skill PR</strong> forms for research
              governance (not live RH execution).
            </li>
          </ul>
        </Sub>
      </HowTo>

      <HowTo
        title="Trade Lab"
        href="/builder"
        summary="Where structures become numbers: chain, templates, brain, payoff, MC, checklist."
      >
        <ul className="list-disc pl-5 space-y-1 mb-0">
          <li>
            <strong>Symbol + DTE / IV sliders</strong> — scenario context for the model.
          </li>
          <li>
            <strong>Strategy templates</strong> — credit/debit verticals, condor, CSP, Money Press,
            etc.
          </li>
          <li>
            <strong>Recommend</strong> — brain ranks → apply legs → model backtest (PoP/EV window).
          </li>
          <li>
            <strong>Payoff / Greeks panels</strong> — expiration P/L shape and aggregate Greeks.
          </li>
          <li>
            <strong>Order checklist</strong> — strikes, max loss, collateral; copy process to broker
            manually.
          </li>
          <li>
            <strong>Calc engine badge</strong> — Domain vs Diagonal UI for multi-DTE Money Press.
          </li>
          <li>
            Seed rule: if size is 0, structure needs too much capital — switch to defined-risk micro
            or smaller width.
          </li>
        </ul>
      </HowTo>

      <HowTo
        title="Scanner (Strategy filter)"
        href="/scanner"
        summary="Finviz-for-options: strategy chip → ≤15 tickers that fit price band + thesis."
      >
        <ul className="list-disc pl-5 space-y-1 mb-0">
          <li>
            Left rail: pick strategy group (credit, debit, directional, Money Press…).
          </li>
          <li>
            <strong>Price range</strong> default $8–$150 (editable). Raise max for mega-caps/SPY.
          </li>
          <li>
            <strong>Bias</strong> any / bullish / bearish / neutral filters thesis mismatch.
          </li>
          <li>
            <strong>Seed → $20k mode</strong> boosts defined-risk; soft-penalizes naked lottery longs.
          </li>
          <li>
            <strong>RH lessons</strong> soft coach from your history.
          </li>
          <li>
            Table: Fit%, trend proxy, IVR proxy, risk label. Click row → reasons →{" "}
            <strong>Open Trade Lab</strong>.
          </li>
          <li>
            Honest empty/short lists: app never pads to 15 with junk tickers.
          </li>
        </ul>
      </HowTo>

      <HowTo
        title="Evolve Lab (primary tab · flask icon)"
        href="/evolve"
        summary="Scientific-method self-improve lab (workspace-0890ad1c). Synthetic markets only — not live trade signals."
      >
        <Sub title="Where to open it">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>
              Left sidebar (desktop): <strong>Evolve</strong> between Scanner and Library.
            </li>
            <li>
              Mobile tab bar: short label <strong>Evo</strong>.
            </li>
            <li>
              Direct URL:{" "}
              <code className="text-[11px]">http://localhost:3000/evolve</code>
            </li>
            <li>
              Command cockpit <strong>quick links</strong> also point here. (The old buried
              Command “Test” tab was promoted into this first-class tool.)
            </li>
          </ul>
        </Sub>
        <Sub title="What it is (honest)">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>
              A <strong>synthetic stress laboratory</strong> that evolves strategy “genomes”
              (risk / entry / exit / model weights) across fake markets: bull, bear, crisis,
              sideways.
            </li>
            <li>
              Uses the scientific method as a pipeline:{" "}
              <strong>Observe → Hypothesize → Experiment → Analyze → Iterate</strong>.
            </li>
            <li>
              “400 years” (or market-years sliders) means <em>simulated</em> years for stress —
              <strong>not</strong> 400 years of real SPY history.
            </li>
            <li>
              <strong>Champion genomes are lab artifacts</strong> — they do not place orders and
              are not live “buy this strike” signals.
            </li>
            <li>
              No broker connection inside Evolve. No auto-trade. Ever.
            </li>
          </ul>
        </Sub>
        <Sub title="How the UI works (step by step)">
          <ol className="list-decimal pl-5 space-y-1.5 mb-0">
            <li>
              Pick <strong>DTE band</strong> (e.g. 0–1, 5, 30) — filters which strategy templates
              appear for that horizon.
            </li>
            <li>
              Pick a <strong>strategy</strong> (credit spread, iron condor, etc.) and a{" "}
              <strong>ticker profile</strong> (SPY, QQQ, …) used only for synthetic path stats.
            </li>
            <li>
              Set lab knobs: <strong>generations</strong>, <strong>population size</strong>,{" "}
              <strong>market years</strong>, <strong>eval years</strong>. Smaller = faster smoke;
              larger = slower, richer evolution.
            </li>
            <li>
              Click <strong>Run evolution</strong>. The pipeline stages light up while an SSE
              stream (<code className="text-[11px]">/api/testlab/evolve</code>) reports progress.
            </li>
            <li>
              Watch charts: fitness / Sharpe by generation, champion equity curve, regime
              breakdown when available.
            </li>
            <li>
              Read the champion card: edge, win rate, Kelly-style size hint, drawdown —{" "}
              <em>as lab metrics</em>, not as permission to size real capital.
            </li>
          </ol>
        </Sub>
        <Sub title="How it fits your live money loop">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>
              <strong>Off-hours:</strong> run Evolve to see which risk knobs survive crisis regimes.
            </li>
            <li>
              <strong>Do not</strong> copy champion strikes into Robinhood. There are no live
              strikes here.
            </li>
            <li>
              Take only <em>process lessons</em> (tighter risk, prefer defined-risk, avoid
              over-leverage) → then open{" "}
              <Link className="underline text-[var(--text-accent)]" href="/builder">
                Trade Lab
              </Link>{" "}
              with <strong>live Alpaca data</strong> and size from{" "}
              <strong>your real equity</strong> in Settings.
            </li>
            <li>
              Offline twin (optional): <code className="text-[11px]">python/ota</code> and{" "}
              <code className="text-[11px]">TRADING_BRAIN_LOCAL</code> self-improve scripts — same
              idea, CLI.
            </li>
          </ul>
        </Sub>
        <Sub title="When NOT to use Evolve">
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>During a live entry session when you need real marks — use Trade Lab + checklist.</li>
            <li>As proof a structure “always wins” — synthetic edge can overfit the generator.</li>
            <li>As a substitute for journaling real RH outcomes.</li>
          </ul>
        </Sub>
      </HowTo>

      <HowTo
        title="Library"
        href="/library"
        summary="Searchable catalog of book/rule ingest — sources for brain ranking."
      >
        <ul className="list-disc pl-5 space-y-1 mb-0">
          <li>Browse strategy rules and book notes the selector can cite.</li>
          <li>Use to understand <em>why</em> a structure is preferred — not as a hot tip list.</li>
          <li>Copyrighted book text is not dumped raw; structured rules are.</li>
        </ul>
      </HowTo>

      <HowTo
        title="Compare"
        href="/compare"
        summary="Side-by-side structures under the same spot/IV/time assumptions."
      >
        <ul className="list-disc pl-5 space-y-1 mb-0">
          <li>Load up to a few candidates; compare payoff + Monte Carlo stats.</li>
          <li>Use after Scanner shortlist to pick one structure family before Lab sizing.</li>
        </ul>
      </HowTo>

      <HowTo
        title="Journal"
        href="/journal"
        summary="Plan → open → close. Forecast vs outcome. The growth engine for $20k."
      >
        <ul className="list-disc pl-5 space-y-1 mb-0">
          <li>Write the plan <em>before</em> the fill (max loss, thesis, exit).</li>
          <li>Close with realized P/L and what you will repeat or ban.</li>
          <li>Feeds process honesty; pairs with Lessons from RH history.</li>
        </ul>
      </HowTo>

      <HowTo
        title="Saved"
        href="/saved"
        summary="Local saved analyses — revisit structures without re-building from scratch."
      >
        <ul className="list-disc pl-5 space-y-1 mb-0">
          <li>Store named analyses on this device (local storage).</li>
          <li>Not cloud sync — export notes if you need backup.</li>
        </ul>
      </HowTo>

      <HowTo
        title="Settings"
        href="/settings"
        summary="Seed equity, theme, RH paste import, Alpaca paper, personal account truth."
      >
        <ul className="list-disc pl-5 space-y-1 mb-0">
          <li>
            <strong>Manual seed equity/cash</strong> — drives empire sizing (1% risk, hard ceilings).
          </li>
          <li>
            <strong>Robinhood paste/CSV import</strong> — positions/activity for sharesHeld + coach
            (never password / never live RH login).
          </li>
          <li>
            <strong>Alpaca paper</strong> — optional equity source when keys configured.
          </li>
          <li>
            Theme light/dark. Keep production mock flags off for real money mindset.
          </li>
        </ul>
      </HowTo>

      <HowTo
        title="Education (this page)"
        href="/education"
        summary="Risk, capital ladder, how-to for every surface, structure plain English."
      >
        <ul className="list-disc pl-5 space-y-1 mb-0">
          <li>Start here when onboarding someone (or recording tutorials).</li>
          <li>
            Full video pack:{" "}
            <code className="text-[11px]">docs/training/OPTIONSCOPE_VIDEO_EDUCATION_PACK.txt</code>
          </li>
        </ul>
      </HowTo>

      {/* ═══════════ CONCEPTS ═══════════ */}
      <h2 className="text-lg font-medium m-0 pt-2 border-t border-[var(--border)] pt-4">
        Core concepts
      </h2>

      <Concept title="Evolve vs Trade Lab (do not mix them up)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-1.5 pr-3 font-medium"></th>
                <th className="py-1.5 pr-3 font-medium">
                  <Link className="underline text-[var(--text-accent)]" href="/evolve">
                    Evolve
                  </Link>
                </th>
                <th className="py-1.5 font-medium">
                  <Link className="underline text-[var(--text-accent)]" href="/builder">
                    Trade Lab
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-secondary)]">
              <tr className="border-b border-[var(--border)]">
                <td className="py-1.5 pr-3 font-medium text-[var(--text-primary)]">Data</td>
                <td className="py-1.5 pr-3">Synthetic regimes</td>
                <td className="py-1.5">Live / demo option chain</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-1.5 pr-3 font-medium text-[var(--text-primary)]">Output</td>
                <td className="py-1.5 pr-3">Champion genome metrics</td>
                <td className="py-1.5">Strikes, PoP/EV, checklist</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-1.5 pr-3 font-medium text-[var(--text-primary)]">Use when</td>
                <td className="py-1.5 pr-3">Study risk rules offline</td>
                <td className="py-1.5">Before a real or paper fill</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 font-medium text-[var(--text-primary)]">Broker</td>
                <td className="py-1.5 pr-3">Never</td>
                <td className="py-1.5">Manual checklist only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Concept>

      <Concept title="Capital ladder (empire)">
        Seed (~$500–few k) → Stage 1 (~$5k) → Stage 2 (~$20–25k). At seed, 1% risk is tiny — many
        1-lots correctly size to <strong>zero</strong>. Prefer defined-risk micro spreads. Cash-secured
        puts need strike × 100 — often impossible early. Survival beats boldness.
      </Concept>

      <Concept title="Core structures (plain English)">
        <ul className="list-disc pl-5 space-y-1 mb-0">
          <li>
            <strong>Long call / put</strong> — buy premium; risk ≈ debit; needs direction (your RH
            history often struggled here).
          </li>
          <li>
            <strong>Vertical debit</strong> — buy one, sell another; defined risk/reward.
          </li>
          <li>
            <strong>Vertical credit</strong> — sell premium with a wing; defined risk; thrives when IV
            elevated and underlying cooperates.
          </li>
          <li>
            <strong>Iron condor</strong> — put credit + call credit; range thesis.
          </li>
          <li>
            <strong>CSP / covered call</strong> — capital-heavy; assignment path; later-stage.
          </li>
          <li>
            <strong>Money Press (put diagonal)</strong> — weekly short put + longer protection put;
            Trade Lab Money Press template.
          </li>
        </ul>
      </Concept>

      <Concept title="Greeks in one breath">
        <strong>Δ</strong> price sensitivity · <strong>Γ</strong> delta change · <strong>Θ</strong>{" "}
        time decay · <strong>ν</strong> IV · <strong>ρ</strong> rates. Never treat |delta| as win
        probability.
      </Concept>

      <Concept title="What the brain does">
        Market context + book rules + NCI bias + RH soft coach → rank and size under empire policy →
        you verify checklist and execute manually elsewhere.
      </Concept>

      <Concept title="NCI FIRE gates vs options">
        Gates (ADX, FER, Kinetic, ABC, session) come from the forex assistant. On options they are{" "}
        <strong>soft context</strong> for directional FIRE-style bias — not a hard “no options today”
        switch. Premium selling can still make sense when FIRE gates fail.
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
      <h2 className="text-base font-medium m-0">{title}</h2>
      <div className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{children}</div>
    </section>
  );
}

function HowTo({
  title,
  href,
  summary,
  children,
}: {
  title: string;
  href: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-medium m-0">{title}</h2>
        <Link
          href={href}
          className="text-xs text-[var(--text-accent)] underline underline-offset-2"
        >
          Open →
        </Link>
      </div>
      <p className="text-xs text-[var(--text-muted)] m-0 mt-1">{summary}</p>
      <div className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-[var(--text-primary)] m-0 mb-1">{title}</h3>
      {children}
    </div>
  );
}
