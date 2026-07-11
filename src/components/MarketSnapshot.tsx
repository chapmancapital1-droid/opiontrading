"use client";
import { useEffect, useState } from "react";
import { dataClient } from "@/data/client";

/** Strip an "EXCHANGE:" prefix — TradingView uses NASDAQ:AAPL, the data API wants AAPL. */
function bareTicker(s: string): string {
  const t = s.includes(":") ? s.split(":").pop()! : s;
  return t.trim().toUpperCase();
}

type Snap = {
  loading: boolean;
  error?: string;
  spot?: number;
  source?: string;
  freshness?: string;
  demo?: boolean;
  nearestExpiry?: string;
  expiryCount?: number;
  atmIv?: number | null;
  nextEarnings?: string | null;
  exDividend?: string | null;
};

const fmtUsd = (n?: number) =>
  n == null ? "—" : "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function MarketSnapshot({ symbol }: { symbol: string }) {
  const ticker = bareTicker(symbol);
  const [s, setS] = useState<Snap>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    setS({ loading: true });
    (async () => {
      const next: Snap = { loading: false };
      const [q, ex, ev] = await Promise.allSettled([
        dataClient.quote(ticker),
        dataClient.expirations(ticker),
        dataClient.events(ticker),
      ]);
      if (q.status === "fulfilled") {
        next.spot = q.value.quote.price;
        next.source = q.value.quote.meta.source;
        next.freshness = q.value.quote.meta.freshness;
        next.demo = q.value.status.usingDemoFallback;
      }
      if (ex.status === "fulfilled" && ex.value.expirations.length > 0) {
        next.expiryCount = ex.value.expirations.length;
        const first = ex.value.expirations[0];
        if (first) next.nearestExpiry = first;
      }
      if (ev.status === "fulfilled") {
        next.nextEarnings = ev.value.events.nextEarnings ?? null;
        next.exDividend = ev.value.events.exDividend ?? null;
      }
      if (q.status === "rejected" && ex.status === "rejected") {
        next.error = `No market data for ${ticker}`;
      }
      // Best-effort ATM implied vol from the nearest expiry's chain.
      if (next.nearestExpiry && next.spot != null) {
        try {
          const { chain } = await dataClient.chain(ticker, next.nearestExpiry);
          const withIv = chain.quotes.filter((c) => c.impliedVol != null);
          if (withIv.length) {
            const atm = withIv.reduce((best, c) =>
              Math.abs(c.contract.strike - next.spot!) < Math.abs(best.contract.strike - next.spot!) ? c : best
            );
            next.atmIv = atm.impliedVol;
          }
        } catch {
          /* IV is best-effort; ignore */
        }
      }
      if (!cancelled) setS(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const tile = "rounded-lg bg-[var(--surface-1)] px-3 py-2";
  const label = "text-xs text-[var(--text-muted)]";
  const value = "text-lg font-medium";

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Market snapshot · {ticker}</span>
        {s.source && (
          <span className="text-xs text-[var(--text-muted)]">
            {s.demo ? "demo data" : s.source} · {s.freshness}
          </span>
        )}
      </div>

      {s.error ? (
        <div className="text-sm text-[var(--text-muted)]">{s.error}</div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
          <div className={tile}>
            <div className={label}>Spot</div>
            <div className={value}>{s.loading ? "…" : fmtUsd(s.spot)}</div>
          </div>
          <div className={tile}>
            <div className={label}>ATM implied vol</div>
            <div className={value}>{s.atmIv != null ? (s.atmIv * 100).toFixed(1) + "%" : "—"}</div>
          </div>
          <div className={tile}>
            <div className={label}>Nearest expiry</div>
            <div className={value} style={{ fontSize: 15 }}>
              {s.nearestExpiry ?? "—"}
              {s.expiryCount ? <span className={label}> · {s.expiryCount} total</span> : null}
            </div>
          </div>
          <div className={tile}>
            <div className={label}>Next earnings</div>
            <div className={value} style={{ fontSize: 15 }}>{s.nextEarnings ?? "—"}</div>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)] mt-2">
        Live inputs for the strategy engine, from your configured data provider (demo by default;
        OpenBB for live chains/IV — see <code>docs/OPENBB_SETUP.md</code>). Not investment advice.
      </p>
    </section>
  );
}
