/**
 * Structured rules distilled from L:\newdump library (personal reference).
 * Full copyrighted text is NOT stored — only operational entry/exit rules
 * for the deterministic brain. Focus: option profit process, not hype.
 *
 * Corpus roots:
 *  - Books - Investing and Options (270+ PDFs; options/vol collections)
 *  - Basic Black-Scholes (Crack) — pricing discipline
 *  - Saliba Option Spread Strategies (2009) — defined-risk spreads (full chapter map)
 *  - AI / Quantum AI volumes — co-pilot limits (language ≠ edge)
 */

import type { StrategyRule } from "./types";
import {
  SALIBA_HYGIENE,
  SALIBA_META,
  SALIBA_REJECT_SEED,
} from "./salibaPlaybook";

export const NEWDUMP_LIBRARY_META = {
  root: "L:\\newdump",
  inventory: "src/knowledge/catalog/newdump_inventory.json",
  focus: "option_profits_defined_risk_process",
  note: "Slow ingest: metadata cataloged; rules are structured distillations only.",
} as const;

/**
 * Profit-first operating rules for the empire companion brain.
 * Higher priority on defined-risk premium when seed capital is small.
 */
export const NEWDUMP_RULES: StrategyRule[] = [
  {
    id: "newdump_bs_discipline_credit",
    strategyId: "bull_put_credit",
    name: "Black-Scholes Discipline — Put Credit (Newdump)",
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
      "Price as risk-transfer: max loss = width − credit must be known before entry (BS discipline)",
      "Prefer elevated IV when selling premium; cheap IV favors debit structures instead",
      "Never treat model delta as probability of profit",
      "Short put delta ~0.20–0.30; 21–45 DTE; liquid strikes only",
      "Profit process: define BEs + max loss + exit (50% credit or 21 DTE) before fill",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "stop_2x_credit", "friday_roll_or_close"],
    shortDeltaTarget: 0.25,
    dteMin: 21,
    dteMax: 45,
    priority: 0.91,
    growthPrimary: true,
    bookSource:
      "L:\\newdump Basic Black-Scholes (Crack) + Options Trading Collection — personal distillation",
    structure: "Bull put credit with explicit pricing + risk window",
    notes: [
      "Crack/BS focus: inputs (S,K,T,σ,r) drive price; mis-specified σ = mis-specified edge",
      "Empire seed: prefer this over CSP cash lock",
    ],
  },
  {
    id: "newdump_saliba_put_credit",
    strategyId: "bull_put_credit",
    name: "Saliba Vertical — Bull Put Credit (Defined)",
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
      "Verticals for moderate directional move OR high-IV environment where long naked call/put is too expensive (Saliba Ch.2)",
      "Bull put credit: short higher put / long lower put — max loss = width − credit known before entry",
      "Use as limited-risk short-premium income or support-bounce view with hard floor",
      "Prefer liquid strikes; enter as multi-leg (avoid legging risk per book disclosures)",
      "Size to empire risk % — not to credit alone",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "stop_2x_credit"],
    shortDeltaTarget: 0.25,
    dteMin: 21,
    dteMax: 45,
    priority: 0.9,
    growthPrimary: true,
    bookSource:
      "Saliba A. Option Spread Strategies (2009) Ch.2 Verticals — personal distillation",
    structure: "Bull put credit vertical",
    notes: [
      "Synthetic twin of bull call debit for many purposes; pick by IV/debit preference",
      "Countertrend bounce use-case only with strict max loss (book: verticals reduce bottom-picking risk)",
    ],
  },
  {
    id: "newdump_saliba_call_credit",
    strategyId: "bear_call_credit",
    name: "Saliba Vertical — Bear Call Credit (Defined)",
    thesis: "moderately_bearish",
    portfolioRole: "income_engine",
    riskProfile: "defined",
    approval: "level3_spreads",
    ivConditions: ["elevated", "neutral"],
    trends: ["down", "sideways"],
    eventStance: "prefer_clear",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [
      "Bear call credit for neutral-to-bearish / resistance rejection (Ch.2)",
      "Max profit = credit; max loss = width − credit — always size to empire budget",
      "Short call near technical resistance or range high when IV supports selling",
      "Wing always present — never naked short call from this playbook",
      "Multi-leg execution preferred; do not leave one side live after partial exit (disclosure risk)",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "stop_2x_credit"],
    shortDeltaTarget: 0.28,
    dteMin: 21,
    dteMax: 45,
    priority: 0.89,
    growthPrimary: true,
    bookSource:
      "Saliba A. Option Spread Strategies (2009) Ch.2 Verticals — personal distillation",
    structure: "Bear call credit vertical",
    notes: ["Spreads are the toolkit for directional + range without naked tails"],
  },
  {
    id: "newdump_saliba_bull_call_debit",
    strategyId: "bull_call_debit",
    name: "Saliba Vertical — Bull Call Debit (Defined)",
    thesis: "bullish",
    portfolioRole: "growth_tactical",
    riskProfile: "defined",
    approval: "level3_spreads",
    ivConditions: ["low", "neutral"],
    trends: ["up"],
    eventStance: "prefer_clear",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [
      "Bull call debit for moderate upside when long naked call is rich on IV (Ch.2 high-IV vertical use-case inverted: debit when IV not punitive)",
      "Max loss = net debit; BE ≈ long strike + debit",
      "Prefer when seeking limited-risk directional vs buying stock outright",
      "Avoid if term structure / IV makes debit absurd vs vertical credit alternative",
    ],
    exitRules: ["profit_50pct_max", "stop_1x_debit", "dte_21_close_or_roll"],
    shortDeltaTarget: null,
    dteMin: 21,
    dteMax: 60,
    priority: 0.78,
    growthPrimary: false,
    bookSource:
      "Saliba A. Option Spread Strategies (2009) Ch.2 Verticals — personal distillation",
    structure: "Bull call debit vertical",
    notes: ["Pair with NCI FIRE BUY bias when available"],
  },
  {
    id: "newdump_saliba_condor",
    strategyId: "iron_condor",
    name: "Saliba Butterflies/Condors — Range Premium (Defined)",
    thesis: "range",
    portfolioRole: "income_engine",
    riskProfile: "defined",
    approval: "level3_spreads",
    ivConditions: ["elevated", "neutral"],
    trends: ["sideways"],
    eventStance: "avoid_earnings",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [
      "Directionless/range forecast required (Ch.5): support, resistance, mean-reversion area",
      "Wings near S/R; short body near mean-reversion price (butterfly) or stretch to condor for wider range",
      "Forecast how long range lasts → choose expiration (projected time in range)",
      "Wings define max loss; credit/debit defines max profit — show both with PoP",
      "Manage/adjust when range migrates (book: roll butterflies within condor); do not hope through breakouts",
      "21–40 DTE preferred for theta + adjustability",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "stop_2x_credit"],
    shortDeltaTarget: 0.16,
    dteMin: 21,
    dteMax: 40,
    priority: 0.86,
    growthPrimary: false,
    bookSource:
      "Saliba A. Option Spread Strategies (2009) Ch.5 Butterflies and Condors — personal distillation",
    structure: "Iron condor / butterfly family range income",
    notes: [
      "Long butterfly/condor often short vega near body — elevated IV entry helps",
      "Empire seed: prefer iron condor defined wings over naked short strangle",
    ],
  },
  {
    id: "newdump_saliba_calendar",
    strategyId: "money_press_put_diagonal",
    name: "Saliba Calendar / Time Spread Discipline (Diagonal Ally)",
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
      "Time-spread logic (Ch.6): term structure of IV matters — avoid long calendar when short-dated IV is depressed vs long-dated against your forecast",
      "Prefer structures where short front premium is rich relative to back (aligns with weekly press + multi-month protection)",
      "Enter multi-leg; liquid underlyings only",
      "Not fire-and-forget — manage rolls as time and spot move (same management ethos as covered-write chapter)",
    ],
    exitRules: ["friday_roll_or_close", "dte_7_close_or_roll", "manual_review", "profit_50pct_max"],
    shortDeltaTarget: 0.5,
    dteMin: 3,
    dteMax: 10,
    priority: 0.88,
    growthPrimary: true,
    bookSource:
      "Saliba A. Option Spread Strategies (2009) Ch.6 Calendars + Money Press alignment — personal distillation",
    structure: "Put diagonal / calendar family with term-structure check",
    notes: [
      "Maps to empire money_press_put_diagonal rather than pure same-strike calendar",
      "Call vs put time spreads often synthetic equivalents — pricing/liquidity chooses",
    ],
  },
  {
    id: "newdump_saliba_covered_write",
    strategyId: "covered_call",
    name: "Saliba Covered-Write — Income (Managed)",
    thesis: "moderately_bullish",
    portfolioRole: "income_engine",
    riskProfile: "substantial_downside_capped_upside",
    approval: "level2_basic",
    ivConditions: ["elevated", "neutral"],
    trends: ["up", "sideways"],
    eventStance: "prefer_clear",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [
      "Requires long shares — neutral to mildly bullish forecast only (Ch.1)",
      "Prefer short-dated (≤45 DTE) near-money for income theta; ITM/longer for more premium/protection tradeoff",
      "Covered-write = short put risk profile — ruthlessly manage downside; not fire-and-forget",
      "Prefer steady/falling IV after entry; rising IV hurts short call",
      "Adjust with vertical rolls if view changes (book examples: roll up with long call spread)",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "manual_review"],
    shortDeltaTarget: 0.3,
    dteMin: 14,
    dteMax: 45,
    priority: 0.8,
    growthPrimary: false,
    bookSource:
      "Saliba A. Option Spread Strategies (2009) Ch.1 Covered-Write — personal distillation",
    structure: "Covered call / buy-write",
    notes: [
      "Seed: only if sharesHeld; else use defined verticals",
      "Book explicitly rejects late-night 'cash machine' marketing",
    ],
  },
  {
    id: "newdump_vol_seller_iv_rich",
    strategyId: "bull_put_credit",
    name: "Vol Collection — IV-Rich Put Credit (Newdump VIX library)",
    thesis: "moderately_bullish",
    portfolioRole: "income_engine",
    riskProfile: "defined",
    approval: "level3_spreads",
    ivConditions: ["elevated"],
    trends: ["up", "sideways"],
    eventStance: "prefer_clear",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [
      "Sell premium when IV rank/percentile elevated vs history",
      "Avoid selling into known binary events unless structure is deliberately post-event",
      "Prefer liquid large-caps; wide bid/ask kills theoretical edge",
      "Exit plan mandatory: 50% of max credit or time stop",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "stop_2x_credit"],
    shortDeltaTarget: 0.25,
    dteMin: 21,
    dteMax: 45,
    priority: 0.89,
    growthPrimary: true,
    bookSource:
      "L:\\newdump Volatility and VIX Collection + Natenberg-class vol discipline (personal)",
    structure: "IV-rich bull put credit",
    notes: ["Volatility Trading / VIX collection: edge is process + regime, not prediction"],
  },
  {
    id: "newdump_cc_income",
    strategyId: "covered_call",
    name: "Covered Call Income — Own-the-Name (Newdump)",
    thesis: "neutral",
    portfolioRole: "campaign",
    riskProfile: "substantial_downside_capped_upside",
    approval: "level2_basic",
    ivConditions: ["elevated", "neutral"],
    trends: ["up", "sideways"],
    eventStance: "avoid_ex_div",
    minLiquidity: "normal",
    newsBias: "any",
    entryRules: [
      "Only on shares you already own and want to hold",
      "Short call OTM; premium is cushion not full protection",
      "Watch early assignment into ex-div on ITM short calls",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "manual_review"],
    shortDeltaTarget: 0.3,
    dteMin: 21,
    dteMax: 45,
    priority: 0.84,
    growthPrimary: true,
    bookSource: "L:\\newdump Covered Call / Wheel collection — personal distillation",
    structure: "Long stock + short call",
    notes: ["Stage1+ when shares held; seed often skips"],
  },
  {
    id: "newdump_debit_cheap_iv",
    strategyId: "bull_call_debit",
    name: "Debit Growth — Cheap IV Directional (Newdump)",
    thesis: "bullish",
    portfolioRole: "growth_tactical",
    riskProfile: "defined",
    approval: "level3_spreads",
    ivConditions: ["low", "neutral"],
    trends: ["up"],
    eventStance: "prefer_clear",
    minLiquidity: "normal",
    newsBias: "positive",
    entryRules: [
      "Buy premium only when IV is not elevated (avoid overpaying extrinsic)",
      "Debit ≤ ~50% of width for positive reward skew when possible",
      "Risk = full debit; size under 1% empire rule",
      "Clear invalidation: thesis break or 1× debit stop",
    ],
    exitRules: ["profit_50pct_max", "stop_1x_debit", "manual_review"],
    shortDeltaTarget: null,
    dteMin: 21,
    dteMax: 60,
    priority: 0.74,
    growthPrimary: false,
    bookSource: "L:\\newdump Options Trading Collection — debit when IV low",
    structure: "Bull call debit vertical",
    notes: ["Opposite of vol-selling regime"],
  },
  {
    id: "newdump_money_press_align",
    strategyId: "money_press_put_diagonal",
    name: "Weekly Premium Press — Diagonal Put (Newdump + method books)",
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
      "Short higher weekly put + long lower multi-month put (diagonal protection)",
      "Seed-friendly alternative to CSP cash lock",
      "Friday roll discipline; multi-week press life",
      "Fit between earnings; liquid names",
    ],
    exitRules: ["friday_roll_or_close", "dte_7_close_or_roll", "manual_review", "profit_50pct_max"],
    shortDeltaTarget: 0.5,
    dteMin: 3,
    dteMax: 10,
    priority: 0.9,
    growthPrimary: true,
    bookSource: "Money Press Method + newdump premium-selling collection (personal)",
    structure: "Put diagonal weekly press",
    notes: ["Primary micro-account income path when width fits budget"],
  },
  {
    id: "newdump_strauss_process_credit",
    strategyId: "bull_put_credit",
    name: "Algo Essentials Process — Put Credit with Backtest Discipline (Strauss)",
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
      "Process-first: define max loss, exit, and thesis before fill (book’s emotion-removal via rules)",
      "Prefer elevated IV for short premium; size from max loss under empire % — not from gross return fantasies",
      "Do not promote a structure because a Python backtest looked good without walk-forward / OOS discipline",
      "Liquid optionable names only (survivorship + microstructure realism: avoid junk chains)",
      "Defined put credit only — no naked short puts from algo tutorials",
    ],
    exitRules: ["profit_50pct_max", "dte_21_close_or_roll", "stop_2x_credit"],
    shortDeltaTarget: 0.25,
    dteMin: 21,
    dteMax: 45,
    priority: 0.84,
    growthPrimary: true,
    bookSource:
      "L:\\newdump Algorithmic Essentials Trading with Python (Strauss/Van Der Post 2024) — personal distillation",
    structure: "Bull put credit under algo-process hygiene",
    notes: [
      "Book is equity/Python algo primer — not Money Press / CrowBar structure authority",
      "HFT & ML chapters rejected as empire primary edge",
    ],
  },
];

