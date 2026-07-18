/**
 * SPY special playbook — advanced 1DTE / defined-risk instructions
 * for the OptionScope Command brain when symbol is SPY.
 *
 * Educational only. Aligns with Python OTA SPY_1DTE strategy + safe/cheap research.
 */

export const SPY_TICKERS = new Set(["SPY", "SPX", "SPXW"]);

export function isSpySymbol(symbol: string): boolean {
  const s = (symbol.includes(":") ? symbol.split(":").pop()! : symbol)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return SPY_TICKERS.has(s) || s === "SPY";
}

export type SpyBias = "bullish" | "bearish" | "neutral";

export interface SpyStrikeGuide {
  label: string;
  offsetHint: string;
  structure: string;
  estPopBand: string;
  when: string;
  how: string;
}

export interface SpyAdvancedPlaybook {
  symbol: string;
  title: string;
  bias: SpyBias;
  summary: string;
  whenToTrade: string[];
  whenNotToTrade: string[];
  highPopStrikeGuides: SpyStrikeGuide[];
  safeCheapStructures: {
    id: string;
    name: string;
    how: string;
    capitalNote: string;
    target: string;
  }[];
  adjustmentLadder: string[];
  riskRules: string[];
  sessionChecklist: string[];
  robinhoodAdvanced: string[];
  disclaimer: string;
}

/** Prefer these strategyIds when the ticker is SPY. */
export const SPY_STRATEGY_BOOST: Record<string, number> = {
  bull_put_credit: 0.22,
  bear_call_credit: 0.2,
  iron_condor: 0.18,
  bull_call: 0.14,
  bear_put: 0.14,
  long_call: 0.08,
  long_put: 0.08,
  cash_secured_put: 0.12,
  covered_call: 0.1,
  debit_spread: 0.16,
  credit_spread: 0.18,
  calendar: 0.06,
};

export function spyBiasFromContext(input: {
  spotTrend?: string;
  newsSentiment?: string;
  nciFireBuy?: boolean;
  nciFireSell?: boolean;
}): SpyBias {
  if (input.nciFireBuy) return "bullish";
  if (input.nciFireSell) return "bearish";
  const t = (input.spotTrend || "").toLowerCase();
  if (t.includes("up") || t === "bullish") return "bullish";
  if (t.includes("down") || t === "bearish") return "bearish";
  const n = (input.newsSentiment || "").toLowerCase();
  if (n === "bullish" || n === "positive") return "bullish";
  if (n === "bearish" || n === "negative") return "bearish";
  return "neutral";
}

