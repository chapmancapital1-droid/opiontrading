/**
 * Structured distillations from L:\dump2 (personal reference only).
 * No full course video/transcript dumps — operational process only.
 *
 * Primary corpus:
 *  - Python Algo Trading Market Neutral Hedge Fund Strategy
 *    (Quantopian-era: Pipeline factors, Psychsignal, Sentdex long/short)
 *  - Sargent & Stachurski — Python Programming for Economics and Finance (2023)
 *    (QuantEcon lectures: Python/NumPy/SciPy/Pandas tooling — not trade rules)
 *  - Kneusel — Math for Programming (No Starch 2025)
 *    (discrete/continuous math for coders — not trade rules)
 *
 * Explicitly NOT auto-ported:
 *  - Quantopian/Zipline Python runtime
 *  - Equity long-short market-neutral books for seed RH options
 *  - Marketing Sharpe claims from course tear sheets
 *  - Sargent Python stack into Next.js runtime (brain stays pure TS + workers)
 *  - Kneusel as strategy source (math literacy only)
 */

import type { StrategyRule } from "./types";

export const DUMP2_META = {
  root: "L:\\dump2",
  course:
    "L:\\dump2\\Python Algo Trading Market Neutral Hedge Fund Strategy",
  sargent:
    "L:\\dump2\\Sargent T. Python Programming for Economics and Finance 2023",
  kneusel:
    "L:\\dump2\\Kneusel R. Math for Programming. Learn the Math, Write Better Code 2025",
  inventory: "src/knowledge/catalog/dump2_inventory.json",
  focus: "quant_workflow_sentiment_hygiene_plus_math_python_tooling",
} as const;

/**
 * Sargent/Stachurski 2023 (QuantEcon) — programming hygiene only.
 * No options legs, no strategy IDs. Optional research literacy for offline Python.
 */
export const DUMP2_SARGENT_TOOLING = [
  "Scope: Python foundations for econ/finance research (white noise, NumPy, SciPy, Pandas, SymPy, Numba/JAX) — not option entry/exit rules.",
  "Do not vendor Anaconda/QuantEcon notebooks into OptionScope; brain + MC stay TypeScript workers.",
  "Good-code lectures: small pure functions, tests, clear state — already mirrored by pure domain/brain modules.",
  "SciPy roots/optimize/integrate/linalg: conceptual cousins of BS solvers & numerical risk; reimplement in TS only when needed, never call Python from Recommend.",
  "Pandas online data demos: research only; live chain marks come from OptionScope providers (Alpaca/Polygon/etc.), not notebook scrapes.",
  "Parallel/Numba/JAX speed chapters: motivation for MC worker isolation — do not train JAX models for seed empire picks.",
  "SymPy exchange-economy demo: pedagogy; not a trade signal.",
] as const;

/**
 * Kneusel Math for Programming (2025, No Starch) — discrete/continuous math for coders.
 * No options legs. Soft map to numerical hygiene already expected in pure TS domain/MC.
 */
export const DUMP2_KNEUSEL_MATH = [
  "Scope: computers & numbers (bases, float precision), sets, Boolean, functions, induction, recursion, number theory, combinatorics, graphs/trees, probability, stats, linear algebra, calculus, DEs.",
  "Floating-point / round-off (Ch.1): never trust raw float equality on money or MC tallies — use fixed cents / tolerances (domain money helpers).",
  "Probability + statistics (Ch.11–12): literacy for Monte Carlo PoP and journal calibration — formulas live in TS domain, not this book as a signal source.",
  "Combinatorics / counting (Ch.8): algorithm complexity mindset; not strike-picking combinatorics as edge.",
  "Linear algebra (Ch.13): background for multi-factor risk ideas; empire risk stays simple % budgets, not full PCA books.",
  "Calculus / DEs (Ch.14–16): continuous change models for ML/science — do not invent Greeks from book exercises; use chain + BS/binomial code.",
  "No strategy rules from this volume: Learn the Math, Write Better Code ≠ Learn the Trade, Size the Press.",
] as const;

/**
 * Professional quant workflow (course §7) mapped to OptionScope stages.
 * Use as checklist / explain citations — not a separate product mode.
 */
export const DUMP2_QUANT_WORKFLOW = [
  {
    step: 1,
    name: "Universe",
    rule: "Liquid, self-similar names only — primary common shares; drop OTC, illiquid, hard-to-trade.",
    optionScope: "liquidity gate + minLiquidity normal/tight; avoid wide-spread chains",
  },
  {
    step: 2,
    name: "Single alpha",
    rule: "Define one ranking expression; measure predictive power before sizing.",
    optionScope: "one StrategyRule thesis (IV/trend/news) scored in selector",
  },
  {
    step: 3,
    name: "Alpha combination",
    rule: "Combine multiple weak signals so noise cancels; never ship one unvalidated alpha live.",
    optionScope: "IV + spot + news + NCI + empire phase — multi-gate score, not single indicator",
  },
  {
    step: 4,
    name: "Risk model",
    rule: "Constrain concentration, sector, and market exposure before orders.",
    optionScope: "empire openRiskBudget, max campaigns, per-trade % risk, daily loss halt",
  },
  {
    step: 5,
    name: "Portfolio construction",
    rule: "Map combined alpha + risk model → target weights / positions.",
    optionScope: "sizePosition + defined-risk max loss known before fill",
  },
  {
    step: 6,
    name: "Execution",
    rule: "Transition current book → target with explicit process; track costs.",
    optionScope: "manual Robinhood checklist; no auto-broker from this course",
  },
] as const;