/**
 * Cohan — Brain Rush: How to Invest and Compete in the Real World of Generative AI (Apress 2024)
 * Industry/ecosystem + investment framing for GenAI — co-pilot & verification hygiene.
 * Not an options structure book.
 */
export const NEWDUMP_COHAN_BRAIN_RUSH = {
  path:
    "L:\\newdump\\Cohan P. Brain Rush. How to Invest and Compete..Real World of Generative AI 2024\\Cohan P. Brain Rush. How to Invest and Compete..Real World of Generative AI 2024.pdf",
  author: "Peter Cohan",
  publisher: "Apress",
  year: 2024,
  isbn: "979-8-8688-0317-8",
  pages: 403,
  chapters: [
    "1 Introducing Brain Rush",
    "2 What Is Generative AI? (bright/dark side, ecosystem)",
    "3 End-user applications (incl. financial services case studies)",
    "4 Services / consulting / coding outsourcers",
    "5 Generative AI software (LLM providers, apps)",
    "6 Cloud platforms",
    "7 Hardware (semiconductors, servers, cooling)",
    "8 Implications for consumers/employees/companies/investors",
    "9 Societal benefits and risks",
  ] as const,
  hygiene: [
    "GenAI has two sides: productivity upside vs hallucination, liability, bias — never trust unverified model text for fills (lawyer/ChatGPT citations caution).",
    "Investment-advisor-style chatbots (JPMorgan/GS experiments in book) = co-pilot research aids — not automatic trade tickets; human verifies.",
    "Proprietary prompts with secrets: do not paste RH credentials, account numbers, or live keys into public chatbots.",
    "GenAI software/cloud/hardware industry maps (NVDA, cloud, apps) are equity-theme literacy — seed empire edge is defined-risk options process, not chasing AI stock narratives alone.",
    "Cognitive hunger > cognitive lock-in: keep learning tools; do not freeze a broken process.",
    "Deployment principles: start with high-payoff, low-risk experiments (explain, journal, checklist) before production automation.",
    "Misinformation risk means Phase 5 must only narrate engine facts + catalog citations — no free-form strikes/Greeks.",
  ] as const,
  reject: [
    "Brain Rush stock tips as StrategyRule IDs",
    "GenAI GDP forecasts as entry signals",
    "Auto-investment-advisor agents placing RH orders",
  ] as const,
} as const;

