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
  resolvePersonalAccountState,
  chainToRows,
  buildRiskMapsFromChain,
  scoreRecommendationsWithEngine,
  pickPreferredExpiration,
  explainStrategy,
  type ScoredRecommendation,
  type BrainDecision,
  type AccountState,
  type StrategyExplanation,
  type LiveAccountClient,
} from "@/brain";
import { loadPersonalAccount } from "@/lib/personalAccount";
import { loadRhImport, rowsToSharesHeld, estimateOpenRiskProxy } from "@/lib/rhImport";
import { zeroSizeCoach } from "@/knowledge/empirePolicy";
import type { NciTaSnapshot } from "@/indicators/nciTa";
import type { Leg } from "@/domain/types";
import { STRATEGY_RULES } from "@/knowledge/strategyRules";

/** Payload for loading a brain pick into the builder + profit window. */
export type BrainSelectPayload = {
  strategyId: string;
  name: string;
  legs: Leg[];
  legsNote: string;
  expiration?: string;
  /** Spot used for the rec (sync builder). */
  spot?: number;
  /** ATM IV decimal for model (e.g. 0.32). */
  sigma?: number;
  /** Near-leg DTE for builder horizon. */
  dte?: number;
  /** Far-leg DTE when multi-expiry (Money Press diagonal). */
  farDte?: number;
  /** Monte Carlo / payoff “backtest” snapshot for brain window + builder. */
  backtest?: BrainBacktestResult;
  /** Suggested contracts from empire sizing (display only). */
  suggestedContracts?: number;
};

/** Model backtest shown in brain rail after Recommend. */
export type BrainBacktestResult = {
  simulations: number;
  seed: number;
  probProfit: number | null;
  expectedPL: number | null;
  returnOnRisk: number | null;
  maxProfit: number | "unlimited" | null;
  maxLoss: number | "undefined" | null;
  netCashFlow: number | null;
  breakEvens: number[];
  /** Human profit window lines. */
  profitWindow: string[];
  runAt: string;
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

const BACKTEST_SIMS = 20_000;

function buildProfitWindow(e: {
  maxProfit: number | "unlimited" | null;
  maxLoss: number | "undefined" | null;
  breakEvens: number[];
  netCashFlow: number | null;
  probProfit: number | null;
  expectedPL: number | null;
}): string[] {
  const lines: string[] = [];
  if (e.netCashFlow != null) {
    lines.push(
      e.netCashFlow >= 0
        ? `Entry ~ net credit $${Math.abs(e.netCashFlow).toFixed(0)} / lot`
        : `Entry ~ net debit $${Math.abs(e.netCashFlow).toFixed(0)} / lot`
    );
  }
  if (e.maxProfit === "unlimited") lines.push("Max profit: unlimited (model)");
  else if (typeof e.maxProfit === "number")
    lines.push(`Max profit: $${e.maxProfit.toFixed(0)} / lot (model)`);
  if (e.maxLoss === "undefined") lines.push("Max loss: undefined — companion blocks naked tails");
  else if (typeof e.maxLoss === "number")
    lines.push(`Max loss: $${Math.abs(e.maxLoss).toFixed(0)} / lot (model)`);
  if (e.breakEvens?.length)
    lines.push(`Break-even(s): ${e.breakEvens.map((b) => "$" + b.toFixed(2)).join(", ")}`);
  else lines.push("Break-even(s): none / flat zone (see payoff)");
  if (e.probProfit != null) lines.push(`Model PoP: ${(e.probProfit * 100).toFixed(1)}%`);
  if (e.expectedPL != null)
    lines.push(`Model EV: ${e.expectedPL >= 0 ? "+" : ""}$${e.expectedPL.toFixed(0)} / lot`);
  lines.push("Estimates only — not a historical guarantee of future results.");
  return lines;
}

function daysTo(iso: string): number {
  return Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 864e5));
}

function farDteFromLegs(legs: Leg[], nearDte: number): number | undefined {
  const exps = legs
    .filter((l): l is Extract<Leg, { assetType: "option" }> => l.assetType === "option")
    .map((l) => l.expiration)
    .filter(Boolean);
  if (exps.length < 2) return undefined;
  const sorted = [...new Set(exps)].sort();
  const far = sorted[sorted.length - 1]!;
  return Math.max(nearDte + 7, daysTo(far));
}

