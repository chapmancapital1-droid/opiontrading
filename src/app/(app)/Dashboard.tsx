"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TradingViewChart from "@/components/TradingViewChart";
import TradingViewTimeline from "@/components/TradingViewTimeline";
import MarketSummary from "@/components/MarketSummary";
import MarketSnapshot from "@/components/MarketSnapshot";
import MarketContextPanel from "@/components/MarketContextPanel";
import CommandRitual from "@/components/CommandRitual";
import BrainRecommendPanel from "@/components/BrainRecommendPanel";
import SpyCommandPanel from "@/components/SpyCommandPanel";
import DirectionBiasPanel from "@/components/DirectionBiasPanel";
import RhHistoryLessonsPanel from "@/components/RhHistoryLessonsPanel";
import { isSpySymbol } from "@/knowledge/spyPlaybook";
import {
  AI_COPILOT_CHARTER,
  NEWDUMP_LIBRARY_META,
  NEWDUMP_RULES,
} from "@/knowledge/newdumpRules";
import {
  TRADINGAGENTS_META,
  TRADINGAGENTS_REJECT,
  TRADINGAGENTS_SKILL_PR_GATES,
} from "@/knowledge/tradingAgentsPolicy";
import {
  VIBETRADING_META,
  VIBETRADING_REJECT,
  VIBETRADING_SKILL_PR_GATES,
} from "@/knowledge/vibeTradingPolicy";
import {
  formatTradingAgentsSkillPRMarkdown,
  formatVibeTradingSkillPRMarkdown,
  listPostTradeReviews,
  listPreTradePlans,
  listTradingAgentsSkillPRs,
  listVibeTradingSkillPRs,
  savePostTradeReview,
  savePreTradePlan,
  saveTradingAgentsSkillPR,
  saveVibeTradingSkillPR,
  TRADINGAGENTS_ROLES,
  VIBETRADING_TEMPLATES,
  type PostTradeReview,
  type PreTradePlan,
  type TradingAgentsSkillPR,
  type VibeTradingSkillPR,
} from "@/lib/playbookForms";
import {
  STRATEGY_PICKER,
  STRATEGY_PICKER_GROUPS,
} from "@/lib/strategyCatalog";

type TabId =
  | "cockpit"
  | "bias"
  | "spy"
  | "lessons"
  | "brain"
  | "library"
  | "playbook";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "cockpit", label: "Cockpit", icon: "ti-chart-candle" },
  { id: "bias", label: "Bias", icon: "ti-arrows-up-down" },
  { id: "spy", label: "SPY", icon: "ti-chart-line" },
  { id: "lessons", label: "Lessons", icon: "ti-school" },
  { id: "brain", label: "Brain", icon: "ti-brain" },
  { id: "library", label: "Library", icon: "ti-books" },
  { id: "playbook", label: "Playbook", icon: "ti-clipboard-check" },
];

const QUICK = [
  {
    href: "/scanner",
    title: "Strategy Scanner",
    desc: "Finviz-for-options: filter by strategy → ≤15 tickers $8–$150.",
  },
  { href: "/builder", title: "Trade Lab", desc: "Recommend → lock strikes → model backtest." },
  {
    href: "/evolve",
    title: "Evolve Lab",
    desc: "Synthetic self-improve lab (workspace-0890ad1c). Not live signals.",
  },
  { href: "/library", title: "Full library", desc: "Newdump catalog + active rules." },
  { href: "/journal", title: "Journal", desc: "Plan → open → close. Forecast vs outcome." },
  { href: "/education", title: "Education", desc: "Empire field manual · profit process." },
];