/**
 * Wichert — Mind, Brain, Quantum AI, and the Multiverse (CRC Press 2023)
 * Philosophy of mind + CS foundations + quantum AI + Everett many-worlds.
 * Explicit scope limit: metaphor/philosophy ≠ options edge or quantum pricing.
 */
export const NEWDUMP_WICHERT_QUANTUM = {
  path:
    "L:\\newdump\\Wichert A. Mind, Brain, Quantum AI, and the Multiverse 2023\\Wichert A. Mind, Brain, Quantum AI, and the Multiverse 2023.pdf",
  author: "Andreas Wichert",
  publisher: "CRC Press / Taylor & Francis",
  year: 2023,
  pages: 199,
  chapters: [
    "1 Introduction (mind, dualism, computationalism, free will)",
    "2 Computer Metaphor (Gödel, Turing, AI, complex systems, ML)",
    "3 Brain (neurons, consciousness theories, neuromorphic)",
    "4 Quantum Reality (entropy, QM, quantum computation, quantum AI, quantum brain)",
    "5 Multiverse (Everett many-worlds, quantum cognition metaphors)",
    "6 Conclusion (ethics, other minds, Summa Technologiae)",
  ] as const,
  hygiene: [
    "Quantum AI / multiverse / many-minds material is philosophy of mind and physics literacy — not an options edge source.",
    "Do not brand Monte Carlo path samples as 'multiverse trading' or 'quantum AI picks' — MC is classical simulation for PoP/EV.",
    "Do not claim Oracles or free-will arguments justify skipping risk gates or journal discipline.",
    "Computationalism debates (mind as machine) do not authorize auto-broker or undefined-risk strategies.",
    "Quantum machine learning / Grover / QFT chapters: research horizon — not RH seed-stage tooling.",
    "Phase 5 'Quantum AI' narrative layer (if used) must only narrate structured BrainDecision facts — never invent strikes from metaphysics.",
    "Ethics chapters: power of AI ≠ permission to hide opacity; prefer transparent gates + catalog citations.",
  ] as const,
  reject: [
    "Quantum brain dualism as trade signal",
    "Everett branching as portfolio construction",
    "Quantum suicide / many-minds metaphors in risk sizing",
    "Any StrategyRule derived from this volume",
  ] as const,
} as const;