/** Sentiment-factor hygiene from Psychsignal / Sentdex sections. */
export const DUMP2_SENTIMENT_HYGIENE = [
  "No signal day → no trade (do not invent sentiment when news feed empty).",
  "Avoid trading through earnings windows (event calendar filter).",
  "Avoid acquisition / hard M&A targets — price pinned near deal terms; options edge dies.",
  "Sentiment is one alpha only — combine with liquidity + structure; course itself warns against single-alpha live books.",
  "StockTwits/Twitter mood ≠ options chain marks; never let sentiment invent strikes.",
  "News-wire sentiment (CNBC/WSJ-class feeds) is soft bias only — same as MarketContext.newsSentiment.",
] as const;

export const DUMP2_RULES: StrategyRule[] = [
  {
    id: "dump2_universe_liquidity_credit",
    strategyId: "bull_put_credit",
    name: "Quant Workflow — Liquid Universe Put Credit (Dump2)",
    thesis: "moderately_bullish",
    portfolioRole: "income_engine",
    riskProfile: "defined",
    approval: "level3_spreads",
    ivConditions: ["elevated", "neutral"],
    trends: ["up", "sideways"],
    eventStance: "avoid_earnings",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [
      "Universe first: only liquid primary common equities with tight option spreads (course Q1500-style discipline)",
      "Drop hard-to-trade / wide-spread underlyings before scoring premium",
      "Defined put credit only; max loss = width − credit known before entry",
      "Avoid earnings window and known hard M&A/deal-pinned names (sentiment course filter)",
      "Treat structure + IV as primary alphas; news/sentiment soft only",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "stop_2x_credit"],
    shortDeltaTarget: 0.25,
    dteMin: 21,
    dteMax: 45,
    priority: 0.86,
    growthPrimary: true,
    bookSource:
      "L:\\dump2 Python Algo Trading Market Neutral HF Strategy — quant workflow + universe filters (personal distillation)",
    structure: "Bull put credit on liquid names with quant-style universe hygiene",
    notes: [
      "Course is equity long/short market-neutral on Quantopian — NOT ported as LS equities for seed RH",
      "Workflow steps 1–6 inform gates; Sharpe tear-sheet claims are marketing, not guarantees",
    ],
  },
  {
    id: "dump2_sentiment_soft_debit",
    strategyId: "bull_call_debit",
    name: "Sentiment Soft Confirm — Bull Call Debit (Dump2)",
    thesis: "bullish",
    portfolioRole: "growth_tactical",
    riskProfile: "defined",
    approval: "level2_basic",
    ivConditions: ["low", "neutral"],
    trends: ["up"],
    eventStance: "avoid_earnings",
    minLiquidity: "normal",
    newsBias: "positive",
    entryRules: [
      "Require positive news/sentiment alignment for tactical bull debit (course sentiment factor idea)",
      "If news feed empty or neutral with no other edge → skip (no signal, no trade)",
      "Avoid earnings and acquisition-target names",
      "Cheap/neutral IV preferred for debit; do not buy rich IV just because tweets are bullish",
      "Sentiment never sets strikes — chain marks + empire size only",
    ],
    exitRules: ["profit_50pct_max", "stop_1x_debit", "dte_21_close_or_roll"],
    shortDeltaTarget: null,
    dteMin: 21,
    dteMax: 60,
    priority: 0.68,
    growthPrimary: false,
    bookSource:
      "L:\\dump2 Psychsignal/Sentdex sentiment factor modules — soft confirm only (personal distillation)",
    structure: "Bull call debit with news soft-confirm + event filters",
    notes: [
      "Multi-alpha: spot trend + news + IV still must pass selector",
      "Course long-short equity books are out of scope for empire seed options",
    ],
  },
  {
    id: "dump2_neutral_multi_alpha_condor",
    strategyId: "iron_condor",
    name: "Multi-Alpha Discipline — Iron Condor (Dump2)",
    thesis: "neutral",
    portfolioRole: "income_engine",
    riskProfile: "defined",
    approval: "level3_spreads",
    ivConditions: ["elevated"],
    trends: ["sideways"],
    eventStance: "prefer_clear",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [
      "Do not run a single unvalidated signal as the whole book (course multi-alpha warning)",
      "Condor only when IV elevated AND range/sideways structure holds AND liquidity OK",
      "Risk model first: defined wings, empire campaign limits, no concentration in one name",
      "Avoid binary events inside short DTE window",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "stop_2x_credit"],
    shortDeltaTarget: 0.16,
    dteMin: 25,
    dteMax: 45,
    priority: 0.74,
    growthPrimary: false,
    bookSource:
      "L:\\dump2 quant workflow alpha-combination + risk-model steps (personal distillation)",
    structure: "Iron condor as multi-condition income, not single-indicator bet",
    notes: ["Stage1+ capital more realistic for condor width vs seed micro"],
  },
];
