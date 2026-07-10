/* ============================================================================
   OPTIONSCOPE — MESSAGE 7 of 7
   Order Checklist · Compare · Journal dashboard · Education · App shell · README

   Split each section into the path in its banner: ===== FILE: path =====
   Depends on Messages 1-6.
   ============================================================================ */


/* ============================================================================
   ===== FILE: src/lib/orderChecklist.ts =====
   Build a Robinhood-ready order checklist from an analyzed strategy.
   NO "Place Trade" action — this is a manual-verification artifact only.
   ============================================================================ */

import type { Leg, OptionLeg } from "@/domain/types";
import type { ForecastSnapshot } from "@/db/types";

export interface ChecklistLegLine {
  action: "Buy to open" | "Sell to open";
  optionType: "call" | "put" | "stock";
  strike: number | null;
  quantity: number;
  expiration: string | null;
}

export interface OrderChecklist {
  underlying: string;
  strategyName: string;
  contracts: number;              // spreads / contract count
  expiration: string | null;
  legs: ChecklistLegLine[];
  netLimitPerShare: number;       // + credit / - debit
  netLimitLabel: string;          // "Net credit $1.40" | "Net debit $3.10"
  estTotal: number;
  maxModeledLoss: number | "undefined";
  estCollateral: number | null;
  breakEvens: number[];
  quoteTimestamp: string | null;
  plannedProfitTarget: number | null;
  plannedLossLimit: number | null;
  plannedExitDate: string | null;
  reviewConfirmedLabel: string;   // the checkbox text
}

function legLine(l: Leg): ChecklistLegLine {
  if (l.assetType === "stock") {
    return { action: l.side === "long" ? "Buy to open" : "Sell to open", optionType: "stock", strike: null, quantity: l.shares, expiration: null };
  }
  const o = l as OptionLeg;
  return {
    action: o.side === "long" ? "Buy to open" : "Sell to open",
    optionType: o.optionType, strike: o.strike, quantity: o.contracts, expiration: o.expiration,
  };
}

export function buildChecklist(args: {
  underlying: string;
  strategyName: string;
  legs: Leg[];
  netCashFlow: number;            // dollars, + credit / - debit
  perShareNet: number;            // + credit / - debit per share
  maxLoss: number | "undefined";
  collateral: number | null;
  breakEvens: number[];
  quoteTimestamp: string | null;
  forecast?: ForecastSnapshot;
  plannedProfitTarget?: number | null;
  plannedLossLimit?: number | null;
  plannedExitDate?: string | null;
}): OrderChecklist {
  const optionLegs = args.legs.filter((l): l is OptionLeg => l.assetType === "option");
  const contracts = optionLegs.length ? Math.min(...optionLegs.map((l) => l.contracts)) : 1;
  const expiration = optionLegs[0]?.expiration ?? null;
  const credit = args.perShareNet >= 0;

  return {
    underlying: args.underlying,
    strategyName: args.strategyName,
    contracts,
    expiration,
    legs: args.legs.map(legLine),
    netLimitPerShare: Number(Math.abs(args.perShareNet).toFixed(2)),
    netLimitLabel: `${credit ? "Net credit" : "Net debit"} $${Math.abs(args.perShareNet).toFixed(2)} / share`,
    estTotal: Number(Math.abs(args.netCashFlow).toFixed(2)),
    maxModeledLoss: args.maxLoss,
    estCollateral: args.collateral,
    breakEvens: args.breakEvens,
    quoteTimestamp: args.quoteTimestamp,
    plannedProfitTarget: args.plannedProfitTarget ?? null,
    plannedLossLimit: args.plannedLossLimit ?? null,
    plannedExitDate: args.plannedExitDate ?? null,
    reviewConfirmedLabel: "I reviewed the order details in Robinhood.",
  };
}

