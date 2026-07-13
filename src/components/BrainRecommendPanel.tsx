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
  seedAccount,
  chainToRows,
  buildRiskMapsFromChain,
  scoreRecommendationsWithEngine,
  pickPreferredExpiration,
  explainStrategy,
  mapLiveToAccountState,
  demoAsLiveClient,
  type ScoredRecommendation,
  type BrainDecision,
  type AccountState,
  type StrategyExplanation,
  type LiveAccountClient,
} from "@/brain";
import { loadPersonalAccount } from "@/lib/personalAccount";
import { getEmpirePhaseLimits, zeroSizeCoach } from "@/knowledge/empirePolicy";
import type { NciTaSnapshot } from "@/indicators/nciTa";
import type { Leg } from "@/domain/types";
import { STRATEGY_RULES } from "@/knowledge/strategyRules";

/** Payload for loading a brain pick into the builder. */
export type BrainSelectPayload = {
  strategyId: string;
  name: string;
  legs: Leg[];
  legsNote: string;
  expiration?: string;
};

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
  /** Prefer this expiry when set (builder-selected). */
  preferredExpiration?: string;
  /** Optional account override (defaults to educational demo account). */
  account?: Partial<AccountState>;
  /** When user clicks a recommendation, load strategy (+ optional exact legs). */
  onSelectStrategy?: (payload: BrainSelectPayload | string) => void;
}