function toPayload(
  r: ScoredRecommendation,
  ctx: MarketContext,
  backtest: BrainBacktestResult
): BrainSelectPayload {
  const dte = daysTo(ctx.expiration);
  const far = farDteFromLegs(r.legs ?? [], dte);
  const payload: BrainSelectPayload = {
    strategyId: r.strategyId,
    name: r.name,
    legs: r.legs ?? [],
    legsNote: r.legsNote || r.engine.notes.join("; ") || r.name,
    expiration: r.expiration || ctx.expiration,
    spot: ctx.spot,
    sigma: ctx.atmIv && ctx.atmIv > 0 ? ctx.atmIv : 0.3,
    dte,
    backtest,
    suggestedContracts: r.suggestedContracts,
  };
  if (far != null) payload.farDte = far;
  return payload;
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
  const [applied, setApplied] = useState<{
    name: string;
    strategyId: string;
    legsNote: string;
    backtest: BrainBacktestResult;
    suggestedContracts: number;
  } | null>(null);
  const [recommendBusy, setRecommendBusy] = useState(false);

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
    // RH paste → sharesHeld bridge (B04); never password / never network to RH
    let rhSharesHeld: Record<string, number> = {};
    let openRiskProxy = 0;
    if (typeof window !== "undefined") {
      const imp = loadRhImport();
      if (imp?.rows?.length) {
        rhSharesHeld = rowsToSharesHeld(imp.rows);
        openRiskProxy = estimateOpenRiskProxy(imp.rows);
      }
    }
    return resolvePersonalAccountState({
      profile,
      live: liveAcct,
      rhSharesHeld,
      openRiskProxy,
      ...(accountOver ? { accountOver } : {}),
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

  /** Clear applied rec only when the underlying changes (not when we lock expiry). */
  useEffect(() => {
    setApplied(null);
  }, [ticker]);

  function applyRec(r: ScoredRecommendation, deepBacktest: boolean) {
    if (!ctx || !data || !decision || !onSelectStrategy) return;
    setRecommendBusy(true);
    try {
      const sigma = ctx.atmIv && ctx.atmIv > 0 ? ctx.atmIv : 0.3;
      const tYears = Math.max(
        1 / 365,
        (new Date(ctx.expiration).getTime() - Date.now()) / (365.25 * 864e5)
      );
      const rows = chainToRows(data.chain);
      const sims = deepBacktest ? BACKTEST_SIMS : 3_000;
      const seed = deepBacktest ? (Date.now() % 1_000_000) + 17 : 42;

      // Deep MC on the chosen structure only (model backtest, not historical fills).
      const slim: BrainDecision = {
        ...decision,
        recommendations: [r],
      };
      const rescored = scoreRecommendationsWithEngine(slim, {
        symbol: ticker,
        spot: ctx.spot,
        expiration: ctx.expiration,
        chain: rows,
        sigma,
        tYears,
        simulations: sims,
        seed,
      });
      const pick = rescored[0] ?? r;
      const e = pick.engine;
      const backtest: BrainBacktestResult = {
        simulations: sims,
        seed,
        probProfit: e.probProfit,
        expectedPL: e.expectedPL,
        returnOnRisk: e.returnOnRisk,
        maxProfit: e.maxProfit,
        maxLoss: e.maxLoss,
        netCashFlow: e.netCashFlow,
        breakEvens: e.breakEvens ?? [],
        profitWindow: buildProfitWindow(e),
        runAt: new Date().toISOString(),
      };
      setApplied({
        name: pick.name,
        strategyId: pick.strategyId,
        legsNote: pick.legsNote || pick.engine.notes.join("; "),
        backtest,
        suggestedContracts: pick.suggestedContracts,
      });
      onSelectStrategy(toPayload(pick, ctx, backtest));
    } finally {
      setRecommendBusy(false);
    }
  }

  function runRecommend() {
    if (!scored.length || decision?.haltTrading) return;
    applyRec(scored[0]!, true);
  }

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

  const canRecommend =
    phase === "idle" &&
    !!decision &&
    !decision.haltTrading &&
    scored.length > 0 &&
    !!onSelectStrategy &&
    !recommendBusy;

  return (
    <section className={wrap} aria-label={`Trading brain recommendations for ${ticker}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium">Trading brain · {ticker}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-accent)] text-[var(--text-accent)] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canRecommend}
            onClick={runRecommend}
            title="Apply #1 brain pick: lock strikes, prices, profit window, run model backtest"
            aria-label="Recommend — apply top trading brain pick to builder"
          >
            {recommendBusy ? "Running…" : "✦ Recommend"}
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            {decision?.version ?? "…"} · manual only
          </span>
        </div>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] m-0">
        <strong className="text-[var(--text-secondary)]">Recommend</strong> loads the top ranked
        structure into the lab (strategy, strikes, marks, DTE), defines the profit window, and runs a
        Monte Carlo model backtest here. Not historical trade replay — model estimates only.
      </p>
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
            {decision.spyPlaybook ? (
              <Pill ok text={`SPY ADVANCED · bias ${decision.spyPlaybook.bias}`} />
            ) : null}
            {decision.nciTa ? (
              <Pill
                ok={decision.nciTa.allGatesPass}
                text={`NCI ${decision.nciTa.masterDir} ${decision.nciTa.masterPct}% · ${decision.nciTa.trigger}${
                  decision.nciTa.fireBuy ? " · FIRE BUY" : ""
                }${decision.nciTa.fireSell ? " · FIRE SELL" : ""}${
                  decision.nciTa.allGatesPass ? "" : " · FIRE gates soft-fail (not options halt)"
                }`}
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

          {/* SPY advanced playbook (when ticker is SPY) */}
          {decision.spyPlaybook && (
            <div
              className="rounded-lg border p-3 flex flex-col gap-2"
              style={{ borderColor: "var(--border-accent)", background: "var(--surface-1)" }}
              aria-label="SPY advanced instructions"
            >
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-accent)] font-medium">
                SPY advanced instructions
              </div>
              <p className="text-xs text-[var(--text-secondary)] m-0">
                {decision.spyPlaybook.summary}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-[var(--text-secondary)]">
                <div>
                  <strong className="text-[var(--text-primary)]">When</strong>
                  <ul className="m-0 mt-1 pl-4 list-disc space-y-0.5">
                    {decision.spyPlaybook.whenToTrade.slice(0, 3).map((x) => (
                      <li key={x.slice(0, 36)}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong className="text-[var(--text-primary)]">Adjust</strong>
                  <ul className="m-0 mt-1 pl-4 list-disc space-y-0.5">
                    {decision.spyPlaybook.adjustmentLadder.slice(0, 3).map((x) => (
                      <li key={x.slice(0, 36)}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                High-POP guides · bias {decision.spyPlaybook.bias}:{" "}
                {decision.spyPlaybook.highPopStrikeGuides
                  .slice(0, 4)
                  .map((g) => g.label)
                  .join(" · ")}
                {" · "}
                Full detail on Command → <strong>SPY</strong> tab
              </div>
            </div>
          )}

          {/* Applied Recommend → backtest + profit window */}
          {applied && (
            <div
              className="rounded-lg border border-[var(--border-accent)] bg-[var(--surface-1)] p-3 flex flex-col gap-2"
              aria-label="Applied recommendation backtest"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--text-accent)] font-medium">
                    Applied · model backtest
                  </div>
                  <div className="text-sm font-medium mt-0.5">{applied.name}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {applied.legsNote || applied.strategyId}
                    {applied.suggestedContracts > 0
                      ? ` · size hint ${applied.suggestedContracts} lot(s)`
                      : " · size 0 under budget (still viewable)"}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-[11px] px-2 py-1 rounded border border-[var(--border)] cursor-pointer bg-transparent text-[var(--text-secondary)]"
                  onClick={() => setApplied(null)}
                >
                  Dismiss
                </button>
              </div>
              <div
                className="grid gap-2 text-xs"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))" }}
              >
                <Metric label="Model PoP" value={pct(applied.backtest.probProfit)} />
                <Metric
                  label="EV"
                  value={
                    applied.backtest.expectedPL == null
                      ? "—"
                      : usd(applied.backtest.expectedPL)
                  }
                  tone={
                    applied.backtest.expectedPL != null && applied.backtest.expectedPL >= 0
                      ? "pos"
                      : "neg"
                  }
                />
                <Metric
                  label="Max profit"
                  value={
                    applied.backtest.maxProfit === "unlimited"
                      ? "∞"
                      : typeof applied.backtest.maxProfit === "number"
                        ? usd(applied.backtest.maxProfit)
                        : "—"
                  }
                  tone="pos"
                />
                <Metric
                  label="Max loss"
                  value={
                    applied.backtest.maxLoss === "undefined"
                      ? "Undef"
                      : typeof applied.backtest.maxLoss === "number"
                        ? usd(Math.abs(applied.backtest.maxLoss))
                        : "—"
                  }
                  tone="neg"
                />
              </div>
              <div className="rounded-md bg-[var(--surface-2)] px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
                  Profit window
                </div>
                <ul className="m-0 pl-4 list-disc text-[11px] text-[var(--text-secondary)] space-y-0.5">
                  {applied.backtest.profitWindow.map((line) => (
                    <li key={line.slice(0, 40)}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {applied.backtest.simulations.toLocaleString()} sims · seed {applied.backtest.seed} ·{" "}
                {new Date(applied.backtest.runAt).toLocaleTimeString()} · left rail locked to these
                legs
              </div>
              {applied.suggestedContracts < 1 && (
                <div className="text-[11px] text-[var(--text-warning)] rounded-md bg-[var(--bg-warning)] px-2 py-1.5">
                  {zeroSizeCoach({
                    equity: account.equity,
                    maxLossPerContract:
                      typeof applied.backtest.maxLoss === "number"
                        ? Math.abs(applied.backtest.maxLoss)
                        : 0,
                    strategyId: applied.strategyId,
                  })}
                </div>
              )}
              <a
                href="#order-checklist"
                className="text-[11px] text-[var(--text-accent)] no-underline hover:underline"
              >
                Jump to order checklist ↓
              </a>
            </div>
          )}

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
                  active={applied?.strategyId === r.strategyId}
                  explainOpen={explainOpen === r.strategyId}
                  onExplain={() =>
                    setExplainOpen((cur) => (cur === r.strategyId ? null : r.strategyId))
                  }
                  {...(onSelectStrategy
                    ? {
                        onSelect: () => applyRec(r, true),
                        selectLabel: r.rank === 1 ? "Recommend" : "Apply + backtest",
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
  active,
  selectLabel = "Apply + backtest",
}: {
  r: ScoredRecommendation;
  equity: number;
  onSelect?: () => void;
  onExplain?: () => void;
  explainOpen?: boolean;
  active?: boolean;
  selectLabel?: string;
}) {
  const e = r.engine;
  return (
    <article
      className="rounded-lg border bg-[var(--surface-1)] p-3 flex flex-col gap-2"
      style={{
        borderColor: active ? "var(--border-accent)" : "var(--border)",
        boxShadow: active ? "0 0 0 1px var(--border-accent)" : undefined,
      }}
      aria-label={`Rank ${r.rank}: ${r.name}`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-medium">
            #{r.rank} · {r.name}
            {r.growthPrimary ? (
              <span className="ml-2 text-[11px] text-[var(--text-accent)]">growth-primary</span>
            ) : null}
            {active ? (
              <span className="ml-2 text-[11px] text-[var(--text-accent)]">loaded</span>
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
              {selectLabel}
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

      {/* Always coach when contracts=0 — never silent zero (prefer brain-attached coach) */}
      {r.suggestedContracts < 1 && (
        <div className="text-[11px] text-[var(--text-warning)] rounded-md bg-[var(--bg-warning)] px-2 py-1.5">
          {r.zeroSizeCoach ??
            zeroSizeCoach({
              equity,
              maxLossPerContract:
                r.maxLossPerContract != null && r.maxLossPerContract > 0
                  ? r.maxLossPerContract
                  : typeof e.maxLoss === "number"
                    ? Math.abs(e.maxLoss)
                    : r.riskDollars > 0
                      ? r.riskDollars
                      : 0,
              strategyId: r.strategyId,
            })}
        </div>
      )}

      {e.notes.length > 0 && (
        <div className="text-[11px] text-[var(--text-secondary)]">
          Strikes: {e.notes.join(" · ")}
        </div>
      )}

      {r.advancedInstructions && r.advancedInstructions.length > 0 && (
        <div
          className="text-[11px] rounded-md px-2 py-1.5 border"
          style={{ borderColor: "var(--border-accent)", background: "var(--surface-2)" }}
        >
          <div className="font-medium text-[var(--text-accent)] mb-0.5">SPY advanced · how / when</div>
          <ul className="m-0 pl-4 list-disc space-y-0.5 text-[var(--text-secondary)]">
            {r.advancedInstructions.map((line) => (
              <li key={line.slice(0, 48)}>{line}</li>
            ))}
          </ul>
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
          <strong>Entry:</strong> {r.entryRules.slice(0, 4).join(" · ")}
        </div>
        <div className="mt-1">
          <strong>Exit / adjust:</strong> {r.exitRules.slice(0, 5).join(" · ")}
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
