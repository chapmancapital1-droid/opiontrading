"use client";

/**
 * Phase 4.1 — Trading Brain recommendations panel.
 * Loads market context + optional NCI TA snapshot, runs runTradingBrain,
 * instantiates top strategies on the live chain, and scores PoP/EV/RoR.
 *
 * Educational decision support only — never places orders.
 */

import { useEffect, useMemo, useState } from "react";
import { dataClient } from "@/data/client";
import { fetchNews } from "@/data/news/client";
import { useIvHistory } from "@/hooks/useIvHistory";
import { atmImpliedVol, computeMarketContext, type MarketContext } from "@/lib/marketContext";
import type { UnderlyingQuote, OptionChain, EventData } from "@/data/types";
import type { NewsItem } from "@/data/news/types";
import {
  runTradingBrain,
  demoAccount,
  chainToRows,
  buildRiskMapsFromChain,
  scoreRecommendationsWithEngine,
  type ScoredRecommendation,
  type BrainDecision,
  type AccountState,
} from "@/brain";
import type { NciTaSnapshot } from "@/indicators/nciTa";
import { STRATEGY_RULES } from "@/knowledge/strategyRules";

function bareTicker(s: string): string {
  const t = s.includes(":") ? s.split(":").pop()! : s;
  return t.trim().toUpperCase();
}

const usd = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (f: number | null) => (f == null ? "—" : (f * 100).toFixed(1) + "%");

interface Loaded {
  quote: UnderlyingQuote;
  chain: OptionChain;
  events: EventData;
  news: NewsItem[];
  demo: boolean;
}

type Phase = "idle" | "loading" | "error";

export interface BrainRecommendPanelProps {
  symbol: string;
  /** Optional account override (defaults to educational demo account). */
  account?: Partial<AccountState>;
  /** When user clicks a recommendation, apply that strategy template id. */
  onSelectStrategy?: (strategyId: string) => void;
}

export default function BrainRecommendPanel({
  symbol,
  account: accountOver,
  onSelectStrategy,
}: BrainRecommendPanelProps) {
  const ticker = bareTicker(symbol);
  const { history, record } = useIvHistory(ticker);
  const [data, setData] = useState<Loaded | null>(null);
  const [nciTa, setNciTa] = useState<NciTaSnapshot | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!ticker) {
      setPhase("idle");
      setData(null);
      return;
    }
    let cancelled = false;
    setPhase("loading");
    setErr("");
    (async () => {
      try {
        const q = await dataClient.quote(ticker);
        const ex = await dataClient.expirations(ticker);
        const expiry = ex.expirations[0];
        if (!expiry) throw new Error(`No listed expirations for ${ticker}`);
        const [chainRes, evRes, newsRes, nciRes] = await Promise.all([
          dataClient.chain(ticker, expiry),
          dataClient.events(ticker).catch(() => ({ events: {} as EventData })),
          fetchNews(ticker, 20).catch(() => ({ items: [] as NewsItem[] })),
          fetch(`/api/nci-ta/snapshot?symbol=${encodeURIComponent(ticker)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        if (cancelled) return;
        const loaded: Loaded = {
          quote: q.quote,
          chain: chainRes.chain,
          events: evRes.events,
          news: newsRes.items,
          demo: q.status.usingDemoFallback,
        };
        setData(loaded);
        const snap = nciRes?.snapshot ?? nciRes ?? null;
        setNciTa(snap && snap.symbol ? snap : null);
        setPhase("idle");
        const iv = atmImpliedVol(loaded.chain, loaded.quote.price);
        if (iv != null) record(iv, { spot: loaded.quote.price });
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "Failed to run trading brain");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const account = useMemo(
    () =>
      demoAccount({
        ...accountOver,
        sharesHeld: {
          ...demoAccount().sharesHeld,
          ...(accountOver?.sharesHeld ?? {}),
          [ticker]: accountOver?.sharesHeld?.[ticker] ?? demoAccount().sharesHeld?.[ticker] ?? 0,
        },
      }),
    [accountOver, ticker]
  );

  const { decision, scored } = useMemo(() => {
    if (!ctx || !data) return { decision: null as BrainDecision | null, scored: [] as ScoredRecommendation[] };

    const rows = chainToRows(data.chain);
    const strategyIds = [...new Set(STRATEGY_RULES.map((r) => r.strategyId))];
    const { maxLossByStrategyId, collateralByStrategyId } = buildRiskMapsFromChain(strategyIds, {
      symbol: ticker,
      spot: ctx.spot,
      expiration: ctx.expiration,
      chain: rows,
    });

    const decision = runTradingBrain({
      context: ctx,
      account,
      nciTa,
      maxLossByStrategyId,
      collateralByStrategyId,
      topN: 5,
      preferGrowthPrimary: true,
    });

    const sigma = ctx.atmIv && ctx.atmIv > 0 ? ctx.atmIv : 0.3;
    const tYears = Math.max(
      1 / 365,
      (new Date(ctx.expiration).getTime() - Date.now()) / (365.25 * 864e5)
    );

    const scored = scoreRecommendationsWithEngine(decision, {
      symbol: ticker,
      spot: ctx.spot,
      expiration: ctx.expiration,
      chain: rows,
      sigma,
      tYears,
      simulations: 6_000,
      seed: 42,
    });

    return { decision, scored };
  }, [ctx, data, account, nciTa, ticker]);

  const wrap =
    "rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 flex flex-col gap-3";

  if (!ticker) {
    return (
      <section className={wrap}>
        <div className="text-sm text-[var(--text-muted)]">
          Load a ticker to run the OptionScope trading brain.
        </div>
      </section>
    );
  }

  return (
    <section className={wrap} aria-label={`Trading brain recommendations for ${ticker}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium">Trading brain · {ticker}</span>
        <span className="text-xs text-[var(--text-muted)]">
          {decision?.version ?? "…"} · manual checklist only · not investment advice
        </span>
      </div>

      {phase === "error" ? (
        <div className="text-sm text-[var(--text-danger)]">{err}</div>
      ) : phase === "loading" || !decision ? (
        <div className="text-sm text-[var(--text-muted)]">Running selector + engine…</div>
      ) : (
        <>
          {/* Gates / NCI strip */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Pill
              ok={decision.allGatesPassed}
              text={
                decision.haltTrading
                  ? `HALT: ${decision.haltReason}`
                  : decision.allGatesPassed
                    ? "Account gates OK"
                    : "Gate warnings"
              }
            />
            {decision.nciTa ? (
              <Pill
                ok={decision.nciTa.allGatesPass}
                text={`NCI ${decision.nciTa.masterDir} ${decision.nciTa.masterPct}% · ${decision.nciTa.trigger}${
                  decision.nciTa.fireBuy ? " · FIRE BUY" : ""
                }${decision.nciTa.fireSell ? " · FIRE SELL" : ""}`}
              />
            ) : (
              <Pill ok={false} text="NCI TA not loaded (webhook or /api/nci-ta/compute)" />
            )}
            <Pill
              ok={decision.contextConfidence !== "low"}
              text={`Context ${decision.contextConfidence} · risk budget ${usd(
                decision.accountSnapshot.remainingRiskBudget
              )}`}
            />
          </div>

          {decision.haltTrading ? (
            <div className="text-sm text-[var(--text-danger)] rounded-lg bg-[var(--bg-danger)] p-3">
              Trading halted for educational account rules. {decision.haltReason}
            </div>
          ) : scored.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)]">
              No strategies matched current market context. Try another symbol or wait for IV history
              to accumulate.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {scored.map((r) => (
                <RecCard
                  key={r.ruleId}
                  r={r}
                  {...(onSelectStrategy ? { onSelect: onSelectStrategy } : {})}
                />
              ))}
            </div>
          )}

          <p className="text-[11px] text-[var(--text-muted)] m-0">{decision.disclaimer}</p>
        </>
      )}
    </section>
  );
}

function Pill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 font-medium"
      style={{
        background: ok ? "var(--bg-success, rgba(29,158,117,0.12))" : "var(--surface-1)",
        color: ok ? "var(--text-success)" : "var(--text-secondary)",
      }}
    >
      {text}
    </span>
  );
}