/**
 * O’Reilly Early Release — An Illustrated Guide to AI Agents
 * (Visual Intuition for Reasoning, Multimodal, and Diffusion LLMs)
 * EPUB sample: Memory + Tool Usage chapters only (final TOC not complete).
 * Agent architecture hygiene for companion UX — not option structure rules.
 */
export const NEWDUMP_AI_AGENTS_GUIDE = {
  path:
    "L:\\newdump\\newdump\\An Illustrated Guide to AI Agents - Visual Intuition for Reasoning, Multimodal, and Diffusion LLMs\\An Illustrated Guide to AI Agents - Visual Intuition for Reasoning, Multimodal, and Diffusion LLMs.epub",
  form: "epub_early_release",
  isbnUid: "979-8-341-66269-8",
  availableChapters: ["Memory (book ch.4)", "Tool Usage, Learning, and Protocols (book ch.5)"],
  unavailableInThisFile: [
    "Intro / LLM / Reasoning LLMs",
    "LLM Agent / Evaluating Agents / Multi-agent",
    "Multimodal / Coding agent / Training / SLM",
  ],
  hygiene: [
    "Plain LLMs are stateless: without memory they forget actions and repeat mistakes — OptionScope needs explicit memory (journal, account state, catalog), not chat free-form.",
    "Short-term vs long-term memory: session context vs catalog/RAG + journal history (agentic RAG idea maps to searchCatalog + rules, not free web fantasy).",
    "Context engineering: what is in context is the spec — Phase 5 explain must only use structured BrainDecision + MarketContext facts (context-as-specification).",
    "Context select/compress/order: keep high-signal facts (max loss, PoP, gates) first; drop noise; never pad with invented strikes.",
    "Without tools, models only *intend* actions — tools must be real APIs (quote/chain/MC/NCI), never 'tool: place_order' without human.",
    "Tool lifecycle: create → define → select → call → process output — every tool output is untrusted until validated (liquidity, finite marks).",
    "Tool selection: prefer few well-defined tools over dozens of vague ones (empire: chain, quote, journal, catalog).",
    "Fixed flow vs autonomous tool choice: options companion stays low autonomy (fixed brain pipeline) for safety; high autonomy reserved for research notes only.",
    "MCP / standardized tool protocols: useful for tooling integration later — still no auto-broker.",
    "Multi-agent context: separate roles (selector / explainer / risk) already mimic multi-agent without free collaboration inventing risk.",
  ] as const,
  reject: [
    "Autonomous tool agents that place trades",
    "Unvalidated agentic RAG inventing market facts",
    "Treating early-release sample as complete agent product design",
  ] as const,
} as const;

