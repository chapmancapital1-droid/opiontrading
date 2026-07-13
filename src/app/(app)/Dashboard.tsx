"use client";
import { useState } from "react";
import Link from "next/link";
import TradingViewChart from "@/components/TradingViewChart";
import TradingViewTimeline from "@/components/TradingViewTimeline";
import MarketSummary from "@/components/MarketSummary";
import MarketSnapshot from "@/components/MarketSnapshot";
import MarketContextPanel from "@/components/MarketContextPanel";
import CommandRitual from "@/components/CommandRitual";

const QUICK = [
  { href: "/builder", title: "Trade Lab", desc: "Brain rank, payoff, checklist — own the decision." },
  { href: "/journal", title: "Trade journal", desc: "Plan → open → close. Forecast vs outcome." },
  { href: "/settings", title: "Seed & RH import", desc: "Set $500 equity truth · paste RH history." },
  { href: "/education", title: "Education & risk", desc: "Empire field manual · process over prediction." },
];

export default function Dashboard() {
  const [input, setInput] = useState("NASDAQ:AAPL");
  const [symbol, setSymbol] = useState("NASDAQ:AAPL");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-medium">Command</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const s = input.trim().toUpperCase();
            if (s) setSymbol(s);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. NASDAQ:AAPL"
            aria-label="Symbol"
            className="text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 w-48"
          />
          <button
            type="submit"
            className="text-sm rounded-lg border border-[var(--border-accent)] bg-[var(--bg-accent)] text-[var(--text-accent)] px-3 py-1.5"
          >
            Load chart
          </button>
        </form>
      </div>

      <CommandRitual />

      <MarketSnapshot symbol={symbol} />

      <MarketContextPanel symbol={symbol} />

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2">
        <MarketSummary direction="horizontal" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-medium">Live chart · {symbol}</span>
            <span className="text-xs text-[var(--text-muted)]">Live market data by TradingView</span>
          </div>
          <TradingViewChart symbol={symbol} height={520} />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-medium">News · {symbol}</span>
            <span className="text-xs text-[var(--text-muted)]">Top stories by TradingView</span>
          </div>
          <TradingViewTimeline symbol={symbol} height={520} />
        </div>
      </section>

      <section className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {QUICK.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 hover:bg-[var(--surface-1)] transition-colors"
          >
            <div className="font-medium">{q.title}</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">{q.desc}</div>
          </Link>
        ))}
      </section>

      <p className="text-xs text-[var(--text-muted)]">
        Chart is live market data for reference. Option quotes, chains, and news come from your
        configured data provider (see <code>docs/OPENBB_SETUP.md</code>). Educational analysis
        only — not investment advice.
      </p>
    </div>
  );
}
