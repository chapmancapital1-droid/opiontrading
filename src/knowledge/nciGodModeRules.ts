/**
 * NCI GodMode / TRADINGBRAIN package — structured empire notes only.
 *
 * Sources (personal, not auto-traded into RH):
 *  - C:\Users\Michael Chapman\Downloads\NCI_GodMode_v2.0_BUILD_PACKAGE
 *  - C:\Users\Michael Chapman\Desktop\TRADINGBRAIN\data (spec PDFs)
 *  - pine/NCI_Complete_Trading_Assistant_v2.pine (already in OptionScope)
 *  - src/indicators/nciTa/* (already wired to selector + webhook)
 *
 * What this is: GangsterNerds NCI Hybrid / GodMode — MT4 forex EA +
 * 15-voter confluence + ABC cycles + risk guards + Python dashboard bridge.
 *
 * What OptionScope already does: consume NCI TA language (FIRE/ARM, master,
 * ABC, ADX gates) as soft/hard bias on equity OPTIONS recommendations.
 *
 * Explicitly do NOT vendor into empire runtime:
 *  - Auto-place MT4 orders
 *  - Python FastAPI bridge as required dependency (Next API is enough)
 *  - 28-pair FX heatmap as options primary UI
 *  - EMARobot / “De Pip Sniper” (Documents\githubrepotradingdata) — unrelated EA
 */

/** Package locations Michael marked important / related. */
export const NCI_GODMODE_META = {
  buildPackage:
    "C:\\Users\\Michael Chapman\\Downloads\\NCI_GodMode_v2.0_BUILD_PACKAGE",
  tradingBrainSpecs: "C:\\Users\\Michael Chapman\\Desktop\\TRADINGBRAIN",
  pineInRepo: "pine/NCI_Complete_Trading_Assistant_v2.pine",
  optionScopeBridge: "pine/NCI_OptionScope_Alert_Bridge.pine",
  tsEngine: "src/indicators/nciTa/",
  focus: "forex_nci_chart_language_risk_guards_not_auto_broker",
} as const;

/**
 * Risk / process rules from GodMode handoff — map to empire options sizing.
 * (FX pip math differs; keep % risk spirit only.)
 */
export const NCI_GODMODE_RISK_CHARTER = [
  "Max risk per trade ~0.25% of equity (GodMode lock); empire seed already ~0.5% target with hard caps — never widen after entry.",
  "Daily drawdown halt ~1% (GodMode) — empire has dailyLossHaltPct; treat as series reliability gate.",
  "Weekly / max DD ~3% spirit — openRiskBudget + max campaigns already limit book heat.",
  "No martingale, grid, or averaging into losers — same as undefined-risk ban in companion mode.",
  "No stop widening after entry — journal discipline; options: no adding width without new risk budget.",
  "3-loss cooldown (GodMode bars) → after 3 losing option campaigns, pause new risk until next session / manual review.",
  "Demo/forward evidence before scale: GodMode wants 14-day demo; empire: journal calibration before size up ladder stages.",
  "Trend-biased system: low ADX / chop → skip or prefer range income (iron condor / credits) over directional tactical.",
] as const;

/**
 * Chart-language already implemented in selector (do not re-implement blindly).
 */
export const NCI_GODMODE_ALREADY_IN_OPTIONSCOPE = [
  "NciTaSnapshot: master / FIRE BUY|SELL / ARM / ABC A|B|C / ADX / companion / voters",
  "selector: FIRE aligns thesis score; ABC C_CONTRACTION blocks growth_tactical",
  "RoboTrick fade → prefer income/range structures",
  "Webhook POST /api/nci-ta/webhook + snapshot API for Recommend panel",
  "Pine bridge doc: NCI_OptionScope_Alert_Bridge.pine",
] as const;

/**
 * Useful pulls that are still optional upgrades (ideas only).
 */
export const NCI_GODMODE_OPTIONAL_PULLS = [
  "Expose ADX chop threshold in UI next to NCI strip (already minAdx in DEFAULT_NCI_TA_CONFIG).",
  "Surface abcStage explicitly on BrainRecommendPanel (selector already uses it).",
  "3-loss cooldown flag on AccountState if journal shows 3 consecutive losses same day.",
  "Mode labels SCALP/SWING/LONG are FX TF concepts — for options map to DTE bands only if ever needed (not required).",
  "Do not port MQL4 Hybrid EA into RH options path.",
] as const;

/** Noise packages often sitting next to NCI — do not ingest as strategy. */
export const NCI_RELATED_NOISE = [
  "Documents\\githubrepotradingdata\\EMARobot.mq4 — MetaQuotes 'De Pip Sniper' EMA robot; not NCI; not options.",
  "L:\\DUMP3\\mikeandmike* — cinema assets, not trading brain.",
] as const;