/**
 * Saliba — Option Spread Strategies (Bloomberg Press 2009)
 * Re-export canonical module (E:\\newdump path + full chapter rules).
 * @see ./salibaPlaybook.ts
 */
export const NEWDUMP_SALIBA_PLAYBOOK = {
  path: SALIBA_META.paths[0],
  alternatePaths: SALIBA_META.paths,
  authors: SALIBA_META.authors,
  year: SALIBA_META.year,
  isbn: SALIBA_META.isbn,
  pages: SALIBA_META.pages,
  chapters: SALIBA_META.chapters.map((c) => `${c.n} ${c.title}`),
  hygiene: SALIBA_HYGIENE,
  rejectForSeed: SALIBA_REJECT_SEED,
} as const;

/**
 * HBR Press — Artificial Intelligence: The Insights You Need (2019)
 * Management essays (Davenport, Brynjolfsson/McAfee, Ng, etc.) — AI adoption hygiene.
 * Zero option entry/exit rules.
 */
export const NEWDUMP_HBR_AI = {
  path:
    "L:\\newdump\\newdump\\Artificial Intelligence_ The Insights You Need from Harvard Business Review PDF\\Artificial Intelligence_ The Insights You Need from Harvard Business Review.pdf",
  publisher: "Harvard Business Review Press",
  year: 2019,
  isbn: "978-1-63369-789-8",
  pages: 193,
  /** Map to OptionScope product stance only */
  hygiene: [
    "AI is narrow: supports tasks (explain, rank, summarize) — not entire trading jobs or fills (Brynjolfsson/McAfee + Davenport).",
    "Three questions every user/system must answer: How does it work? What is it good at? What must it never do? (Martinho-Truswell) → OptionScope: never invent strikes/marks/orders.",
    "Data is not automatically oil: only high-quality chain/quote/journal data powers the engine; junk context → low confidence (Agrawal/Gans/Goldfarb).",
    "First AI project = quick win: Recommend explain + checklist before moon-shot auto-trade (Andrew Ng).",
    "When algorithms go wrong: need a plan — risk gates, daily halt, manual RH, journal review (Yampolskiy).",
    "Collaborative intelligence: human + AI stronger than either alone — companion narrates, human owns fill (Wilson/Daugherty).",
    "Augmentation over mass automation for this empire: no unofficial RH API, no auto-place.",
    "Pilots before production: demo NCI/GodMode; options brain stays process-first until journal evidence.",
    "Ethics: bias & opacity matter — grounded catalog citations + deterministic PoP/EV beat black-box 'AI picks'.",
    "Evolutionary core ops > moon shots: quietly improve gates, calibration, explain — not 'predict markets with AI'.",
  ] as const,
  reject: [
    "Using HBR marketing claims as trade signals",
    "Emotion-AI / shipping-then-shopping thought experiments as options edge",
    "Late-adopter panic as reason to auto-trade",
  ] as const,
} as const;