export function buildSpyAdvancedPlaybook(opts: {
  spot?: number | null;
  bias?: SpyBias;
  atmIv?: number | null;
  ivTrend?: string;
}): SpyAdvancedPlaybook {
  const bias = opts.bias ?? "neutral";
  const spot = opts.spot != null && opts.spot > 0 ? opts.spot : null;
  const spotLabel = spot != null ? `$${spot.toFixed(2)}` : "live SPY mark";
  const ivPct =
    opts.atmIv != null && opts.atmIv > 0
      ? `${(opts.atmIv * 100).toFixed(1)}% ATM IV`
      : "check live IV";

  const highPopStrikeGuides: SpyStrikeGuide[] =
    bias === "bearish"
      ? [
          {
            label: "Slightly ITM put",
            offsetHint: spot != null ? `~${Math.round(spot + 1)}–${Math.round(spot + 3)} put` : "spot+1 to +3 put",
            structure: "Long put → convert to debit put spread on −40% premium",
            estPopBand: "62–72% model POP",
            when: "Trend down + entry score ≥70 + not last hour",
            how: "Buy liquid put near ATM; if loss hits 40% of premium, sell lower wing ($1–5 wide) to define risk",
          },
          {
            label: "ATM put",
            offsetHint: spot != null ? `~${Math.round(spot)} put` : "ATM put",
            structure: "Long put or bear put debit spread",
            estPopBand: "55–65%",
            when: "Confirmed breakdown under VWAP / ORB low",
            how: "Prefer starting as debit spread (buy ATM, sell lower) if seed equity is small",
          },
          {
            label: "Bear call credit (safe/cheap)",
            offsetHint: spot != null ? `short ~${Math.round(spot + 5)} / long +5 wide` : "OTM short call spread",
            structure: "Bear call credit spread (defined risk)",
            estPopBand: "65–80% if short ~0.15–0.30Δ",
            when: "Mildly bearish or range day with elevated IV",
            how: "Sell OTM call, buy higher call $1–5 wide; target 50% of credit; stop ~2× credit",
          },
          {
            label: "Iron condor (range)",
            offsetHint: "OTM put + OTM call wings",
            structure: "Iron condor",
            estPopBand: "Both shorts OTM; manage early on break",
            when: "Neutral / low expected move day",
            how: "Only when bias=neutral; skip if NCI FIRE or news shock",
          },
        ]
      : bias === "bullish"
        ? [
            {
              label: "Slightly ITM call",
              offsetHint:
                spot != null ? `~${Math.round(spot - 3)}–${Math.round(spot - 1)} call` : "spot−3 to −1 call",
              structure: "Long call → debit call spread on −40%",
              estPopBand: "62–72% model POP",
              when: "Trend up + score ≥70 + first 1–2 hours preferred",
              how: "Buy liquid call; on −40% premium sell higher wing to cut breakeven / max loss",
            },
            {
              label: "ATM call",
              offsetHint: spot != null ? `~${Math.round(spot)} call` : "ATM call",
              structure: "Long call or bull call debit spread",
              estPopBand: "55–65%",
              when: "ORB high break + price above EMA/VWAP",
              how: "Defined-risk debit spread preferred under seed capital rules",
            },
            {
              label: "Bull put credit (safe/cheap)",
              offsetHint: spot != null ? `short ~${Math.round(spot - 5)} / long −5 wide` : "OTM short put spread",
              structure: "Bull put credit spread (defined risk)",
              estPopBand: "65–80% if short ~0.15–0.30Δ",
              when: "Mildly bullish pullback in uptrend; IV not crushed",
              how: "Sell OTM put, buy lower put $1–5 wide; 1–2% capital risk max; target 50% credit",
            },
            {
              label: "CSP / wheel (multi-DTE)",
              offsetHint: "21–45 DTE OTM put",
              structure: "Cash-secured put (not naked 0DTE)",
              estPopBand: "Higher POP at lower delta",
              when: "Elevated IV rank + wheel universe + longer horizon",
              how: "Do not force CSP on 0–1 DTE; use weekly/monthly for collateral engine",
            },
          ]
        : [
            {
              label: "Iron condor",
              offsetHint: "Symmetric OTM wings",
              structure: "Iron condor",
              estPopBand: "Shorts ~0.15–0.25Δ each side",
              when: "True range day; no FIRE buy/sell",
              how: "Defined risk both sides; manage if one side tested",
            },
            {
              label: "Bull put (mild)",
              offsetHint: "Slight OTM put credit",
              structure: "Bull put credit",
              estPopBand: "70%+ if far enough OTM",
              when: "Slight bullish lean without chase",
              how: "Width $1–5; never naked short put",
            },
            {
              label: "Bear call (mild)",
              offsetHint: "Slight OTM call credit",
              structure: "Bear call credit",
              estPopBand: "70%+ if far enough OTM",
              when: "Slight bearish lean / resistance",
              how: "Width $1–5; exit before last-hour gamma",
            },
            {
              label: "Stand down",
              offsetHint: "—",
              structure: "No trade",
              estPopBand: "N/A",
              when: "Choppy open, FOMC/CPI day, score <70",
              how: "Cash is a position — wait for next session filter",
            },
          ];

  return {
    symbol: "SPY",
    title: "SPY advanced playbook (1DTE + defined-risk)",
    bias,
    summary: `SPY at ${spotLabel} · bias ${bias} · ${ivPct} · ${opts.ivTrend ?? "IV regime n/a"}. Prefer liquid ETF options, selective entry, and defined-risk adjustments over naked hope.`,
    whenToTrade: [
      "Entry filter score ≥ 70 (trend + ORB/VWAP/ATR style confirmation)",
      "Model POP on candidate strikes ≥ ~55% (up to 4 strikes; fewer if thin)",
      "Liquid strikes only (tight bid/ask, meaningful volume/OI)",
      "Risk 1–2% of capital max per trade; seed equity → prefer $1–5 wide spreads",
      "First 1–2 hours of RTH preferred for 1DTE directional; avoid blind last-hour lottery",
    ],
    whenNotToTrade: [
      "Score < 70 or conflicting NCI FIRE vs your bias",
      "Binary event risk not priced / not understood (FOMC, CPI, major geo)",
      "Wide markets or vanishing liquidity on desired strike",
      "Daily loss halt or risk budget exhausted (empire gates)",
      "Trying to average down unlimited times on a naked long",
    ],
    highPopStrikeGuides,
    safeCheapStructures: [
      {
        id: "spy_bull_put_credit",
        name: "Bull put credit spread",
        how: "Sell put ~0.15–0.30Δ; buy lower put $1–5 wide. Max loss = width − credit.",
        capitalNote: "Often $50–500 risk per spread depending on width",
        target: "50% of credit; technical/time stop if thesis breaks",
      },
      {
        id: "spy_bear_call_credit",
        name: "Bear call credit spread",
        how: "Sell call ~0.15–0.30Δ; buy higher call $1–5 wide.",
        capitalNote: "Defined risk = width − credit",
        target: "50% credit; avoid naked short calls",
      },
      {
        id: "spy_iron_condor",
        name: "Iron condor",
        how: "Bull put + bear call; short strikes OTM both sides",
        capitalNote: "Max loss one side width − net credit",
        target: "25–50% of credit; manage early on break",
      },
      {
        id: "spy_1dte_debit_adjust",
        name: "1DTE long → debit spread adjust",
        how: "If long ATM option down ≥40% premium: sell OTM wing to define risk / lower BE",
        capitalNote: "Net debit reduced by wing credit",
        target: "Recovery toward reduced BE or flat residual risk — not magic profit",
      },
    ],
    adjustmentLadder: [
      "1) Primary: convert losing long → debit spread (sell OTM wing)",
      "2) Secondary: roll forward if thesis intact and time value justifies",
      "3) Tertiary: hedge opposite wing only if vol spike expected",
      "4) Last resort: exit or broken-wing / butterfly recovery structure",
      "5) Never: unlimited averaging without a hard capital stop",
    ],
    riskRules: [
      "Never risk >1–2% equity per SPY campaign",
      "Prefer defined-risk over naked short premium",
      "Size from max loss (width − credit), not from hope",
      "Last-hour 0/1 DTE: gamma risk — reduce size or stand down",
      "Paper or checklist-only until process is journaled",
    ],
    sessionChecklist: [
      "Load SPY chart + levels (prior day H/L, VWAP, ORB)",
      "Note ATM IV / IV rank and news/event calendar",
      "Run brain Recommend → read SPY advanced block first",
      "Pick ≤4 high-POP candidates; skip thin quotes",
      "Write max loss, BE, and adjustment trigger before entry",
      "Journal plan → open → close with outcome vs forecast",
    ],
    robinhoodAdvanced: [
      "Robinhood: SPY options chain → filter by nearest 0–2 DTE expiry for 1DTE playbook",
      "Build multi-leg debit/credit spreads (not market naked shorts) when seed equity is small",
      "Verify each leg fill vs mid; reject if ask is absurd vs model fair value",
      "Set mental stop: −40% long premium → convert to spread or exit",
      "After fill: screenshot + journal; no auto-broker from OptionScope",
    ],
    disclaimer:
      "Educational SPY companion only. Model POP/EV are estimates. Not trade advice. No automatic orders.",
  };
}

