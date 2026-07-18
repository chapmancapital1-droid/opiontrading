/**
 * Policy for VibeTradingLabs/vibetrading
 * https://github.com/VibeTradingLabs/vibetrading
 *
 * Agent-first crypto framework: natural language → LLM generates Python strategy
 * → static validate → backtest → (optional) live deploy on Hyperliquid/Paradex/etc.
 *
 * Empire stance: offline research / skill hygiene only.
 * NOT equity options, NOT Robinhood, NOT seed-stage live crypto leverage.
 */

export const VIBETRADING_META = {
  repo: "https://github.com/VibeTradingLabs/vibetrading",
  git: "https://github.com/VibeTradingLabs/vibetrading.git",
  site: "https://vibetrading.dev",
  license: "MIT",
  language: "Python >= 3.10",
  focus: "crypto_perp_prompt_to_strategy_backtest_live",
  skillUpstream: "skills/vibetrading/SKILL.md in that repo",
} as const;

/** Pipeline stages (from their DESIGN/README) */
export const VIBETRADING_PIPELINE = [
  "Describe (NL prompt)",
  "Generate (LLM → @vibe Python)",
  "Validate (static analysis)",
  "Backtest (OHLCV + slippage/fees)",
  "Analyze (LLM score/suggestions)",
  "Deploy live (Hyperliquid, Paradex, Lighter, Aster) — EMPIRE BLOCKED",
] as const;

export const VIBETRADING_PULL = [
  "Prompt → structured code → validate before run (mirrors our pre-trade form discipline)",
  "Static validator catches missing risk management before execution",
  "Backtest metrics literacy: Sharpe, Sortino, Calmar, max DD, win rate, expectancy",
  "Same strategy path for sim vs live (sandbox abstraction) — idea only; we keep RH manual",
  "Position sizing helpers (Kelly half, risk-per-trade) as education — empire uses % equity caps",
  "Agent skill packaging (skills/vibetrading) as a pattern for OptionScope Grok skills",
] as const;

export const VIBETRADING_REJECT = [
  "pip install vibetrading into OptionScope production runtime",
  "Live crypto leverage / wallet private keys in empire companion",
  "LLM-generated strategy code as RH options order tickets",
  "Perp long/short templates as seed equity option primary book",
  "Auto-deploy pipeline without human RH checklist",
  "3x leverage / grid / DCA crypto bots for $500–$5k options ladder",
] as const;

export const VIBETRADING_SKILL_PR_GATES = [
  "cryptoOnlyResearch — skill labeled crypto research, not RH options auto",
  "noWalletKeys — no private keys or exchange secrets in repo/prompts",
  "validateBeforeRun — static validation + backtest before any live claim",
  "noEmpireLiveDeploy — blocked_auto_exec for live.start / exchange adapters",
  "definedRiskNote — if mapping ideas to options, only defined-risk structures",
  "humanFillRequired — human owns any real capital action",
] as const;

/** Map vibetrading concepts → OptionScope (soft) */
export const VIBETRADING_ROLE_MAP = [
  {
    vibe: "NL strategy generate",
    empire: "Education / idea capture only — not StrategyRule auto-write",
  },
  {
    vibe: "Static validate",
    empire: "Pre-trade form + riskGates checklist",
  },
  {
    vibe: "Backtest metrics",
    empire: "Journal calibration (Sharpe/DD literacy), not crypto live",
  },
  {
    vibe: "LLM analyze report",
    empire: "Phase 5 explain cousin — must not invent chain marks",
  },
  {
    vibe: "Live deploy",
    empire: "HARD REJECT for empire companion",
  },
] as const;
