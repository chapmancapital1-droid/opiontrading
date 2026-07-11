"use client";

/**
 * MarketContextPanel — Phase 3 UI.
 *
 * Given a symbol, pulls live (or demo) quote + nearest-expiry chain + events +
 * news from the data layer, records today's ATM IV snapshot into the IV-history
 * store, computes a `MarketContext`, and renders the seven signals the strategy
 * brain (Phase 4) will condition on. Degrades to demo data when no live feed is
 * configured. Educational analysis only — not investment advice.
 */

import { useEffect, useMemo, useState } from "react";
import { dataClient } from "@/data/client";
import { fetchNews } from "@/data/news/client";
import { useIvHistory } from "@/hooks/useIvHistory";
import { atmImpliedVol, computeMarketContext, type MarketContext } from "@/lib/marketContext";
import type { UnderlyingQuote, OptionChain, EventData } from "@/data/types";
import type { NewsItem } from "@/data/news/types";

/** Strip an "EXCHANGE:" prefix — TradingView uses NASDAQ:AAPL, the data API wants AAPL. */
function bareTicker(s: string): string {
  const t = s.includes(":") ? s.split(":").pop()! : s;
  return t.trim().toUpperCase();
}

interface Loaded {
  quote: UnderlyingQuote;
  chain: OptionChain;
  events: EventData;
  news: NewsItem[];
  demo: boolean;
}

type Phase = "idle" | "loading" | "error";

const tone = {
  pos: { bg: "var(--bg-success, rgba(29,158,117,0.12))", fg: "var(--text-success)" },
  neg: { bg: "var(--bg-danger)", fg: "var(--text-danger)" },
  warn: { bg: "var(--bg-warning)", fg: "var(--text-warning)" },
  neutral: { bg: "var(--surface-1)", fg: "var(--text-secondary)" },
} as const;

type ToneKey = keyof typeof tone;

const IV_TREND_TONE: Record<MarketContext["ivTrend"], ToneKey> = {
  elevated: "warn", neutral: "neutral", low: "pos",
};
const SPOT_TREND_TONE: Record<MarketContext["spotTrend"], ToneKey> = {
  up: "pos", sideways: "neutral", down: "neg",
};
const LIQUIDITY_TONE: Record<MarketContext["liquidity"], ToneKey> = {
  tight: "pos", normal: "neutral", wide: "warn",
};
const EVENT_TONE: Record<MarketContext["eventProximity"], ToneKey> = {
  earnings: "warn", "ex-div": "warn", clear: "pos",
};
const SENTIMENT_TONE: Record<MarketContext["newsSentiment"], ToneKey> = {
  positive: "pos", neutral: "neutral", negative: "neg",
};
const SPOT_TREND_LABEL: Record<MarketContext["spotTrend"], string> = {
  up: "Up ↑", sideways: "Sideways →", down: "Down ↓",
};

function Badge({ text, k }: { text: string; k: ToneKey }) {
  return (
    <span
      style={{
        display: "inline-block", fontSize: 13, fontWeight: 500,
        padding: "2px 10px", borderRadius: 999,
        background: tone[k].bg, color: tone[k].fg,
      }}
    >
      {text}
    </span>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--surface-1)] px-3 py-2">
      <div className="text-xs text-[var(--text-muted)] mb-1">{label}</div>
      <div className="text-lg font-medium">{children}</div>
    </div>
  );
}