/** Extra match-reason lines injected into each SPY recommendation. */
export function spyAdvancedInstructionLines(
  strategyId: string,
  playbook: SpyAdvancedPlaybook
): string[] {
  const lines: string[] = [
    `SPY special: bias=${playbook.bias} — follow advanced playbook (session checklist + adjustment ladder)`,
  ];
  const id = strategyId.toLowerCase();
  if (
    id === "bull_put_credit" ||
    id === "cash_secured_put" ||
    (id.includes("put") && id.includes("credit"))
  ) {
    lines.push(
      "SPY how: bull put / CSP path — defined-risk width preferred; target ~50% credit; collateral math first"
    );
  } else if (id === "bear_call_credit" || (id.includes("call") && id.includes("credit"))) {
    lines.push(
      "SPY how: bear call credit — never naked short call; manage before last-hour gamma"
    );
  } else if (id.includes("condor") || id === "iron_condor") {
    lines.push("SPY how: iron condor only on neutral/range day; cut if one wing tested hard");
  } else if (id.includes("call") || id === "bull_call" || id === "long_call") {
    lines.push(
      "SPY how: long/debit call — plan debit-spread convert at −40% premium; prefer liquid ATM/slight ITM"
    );
  } else if (id.includes("put") || id === "bear_put" || id === "long_put") {
    lines.push(
      "SPY how: long/debit put — same adjust ladder; sell lower wing on −40% to define risk"
    );
  } else {
    lines.push(
      "SPY how: default to defined-risk spreads; use high-POP strike guides (≤4) from SPY tab"
    );
  }
  lines.push(
    `SPY when: ${playbook.whenToTrade[0] ?? "score ≥70"} · when not: ${playbook.whenNotToTrade[0] ?? "stand down"}`
  );
  return lines;
}