/**
 * Strauss / Van Der Post — Algorithmic Essentials: Trading with Python (2024)
 * L:\newdump\…\Algorithmic Essentials_…Johann Strauss.pdf
 * Python equity/algo primer — process hygiene only (not option legs, not HFT bot).
 */
export const NEWDUMP_ALGO_ESSENTIALS = {
  path:
    "L:\\newdump\\newdump\\Algorithmic Essentials_ Trading with Python_ Comprehenive Guide for 2024 by Johann Strauss PDF\\Algorithmic Essentials_ Trading with Python_ Comprehenive Guide for 2024 by Johann Strauss.pdf",
  authors: "Hayden Van Der Post / Johann Strauss (Reactive Publishing)",
  pages: 275,
  chapters: [
    "1 Basics of algo trading",
    "2 Python start",
    "3 Financial data",
    "4 Analysis with Python",
    "5 ML & AI in finance",
    "6 Backtesting",
    "7 Market microstructure",
    "8 HFT",
    "9 Portfolio risk",
    "10 Optimizing systems",
  ],
  /** Empire-usable process only */
  hygiene: [
    "Backtest before trust: event-driven realism > naive signal loops; measure Sharpe, max drawdown, not just total return.",
    "Walk-forward / out-of-sample: optimize in-sample, validate OOS; avoid curve-fit parameter search as edge.",
    "Kill look-ahead bias: never use future close/shift(-1) as if known at decision time (journal PoP vs realized is the live analog).",
    "Survivorship bias: delisted/failed names matter — prefer liquid optionable universe, not hindsight winners only.",
    "Stress scenarios: re-check risk under lower returns / higher vol (empire daily halt + open risk budget already encode stress).",
    "Overfitting is the nemesis of optimization — more parameters ≠ more edge; keep strategy rules few and defined-risk.",
    "Emotion removal via process: written entry/exit before fill (pretrade form) beats discretionary panic.",
    "HFT / microstructure chapters: out of scope for manual RH equity options empire — do not port latency games.",
    "Python notebooks: research only; OptionScope brain stays TypeScript + MC workers — never auto-trade from book snippets.",
    "ML/AI chapters: co-pilot research; never invent chain marks or free-form strategies (same as AI_COPILOT_CHARTER).",
  ] as const,
  /** Explicit non-goals for this PDF */
  reject: [
    "High-frequency trading stack",
    "Auto-broker Python bots into Robinhood",
    "Keyword-seed strategy IDs without structure (old hit_weight=1–2 seeds)",
  ] as const,
} as const;