export default function MarketContextPanel({ symbol }: { symbol: string }) {
  const ticker = bareTicker(symbol);
  const { history, record } = useIvHistory(ticker);
  const [data, setData] = useState<Loaded | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!ticker) { setPhase("idle"); setData(null); return; }
    let cancelled = false;
    setPhase("loading"); setErr("");
    (async () => {
      try {
        const q = await dataClient.quote(ticker);
        const ex = await dataClient.expirations(ticker);
        const expiry = ex.expirations[0];
        if (!expiry) throw new Error(`No listed expirations for ${ticker}`);
        const [chainRes, evRes, newsRes] = await Promise.all([
          dataClient.chain(ticker, expiry),
          dataClient.events(ticker).catch(() => ({ events: {} as EventData })),
          fetchNews(ticker, 20).catch(() => ({ items: [] as NewsItem[] })),
        ]);
        if (cancelled) return;
        const loaded: Loaded = {
          quote: q.quote, chain: chainRes.chain, events: evRes.events,
          news: newsRes.items, demo: q.status.usingDemoFallback,
        };
        setData(loaded);
        setPhase("idle");
        // Persist today's ATM IV (+ spot) so IV rank/percentile accrues over time.
        const iv = atmImpliedVol(loaded.chain, loaded.quote.price);
        if (iv != null) record(iv, { spot: loaded.quote.price });
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "Failed to load market context");
        setPhase("error");
      }
    })();
    return () => { cancelled = true; };
    // `record` is stable per symbol; excluding it avoids a reload loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const ctx = useMemo<MarketContext | null>(() => {
    if (!data) return null;
    return computeMarketContext({
      symbol: ticker,
      quote: data.quote,
      chain: data.chain,
      ivHistory: history,
      events: data.events,
      news: data.news,
    });
  }, [data, history, ticker]);

  const wrap = "rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3";

  if (!ticker) {
    return (
      <section className={wrap}>
        <div className="text-sm text-[var(--text-muted)]">
          Load a ticker to see its live market context.
        </div>
      </section>
    );
  }

  const ivRankPct = ctx ? Math.round(ctx.ivRank * 100) : 0;

  return (
    <section className={wrap} aria-label={`Market context for ${ticker}`}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <span className="text-sm font-medium">Market context · {ticker}</span>
        {ctx && (
          <span className="text-xs text-[var(--text-muted)]">
            {data?.demo ? "demo data" : (data?.quote.meta.source ?? "live")} · confidence {ctx.confidence} · {ctx.sampleSize} IV day(s)
          </span>
        )}
      </div>

      {phase === "error" ? (
        <div className="text-sm text-[var(--text-danger)]">{err}</div>
      ) : phase === "loading" || !ctx ? (
        <div className="text-sm text-[var(--text-muted)]">Computing market context…</div>
      ) : (
        <>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <Tile label="IV rank">
              <div className="flex items-center gap-2">
                <span>{ivRankPct}%</span>
                <Badge text={ctx.ivTrend} k={IV_TREND_TONE[ctx.ivTrend]} />
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div style={{ width: `${ivRankPct}%`, height: "100%", background: "var(--text-accent, #378add)" }} />
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                ATM IV {ctx.atmIv != null ? (ctx.atmIv * 100).toFixed(1) + "%" : "—"}
              </div>
            </Tile>

            <Tile label="Spot trend">
              <Badge text={SPOT_TREND_LABEL[ctx.spotTrend]} k={SPOT_TREND_TONE[ctx.spotTrend]} />
              <div className="text-xs text-[var(--text-muted)] mt-1">Spot ${ctx.spot.toLocaleString("en-US", { maximumFractionDigits: 2 })}</div>
            </Tile>

            <Tile label="Expected move (to expiry)">
              <span>±${ctx.expectedMove.toFixed(2)}</span>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {ctx.expectedMovePct != null ? "±" + (ctx.expectedMovePct * 100).toFixed(1) + "% · " : ""}exp {ctx.expiration}
              </div>
            </Tile>

            <Tile label="Liquidity">
              <Badge text={ctx.liquidity} k={LIQUIDITY_TONE[ctx.liquidity]} />
            </Tile>

            <Tile label="Event proximity">
              <Badge text={ctx.eventProximity} k={EVENT_TONE[ctx.eventProximity]} />
            </Tile>

            <Tile label="News sentiment">
              <Badge text={ctx.newsSentiment} k={SENTIMENT_TONE[ctx.newsSentiment]} />
              <div className="text-xs text-[var(--text-muted)] mt-1">{data?.news.length ?? 0} headline(s)</div>
            </Tile>
          </div>

          {ctx.notes.length > 0 && (
            <ul className="mt-2 text-xs text-[var(--text-muted)] list-disc pl-4 space-y-0.5">
              {ctx.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </>
      )}

      <p className="text-xs text-[var(--text-muted)] mt-2">
        Quantitative signals derived from your configured data provider (demo by default; OpenBB for live
        chains/IV). IV rank accrues as daily snapshots build up. Educational analysis only — not investment advice.
      </p>
    </section>
  );
}
