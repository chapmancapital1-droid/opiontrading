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
    <div className="zone-cockpit flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="os-kicker">Command Center</div>
          <h1 className="text-2xl font-medium tracking-tight m-0">Market cockpit</h1>
        </div>
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
            className="os-input w-48"
          />
          <button type="submit" className="os-btn os-btn-primary">
            Load chart
          </button>
        </form>
      </div>

      <CommandRitual />

      <MarketSnapshot symbol={symbol} />

      <MarketContextPanel symbol={symbol} />

      <section className="os-panel p-2">
        <MarketSummary direction="horizontal" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="os-panel p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-medium">Live chart · {symbol}</span>
            <span className="os-badge text-[10px]">TradingView</span>
          </div>
          <TradingViewChart symbol={symbol} height={520} />
        </div>

        <div className="os-panel p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-medium">News · {symbol}</span>
            <span className="os-badge text-[10px]">Timeline</span>
          </div>
          <TradingViewTimeline symbol={symbol} height={520} />
        </div>
      </section>

      <section
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
      >
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className="os-panel p-4 no-underline hover:border-[var(--border-accent)] transition-colors block">
            <div className="font-medium text-[var(--text-primary)]">{q.title}</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">{q.desc}</div>
          </Link>
        ))}
      </section>

      <p className="text-xs text-[var(--text-muted)]">
        Chart is live market data for reference. Option chains come from your configured data
        provider. Educational analysis only — not investment advice. No auto-trade.
      </p>
    </div>
  );
}