/** AI / local-LLM co-pilot constraints (from AI library in newdump). */
export const AI_COPILOT_CHARTER = {
  id: "newdump_ai_copilot_charter",
  title: "AI is co-pilot, not oracle",
  bullets: [
    "Local LLMs (LM Studio) narrate and teach — they never invent strikes, marks, or Greeks.",
    "Deterministic engine owns PoP, EV, max loss, size, and risk gates.",
    "Quantum AI / multiverse reading is philosophy — not an options edge source (Wichert CRC 2023).",
    "Monte Carlo PoP/EV is classical simulation — never rebrand as multiverse or quantum AI edge.",
    "Generative AI books inform workflow automation, not free-form trade fantasies.",
    "Human owns every fill. Companion never auto-trades.",
    "Obsession target: option profits via defined risk, IV regime fit, and process — not prediction theatre.",
    "Strauss Algorithmic Essentials: backtest/walk-forward literacy only — not a live Python execution path.",
    "HBR AI Insights: collaborative intelligence + 'what AI must never do' — never invent strikes, marks, or orders.",
    "Illustrated Guide to AI Agents: memory + tools required for agents; tools must be real APIs; context is the spec — no free-form fills.",
    "Brain Rush: GenAI boosts productivity but hallucinates — never invent strikes/marks; no secrets into public chatbots.",
  ],
  sources: [
    "Build Your Own AI Assistant (local LLM workflows)",
    "Cohan P. Brain Rush (2024) — GenAI industry/compete context; verify outputs; co-pilot only",
    "Wichert A. Mind, Brain, Quantum AI, and the Multiverse (2023) — philosophy/scope limits only",
    "Hassan Brain Networks (personalization ≠ market edge)",
    "Algorithmic Essentials Trading with Python (Strauss/Van Der Post 2024) — process only",
    "Artificial Intelligence: The Insights You Need from HBR (2019) — adoption/governance only",
    "An Illustrated Guide to AI Agents (O'Reilly early release sample) — memory/tools architecture only",
  ],
} as const;

