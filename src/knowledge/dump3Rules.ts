/**
 * Structured notes from L:\DUMP3 (personal reference only).
 *
 * Corpus:
 *  - Markus Schmuck — Complex Heterogeneous Systems (De Gruyter 2024) — science literacy
 *  - Freeman Publications — Bear Market Investing Strategies (EPUB, ~2020)
 *    protective puts, cash-secured puts, inverse-ETF caveats, process hygiene
 *
 * Explicitly NOT auto-ported:
 *  - PDE/electrochemistry solvers
 *  - Gold/silver/crypto prepper chapters as option strategy IDs
 *  - Levered inverse ETFs as empire primary book
 *  - “Avoid multi-leg spreads” marketing — empire prefers *defined-risk* verticals over naked
 *  - Aseprite pixel-art editor source (creative tool, not trading)
 */

import type { StrategyRule } from "./types";

export const DUMP3_META = {
  root: "L:\\DUMP3",
  chess:
    "L:\\DUMP3\\Complex Heterogeneous Systems - Thermodynamics, Information Theory, Composites, Networks",
  bearMarket:
    "L:\\DUMP3\\Bear Market Investing Strategies - 37 Recession-Proof Ideas to Grow Your Wealth",
  aseprite: "L:\\DUMP3\\Aseprite-v1.3.15.5-Source",
  inventory: "src/knowledge/catalog/dump3_inventory.json",
  focus: "science_literacy_plus_bear_market_option_hygiene",
} as const;

/**
 * DUMP3 folders that are creative/dev tools — keep on disk, never feed STRATEGY_RULES.
 */
export const DUMP3_SKIP_NOISE = [
  "Aseprite-v1.3.15.5-Source — pixel-art / sprite animation editor (C++/CMake, Igara Studio EULA). Use for NerdCommand cinema/pixel art if you own a license; zero options-brain value.",
  "Do not vendor Aseprite into OptionScope (wrong stack, proprietary EULA for official binaries, no trading logic).",
  "mikeandmike / cinema dumps — movie assets, not market structure.",
] as const;

/**
 * Schmuck CHeSs — soft systems literacy only (no strategy IDs).
 */
export const DUMP3_CHESS_SCIENCE = [
  "Scope: multiscale heterogeneous systems — thermo, info theory, networks/graphs, composites, electrochemistry, upscaling/homogenization, reliability, Kalman filtering (De Gruyter 2024).",
  "Not an options book: no strikes, DTE, Money Press, or RH checklists from CHeSs science volume alone.",
  "Information quality: thin/noisy inputs → dampen recs (MarketContext.confidence), don't fake certainty.",
  "Reliability serial vs parallel: empire gates are series reliability — one failed hard gate blocks the trade.",
  "Multiscale mindset: don't treat tick micro-noise as macro edge.",
  "Complexity: prefer simple defined-risk books over elaborate unvalidated factor stacks.",
  "Kalman chapters: conceptual cousin of quote/chain filters only — no new Python filter stack.",
  "Electrochemistry applications: zero map to equity option credits.",
] as const;

/**
 * Freeman bear-market EPUB — process + options hygiene (structured only, no full text).
 */
export const DUMP3_BEAR_HYGIENE = [
  "Activity ≠ edge: do not loosen criteria just because the tape is red; stay in circle of competence.",
  "Cash reserves: only risk capital not needed for years; keep dry powder for mispricings (not emergency cash).",
  "Paper P/L: dips test stomach more than brains — reassess business quality; don't panic-sell solely on red.",
  "Protective puts beat stop-loss jumps in high-vol bear gaps (fixed exit price = insurance, not alpha).",
  "CSP when elevated fear/IV: sell cash-secured puts only if willing to own; never naked short puts.",
  "Inverse ETFs: short-term hedge only; decay kills long holds; liquid index products only — not empire seed primary.",
  "Multi-leg complexity: book says beginners stick to protective put + CSP; empire still allows defined-risk verticals when budget requires it.",
  "Marketing claims (37 ideas, gold targets, crypto hedges): not guarantees — size under empire risk ceilings.",
] as const;

