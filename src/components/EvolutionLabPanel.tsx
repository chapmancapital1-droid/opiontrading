"use client";

/**
 * Test tab — Self-improving evolution lab (workspace-0890ad1c).
 * Scientific method: Observe → Hypothesize → Experiment → Analyze → Iterate.
 * Synthetic markets only. Educational. No broker / no auto-trade.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ALL_STRATEGIES,
  AVAILABLE_DTES,
  dteLabel,
  getStrategiesForDTE,
  getAvailableTickers,
  TICKER_PROFILES,
  type DTE,
  type StrategyDef,
} from "@/testlab/trading";

type Stage =
  | "idle"
  | "observing"
  | "hypothesizing"
  | "experimenting"
  | "analyzing"
  | "complete"
  | "error";

type GenRow = {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  bestSharpe: number;
  avgSharpe: number;
  diversity: number;
  bestEquity: number[];
  bestIndividual?: {
    sharpe?: number;
    sortino?: number;
    maxDD?: number;
    winRate?: number;
    trades?: number;
    totalReturn?: number;
    statisticalEdge?: number;
    kellyOptimal?: number;
    expectedValue?: number;
    regimeResults?: Record<
      string,
      { trades: number; winRate: number; avgPnL: number; totalPnL: number }
    >;
  };
};

type Champion = {
  genome: Record<string, number>;
  strategyId: string;
  dte: number;
  ticker: string;
  sharpe: number;
  sortino: number;
  maxDD: number;
  winRate: number;
  trades: number;
  totalReturn: number;
  expectedValue: number;
  kellyOptimal: number;
  statisticalEdge: number;
  equity: number[];
  regimeResults: Record<
    string,
    { trades: number; winRate: number; avgPnL: number; totalPnL: number }
  >;
};

const STAGES: { key: Stage; label: string }[] = [
  { key: "observing", label: "Observe" },
  { key: "hypothesizing", label: "Hypothesize" },
  { key: "experimenting", label: "Experiment" },
  { key: "analyzing", label: "Analyze" },
  { key: "complete", label: "Conclude" },
];

export function EvolutionLabPanel() {
  const [dte, setDte] = useState<DTE>(5);
  const strategies = useMemo(() => getStrategiesForDTE(dte), [dte]);
  const [strategyId, setStrategyId] = useState(
    () => getStrategiesForDTE(5)[0]?.id ?? ALL_STRATEGIES[0]!.id,
  );
  const [ticker, setTicker] = useState("SPY");
  const tickers = useMemo(() => getAvailableTickers(), []);

  const [gens, setGens] = useState(8);
  const [pop, setPop] = useState(8);
  const [marketYears, setMarketYears] = useState(40);
  const [evalYears, setEvalYears] = useState(12);

  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(
    "Select strategy · DTE · ticker → Run evolution",
  );
  const [running, setRunning] = useState(false);
  const [currentGen, setCurrentGen] = useState(0);
  const [totalGen, setTotalGen] = useState(0);
  const [generations, setGenerations] = useState<GenRow[]>([]);
  const [champion, setChampion] = useState<Champion | null>(null);
  const [market, setMarket] = useState<{
    totalDays: number;
    finalPrice: number;
    maxDrawdown: number;
    sharpeRatio: number;
  } | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const strategy: StrategyDef | undefined =
    strategies.find((s) => s.id === strategyId) ?? strategies[0];

  useEffect(() => {
    const list = getStrategiesForDTE(dte);
    if (!list.find((s) => s.id === strategyId)) {
      setStrategyId(list[0]?.id ?? "");
    }
  }, [dte, strategyId]);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  const start = useCallback(() => {
    esRef.current?.close();
    setRunning(true);
    setStage("observing");
    setProgress("Generating synthetic market…");
    setGenerations([]);
    setChampion(null);
    setMarket(null);
    setCurrentGen(0);

    const params = new URLSearchParams({
      strategy: strategy?.id ?? strategyId,
      dte: String(dte),
      ticker,
      generations: String(gens),
      populationSize: String(pop),
      marketYears: String(marketYears),
      evalYears: String(evalYears),
    });

    const es = new EventSource(`/api/testlab/evolve?${params}`);
    esRef.current = es;

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as {
          type: string;
          [k: string]: unknown;
        };
        if (data.type === "config") {
          const c = data.config as { generations?: number };
          setTotalGen(c.generations ?? gens);
          setStage("observing");
        } else if (data.type === "market_generated") {
          setMarket(data.data as typeof market);
          setStage("hypothesizing");
          setProgress("Market ready — testing genome hypotheses…");
        } else if (data.type === "generation_start") {
          setStage("experimenting");
          setCurrentGen((data.generation as number) ?? 0);
          setProgress(
            `Generation ${((data.generation as number) ?? 0) + 1}: backtesting…`,
          );
        } else if (data.type === "generation_done") {
          const row = data.data as GenRow;
          setGenerations((prev) => [
            ...prev,
            { ...row, generation: (data.generation as number) ?? prev.length },
          ]);
          setStage("analyzing");
          setProgress(
            `Gen ${((data.generation as number) ?? 0) + 1} — Sharpe ${row.bestSharpe?.toFixed?.(2) ?? "—"}`,
          );
        } else if (data.type === "complete") {
          setChampion(data.champion as Champion);
          setStage("complete");
          setRunning(false);
          const ch = data.champion as Champion;
          setProgress(
            `Done · Edge ${((ch.statisticalEdge ?? 0) * 100).toFixed(1)}% · WR ${((ch.winRate ?? 0) * 100).toFixed(0)}% · Kelly ${((ch.kellyOptimal ?? 0) * 100).toFixed(0)}%`,
          );
          es.close();
          esRef.current = null;
        } else if (data.type === "error") {
          setStage("error");
          setRunning(false);
          setProgress(`Error: ${String(data.error)}`);
          es.close();
          esRef.current = null;
        }
      } catch {
        /* ignore parse */
      }
    };

    es.onerror = () => {
      if (running || stage !== "complete") {
        setStage("error");
        setRunning(false);
        setProgress("Stream closed unexpectedly");
      }
      es.close();
      esRef.current = null;
    };
  }, [
    strategy,
    strategyId,
    dte,
    ticker,
    gens,
    pop,
    marketYears,
    evalYears,
    running,
    stage,
  ]);

  const fitData = generations.map((g, i) => ({
    gen: i + 1,
    best: +Number(g.bestFitness).toFixed(3),
    avg: +Number(g.avgFitness).toFixed(3),
  }));
  const sharpeData = generations.map((g, i) => ({
    gen: i + 1,
    best: +Number(g.bestSharpe).toFixed(2),
    avg: +Number(g.avgSharpe).toFixed(2),
  }));
  const equityData = useMemo(() => {
    if (!champion?.equity?.length) return [];
    const step = Math.max(1, Math.floor(champion.equity.length / 120));
    return champion.equity
      .filter((_, i) => i % step === 0)
      .map((v, i) => ({ day: i * step, equity: Math.round(v) }));
  }, [champion]);

  const profile = TICKER_PROFILES[ticker];
  const stageOrder = [
    "idle",
    "observing",
    "hypothesizing",
    "experimenting",
    "analyzing",
    "complete",
    "error",
  ];
  const idx = stageOrder.indexOf(stage);

  return (
    <div className="flex flex-col gap-4">
      <header className="os-panel p-4">
        <div className="os-kicker">Engine · Observe → Hypothesize → Experiment → Analyze → Iterate</div>
        <h2 className="text-lg font-medium m-0">
          Self-improving evolution engine
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1 m-0 max-w-3xl">
          Scientific method on <strong>synthetic</strong> markets: genome hypotheses,
          regime backtests, fitness ranking, evolutionary iterate. Educational only —
          no broker, no auto-trade. Champion genomes are lab artifacts, not live signals.
          Full tool page: <strong>/evolve</strong>.
        </p>
      </header>

      {/* Pipeline */}
      <div className="os-panel p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {STAGES.map((s) => {
            const active = stageOrder.indexOf(s.key) <= idx && stage !== "idle";
            const current = stage === s.key;
            return (
              <div
                key={s.key}
                className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                  current
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]"
                    : active
                      ? "border-[var(--border)] text-[var(--text-secondary)]"
                      : "border-transparent opacity-40 text-[var(--text-muted)]"
                }`}
              >
                {s.label}
              </div>
            );
          })}
          {running && (
            <span className="text-xs text-[var(--accent)] animate-pulse self-center">
              Running…
            </span>
          )}
        </div>
        <p className="text-sm m-0 text-[var(--text-secondary)]">{progress}</p>
        {running && totalGen > 0 && (
          <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${Math.min(100, ((currentGen + 1) / totalGen) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="os-panel p-4 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="os-label">
            DTE
            <div className="flex flex-wrap gap-1 mt-1">
              {AVAILABLE_DTES.map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={running}
                  className={`text-xs px-2 py-1 rounded border ${
                    dte === d
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "border-[var(--border)]"
                  }`}
                  onClick={() => setDte(d)}
                >
                  {dteLabel(d)}
                </button>
              ))}
            </div>
          </label>
          <label className="os-label">
            Strategy
            <select
              className="os-input mt-1 w-full text-sm"
              disabled={running}
              value={strategy?.id ?? ""}
              onChange={(e) => setStrategyId(e.target.value)}
            >
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName} ({s.riskReward})
                </option>
              ))}
            </select>
          </label>
          <label className="os-label">
            Ticker
            <select
              className="os-input mt-1 w-full text-sm"
              disabled={running}
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
            >
              {tickers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="os-label">
            Generations
            <input
              type="number"
              min={2}
              max={20}
              className="os-input mt-1 w-full"
              disabled={running}
              value={gens}
              onChange={(e) => setGens(+e.target.value)}
            />
          </label>
          <label className="os-label">
            Population
            <input
              type="number"
              min={4}
              max={16}
              className="os-input mt-1 w-full"
              disabled={running}
              value={pop}
              onChange={(e) => setPop(+e.target.value)}
            />
          </label>
          <label className="os-label">
            Market years
            <input
              type="number"
              min={5}
              max={80}
              className="os-input mt-1 w-full"
              disabled={running}
              value={marketYears}
              onChange={(e) => setMarketYears(+e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-col gap-2 justify-end">
          <button
            type="button"
            className="os-btn os-btn-primary px-4 py-2 disabled:opacity-50"
            disabled={running || !strategy}
            onClick={start}
          >
            {running ? "Evolving…" : "Run evolution"}
          </button>
          {profile && (
            <div className="text-[11px] text-[var(--text-muted)]">
              {profile.name} · IV {(profile.baseIV * 100).toFixed(0)}% · β{" "}
              {profile.beta.toFixed(2)} · {profile.riskLevel} risk
            </div>
          )}
        </div>
      </div>

      {strategy && (
        <p className="text-xs text-[var(--text-secondary)] m-0 px-1">
          {strategy.description_long}
        </p>
      )}

      {/* Metrics */}
      {champion && (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
          {[
            {
              l: "Edge",
              v: `${(champion.statisticalEdge * 100).toFixed(1)}%`,
              ok: champion.statisticalEdge > 0,
            },
            {
              l: "Win rate",
              v: `${(champion.winRate * 100).toFixed(0)}%`,
              ok: champion.winRate > 0.5,
            },
            {
              l: "Sharpe",
              v: champion.sharpe.toFixed(2),
              ok: champion.sharpe > 0,
            },
            {
              l: "Max DD",
              v: `${(champion.maxDD * 100).toFixed(1)}%`,
              ok: champion.maxDD < 0.25,
            },
            {
              l: "Kelly",
              v: `${(champion.kellyOptimal * 100).toFixed(0)}%`,
              ok: champion.kellyOptimal > 0,
            },
            {
              l: "Trades",
              v: String(champion.trades),
              ok: true,
            },
          ].map((m) => (
            <div key={m.l} className="os-metric">
              <div className="os-metric-label">{m.l}</div>
              <div
                className={`os-metric-value text-base ${
                  m.ok ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {m.v}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {fitData.length > 0 && (
          <div className="os-panel p-3">
            <div className="text-xs text-[var(--text-muted)] mb-2">
              Fitness by generation
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fitData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" />
                  <XAxis dataKey="gen" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="best"
                    stroke="#10b981"
                    fill="#10b98133"
                    name="Best"
                  />
                  <Area
                    type="monotone"
                    dataKey="avg"
                    stroke="#6366f1"
                    fill="#6366f133"
                    name="Avg"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {sharpeData.length > 0 && (
          <div className="os-panel p-3">
            <div className="text-xs text-[var(--text-muted)] mb-2">
              Sharpe by generation
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sharpeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" />
                  <XAxis dataKey="gen" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="best" fill="#10b981" name="Best" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="avg" fill="#f59e0b" name="Avg" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {equityData.length > 1 && (
          <div className="os-panel p-3 lg:col-span-2">
            <div className="text-xs text-[var(--text-muted)] mb-2">
              Champion equity curve (synthetic)
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [
                      `$${Number(v).toLocaleString()}`,
                      "Equity",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#10b981"
                    fill="#10b98122"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Regime + genome */}
      {champion?.regimeResults && (
        <div className="os-panel p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
            Per-regime performance
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(champion.regimeResults).map(([name, r]) => (
              <div
                key={name}
                className="rounded-lg border border-[var(--border)] p-3"
              >
                <div className="font-medium capitalize text-sm">{name}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  {r.trades} trades · {(r.winRate * 100).toFixed(0)}% WR
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {champion?.genome && (
        <div className="os-panel p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
            Evolved parameters (sample)
          </div>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            {Object.entries(champion.genome)
              .slice(0, 18)
              .map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-2 px-2 py-1 rounded bg-[var(--surface-2)]"
                >
                  <span className="text-[var(--text-muted)]">{k}</span>
                  <span className="font-mono">
                    {typeof v === "number"
                      ? v > 100
                        ? v.toFixed(0)
                        : v.toFixed(3)
                      : String(v)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {market && (
        <p className="text-[11px] text-[var(--text-muted)] m-0">
          Synthetic market: {market.totalDays} days · final $
          {market.finalPrice?.toFixed?.(2)} · max DD{" "}
          {((market.maxDrawdown ?? 0) * 100).toFixed(1)}% · sharpe{" "}
          {market.sharpeRatio?.toFixed?.(2)}
        </p>
      )}
    </div>
  );
}