/** Pre-trade form schema fields for Command Center Playbook tab. */
export const PRETRADE_FORM_FIELDS = [
  { id: "symbol", label: "Symbol", type: "text", required: true },
  { id: "strategyId", label: "Strategy", type: "strategy", required: true },
  { id: "thesis", label: "Thesis (1 sentence)", type: "textarea", required: true },
  { id: "ivRegime", label: "IV regime", type: "select", options: ["elevated", "neutral", "low"], required: true },
  { id: "maxLoss", label: "Max loss $ (lot)", type: "number", required: true },
  { id: "maxProfit", label: "Max profit $ (lot)", type: "number", required: false },
  { id: "breakEvens", label: "Break-even(s)", type: "text", required: false },
  { id: "dte", label: "DTE", type: "number", required: true },
  { id: "exitPlan", label: "Exit plan", type: "textarea", required: true },
  { id: "eventClear", label: "Clear of earnings/ex-div?", type: "checkbox", required: true },
  { id: "sizeContracts", label: "Contracts", type: "number", required: true },
] as const;

export const POSTTRADE_FORM_FIELDS = [
  { id: "symbol", label: "Symbol", type: "text", required: true },
  { id: "strategyId", label: "Strategy", type: "text", required: true },
  { id: "realizedPL", label: "Realized P/L $", type: "number", required: true },
  { id: "heldDays", label: "Days held", type: "number", required: false },
  { id: "forecastPoP", label: "Forecast PoP at entry", type: "number", required: false },
  { id: "whatWorked", label: "What worked", type: "textarea", required: false },
  { id: "whatFailed", label: "What failed", type: "textarea", required: false },
  { id: "ruleToKeep", label: "Rule to keep / change", type: "textarea", required: true },
] as const;