/** Plain-text render for copy-to-clipboard. */
export function checklistToText(c: OrderChecklist): string {
  const lines: string[] = [];
  lines.push(`OPTIONSCOPE ORDER CHECKLIST — verify in Robinhood before entering`);
  lines.push(`Underlying: ${c.underlying}`);
  lines.push(`Strategy: ${c.strategyName}  (${c.contracts}x)`);
  if (c.expiration) lines.push(`Expiration: ${c.expiration}`);
  lines.push(`—`);
  c.legs.forEach((l, i) => {
    const strike = l.strike != null ? ` $${l.strike} ${l.optionType}` : ` ${l.optionType}`;
    lines.push(`${i + 1}. ${l.action}${strike} × ${l.quantity}`);
  });
  lines.push(`—`);
  lines.push(c.netLimitLabel);
  lines.push(`Est. total: $${c.estTotal}`);
  lines.push(`Max modeled loss: ${c.maxModeledLoss === "undefined" ? "UNDEFINED" : "$" + c.maxModeledLoss}`);
  if (c.estCollateral != null) lines.push(`Est. collateral: $${c.estCollateral}`);
  if (c.breakEvens.length) lines.push(`Break-even(s): ${c.breakEvens.map((b) => "$" + b).join(", ")}`);
  if (c.quoteTimestamp) lines.push(`Quote time: ${c.quoteTimestamp}`);
  if (c.plannedProfitTarget != null) lines.push(`Profit target: $${c.plannedProfitTarget}`);
  if (c.plannedLossLimit != null) lines.push(`Loss limit: $${c.plannedLossLimit}`);
  if (c.plannedExitDate) lines.push(`Planned exit: ${c.plannedExitDate}`);
  lines.push(`—`);
  lines.push(`[ ] ${c.reviewConfirmedLabel}`);
  lines.push(`Estimates only. Not a fill guarantee. Not investment advice. Not affiliated with Robinhood.`);
  return lines.join("\n");
}


/* ============================================================================
   ===== FILE: src/components/OrderChecklistCard.tsx =====
   Renders the checklist with copy / print / save. No Place Trade button.
   ============================================================================ */

/*
"use client";
import { useState } from "react";
import type { OrderChecklist } from "@/lib/orderChecklist";
import { checklistToText } from "@/lib/orderChecklist";

export function OrderChecklistCard({ checklist, onSave }: { checklist: OrderChecklist; onSave?: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(checklistToText(checklist));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-5 print:border-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium">Robinhood order checklist</h3>
        <span className="text-xs text-[var(--text-muted)]">{checklist.contracts}× {checklist.strategyName}</span>
      </div>

      <dl className="text-sm space-y-1">
        <Row k="Underlying" v={checklist.underlying} />
        {checklist.expiration && <Row k="Expiration" v={checklist.expiration} />}
      </dl>

      <ol className="my-3 border-y border-[var(--border)] py-3 text-sm space-y-1">
        {checklist.legs.map((l, i) => (
          <li key={i} className="flex justify-between">
            <span>{l.action} {l.strike != null ? `$${l.strike} ${l.optionType}` : l.optionType}</span>
            <span className="text-[var(--text-secondary)]">× {l.quantity}</span>
          </li>
        ))}
      </ol>

      <dl className="text-sm space-y-1">
        <Row k={checklist.netLimitLabel} v={`$${checklist.estTotal} total`} />
        <Row k="Max modeled loss" v={checklist.maxModeledLoss === "undefined" ? "UNDEFINED" : `$${checklist.maxModeledLoss}`} danger={checklist.maxModeledLoss === "undefined"} />
        {checklist.estCollateral != null && <Row k="Est. collateral" v={`$${checklist.estCollateral}`} />}
        {checklist.breakEvens.length > 0 && <Row k="Break-even(s)" v={checklist.breakEvens.map((b) => `$${b}`).join(", ")} />}
        {checklist.quoteTimestamp && <Row k="Quote time" v={checklist.quoteTimestamp} />}
        {checklist.plannedProfitTarget != null && <Row k="Profit target" v={`$${checklist.plannedProfitTarget}`} />}
        {checklist.plannedLossLimit != null && <Row k="Loss limit" v={`$${checklist.plannedLossLimit}`} />}
        {checklist.plannedExitDate && <Row k="Planned exit" v={checklist.plannedExitDate} />}
      </dl>

      <label className="flex items-center gap-2 mt-3 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        {checklist.reviewConfirmedLabel}
      </label>

      <div className="flex gap-2 mt-4 print:hidden">
        <button onClick={copy} className="text-sm border border-[var(--border-strong)] rounded-lg px-3 py-1.5">{copied ? "Copied" : "Copy"}</button>
        <button onClick={() => window.print()} className="text-sm border border-[var(--border-strong)] rounded-lg px-3 py-1.5">Print / PDF</button>
        {onSave && <button onClick={onSave} disabled={!confirmed} className="text-sm border border-[var(--border-strong)] rounded-lg px-3 py-1.5 disabled:opacity-50">Save to journal</button>}
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-3">
        Estimates only. A limit order is not guaranteed to fill. Not investment advice. Not affiliated with or endorsed by Robinhood.
      </p>
    </div>
  );
}
function Row({ k, v, danger }: { k: string; v: string; danger?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--text-secondary)]">{k}</dt>
      <dd className={danger ? "text-[var(--text-danger)] font-medium" : ""}>{v}</dd>
    </div>
  );
}
*/