function RecCard({
  r,
  onSelect,
}: {
  r: ScoredRecommendation;
  onSelect?: (strategyId: string) => void;
}) {
  const e = r.engine;
  return (
    <article
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 flex flex-col gap-2"
      aria-label={`Rank ${r.rank}: ${r.name}`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-medium">
            #{r.rank} · {r.name}
            {r.growthPrimary ? (
              <span className="ml-2 text-[11px] text-[var(--text-accent)]">growth-primary</span>
            ) : null}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            score {r.matchScore.toFixed(2)} · {r.portfolioRole.replace(/_/g, " ")} ·{" "}
            {r.suggestedContracts > 0
              ? `${r.suggestedContracts} contract(s) · risk ${usd(r.riskDollars)}`
              : "size 0 (budget / max-loss)"}
          </div>
        </div>
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(r.strategyId)}
            className="text-xs px-2.5 py-1 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-accent)] text-[var(--text-accent)] cursor-pointer"
          >
            Load in builder
          </button>
        )}
      </div>

      <div
        className="grid gap-2 text-xs"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))" }}
      >
        <Metric label="Model PoP" value={pct(e.probProfit)} />
        <Metric
          label="EV"
          value={e.expectedPL == null ? "—" : usd(e.expectedPL)}
          tone={e.expectedPL != null && e.expectedPL >= 0 ? "pos" : "neg"}
        />
        <Metric
          label="RoR"
          value={e.returnOnRisk == null ? "—" : e.returnOnRisk.toFixed(2) + "x"}
        />
        <Metric
          label="Max loss / lot"
          value={
            typeof e.maxLoss === "number"
              ? usd(Math.abs(e.maxLoss))
              : e.maxLoss === "undefined"
                ? "Undefined"
                : r.maxLossPerContract != null
                  ? usd(r.maxLossPerContract)
                  : "—"
          }
          tone="neg"
        />
      </div>

      {e.notes.length > 0 && (
        <div className="text-[11px] text-[var(--text-secondary)]">
          Strikes: {e.notes.join(" · ")}
        </div>
      )}

      <details className="text-xs text-[var(--text-secondary)]">
        <summary className="cursor-pointer">Why this rank · entry / exit · Robinhood path</summary>
        <ul className="mt-1 pl-4 list-disc space-y-0.5">
          {r.matchReasons.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <div className="mt-2">
          <strong>Entry:</strong> {r.entryRules.slice(0, 3).join(" · ")}
        </div>
        <div className="mt-1">
          <strong>Exit:</strong> {r.exitRules.join(" · ")}
        </div>
        <div className="mt-1 text-[var(--text-muted)]">{r.robinhoodNextStep}</div>
        <div className="mt-1 text-[10px] text-[var(--text-muted)]">Source: {r.bookSource}</div>
      </details>
    </article>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  const color =
    tone === "pos"
      ? "var(--text-success)"
      : tone === "neg"
        ? "var(--text-danger)"
        : "var(--text-primary)";
  return (
    <div className="rounded-md bg-[var(--surface-2)] px-2 py-1.5">
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
      <div className="text-sm font-medium" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