export default function Dashboard() {
  const [tab, setTab] = useState<TabId>("cockpit");
  const [input, setInput] = useState("NASDAQ:AAPL");
  const [symbol, setSymbol] = useState("NASDAQ:AAPL");
  const bare = useMemo(() => symbol.split(":").pop() || symbol, [symbol]);

  // Playbook form state
  const [preMsg, setPreMsg] = useState("");
  const [postMsg, setPostMsg] = useState("");
  const [pre, setPre] = useState({
    symbol: bare,
    strategyId: "bull_put_credit",
    thesis: "",
    ivRegime: "elevated",
    maxLoss: 200,
    maxProfit: 50,
    breakEvens: "",
    dte: 30,
    exitPlan: "Close at 50% of max credit or by 21 DTE",
    eventClear: true,
    sizeContracts: 1,
  });
  const [post, setPost] = useState({
    symbol: bare,
    strategyId: "bull_put_credit",
    realizedPL: 0,
    heldDays: 7,
    forecastPoP: 0.6,
    whatWorked: "",
    whatFailed: "",
    ruleToKeep: "",
  });

  const [preList, setPreList] = useState<PreTradePlan[]>([]);
  const [postList, setPostList] = useState<PostTradeReview[]>([]);
  const [taMsg, setTaMsg] = useState("");
  const [taList, setTaList] = useState<TradingAgentsSkillPR[]>([]);
  const [ta, setTa] = useState({
    skillName: "tradingagents-soft-bias",
    upstreamRef: "v0.3.1",
    symbol: bare,
    analysisDate: new Date().toISOString().slice(0, 10),
    rolesUsed: ["sentiment_analyst", "bull_researcher", "bear_researcher", "risk_management"] as string[],
    llmProvider: "openai_compatible",
    llmModel: "local-or-cloud",
    empireMode: "research_only" as const,
    agentDecision: "",
    bullCase: "",
    bearCase: "",
    riskNote: "",
    proposedStrategyId: "bull_put_credit",
    definedRiskOnly: true,
    noAutoBroker: true,
    noInventedMarks: true,
    humanFillRequired: true,
    journalLogged: false,
    nciOrContextOk: false,
    prDecision: "request_changes" as const,
    prRationale: "",
    filesTouched: "",
  });
  const [vtMsg, setVtMsg] = useState("");
  const [vtList, setVtList] = useState<VibeTradingSkillPR[]>([]);
  const [vt, setVt] = useState({
    skillName: "vibetrading-offline-research",
    upstreamRef: "v0.3.0",
    nlPrompt: "",
    asset: "BTC",
    interval: "1h",
    templateUsed: "momentum",
    llmProvider: "anthropic",
    llmModel: "claude-sonnet",
    empireMode: "research_only" as const,
    validationStatus: "not_run" as const,
    validationNotes: "",
    backtestSharpe: null as number | null,
    backtestMaxDd: null as number | null,
    backtestWinRate: null as number | null,
    backtestNotes: "",
    cryptoOnlyResearch: true,
    noWalletKeys: true,
    validateBeforeRun: true,
    noEmpireLiveDeploy: true,
    definedRiskNote: true,
    humanFillRequired: true,
    prDecision: "request_changes" as const,
    prRationale: "",
    filesTouched: "",
  });

  useEffect(() => {
    setPreList(listPreTradePlans());
    setPostList(listPostTradeReviews());
    setTaList(listTradingAgentsSkillPRs());
    setVtList(listVibeTradingSkillPRs());
  }, []);

  function toggleTaRole(role: string) {
    setTa((prev) => ({
      ...prev,
      rolesUsed: prev.rolesUsed.includes(role)
        ? prev.rolesUsed.filter((r) => r !== role)
        : [...prev.rolesUsed, role],
    }));
  }

  return (
    <div className="zone-cockpit flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="os-kicker">Command Center</div>
          <h1 className="text-2xl font-medium tracking-tight m-0">Empire market cockpit</h1>
          <p className="text-xs text-[var(--text-muted)] m-0 mt-1">
            Tabs from newdump knowledge map · option-profit process over prediction
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const s = input.trim().toUpperCase();
            if (s) {
              setSymbol(s);
              const bareSym = s.split(":").pop() || s;
              setPre((p) => ({ ...p, symbol: bareSym }));
              setPost((p) => ({ ...p, symbol: bareSym }));
              // Searching SPY jumps to the SPY advanced tab
              if (isSpySymbol(bareSym)) setTab("spy");
            }
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. SPY or NASDAQ:AAPL"
            aria-label="Symbol"
            className="os-input w-48"
          />
          <button type="submit" className="os-btn os-btn-primary">
            Load
          </button>
          <button
            type="button"
            className="os-btn text-xs"
            onClick={() => {
              setInput("AMEX:SPY");
              setSymbol("AMEX:SPY");
              setPre((p) => ({ ...p, symbol: "SPY" }));
              setPost((p) => ({ ...p, symbol: "SPY" }));
              setTab("spy");
            }}
          >
            SPY
          </button>
          <Link
            href="/scanner"
            className="os-btn os-btn-primary text-xs no-underline inline-flex items-center gap-1"
          >
            <i className="ti ti-filter" aria-hidden />
            Strategy filter
          </Link>
        </form>
      </div>

      {/* Tab bar */}
      <div
        className="flex flex-wrap gap-1 p-1 rounded-xl border"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        role="tablist"
        aria-label="Command center sections"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`os-btn text-xs py-1.5 px-3 ${active ? "os-btn-primary" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <i className={`ti ${t.icon} mr-1`} aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "cockpit" && (
        <>
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
              <Link
                key={q.href}
                href={q.href}
                className="os-panel p-4 no-underline hover:border-[var(--border-accent)] transition-colors block"
              >
                <div className="font-medium text-[var(--text-primary)]">{q.title}</div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">{q.desc}</div>
              </Link>
            ))}
          </section>
        </>
      )}

      {tab === "bias" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--text-muted)] m-0">
            NCI direction bias for <strong>{bare}</strong> — change the symbol box above and Load to
            switch tickers. Same SuperBias / ports / voters language as your forex trade assistant.
          </p>
          <DirectionBiasPanel symbol={symbol} />
        </div>
      )}

      {tab === "spy" && (
        <SpyCommandPanel
          symbol={symbol}
          onUseSpy={() => {
            setInput("AMEX:SPY");
            setSymbol("AMEX:SPY");
            setPre((p) => ({ ...p, symbol: "SPY" }));
            setPost((p) => ({ ...p, symbol: "SPY" }));
          }}
        />
      )}

      {tab === "lessons" && <RhHistoryLessonsPanel symbol={bare} />}

      {tab === "brain" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1.1fr]">
          <section className="os-panel p-4 flex flex-col gap-3">
            <h2 className="text-base font-medium m-0">Profit obsession charter</h2>
            <p className="text-xs text-[var(--text-secondary)] m-0">
              Brain is trained to rank structures that fit IV + trend + capital ladder — with defined
              risk when seed equity is small. Hit Recommend in Trade Lab for full lock + backtest.
              Search <strong>SPY</strong> for the advanced 1DTE playbook on each recommendation.
            </p>
            <ul className="text-sm text-[var(--text-secondary)] m-0 pl-4 list-disc space-y-1">
              {AI_COPILOT_CHARTER.bullets.map((b) => (
                <li key={b.slice(0, 40)}>{b}</li>
              ))}
            </ul>
            <div className="text-xs text-[var(--text-muted)]">
              Newdump rules loaded: {NEWDUMP_RULES.length} · root{" "}
              <code>{NEWDUMP_LIBRARY_META.root}</code>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/builder" className="os-btn os-btn-primary text-center no-underline">
                Open Trade Lab · Recommend
              </Link>
              <button
                type="button"
                className="os-btn text-xs"
                onClick={() => {
                  setInput("AMEX:SPY");
                  setSymbol("AMEX:SPY");
                  setTab("spy");
                }}
              >
                Open SPY tab
              </button>
            </div>
          </section>
          <div>
            <BrainRecommendPanel symbol={bare} />
          </div>
        </div>
      )}

      {tab === "library" && (
        <div className="flex flex-col gap-3">
          <section className="os-panel p-4">
            <h2 className="text-base font-medium m-0 mb-2">Slow ingest status</h2>
            <p className="text-sm text-[var(--text-secondary)] m-0">
              Indexed options / vol / AI titles from the local dump. Structured rules feed the
              selector; full copyrighted text is not copied into the app.
            </p>
            <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
              <div className="os-metric">
                <div className="os-metric-label">Newdump rules</div>
                <div className="os-metric-value">{NEWDUMP_RULES.length}</div>
              </div>
              <div className="os-metric">
                <div className="os-metric-label">Focus</div>
                <div className="os-metric-value text-sm">Option profits</div>
              </div>
            </div>
            <Link href="/library" className="os-btn mt-3 inline-block no-underline text-center">
              Browse full catalog →
            </Link>
          </section>
          <section className="os-panel p-4">
            <h2 className="text-base font-medium m-0 mb-2">Top profit rules (sample)</h2>
            <div className="flex flex-col gap-2">
              {NEWDUMP_RULES.slice(0, 4).map((r) => (
                <div key={r.id} className="text-sm border border-[var(--border)] rounded-lg p-2.5">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{r.strategyId}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "playbook" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Pre-trade form */}
          <form
            className="os-panel p-4 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              savePreTradePlan({
                ...pre,
                maxProfit: pre.maxProfit || null,
              });
              setPreList(listPreTradePlans());
              setPreMsg("Saved pre-trade plan locally.");
            }}
          >
            <h2 className="text-base font-medium m-0">Pre-trade plan form</h2>
            <p className="text-[11px] text-[var(--text-muted)] m-0">
              From library discipline: define risk window before any fill.
            </p>
            <label className="os-label">
              Symbol
              <input
                className="os-input mt-1 w-full"
                value={pre.symbol}
                onChange={(e) => setPre({ ...pre, symbol: e.target.value.toUpperCase() })}
                required
              />
            </label>
            <label className="os-label">
              Strategy
              <select
                className="os-input mt-1 w-full"
                value={pre.strategyId}
                onChange={(e) => setPre({ ...pre, strategyId: e.target.value })}
              >
                {STRATEGY_PICKER_GROUPS.map((g) => (
                  <optgroup key={g} label={g}>
                    {STRATEGY_PICKER.filter((s) => s.group === g).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="os-label">
              Thesis
              <textarea
                className="os-input mt-1 w-full min-h-[60px]"
                value={pre.thesis}
                onChange={(e) => setPre({ ...pre, thesis: e.target.value })}
                required
              />
            </label>
            <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <label className="os-label">
                IV regime
                <select
                  className="os-input mt-1 w-full"
                  value={pre.ivRegime}
                  onChange={(e) => setPre({ ...pre, ivRegime: e.target.value })}
                >
                  <option value="elevated">elevated</option>
                  <option value="neutral">neutral</option>
                  <option value="low">low</option>
                </select>
              </label>
              <label className="os-label">
                DTE
                <input
                  className="os-input mt-1 w-full"
                  type="number"
                  value={pre.dte}
                  onChange={(e) => setPre({ ...pre, dte: +e.target.value })}
                  required
                />
              </label>
              <label className="os-label">
                Max loss $
                <input
                  className="os-input mt-1 w-full"
                  type="number"
                  value={pre.maxLoss}
                  onChange={(e) => setPre({ ...pre, maxLoss: +e.target.value })}
                  required
                />
              </label>
              <label className="os-label">
                Max profit $
                <input
                  className="os-input mt-1 w-full"
                  type="number"
                  value={pre.maxProfit}
                  onChange={(e) => setPre({ ...pre, maxProfit: +e.target.value })}
                />
              </label>
              <label className="os-label">
                Contracts
                <input
                  className="os-input mt-1 w-full"
                  type="number"
                  min={0}
                  value={pre.sizeContracts}
                  onChange={(e) => setPre({ ...pre, sizeContracts: +e.target.value })}
                />
              </label>
              <label className="os-label">
                Break-evens
                <input
                  className="os-input mt-1 w-full"
                  value={pre.breakEvens}
                  onChange={(e) => setPre({ ...pre, breakEvens: e.target.value })}
                />
              </label>
            </div>
            <label className="os-label">
              Exit plan
              <textarea
                className="os-input mt-1 w-full min-h-[52px]"
                value={pre.exitPlan}
                onChange={(e) => setPre({ ...pre, exitPlan: e.target.value })}
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={pre.eventClear}
                onChange={(e) => setPre({ ...pre, eventClear: e.target.checked })}
              />
              Clear of earnings / hard catalysts
            </label>
            <button type="submit" className="os-btn os-btn-primary">
              Save pre-trade plan
            </button>
            {preMsg && <div className="text-xs text-[var(--text-success)]">{preMsg}</div>}
            {preList.length > 0 && (
              <div className="text-[11px] text-[var(--text-muted)]">
                Recent: {preList.slice(0, 3).map((p) => `${p.symbol}/${p.strategyId}`).join(" · ")}
              </div>
            )}
          </form>

          {/* Post-trade form */}
          <form
            className="os-panel p-4 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              savePostTradeReview({
                ...post,
                heldDays: post.heldDays,
                forecastPoP: post.forecastPoP,
              });
              setPostList(listPostTradeReviews());
              setPostMsg("Saved post-trade review locally.");
            }}
          >
            <h2 className="text-base font-medium m-0">Post-trade review form</h2>
            <p className="text-[11px] text-[var(--text-muted)] m-0">
              Calibrate the brain: forecast vs realized. What rule do you keep?
            </p>
            <label className="os-label">
              Symbol
              <input
                className="os-input mt-1 w-full"
                value={post.symbol}
                onChange={(e) => setPost({ ...post, symbol: e.target.value.toUpperCase() })}
                required
              />
            </label>
            <label className="os-label">
              Strategy
              <select
                className="os-input mt-1 w-full"
                value={post.strategyId}
                onChange={(e) => setPost({ ...post, strategyId: e.target.value })}
                required
              >
                {STRATEGY_PICKER_GROUPS.map((g) => (
                  <optgroup key={g} label={g}>
                    {STRATEGY_PICKER.filter((s) => s.group === g).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <label className="os-label">
                Realized P/L $
                <input
                  className="os-input mt-1 w-full"
                  type="number"
                  value={post.realizedPL}
                  onChange={(e) => setPost({ ...post, realizedPL: +e.target.value })}
                  required
                />
              </label>
              <label className="os-label">
                Days held
                <input
                  className="os-input mt-1 w-full"
                  type="number"
                  value={post.heldDays}
                  onChange={(e) => setPost({ ...post, heldDays: +e.target.value })}
                />
              </label>
              <label className="os-label">
                Forecast PoP
                <input
                  className="os-input mt-1 w-full"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={post.forecastPoP}
                  onChange={(e) => setPost({ ...post, forecastPoP: +e.target.value })}
                />
              </label>
            </div>
            <label className="os-label">
              What worked
              <textarea
                className="os-input mt-1 w-full min-h-[52px]"
                value={post.whatWorked}
                onChange={(e) => setPost({ ...post, whatWorked: e.target.value })}
              />
            </label>
            <label className="os-label">
              What failed
              <textarea
                className="os-input mt-1 w-full min-h-[52px]"
                value={post.whatFailed}
                onChange={(e) => setPost({ ...post, whatFailed: e.target.value })}
              />
            </label>
            <label className="os-label">
              Rule to keep / change
              <textarea
                className="os-input mt-1 w-full min-h-[52px]"
                value={post.ruleToKeep}
                onChange={(e) => setPost({ ...post, ruleToKeep: e.target.value })}
                required
              />
            </label>
            <button type="submit" className="os-btn os-btn-primary">
              Save post-trade review
            </button>
            {postMsg && <div className="text-xs text-[var(--text-success)]">{postMsg}</div>}
            {postList.length > 0 && (
              <div className="text-[11px] text-[var(--text-muted)]">
                Recent:{" "}
                {postList
                  .slice(0, 3)
                  .map((p) => `${p.symbol} ${p.realizedPL >= 0 ? "+" : ""}${p.realizedPL}`)
                  .join(" · ")}
              </div>
            )}
          </form>

          {/* TradingAgents skill PR form */}
          <form
            className="os-panel p-4 flex flex-col gap-2 lg:col-span-2"
            onSubmit={(e) => {
              e.preventDefault();
              const row = saveTradingAgentsSkillPR({ ...ta });
              setTaList(listTradingAgentsSkillPRs());
              setTaMsg(`Saved skill PR gate · ${row.prDecision} · ${row.skillName}`);
            }}
          >
            <h2 className="text-base font-medium m-0">TradingAgents skill PR form</h2>
            <p className="text-[11px] text-[var(--text-muted)] m-0">
              Gate multi-agent LLM research from{" "}
              <a
                className="underline"
                href={TRADINGAGENTS_META.repo}
                target="_blank"
                rel="noreferrer"
              >
                TauricResearch/TradingAgents
              </a>{" "}
              before any empire skill merge. Research / soft-bias only — never auto-execute.
            </p>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <label className="os-label">
                Skill name
                <input
                  className="os-input mt-1 w-full"
                  value={ta.skillName}
                  onChange={(e) => setTa({ ...ta, skillName: e.target.value })}
                  required
                />
              </label>
              <label className="os-label">
                Upstream ref (tag/commit)
                <input
                  className="os-input mt-1 w-full"
                  value={ta.upstreamRef}
                  onChange={(e) => setTa({ ...ta, upstreamRef: e.target.value })}
                  required
                />
              </label>
              <label className="os-label">
                Symbol
                <input
                  className="os-input mt-1 w-full"
                  value={ta.symbol}
                  onChange={(e) => setTa({ ...ta, symbol: e.target.value.toUpperCase() })}
                  required
                />
              </label>
              <label className="os-label">
                Analysis date
                <input
                  className="os-input mt-1 w-full"
                  type="date"
                  value={ta.analysisDate}
                  onChange={(e) => setTa({ ...ta, analysisDate: e.target.value })}
                  required
                />
              </label>
              <label className="os-label">
                LLM provider
                <input
                  className="os-input mt-1 w-full"
                  value={ta.llmProvider}
                  onChange={(e) => setTa({ ...ta, llmProvider: e.target.value })}
                />
              </label>
              <label className="os-label">
                Model
                <input
                  className="os-input mt-1 w-full"
                  value={ta.llmModel}
                  onChange={(e) => setTa({ ...ta, llmModel: e.target.value })}
                />
              </label>
              <label className="os-label">
                Empire mode
                <select
                  className="os-input mt-1 w-full"
                  value={ta.empireMode}
                  onChange={(e) =>
                    setTa({
                      ...ta,
                      empireMode: e.target.value as typeof ta.empireMode,
                    })
                  }
                >
                  <option value="research_only">research_only</option>
                  <option value="soft_bias">soft_bias</option>
                  <option value="blocked_auto_exec">blocked_auto_exec</option>
                </select>
              </label>
              <label className="os-label">
                Proposed strategy
                <select
                  className="os-input mt-1 w-full"
                  value={ta.proposedStrategyId}
                  onChange={(e) => setTa({ ...ta, proposedStrategyId: e.target.value })}
                >
                  <option value="">(none)</option>
                  {STRATEGY_PICKER.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="os-label">
                PR decision
                <select
                  className="os-input mt-1 w-full"
                  value={ta.prDecision}
                  onChange={(e) =>
                    setTa({
                      ...ta,
                      prDecision: e.target.value as typeof ta.prDecision,
                    })
                  }
                >
                  <option value="approve_skill">approve_skill</option>
                  <option value="request_changes">request_changes</option>
                  <option value="reject">reject</option>
                </select>
              </label>
            </div>

            <div className="text-xs font-medium mt-1">Roles mirrored (TradingAgents firm)</div>
            <div className="flex flex-wrap gap-2">
              {TRADINGAGENTS_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] border border-[var(--border)] rounded-md px-2 py-1"
                >
                  <input
                    type="checkbox"
                    checked={ta.rolesUsed.includes(role)}
                    onChange={() => toggleTaRole(role)}
                  />
                  {role}
                </label>
              ))}
            </div>

            <label className="os-label">
              Agent decision (paste)
              <textarea
                className="os-input mt-1 w-full min-h-[56px]"
                value={ta.agentDecision}
                onChange={(e) => setTa({ ...ta, agentDecision: e.target.value })}
                placeholder="BUY / HOLD / SELL · rating · size rationale…"
              />
            </label>
            <div className="grid gap-2 lg:grid-cols-3">
              <label className="os-label">
                Bull case
                <textarea
                  className="os-input mt-1 w-full min-h-[52px]"
                  value={ta.bullCase}
                  onChange={(e) => setTa({ ...ta, bullCase: e.target.value })}
                />
              </label>
              <label className="os-label">
                Bear case
                <textarea
                  className="os-input mt-1 w-full min-h-[52px]"
                  value={ta.bearCase}
                  onChange={(e) => setTa({ ...ta, bearCase: e.target.value })}
                />
              </label>
              <label className="os-label">
                Risk note
                <textarea
                  className="os-input mt-1 w-full min-h-[52px]"
                  value={ta.riskNote}
                  onChange={(e) => setTa({ ...ta, riskNote: e.target.value })}
                />
              </label>
            </div>

            <div className="text-xs font-medium mt-1">Empire gates (all must hold to approve)</div>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-[11px] text-[var(--text-secondary)]">
              {(
                [
                  ["definedRiskOnly", "Defined-risk only (seed)"],
                  ["noAutoBroker", "No auto-broker / no RH API"],
                  ["noInventedMarks", "No invented strikes/marks"],
                  ["humanFillRequired", "Human fill required"],
                  ["journalLogged", "Journal logged"],
                  ["nciOrContextOk", "NCI / MarketContext OK"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ta[key]}
                    onChange={(e) => setTa({ ...ta, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] m-0">
              Gate legend: {TRADINGAGENTS_SKILL_PR_GATES.join(" · ")}
            </p>

            <label className="os-label">
              PR rationale
              <textarea
                className="os-input mt-1 w-full min-h-[52px]"
                value={ta.prRationale}
                onChange={(e) => setTa({ ...ta, prRationale: e.target.value })}
                required
              />
            </label>
            <label className="os-label">
              Files touched
              <textarea
                className="os-input mt-1 w-full min-h-[44px] font-mono text-[11px]"
                value={ta.filesTouched}
                onChange={(e) => setTa({ ...ta, filesTouched: e.target.value })}
                placeholder=".grok/skills/…&#10;src/…"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="os-btn os-btn-primary">
                Save skill PR gate
              </button>
              <button
                type="button"
                className="os-btn"
                onClick={() => {
                  const draft: TradingAgentsSkillPR = {
                    ...ta,
                    id: "draft",
                    createdAt: new Date().toISOString(),
                  };
                  const md = formatTradingAgentsSkillPRMarkdown(draft);
                  void navigator.clipboard.writeText(md);
                  setTaMsg("PR markdown copied to clipboard.");
                }}
              >
                Copy PR markdown
              </button>
            </div>
            {taMsg && <div className="text-xs text-[var(--text-success)]">{taMsg}</div>}
            {taList.length > 0 && (
              <div className="text-[11px] text-[var(--text-muted)]">
                Recent:{" "}
                {taList
                  .slice(0, 4)
                  .map((p) => `${p.skillName}→${p.prDecision}`)
                  .join(" · ")}
              </div>
            )}
            <ul className="text-[10px] text-[var(--text-muted)] m-0 pl-4 list-disc">
              {TRADINGAGENTS_REJECT.slice(0, 4).map((r) => (
                <li key={r.slice(0, 40)}>{r}</li>
              ))}
            </ul>
          </form>

          {/* VibeTrading skill PR form */}
          <form
            className="os-panel p-4 flex flex-col gap-2 lg:col-span-2"
            onSubmit={(e) => {
              e.preventDefault();
              const row = saveVibeTradingSkillPR({ ...vt });
              setVtList(listVibeTradingSkillPRs());
              setVtMsg(`Saved VibeTrading skill PR · ${row.prDecision} · ${row.skillName}`);
            }}
          >
            <h2 className="text-base font-medium m-0">VibeTrading skill PR form</h2>
            <p className="text-[11px] text-[var(--text-muted)] m-0">
              Gate prompt→code→backtest skills from{" "}
              <a className="underline" href={VIBETRADING_META.repo} target="_blank" rel="noreferrer">
                VibeTradingLabs/vibetrading
              </a>{" "}
              (crypto). Offline research only — <strong>no live wallet deploy</strong> into empire.
            </p>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <label className="os-label">
                Skill name
                <input
                  className="os-input mt-1 w-full"
                  value={vt.skillName}
                  onChange={(e) => setVt({ ...vt, skillName: e.target.value })}
                  required
                />
              </label>
              <label className="os-label">
                Upstream ref
                <input
                  className="os-input mt-1 w-full"
                  value={vt.upstreamRef}
                  onChange={(e) => setVt({ ...vt, upstreamRef: e.target.value })}
                  required
                />
              </label>
              <label className="os-label">
                Asset
                <input
                  className="os-input mt-1 w-full"
                  value={vt.asset}
                  onChange={(e) => setVt({ ...vt, asset: e.target.value.toUpperCase() })}
                />
              </label>
              <label className="os-label">
                Interval
                <input
                  className="os-input mt-1 w-full"
                  value={vt.interval}
                  onChange={(e) => setVt({ ...vt, interval: e.target.value })}
                />
              </label>
              <label className="os-label">
                Template
                <select
                  className="os-input mt-1 w-full"
                  value={vt.templateUsed}
                  onChange={(e) => setVt({ ...vt, templateUsed: e.target.value })}
                >
                  {VIBETRADING_TEMPLATES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="os-label">
                Empire mode
                <select
                  className="os-input mt-1 w-full"
                  value={vt.empireMode}
                  onChange={(e) =>
                    setVt({
                      ...vt,
                      empireMode: e.target.value as typeof vt.empireMode,
                    })
                  }
                >
                  <option value="research_only">research_only</option>
                  <option value="backtest_offline">backtest_offline</option>
                  <option value="blocked_live_deploy">blocked_live_deploy</option>
                </select>
              </label>
              <label className="os-label">
                Validation
                <select
                  className="os-input mt-1 w-full"
                  value={vt.validationStatus}
                  onChange={(e) =>
                    setVt({
                      ...vt,
                      validationStatus: e.target.value as typeof vt.validationStatus,
                    })
                  }
                >
                  <option value="not_run">not_run</option>
                  <option value="valid">valid</option>
                  <option value="warnings">warnings</option>
                  <option value="errors">errors</option>
                </select>
              </label>
              <label className="os-label">
                PR decision
                <select
                  className="os-input mt-1 w-full"
                  value={vt.prDecision}
                  onChange={(e) =>
                    setVt({
                      ...vt,
                      prDecision: e.target.value as typeof vt.prDecision,
                    })
                  }
                >
                  <option value="approve_skill">approve_skill</option>
                  <option value="request_changes">request_changes</option>
                  <option value="reject">reject</option>
                </select>
              </label>
            </div>
            <label className="os-label">
              NL prompt (strategy description)
              <textarea
                className="os-input mt-1 w-full min-h-[56px]"
                value={vt.nlPrompt}
                onChange={(e) => setVt({ ...vt, nlPrompt: e.target.value })}
                placeholder="BTC momentum: RSI oversold, SMA cross, TP/SL…"
              />
            </label>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
              <label className="os-label">
                Sharpe
                <input
                  className="os-input mt-1 w-full"
                  type="number"
                  step="0.01"
                  value={vt.backtestSharpe ?? ""}
                  onChange={(e) =>
                    setVt({
                      ...vt,
                      backtestSharpe: e.target.value === "" ? null : +e.target.value,
                    })
                  }
                />
              </label>
              <label className="os-label">
                Max DD
                <input
                  className="os-input mt-1 w-full"
                  type="number"
                  step="0.01"
                  value={vt.backtestMaxDd ?? ""}
                  onChange={(e) =>
                    setVt({
                      ...vt,
                      backtestMaxDd: e.target.value === "" ? null : +e.target.value,
                    })
                  }
                />
              </label>
              <label className="os-label">
                Win rate
                <input
                  className="os-input mt-1 w-full"
                  type="number"
                  step="0.01"
                  value={vt.backtestWinRate ?? ""}
                  onChange={(e) =>
                    setVt({
                      ...vt,
                      backtestWinRate: e.target.value === "" ? null : +e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <label className="os-label">
              Backtest / validation notes
              <textarea
                className="os-input mt-1 w-full min-h-[44px]"
                value={vt.backtestNotes || vt.validationNotes}
                onChange={(e) =>
                  setVt({ ...vt, backtestNotes: e.target.value, validationNotes: e.target.value })
                }
              />
            </label>
            <div className="text-xs font-medium">Empire gates</div>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-[11px] text-[var(--text-secondary)]">
              {(
                [
                  ["cryptoOnlyResearch", "Crypto research only (not RH options auto)"],
                  ["noWalletKeys", "No wallet / private keys"],
                  ["validateBeforeRun", "Validate before run"],
                  ["noEmpireLiveDeploy", "No empire live deploy"],
                  ["definedRiskNote", "Defined-risk if mapping to options"],
                  ["humanFillRequired", "Human fill required"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={vt[key]}
                    onChange={(e) => setVt({ ...vt, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] m-0">
              {VIBETRADING_SKILL_PR_GATES.join(" · ")}
            </p>
            <label className="os-label">
              PR rationale
              <textarea
                className="os-input mt-1 w-full min-h-[52px]"
                value={vt.prRationale}
                onChange={(e) => setVt({ ...vt, prRationale: e.target.value })}
                required
              />
            </label>
            <label className="os-label">
              Files touched
              <textarea
                className="os-input mt-1 w-full min-h-[40px] font-mono text-[11px]"
                value={vt.filesTouched}
                onChange={(e) => setVt({ ...vt, filesTouched: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="os-btn os-btn-primary">
                Save VibeTrading skill PR
              </button>
              <button
                type="button"
                className="os-btn"
                onClick={() => {
                  const draft: VibeTradingSkillPR = {
                    ...vt,
                    id: "draft",
                    createdAt: new Date().toISOString(),
                  };
                  void navigator.clipboard.writeText(formatVibeTradingSkillPRMarkdown(draft));
                  setVtMsg("VibeTrading PR markdown copied.");
                }}
              >
                Copy PR markdown
              </button>
            </div>
            {vtMsg && <div className="text-xs text-[var(--text-success)]">{vtMsg}</div>}
            {vtList.length > 0 && (
              <div className="text-[11px] text-[var(--text-muted)]">
                Recent:{" "}
                {vtList
                  .slice(0, 4)
                  .map((p) => `${p.skillName}→${p.prDecision}`)
                  .join(" · ")}
              </div>
            )}
            <ul className="text-[10px] text-[var(--text-muted)] m-0 pl-4 list-disc">
              {VIBETRADING_REJECT.slice(0, 4).map((r) => (
                <li key={r.slice(0, 48)}>{r}</li>
              ))}
            </ul>
          </form>
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)]">
        Educational companion only — not investment advice. No auto-trade. Charts are live market
        reference; chains come from your data provider.
      </p>
    </div>
  );
}