/* ============================================================================
   ===== FILE: src/lib/compare.ts =====
   Side-by-side comparison of up to 3 strategies on the same underlying.
   Does NOT auto-pick a "best" — returns rows the user sorts themselves.
   ============================================================================ */

import type { Leg } from "@/domain/types";
import { analyzePayoff } from "@/domain/payoff";
import { runMonteCarlo, type DriftMode } from "@/domain/montecarlo";

export interface CompareInput {
  label: string;
  legs: Leg[];
}
export interface CompareRow {
  label: string;
  netCashFlow: number;
  maxProfit: number | "unlimited";
  maxLoss: number | "undefined";
  breakEvens: number[];
  probProfit: number;
  expectedPL: number;
  returnOnRisk: number | null;   // maxProfit / |maxLoss| when both finite
}

export function compareStrategies(
  items: CompareInput[],
  ctx: { spot: number; tYears: number; sigma: number; r: number; q: number; drift: DriftMode; simulations: number; seed: number }
): CompareRow[] {
  if (items.length > 3) items = items.slice(0, 3);
  return items.map((it) => {
    const p = analyzePayoff({ underlying: "CMP", legs: it.legs, currentPrice: ctx.spot });
    const mc = runMonteCarlo({ legs: it.legs, spot: ctx.spot, tYears: ctx.tYears, sigma: ctx.sigma, r: ctx.r, q: ctx.q, drift: ctx.drift, simulations: ctx.simulations, seed: ctx.seed });
    const ror =
      typeof p.maxProfit === "number" && typeof p.maxLoss === "number" && p.maxLoss !== 0
        ? Number((p.maxProfit / Math.abs(p.maxLoss)).toFixed(3))
        : null;
    return {
      label: it.label,
      netCashFlow: p.netCashFlow,
      maxProfit: p.maxProfit, maxLoss: p.maxLoss, breakEvens: p.breakEvens,
      probProfit: mc.probProfit, expectedPL: mc.expectedPL, returnOnRisk: ror,
    };
  });
}

export type SortKey = "probProfit" | "expectedPL" | "returnOnRisk" | "maxLoss" | "netCashFlow";
export function sortCompare(rows: CompareRow[], key: SortKey, dir: "asc" | "desc" = "desc"): CompareRow[] {
  const val = (r: CompareRow): number => {
    const v = r[key];
    if (v === "unlimited") return Number.POSITIVE_INFINITY;
    if (v === "undefined") return Number.NEGATIVE_INFINITY;
    return typeof v === "number" ? v : 0;
  };
  return [...rows].sort((a, b) => (dir === "desc" ? val(b) - val(a) : val(a) - val(b)));
}


/* ============================================================================
   ===== FILE: src/app/(app)/layout.tsx =====
   App shell / navigation for the 8 primary pages.
   ============================================================================ */

/*
import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "ti-layout-dashboard" },
  { href: "/builder", label: "Strategy builder", icon: "ti-tools" },
  { href: "/compare", label: "Compare", icon: "ti-columns" },
  { href: "/saved", label: "Saved trades", icon: "ti-bookmark" },
  { href: "/journal", label: "Trade journal", icon: "ti-notebook" },
  { href: "/settings", label: "Settings", icon: "ti-settings" },
  { href: "/education", label: "Education & risk", icon: "ti-shield" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <nav className="md:w-56 border-r border-[var(--border)] p-3 shrink-0">
        <div className="font-medium text-lg px-2 py-3">OptionScope</div>
        <ul className="space-y-1">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-[var(--surface-1)]">
                <i className={`ti ${n.icon}`} aria-hidden /> {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-4 md:p-6 max-w-4xl">
        {children}
        <footer className="mt-10 text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-4">
          Educational tool. Not investment advice. Not affiliated with or endorsed by Robinhood.{" "}
          <a className="underline" href="https://www.theocc.com/company-information/documents-and-archives/options-disclosure-document" target="_blank" rel="noreferrer">
            Characteristics and Risks of Standardized Options
          </a>
        </footer>
      </main>
    </div>
  );
}
*/


/* ============================================================================
   ===== FILE: src/app/(app)/education/page.tsx =====
   Risk disclosures + plain-English concept explainers (original prose).
   ============================================================================ */

/*
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
*/


/* ============================================================================
   ===== FILE: README.md =====
   ============================================================================ */