export const DUMP3_RULES: StrategyRule[] = [
  {
    id: "dump3_bear_protective_put",
    strategyId: "long_put",
    name: "Bear Market — Protective Put Floor (Dump3 Freeman)",
    thesis: "bearish",
    portfolioRole: "hedge",
    riskProfile: "defined",
    approval: "level2_basic",
    ivConditions: ["elevated", "neutral"],
    trends: ["down", "sideways"],
    eventStance: "prefer_clear",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [
      "Requires long shares (or equivalent equity book) — protective put is insurance, not a standalone lottery ticket",
      "Prefer protective put over stop-loss when vol spikes: put locks sell price; stops can gap through",
      "Strike near acceptable floor (personal pain level); debit = insurance cost, max loss ≈ stock basis − strike + put debit",
      "Size under empire risk budget; do not over-insure illiquid names",
      "Elevated IV makes puts expensive — accept cost or reduce share size instead of skipping all protection when needed",
    ],
    exitRules: ["manual_review", "dte_21_close_or_roll", "profit_50pct_max"],
    shortDeltaTarget: null,
    dteMin: 21,
    dteMax: 90,
    priority: 0.7,
    growthPrimary: false,
    bookSource:
      "L:\\DUMP3 Bear Market Investing Strategies (Freeman) — protective puts vs stop jumps (personal distillation)",
    structure: "Long put against held shares (protective put)",
    notes: [
      "Not a money-making strategy in the book’s framing — portfolio floor",
      "Seed accounts with no shares: skip; use defined-risk bear put debit instead if directional",
    ],
  },
  {
    id: "dump3_bear_csp_elevated_iv",
    strategyId: "cash_secured_put",
    name: "Bear Market — Cash-Secured Put Income (Dump3 Freeman)",
    thesis: "moderately_bullish",
    portfolioRole: "income_engine",
    riskProfile: "substantial_downside_capped_upside",
    approval: "level2_basic",
    ivConditions: ["elevated"],
    trends: ["down", "sideways"],
    eventStance: "avoid_earnings",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [
      "Only when willing to own 100 shares per contract at strike; cash reserved = strike × 100",
      "Prefer elevated IV / fear regimes so short put premium is rich (bear-market CSP thesis)",
      "Strike at level you’d happily accumulate; not a hope-for-expire-worthless lottery below junk levels",
      "Never naked short put — cash- or stock-secured only",
      "Seed/stage0: usually blocked by empire cash-lock math — prefer bull put credit with known max loss",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "stop_2x_credit"],
    shortDeltaTarget: 0.25,
    dteMin: 21,
    dteMax: 45,
    priority: 0.78,
    growthPrimary: true,
    bookSource:
      "L:\\DUMP3 Bear Market Investing Strategies (Freeman) — cash-secured puts in rich put premium (personal distillation)",
    structure: "Cash-secured short put",
    notes: [
      "Empire seed often prefers defined-risk bull put credit over full CSP cash lock",
      "Assignment in a deeper bear is a feature if strike was intentional accumulation",
    ],
  },
  {
    id: "dump3_bear_put_debit_directional",
    strategyId: "bear_put_debit",
    name: "Bear Market — Defined Put Debit (Dump3)",
    thesis: "bearish",
    portfolioRole: "growth_tactical",
    riskProfile: "defined",
    approval: "level3_spreads",
    ivConditions: ["low", "neutral"],
    trends: ["down"],
    eventStance: "prefer_clear",
    minLiquidity: "normal",
    newsBias: "negative",
    entryRules: [
      "Defined-risk way to express bearish view without naked short stock or levered inverse ETF hold",
      "Prefer when IV is not already sky-high (debit hurt by rich vol); if IV elevated, prefer credit structures or smaller size",
      "Max loss = net debit known before entry; size under empire 0.5–1% risk",
      "Liquid underlyings only; avoid single-stock inverse-ETF substitutes",
      "Exit plan before entry — bear rallies are vicious",
    ],
    exitRules: ["profit_50pct_max", "stop_1x_debit", "dte_21_close_or_roll"],
    shortDeltaTarget: null,
    dteMin: 21,
    dteMax: 60,
    priority: 0.72,
    growthPrimary: false,
    bookSource:
      "L:\\DUMP3 Bear Market EPUB directional hedge intent + empire defined-risk preference (personal distillation)",
    structure: "Bear put debit vertical",
    notes: [
      "Book highlights long puts / protective puts; debit vertical is empire-safe adaptation for no-share accounts",
      "Reject long hold of levered inverse ETFs as primary book (decay)",
    ],
  },
];
