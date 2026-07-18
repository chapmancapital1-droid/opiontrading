/**
 * Phase 5 — Grounded educational explainer ("Quantum AI" narrative layer).
 *
 * NEVER freelances risk or invents strikes. Only uses:
 *   - structured ScoredRecommendation / BrainDecision fields
 *   - MarketContext signals
 *   - book-library catalog snippets via searchCatalog
 *
 * No order placement. Not investment advice.
 */

import { searchCatalog, type CatalogQueryResult } from "@/knowledge/catalog";
import type { MarketContext } from "@/lib/marketContext";
import type { BrainDecision } from "./types";
import type { ScoredRecommendation } from "./engineScore";

export interface ExplainCitation {
  source: string;
  page: number | null;
  snippet: string;
  category: string;
  subsection: string;
}

export interface StrategyExplanation {
  strategyId: string;
  name: string;
  headline: string;
  thesis: string;
  whyNow: string[];
  risks: string[];
  howToUseBuilder: string[];
  robinhoodReminder: string;
  citations: ExplainCitation[];
  confidenceNote: string;
  disclaimer: string;
  /** Structured facts the UI/AI must not contradict */
  facts: {
    symbol: string;
    matchScore: number;
    suggestedContracts: number;
    enginePoP: number | null;
    engineEV: number | null;
    payoffRoR: number | null;
    maxLossPerContract: number | null;
    legsNote: string;
    ivTrend: string;
    spotTrend: string;
    eventProximity: string;
    dte: number | null;
  };
}

export interface BrainExplainInput {
  decision: BrainDecision;
  context: MarketContext;
  /** Ranked / scored recs (engine metrics optional). */
  scored: ScoredRecommendation[];
  /** Which strategyId to explain (default: top rec). */
  strategyId?: string;
}

function flattenCitations(hits: CatalogQueryResult[], max = 6): ExplainCitation[] {
  const out: ExplainCitation[] = [];
  for (const h of hits) {
    for (const sn of h.hits) {
      out.push({
        source: sn.source || "option book library",
        page: sn.page,
        snippet: sn.snippet.slice(0, 320),
        category: h.category,
        subsection: h.subsection,
      });
      if (out.length >= max) return out;
    }
  }
  return out;
}

function dteOf(exp: string | undefined | null): number | null {
  if (!exp) return null;
  const d = Math.round((new Date(exp).getTime() - Date.now()) / 864e5);
  return Number.isFinite(d) ? d : null;
}

/**
 * Build a grounded plain-language explanation for one recommendation.
 */