/*
# OptionScope

Educational options strategy calculator & Robinhood trading companion.
Analyzes a trade's risk, reward, break-evens, Greeks, and model-based
probability of profit — then produces a manual-entry order checklist.
**Not affiliated with or endorsed by Robinhood. Not investment advice.**

## What it does
- Payoff & risk engine with correct unlimited/undefined-risk detection
- Black-Scholes (European) + CRR binomial (American, early exercise) + Greeks
- Seeded Monte Carlo probability of profit/loss, expected value, percentiles,
  and a Monte Carlo confidence interval (never a false-precision number)
- 15 same-expiration strategy templates; naked shorts blocked in companion mode
- Provider-independent market data (demo + manual + pluggable licensed feed)
- Trade journal with write-once forecast snapshots and probability calibration
- Copyable / printable Robinhood order checklist (no auto-trading)

## Quick start
```bash
npm install
cp .env.example .env.local     # demo mode works with no keys
npm run dev
```
Open http://localhost:3000. Demo mode needs no account. Sign-in is required
only to save to the journal.

## Testing
```bash
npm test        # unit tests for every strategy + lifecycle + Monte Carlo seed
npm run typecheck
```
All acceptance fixtures from the spec pass, including the 500/510 bull call
spread (net debit $310, max profit $690, break-even $503.10), the covered call
($97.50 BE, $9,750 max loss, $107.50 crossover), the iron condor (two BEs), the
wheel campaign (+$450), and the rolling ledger (+$300 cumulative, not +$450).

## Connect a licensed market-data provider
1. Set env (server-only — never NEXT_PUBLIC_):
   ```
   MARKET_DATA_PROVIDER=polygon
   MARKET_DATA_API_KEY=your_key
   MARKET_DATA_BASE_URL=https://api.polygon.io
   ```
2. Implement/verify the adapter in `src/data/providers/`. It must satisfy the
   `MarketDataProvider` interface. Field mappings in `polygon.ts` are a
   template — confirm them against your licensed contract.
3. The engine and UI never change. If the key is missing, the app falls back to
   clearly labeled demo data (see `providerStatus()`).

Never expose a market-data secret in client code. `src/data/serverProvider.ts`
imports `server-only` so a client import fails the build.

## Database (Supabase)
Run `db/schema.sql` in the Supabase SQL editor. It enables Row-Level Security
on every user-owned table, auto-creates a profile on signup, and stores the
roll/wheel ledger in `cash_events`. The forecast snapshot column is write-once
so calibration compares the original prediction against the real outcome.

## Architecture
```
src/domain/   pure calculation engine (no React, fully unit-tested)
src/data/     provider-independent market data + server routes
src/db/       schema types, Supabase clients, journal repo, calibration
src/workers/  Monte Carlo Web Worker (keeps the UI responsive)
src/app/      Next.js routes + API handlers
src/components/ UI
tests/        unit + integration
```

## Methodology
See `docs/methodology.md`: payoff derivation, break-even root-finding
(interval scan + bisection), unlimited-risk detection via tail slopes,
valuation model selection, GBM Monte Carlo, and calibration with Wilson
intervals. Probabilities are model estimates under stated assumptions, not
guarantees. Delta is reported as a sensitivity, never as probability of profit.

## License / disclaimer
For education and analysis only. No warranty. The authors are not liable for
trading losses. Verify every order in Robinhood before entering it.
*/


/* ============================================================================
   ===== FILE: docs/methodology.md  (outline) =====
   ============================================================================ */

/*
# Calculation methodology

## 1. Expiration payoff
Per-leg: entry cash flow (premium ± fees) + intrinsic settlement at S_T.
Total = sum of legs. Money math uses decimal.js; rounding only at display.

## 2. Break-evens
Interval scan of the net payoff across a window sized by tail slope and worst-
case P/L magnitude (so coincident strikes like a straddle are still bracketed),
then bisection on each sign change. Deduped to the cent.

## 3. Max profit / loss & unlimited-risk detection
Evaluate all strike breakpoints plus S=0 and a far tail. Unlimited upside iff
upper tail slope > 0; undefined loss iff upper tail slope < 0. Never inferred
from a chart range.

## 4. Valuation
European -> Black-Scholes closed form. American -> Cox-Ross-Rubinstein binomial
with early exercise; Greeks by finite difference. Model chosen from leg
exercise-style metadata and disclosed in the UI.

## 5. Monte Carlo
Seeded mulberry32 + Box-Muller normal. GBM to expiration; fixed vol (labeled).
Risk-neutral drift (r - q) for market-implied mode, user drift otherwise.
PoP = share of sims with full-strategy P/L > 0. Report SE = sqrt(p(1-p)/N) and
a 95% CI. Delta is reported separately and never equated to PoP.

## 6. Calibration
Bin closed trades by predicted PoP; compare to observed win frequency with a
95% Wilson interval per bin. Small-sample warning below 30 closed trades.
*/
