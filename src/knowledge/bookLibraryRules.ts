/**
 * Structured rules from L:\bookLibrary (personal reference only).
 * No full copyrighted text — operational entry/exit only.
 *
 * Priority corpus:
 *  - Money Press Cheat Sheet 2016 (Preston James)
 *  - The Money Press Method 2020 (already aligned as put diagonal)
 *  - Crow Bar Strategy (LEAP / long call momentum)
 *  - Steadiest Option Trader (67a68be…) — wheel/credits
 *  - Options crash courses + TA risk modules
 *  - AI for trading volumes (co-pilot limits)
 *
 * Ignored for options brain: EA robot manuals, binary options hype, porn folder, codecs, Windows ISOs.
 */

import type { StrategyRule } from "./types";

export const BOOKLIBRARY_META = {
  root: "L:\\bookLibrary",
  inventory: "src/knowledge/catalog/booklibrary_inventory.json",
  focus: "option_methods_money_press_crowbar_credits",
} as const;

export const BOOKLIBRARY_RULES: StrategyRule[] = [
  {
    id: "booklib_money_press_cheat_sheet",
    strategyId: "money_press_put_diagonal",
    name: "Money Press Cheat Sheet — Weekly ATM Put + Protection",
    thesis: "bullish",
    portfolioRole: "income_engine",
    riskProfile: "defined",
    approval: "level3_spreads",
    ivConditions: ["elevated", "neutral"],
    trends: ["up", "sideways"],
    eventStance: "prefer_clear",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [
      "Sell ATM weekly put + buy 2–6 month OTM put protection (equal contracts) as one diagonal spread",
      "Enter both legs together with LIMIT orders; new press often opens as net debit",
      "Protection cost guideline: ~2.5× ATM weekly put premium (≈ 2–3 weeks of short premium)",
      "Require ≥1 compelling circumstance: positive earnings reaction, product launch rumor, crow-bar setup, split, sunrise/demise, hot industry — confirmed by price action & volume",
      "Do NOT start if next earnings is < 2 weeks away; ideal is 6–12 week press life between earnings",
      "Prefer triple-digit liquid names; avoid commodities, most ETFs, clothing retailers, semis, 'earthy' policy names",
      "Never raise protection strike just to cut margin — pass if 1-lot risk is too large for account",
    ],
    exitRules: [
      "friday_roll_or_close",
      "dte_7_close_or_roll",
      "manual_review",
      "profit_50pct_max",
    ],
    shortDeltaTarget: 0.5,
    dteMin: 3,
    dteMax: 10,
    priority: 0.92,
    growthPrimary: true,
    bookSource:
      "L:\\bookLibrary Money Press Cheat Sheet 2016 + Money Press Method 2020 (personal distillation)",
    structure: "ATM weekly short put / lower multi-month long put diagonal",
    notes: [
      "Friday: BTC expiring short, STO next week ATM (or slightly ITM if strong / OTM if uncertain)",
      "Do not let protection DTE fall under ~6 weeks — roll protection out",
      "After ~2 weekly credits collected, residual risk is much lower (cash free for size/new press)",
      "Conservative exit: Friday before earnings; aggressive: sell through earnings only with tighter protection",
      "Marketing ROI claims are not guarantees — size under empire risk budget",
    ],
  },
  {
    id: "booklib_crowbar_leap",
    strategyId: "long_call",
    name: "CrowBar — LEAP Call on Momentum Breakout (BookLibrary)",
    thesis: "bullish",
    portfolioRole: "growth_tactical",
    riskProfile: "defined",
    approval: "level2_basic",
    ivConditions: ["neutral", "elevated"],
    trends: ["up"],
    eventStance: "prefer_clear",
    minLiquidity: "normal",
    newsBias: "positive",
    entryRules: [
      "CrowBar setup requires ALL: new 52-week high + doubled in past year + all-time high + EPS rank ≥80 + RS ≥80 (IBD-style filters)",
      "Buy within ~10% of the 'double' high — not chase white-hot extensions",
      "Prefer long-dated call (LEAP, often Jan) ITM so premium is ~½ intrinsic / ½ time value",
      "No penny stocks; avoid commodity-tied names",
      "Risk = full debit; size under empire 1% rule (LEAP debits can be large)",
      "Optional enhancer: later sell OTM weekly calls only when earnings calendar is clear",
    ],
    exitRules: ["profit_50pct_max", "stop_1x_debit", "manual_review"],
    shortDeltaTarget: null,
    dteMin: 90,
    dteMax: 400,
    priority: 0.72,
    growthPrimary: false,
    bookSource:
      "L:\\bookLibrary Crow Bar Strategy — Preston James (personal distillation; ROI anecdotes not guarantees)",
    structure: "Long ITM/near-ITM LEAP call on S-curve breakout name",
    notes: [
      "Exit if RS <75, sharp break under 50DMA on volume, LEAP loses >50% of premium paid, or fraud/gov action",
      "Can pair with bull put credit or Money Press on same name if capital allows",
      "Stage1+ capital usually required for LEAP debit",
    ],
  },
  {
    id: "booklib_risk_mgmt_credit",
    strategyId: "bull_put_credit",
    name: "TA Course Risk — Put Credit with Hard Risk Budget (BookLibrary)",
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
      "Position size from max loss first — never from hope of premium",
      "Defined put credit only; width − credit known before entry",
      "Respect risk-management module: fixed risk per trade under empire ceiling",
      "Avoid binary earnings inside short DTE",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "stop_2x_credit"],
    shortDeltaTarget: 0.25,
    dteMin: 21,
    dteMax: 45,
    priority: 0.88,
    growthPrimary: true,
    bookSource:
      "L:\\bookLibrary Technical Analysis Mastery risk modules + Advanced Options course notes (personal)",
    structure: "Bull put credit with explicit risk budget",
    notes: ["Psychology modules: process > revenge trading after losses"],
  },
];

/**
 * AI books in bookLibrary — co-pilot limits + brain-health hygiene
 * (Jesse/Chan Generative AI for Trading and Asset Management 2025).
 */
export const BOOKLIBRARY_AI_NOTES = [
  "Day Trading with ChatGPT / Generative AI for Trading: use AI for research workflow, not unverified signals.",
  "Jesse/Chan GenAI 2025: LLM is junior co-pilot (code + clarify), not autonomous strategy inventor — human domain rules own entries.",
  "Jesse/Chan: same prompt ≠ same answer — brain core must stay deterministic (gates, scores, BS/MC); LLM only narrates structured decisions.",
  "Jesse/Chan hybrid OOD: low MarketContext confidence or thin chain/IV history → dampen or block recs (no fake-confident P(y|x) on junk inputs).",
  "Jesse/Chan regimes: vol/IV regime can soft-bias strategy pool; do not hard-code unvalidated GMM/VAE into Recommend.",
  "Jesse/Chan RAG: explainers must cite catalog/rules; never free-form legs, strikes, or chain marks.",
  "Jesse/Chan options term-structure: calendars/diagonals need expert distillation (Money Press) — ChatGPT alone mis-specified rolls and plots.",
  "Jesse/Chan companion code (genai4t TimeVAE/TimeGAN/Chronos/FinBERT): research lab only — do not import into OptionScope runtime; no options chain/risk gates in that repo.",
  "Coding with AI / AI-Assisted Coding: accelerate OptionScope tooling; never invent chain marks.",
  "Forex EA robot manuals: out of scope for equity options empire companion.",
  "Binary options materials: rejected for this product (not listed equity options process).",
] as const;