export function explainStrategy(input: BrainExplainInput): StrategyExplanation {
  const { decision, context } = input;
  const rec =
    (input.strategyId
      ? input.scored.find((s) => s.strategyId === input.strategyId)
      : null) ??
    input.scored[0] ??
    null;

  if (!rec) {
    return {
      strategyId: input.strategyId ?? "none",
      name: "No recommendation",
      headline: "No ranked strategy to explain for this context.",
      thesis: "The selector found no eligible strategies under current gates and market context.",
      whyNow: decision.marketNotes.slice(0, 4),
      risks: ["Do not force a trade when the brain returns an empty ranking."],
      howToUseBuilder: ["Reload chain on a liquid symbol", "Check account gates / NCI TA snapshot"],
      robinhoodReminder: decision.disclaimer,
      citations: [],
      confidenceNote: `Context confidence: ${context.confidence}`,
      disclaimer: decision.disclaimer,
      facts: {
        symbol: context.symbol,
        matchScore: 0,
        suggestedContracts: 0,
        enginePoP: null,
        engineEV: null,
        payoffRoR: null,
        maxLossPerContract: null,
        legsNote: "",
        ivTrend: context.ivTrend,
        spotTrend: context.spotTrend,
        eventProximity: context.eventProximity,
        dte: dteOf(context.expiration),
      },
    };
  }

  const queryParts = [
    rec.name,
    rec.strategyId.replace(/_/g, " "),
    context.ivTrend === "elevated" ? "sell premium implied volatility" : "implied volatility",
    context.spotTrend,
    rec.portfolioRole.replace(/_/g, " "),
  ];
  const catalogHits = searchCatalog(queryParts.join(" "), 8);
  // Secondary search on entry keywords
  const more = searchCatalog(rec.entryRules[0] ?? rec.strategyId, 4);
  const citations = flattenCitations([...catalogHits, ...more], 6);

  const dte = dteOf(context.expiration);
  const pop =
    rec.engine.probProfit != null ? `${(rec.engine.probProfit * 100).toFixed(1)}% model PoP` : "PoP not scored";
  const ev =
    rec.engine.expectedPL != null
      ? `model EV ${rec.engine.expectedPL >= 0 ? "+" : ""}$${rec.engine.expectedPL.toFixed(0)}`
      : "EV not scored";

  const whyNow: string[] = [
    ...rec.matchReasons.slice(0, 4),
    `Market: IV ${context.ivTrend} (rank ${(context.ivRank * 100).toFixed(0)}%), spot ${context.spotTrend}, liquidity ${context.liquidity}, events ${context.eventProximity}.`,
    dte != null ? `Analysis expiry ${context.expiration} (~${dte} DTE).` : "Expiry unknown.",
    `Engine: ${pop}; ${ev}; payoff RoR ${rec.engine.returnOnRisk ?? "—"}.`,
  ];
  if (decision.nciTa) {
    whyNow.push(
      `NCI TA: master ${decision.nciTa.masterDir} ${decision.nciTa.masterPct}% · ${decision.nciTa.trigger}` +
        (decision.nciTa.fireBuy ? " · FIRE BUY bias" : "") +
        (decision.nciTa.fireSell ? " · FIRE SELL bias" : "")
    );
  }

  const risks: string[] = [
    ...rec.exitRules.map((e) => `Exit rule: ${e}`),
    context.eventProximity !== "clear"
      ? `Event proximity is ${context.eventProximity} — spreads/IV can jump.`
      : "Even with clear calendar, gap risk remains.",
    rec.engine.probProfit != null
      ? "Model PoP is a Monte Carlo estimate under fixed vol — not a guarantee."
      : "Engine metrics missing — do not treat rank alone as probability.",
    rec.suggestedContracts < 1
      ? "Suggested size is 0 contracts under risk budget / cash rules."
      : `Sized to ${rec.suggestedContracts} contract(s); max risk ~$${rec.riskDollars.toFixed(0)} on open risk budget.`,
  ];

  const howToUseBuilder = [
    `Click “Load in builder” for ${rec.name} so strikes match the brain instantiation notes.`,
    rec.legsNote || rec.engine.notes.join("; ") || "Verify strikes against the live chain.",
    "Review payoff chart, break-evens, and order checklist before any manual Robinhood entry.",
    "Never auto-trade; OptionScope is educational decision support only.",
  ];

  const headline = `#${rec.rank} ${rec.name} on ${context.symbol} — match ${rec.matchScore.toFixed(2)} · ${pop}`;

  return {
    strategyId: rec.strategyId,
    name: rec.name,
    headline,
    thesis: `${rec.name} is ranked because rule conditions align with current ${context.symbol} context (${context.ivTrend} IV, ${context.spotTrend} spot). Growth-primary=${rec.growthPrimary}. Book source: ${rec.bookSource}.`,
    whyNow,
    risks,
    howToUseBuilder,
    robinhoodReminder: rec.robinhoodNextStep,
    citations,
    confidenceNote: `Context confidence ${context.confidence} · brain ${decision.version} · ${decision.executionMode}`,
    disclaimer: decision.disclaimer,
    facts: {
      symbol: context.symbol,
      matchScore: rec.matchScore,
      suggestedContracts: rec.suggestedContracts,
      enginePoP: rec.engine.probProfit,
      engineEV: rec.engine.expectedPL,
      payoffRoR: rec.engine.returnOnRisk,
      maxLossPerContract: rec.maxLossPerContract,
      legsNote: rec.legsNote || rec.engine.notes.join("; "),
      ivTrend: context.ivTrend,
      spotTrend: context.spotTrend,
      eventProximity: context.eventProximity,
      dte,
    },
  };
}

/** Format explanation as markdown for copy/export. */
export function explanationToMarkdown(x: StrategyExplanation): string {
  const lines = [
    `# ${x.headline}`,
    "",
    x.thesis,
    "",
    "## Why now",
    ...x.whyNow.map((w) => `- ${w}`),
    "",
    "## Risks & exits",
    ...x.risks.map((w) => `- ${w}`),
    "",
    "## How to use OptionScope",
    ...x.howToUseBuilder.map((w) => `- ${w}`),
    "",
    "## Robinhood path",
    x.robinhoodReminder,
    "",
    "## Book library citations",
    ...(x.citations.length
      ? x.citations.map(
          (c) =>
            `- (${c.category} / ${c.subsection}) ${c.source}${c.page != null ? ` p.${c.page}` : ""}: “${c.snippet}”`
        )
      : ["- No catalog hits — rely on rule bookSource only."]),
    "",
    `_${x.confidenceNote}_`,
    "",
    `**Disclaimer:** ${x.disclaimer}`,
  ];
  return lines.join("\n");
}