export default function BrainRecommendPanel({
  symbol,
  preferredExpiration,
  account: accountOver,
  onSelectStrategy,
}: BrainRecommendPanelProps) {
  const ticker = bareTicker(symbol);
  const { history, record } = useIvHistory(ticker);
  const [data, setData] = useState<Loaded | null>(null);
  const [nciTa, setNciTa] = useState<NciTaSnapshot | null>(null);
  const [liveAcct, setLiveAcct] = useState<LiveAccountClient | null>(null);
  const [expiryNote, setExpiryNote] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [err, setErr] = useState("");
  const [personalReady, setPersonalReady] = useState(false);

  // Personal seed profile + optional Alpaca paper
  useEffect(() => {
    let cancelled = false;
    setPersonalReady(true);
    (async () => {
      const profile = loadPersonalAccount();
      try {
        const res = await fetch("/api/alpaca/account");
        const j = await res.json();
        if (cancelled) return;
        if (j?.ok && j.account && profile.equitySource === "alpaca_paper") {
          setLiveAcct(j.account as LiveAccountClient);
        } else if (j?.ok && j.account) {
          const acc = j.account as LiveAccountClient;
          setLiveAcct({
            ...acc,
            note:
              profile.equitySource === "manual_seed"
                ? `Sizing from manual seed $${profile.manualEquity} (Alpaca paper visible but not primary)`
                : acc.note ?? "Alpaca connected",
          });
        } else {
          setLiveAcct({
            source: "demo",
            equity: profile.manualEquity,
            cash: profile.manualCash,
            sharesHeld: {},
            openRiskDollars: 0,
            openCampaigns: 0,
            dailyRealizedPL: 0,
            note: "Using personal seed equity from Settings",
          });
        }
      } catch {
        if (!cancelled) {
          const profile = loadPersonalAccount();
          setLiveAcct({
            source: "demo",
            equity: profile.manualEquity,
            cash: profile.manualCash,
            sharesHeld: {},
            openRiskDollars: 0,
            openCampaigns: 0,
            dailyRealizedPL: 0,
            note: "Seed account (offline)",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        const list = ex.expirations ?? [];
        if (!list.length) throw new Error(`No listed expirations for ${ticker}`);

        let expiry = preferredExpiration && list.includes(preferredExpiration)
          ? preferredExpiration
          : null;
        let note = expiry
          ? `Using builder-selected expiry ${expiry}`
          : "";
        if (!expiry) {
          const pick = pickPreferredExpiration(list, { minDte: 7, maxDte: 45 });
          if (!pick) throw new Error(`No usable expirations for ${ticker}`);
          expiry = pick.expiration;
          note = pick.note;
        }
        if (cancelled) return;
        setExpiryNote(note);

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
        // Record IV once; avoid depending on `history` in scoring deps loop.
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
  }, [ticker, preferredExpiration]);

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

  const account = useMemo(() => {
    const profile = personalReady ? loadPersonalAccount() : null;
    const useAlpaca = profile?.equitySource === "alpaca_paper" && liveAcct?.source === "alpaca";

    if (useAlpaca && liveAcct) {
      const sharesHeld = { ...liveAcct.sharesHeld, ...(accountOver?.sharesHeld ?? {}) };
      const mapOpts: Parameters<typeof mapLiveToAccountState>[1] = {
        approvalProfile: accountOver?.approvalProfile ?? profile?.approvalProfile ?? "level3_spreads",
        growthMode: accountOver?.growthMode ?? getEmpirePhaseLimits(liveAcct.equity).growthMode,
      };
      if (accountOver?.dailyRealizedPL != null) mapOpts.dailyRealizedPL = accountOver.dailyRealizedPL;
      const mapped = mapLiveToAccountState({ ...liveAcct, sharesHeld }, mapOpts);
      return demoAccount({ ...mapped, ...accountOver, sharesHeld });
    }

    const equity = profile?.manualEquity ?? 500;
    const cash = profile?.manualCash ?? equity;
    return seedAccount(equity, {
      cash,
      approvalProfile: profile?.approvalProfile ?? "level3_spreads",
      sharesHeld: accountOver?.sharesHeld ?? {},
      ...accountOver,
    });
  }, [accountOver, ticker, liveAcct, personalReady]);

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
      simulations: 3_000,
      seed: 42,
    });

    return { decision, scored };
  }, [ctx, data, account, nciTa, ticker]);

  const [explainOpen, setExplainOpen] = useState<string | null>(null);
  const explanation = useMemo<StrategyExplanation | null>(() => {
    if (!decision || !ctx || !explainOpen) return null;
    return explainStrategy({
      decision,
      context: ctx,
      scored,
      strategyId: explainOpen,
    });
  }, [decision, ctx, scored, explainOpen]);

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
      {/* Live paper/live account strip */}
      <div className="flex flex-wrap gap-2 text-xs items-center">
        <Pill
          ok={liveAcct?.source === "alpaca"}
          text={
            liveAcct?.source === "alpaca"
              ? `Alpaca ${liveAcct.mode ?? "paper"} · ${liveAcct.status ?? "OK"} · equity ${usd(liveAcct.equity)} · cash ${usd(liveAcct.cash)}`
              : liveAcct?.note || "Account: demo (connecting…)"
          }
        />
        {liveAcct?.source === "alpaca" && liveAcct.buyingPower != null && (
          <Pill ok={true} text={`Buying power ${usd(liveAcct.buyingPower)}`} />
        )}
        {liveAcct?.source === "alpaca" && (liveAcct.openOptionContracts ?? 0) > 0 && (
          <Pill
            ok={true}
            text={`Open option lots ~${liveAcct.openOptionContracts} · risk proxy ${usd(liveAcct.openRiskDollars)}`}
          />
        )}
      </div>
      {liveAcct?.note && (
        <div className="text-[11px] text-[var(--text-muted)]">{liveAcct.note}</div>
      )}

      {expiryNote && (
        <div className="text-xs text-[var(--text-secondary)]">
          Expiry: {ctx?.expiration ?? "—"}
          {ctx ? ` (${Math.max(0, Math.round((new Date(ctx.expiration).getTime() - Date.now()) / 864e5))} DTE)` : ""}
          {" · "}
          {expiryNote}
        </div>
      )}

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
                  equity={account.equity}
                  explainOpen={explainOpen === r.strategyId}
                  onExplain={() =>
                    setExplainOpen((cur) => (cur === r.strategyId ? null : r.strategyId))
                  }
                  {...(onSelectStrategy
                    ? {
                        onSelect: () => {
                          const payload: BrainSelectPayload = {
                            strategyId: r.strategyId,
                            name: r.name,
                            legs: r.legs ?? [],
                            legsNote: r.legsNote || r.engine.notes.join("; "),
                          };
                          if (r.expiration) payload.expiration = r.expiration;
                          onSelectStrategy(payload);
                        },
                      }
                    : {})}
                />
              ))}
            </div>
          )}

          {explanation && (
            <ExplainPanel
              x={explanation}
              onClose={() => setExplainOpen(null)}
            />
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
  equity,
  onSelect,
  onExplain,
  explainOpen,
}: {
  r: ScoredRecommendation;
  equity: number;
  onSelect?: () => void;
  onExplain?: () => void;
  explainOpen?: boolean;
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
        <div className="flex gap-1.5 flex-wrap">
          {onExplain && (
            <button
              type="button"
              onClick={onExplain}
              className="text-xs px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] cursor-pointer"
            >
              {explainOpen ? "Hide AI" : "Explain (AI)"}
            </button>
          )}
          {onSelect && (
            <button
              type="button"
              onClick={onSelect}
              className="text-xs px-2.5 py-1 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-accent)] text-[var(--text-accent)] cursor-pointer"
            >
              Load in builder
            </button>
          )}
        </div>
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
          label="Payoff RoR"
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

      {r.suggestedContracts < 1 && r.maxLossPerContract != null && r.maxLossPerContract > 0 && (
        <div className="text-[11px] text-[var(--text-warning)] rounded-md bg-[var(--bg-warning)] px-2 py-1.5">
          {zeroSizeCoach({
            equity,
            maxLossPerContract: r.maxLossPerContract,
            strategyId: r.strategyId,
          })}
        </div>
      )}

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

function ExplainPanel({
  x,
  onClose,
}: {
  x: StrategyExplanation;
  onClose: () => void;
}) {
  return (
    <section
      className="rounded-lg border border-[var(--border-accent)] bg-[var(--surface-1)] p-3 flex flex-col gap-2"
      aria-label={`AI explanation for ${x.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-[var(--text-accent)] font-medium">
            Phase 5 · catalog-grounded explainer
          </div>
          <h3 className="text-sm font-medium m-0 mt-0.5">{x.headline}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs px-2 py-1 rounded border border-[var(--border)] cursor-pointer bg-transparent text-[var(--text-secondary)]"
        >
          Close
        </button>
      </div>
      <p className="text-sm text-[var(--text-secondary)] m-0">{x.thesis}</p>
      <div>
        <div className="text-xs font-medium mb-1">Why now</div>
        <ul className="text-xs text-[var(--text-secondary)] m-0 pl-4 list-disc space-y-0.5">
          {x.whyNow.map((w) => (
            <li key={w.slice(0, 48)}>{w}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-xs font-medium mb-1">Risks &amp; exits</div>
        <ul className="text-xs text-[var(--text-secondary)] m-0 pl-4 list-disc space-y-0.5">
          {x.risks.map((w) => (
            <li key={w.slice(0, 48)}>{w}</li>
          ))}
        </ul>
      </div>
      {x.citations.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1">Book library citations</div>
          <ul className="text-[11px] text-[var(--text-muted)] m-0 pl-4 list-disc space-y-1">
            {x.citations.map((c, i) => (
              <li key={`${c.source}-${i}`}>
                <span className="text-[var(--text-secondary)]">
                  {c.category} / {c.subsection}
                </span>
                {" · "}
                {c.source}
                {c.page != null ? ` p.${c.page}` : ""}: “{c.snippet}”
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-[var(--text-muted)] m-0">{x.confidenceNote}</p>
      <p className="text-[11px] text-[var(--text-muted)] m-0">{x.disclaimer}</p>
    </section>
  );
}
