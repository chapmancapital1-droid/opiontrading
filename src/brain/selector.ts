/**
 * Phase 4 strategy selector — the OptionScope trading brain core.
 *
 * Flow:
 *   MarketContext + AccountState + StrategyRule library
 *     → filter (gates + context match)
 *     → score
 *     → size
 *     → rank
 *     → Robinhood manual next-step copy
 *
 * Never places orders. Never requests Robinhood credentials.
 */

import { PORTFOLIO_POLICY } from "@/knowledge/portfolioPolicy";
import {
  empirePrefersStrategy,
  getEmpirePhaseLimits,
  zeroSizeCoach,
} from "@/knowledge/empirePolicy";
import { STRATEGY_RULES } from "@/knowledge/strategyRules";
import type { StrategyRule } from "@/knowledge/types";
import type { MarketContext } from "@/lib/marketContext";
import type { NciTaSnapshot } from "@/indicators/nciTa";
import {
  buildSpyAdvancedPlaybook,
  isSpySymbol,
  spyAdvancedInstructionLines,
  spyBiasFromContext,
  SPY_STRATEGY_BOOST,
} from "@/knowledge/spyPlaybook";
import { rhHistoryScoreAdjust } from "@/knowledge/rhHistoryLessons";
import {
  allPassed,
  evaluateAccountGates,
  evaluateRuleGates,
  firstFailure,
  remainingRiskBudget,
} from "./riskGates";
import { sizePosition } from "./portfolio";
import type {
  AccountState,
  BrainDecision,
  BrainRecommendation,
  SelectInput,
  StrategyCandidate,
} from "./types";

function scoreRule(
  rule: StrategyRule,
  ctx: MarketContext,
  nciTa?: NciTaSnapshot | null
): { score: number; reasons: string[]; rejects: string[] } {
  let score = rule.priority;
  const reasons: string[] = [];
  const rejects: string[] = [];

  // IV condition
  if (rule.ivConditions.length > 0) {
    if (rule.ivConditions.includes(ctx.ivTrend)) {
      score += 0.12;
      reasons.push(`IV regime ${ctx.ivTrend} matches rule`);
    } else {
      rejects.push(`IV regime ${ctx.ivTrend} not in [${rule.ivConditions.join(", ")}]`);
      return { score: 0, reasons, rejects };
    }
  }

  // Spot trend
  if (rule.trends.length > 0) {
    if (rule.trends.includes(ctx.spotTrend)) {
      score += 0.1;
      reasons.push(`Spot trend ${ctx.spotTrend} matches rule`);
    } else {
      rejects.push(`Spot trend ${ctx.spotTrend} not in [${rule.trends.join(", ")}]`);
      return { score: 0, reasons, rejects };
    }
  }

  // News bias (soft — does not hard-reject unless explicitly mismatched for directional buys)
  if (rule.newsBias !== "any") {
    if (ctx.newsSentiment === rule.newsBias) {
      score += 0.05;
      reasons.push(`News sentiment ${ctx.newsSentiment} aligned`);
    } else if (ctx.newsSentiment === "neutral") {
      score += 0.01;
      reasons.push("News neutral — mild penalty avoided");
    } else {
      // hard reject only for tactical growth with opposite news
      if (rule.portfolioRole === "growth_tactical") {
        rejects.push(`News ${ctx.newsSentiment} opposes required ${rule.newsBias}`);
        return { score: 0, reasons, rejects };
      }
      score -= 0.05;
      reasons.push(`News ${ctx.newsSentiment} not ideal (soft penalty)`);
    }
  }

  // Growth primary boost (empire stage adjusts preference in evaluateCandidates)
  if (rule.growthPrimary) {
    score += 0.08;
    reasons.push("Growth-primary income engine");
  }

  // Confidence soft weight
  if (ctx.confidence === "high") score += 0.03;
  else if (ctx.confidence === "low") score -= 0.03;

  // Wheel universe soft preference for CSP
  if (rule.strategyId === "cash_secured_put") {
    if (PORTFOLIO_POLICY.wheelUniverse.includes(ctx.symbol.toUpperCase())) {
      score += 0.04;
      reasons.push(`${ctx.symbol} is in wheel universe`);
    }
  }

  // SPY special strategy boost + advanced-instruction flags
  if (isSpySymbol(ctx.symbol)) {
    const boost = SPY_STRATEGY_BOOST[rule.strategyId] ?? 0.05;
    score += boost;
    reasons.push(
      boost >= 0.12
        ? `SPY playbook: ${rule.strategyId} is a preferred SPY structure (+${(boost * 100).toFixed(0)} pts)`
        : "SPY playbook: liquid ETF options — defined-risk preferred"
    );
  }

  // Personal Robinhood history soft coach (wins/losses patterns)
  const rh = rhHistoryScoreAdjust(ctx.symbol, rule.strategyId);
  if (rh.delta !== 0 || rh.reasons.length) {
    score += rh.delta;
    reasons.push(...rh.reasons);
  }

  // ---- NCI Complete Trading Assistant live bias (chart language) ----
  if (nciTa) {
    // Hard soft-block: contraction + directional tactical
    if (nciTa.abcStage === "C_CONTRACTION" && rule.portfolioRole === "growth_tactical") {
      rejects.push("NCI TA ABC = C CONTRACTION — skip directional tactical entries");
      return { score: 0, reasons, rejects };
    }
    if (nciTa.fireBuy) {
      if (rule.thesis === "bullish" || rule.thesis === "moderately_bullish") {
        score += 0.18;
        reasons.push("NCI TA ◆ FIRE BUY aligns with bullish thesis");
      } else if (rule.thesis === "bearish" || rule.thesis === "moderately_bearish") {
        score -= 0.12;
        reasons.push("NCI TA FIRE BUY — bearish thesis deprioritized");
      }
    }
    if (nciTa.fireSell) {
      if (rule.thesis === "bearish" || rule.thesis === "moderately_bearish") {
        score += 0.18;
        reasons.push("NCI TA ◆ FIRE SELL aligns with bearish thesis");
      } else if (rule.thesis === "bullish" || rule.thesis === "moderately_bullish") {
        score -= 0.12;
        reasons.push("NCI TA FIRE SELL — bullish thesis deprioritized");
      }
    }
    if (nciTa.masterDir === "BULL" && (rule.thesis === "bullish" || rule.thesis === "moderately_bullish")) {
      score += 0.08;
      reasons.push(`NCI master BULL ${nciTa.masterPct}%`);
    }
    if (nciTa.masterDir === "BEAR" && (rule.thesis === "bearish" || rule.thesis === "moderately_bearish")) {
      score += 0.08;
      reasons.push(`NCI master BEAR ${nciTa.masterPct}%`);
    }
    if (nciTa.masterDir === "FLAT" && (rule.thesis === "range" || rule.thesis === "neutral")) {
      score += 0.1;
      reasons.push("NCI master FLAT — range/neutral income preferred");
    }
    // RoboTrick fade: mean-reversion bias — favor credit/range over chase
    if (nciTa.rtFireBuy || nciTa.rtFireSell) {
      if (rule.portfolioRole === "income_engine" || rule.thesis === "range") {
        score += 0.06;
        reasons.push("NCI RoboTrick fade active — prefer defined income structures");
      }
    }
    if (!nciTa.allGatesPass && rule.portfolioRole === "growth_tactical") {
      score -= 0.1;
      reasons.push("NCI hard gates not all passing — tactical size caution");
    }
  }

  return { score: Number(score.toFixed(4)), reasons, rejects };
}

export function evaluateCandidates(
  context: MarketContext,
  account: AccountState,
  rules: readonly StrategyRule[] = STRATEGY_RULES,
  nciTa?: NciTaSnapshot | null
): StrategyCandidate[] {
  const emp = getEmpirePhaseLimits(account.equity);
  return rules.map((rule) => {
    const { score: base, reasons, rejects } = scoreRule(rule, context, nciTa);
    let score = base;
    // Seed: prefer micro defined-risk templates over capital-heavy income engines
    // Only adjust when the rule already matched market context (base > 0)
    if (base > 0 && (emp.phase === "seed" || emp.phase === "stage1")) {
      if (empirePrefersStrategy(rule.strategyId, account.equity)) {
        score += 0.1;
        reasons.push(`Empire ${emp.phase}: preferred micro/affordable structure`);
      } else if (rule.growthPrimary && emp.phase === "seed") {
        score -= 0.06;
        reasons.push("Empire seed: deprioritize capital-heavy growth-primary until equity scales");
      }
    }
    const gates = evaluateRuleGates(rule, context, account);
    const gateFail = firstFailure(gates);
    if (gateFail) {
      rejects.push(`${gateFail.code}: ${gateFail.message}`);
    }
    const eligible = score > 0 && allPassed(gates);
    return {
      rule,
      matchScore: eligible ? Number(score.toFixed(4)) : 0,
      matchReasons: reasons,
      rejectReasons: rejects,
      eligible,
    };
  });
}

function robinhoodNextStep(rule: StrategyRule, contracts: number, symbol: string): string {
  if (contracts < 1) {
    return (
      `Robinhood: do not enter ${symbol} yet — size is 0. ` +
      `Free risk budget/cash or reduce open risk, then re-run analysis for ${rule.name}. ` +
      PORTFOLIO_POLICY.disclaimer
    );
  }
  const base =
    `In Robinhood: open ${symbol} options chain → build ${rule.name} ` +
    `(${contracts} contract${contracts > 1 ? "s" : ""}) → verify strikes/expiry/limits against OptionScope checklist → ` +
    `submit only after reviewing max loss and collateral. ${PORTFOLIO_POLICY.disclaimer}`;
  if (!isSpySymbol(symbol)) return base;
  return (
    base +
    " SPY advanced: prefer multi-leg defined-risk; for 1DTE use nearest 0–2 DTE expiry; " +
    "if long option −40% premium → convert to debit spread (sell OTM wing) before panic flat."
  );
}

/**
 * Run the full brain: gates → match → size → rank.
 */
export function runTradingBrain(input: SelectInput): BrainDecision {
  const { context, account } = input;
  const topN = input.topN ?? 5;
  const preferGrowth = input.preferGrowthPrimary ?? true;

  const accountGates = evaluateAccountGates(account);
  const halt = firstFailure(accountGates);
  const haltTrading = halt != null && ["DAILY_LOSS_HALT", "INVALID_EQUITY", "RISK_BUDGET_EXHAUSTED"].includes(halt.code);

  const candidates = evaluateCandidates(context, account, STRATEGY_RULES, input.nciTa);
  const eligible = candidates.filter((c) => c.eligible);
  const empPhase = getEmpirePhaseLimits(account.equity);

  eligible.sort((a, b) => {
    // Seed: prefer empire preferred micro structures over growth-primary CSP-style engines
    if (empPhase.phase === "seed") {
      const aPref = empirePrefersStrategy(a.rule.strategyId, account.equity) ? 1 : 0;
      const bPref = empirePrefersStrategy(b.rule.strategyId, account.equity) ? 1 : 0;
      if (aPref !== bPref) return bPref - aPref;
      return b.matchScore - a.matchScore;
    }
    if (preferGrowth && a.rule.growthPrimary !== b.rule.growthPrimary) {
      return a.rule.growthPrimary ? -1 : 1;
    }
    return b.matchScore - a.matchScore;
  });

  const spy = isSpySymbol(context.symbol);
  const spyBias = spy
    ? spyBiasFromContext({
        spotTrend: context.spotTrend,
        newsSentiment: context.newsSentiment,
        ...(input.nciTa?.fireBuy != null ? { nciFireBuy: input.nciTa.fireBuy } : {}),
        ...(input.nciTa?.fireSell != null ? { nciFireSell: input.nciTa.fireSell } : {}),
      })
    : "neutral";
  const spyPlaybook = spy
    ? buildSpyAdvancedPlaybook({
        spot: context.spot,
        bias: spyBias,
        atmIv: context.atmIv,
        ivTrend: context.ivTrend,
      })
    : null;

  const recommendations: BrainRecommendation[] = [];

  if (!haltTrading) {
    for (const c of eligible.slice(0, topN)) {
      const maxLoss = input.maxLossByStrategyId?.[c.rule.strategyId] ?? null;
      const collat = input.collateralByStrategyId?.[c.rule.strategyId] ?? null;
      let contracts = 0;
      let riskDollars = 0;
      if (maxLoss != null && maxLoss > 0) {
        const sized = sizePosition({
          account,
          maxLossPerContract: maxLoss,
          collateralPerContract: collat,
        });
        contracts = sized.contracts;
        riskDollars = sized.riskDollars;
      }

      const matchReasons = [...c.matchReasons];
      let coach: string | null = null;
      if (contracts < 1 && maxLoss != null && maxLoss > 0) {
        matchReasons.push(
          `Infeasible at equity $${account.equity.toFixed(0)}: 1-lot max loss $${maxLoss.toFixed(2)} exceeds empire hard ceiling`
        );
        coach = zeroSizeCoach({
          equity: account.equity,
          maxLossPerContract: maxLoss,
          strategyId: c.rule.strategyId,
        });
      }

      const advancedInstructions =
        spy && spyPlaybook
          ? spyAdvancedInstructionLines(c.rule.strategyId, spyPlaybook)
          : undefined;

      if (advancedInstructions?.length) {
        matchReasons.push(...advancedInstructions.slice(0, 2));
      }

      // SPY: blend entry/exit with playbook adjustment ladder
      const entryRules = spy && spyPlaybook
        ? [
            ...c.rule.entryRules,
            ...spyPlaybook.whenToTrade.slice(0, 2),
            `SPY bias ${spyPlaybook.bias}: use ≤4 high-POP strikes from SPY tab`,
          ]
        : c.rule.entryRules;
      const exitRules = spy && spyPlaybook
        ? [
            ...c.rule.exitRules,
            ...spyPlaybook.adjustmentLadder.slice(0, 3),
          ]
        : c.rule.exitRules;

      recommendations.push({
        rank: recommendations.length + 1,
        ruleId: c.rule.id,
        strategyId: c.rule.strategyId,
        name: c.rule.name,
        portfolioRole: c.rule.portfolioRole,
        matchScore: c.matchScore,
        matchReasons,
        growthPrimary: c.rule.growthPrimary,
        suggestedContracts: contracts,
        maxLossPerContract: maxLoss,
        riskDollars,
        entryRules,
        exitRules,
        bookSource: c.rule.bookSource,
        robinhoodNextStep: robinhoodNextStep(c.rule, contracts, context.symbol),
        zeroSizeCoach: coach,
        ...(advancedInstructions ? { advancedInstructions } : {}),
      });
    }
  }

  const ta = input.nciTa ?? null;
  const spyNotes =
    spy && spyPlaybook
      ? [
          `SPY ADVANCED: ${spyPlaybook.summary}`,
          `SPY when: ${spyPlaybook.whenToTrade[0]}`,
          `SPY adjust: ${spyPlaybook.adjustmentLadder[0]}`,
          "Open Command → SPY tab for full strike guides + session checklist",
        ]
      : [];

  return {
    version: PORTFOLIO_POLICY.version,
    broker: "robinhood",
    executionMode: "manual_checklist_only",
    symbol: context.symbol,
    asOf: context.asOf,
    contextConfidence: context.confidence,
    growthMode: account.growthMode,
    gates: accountGates,
    allGatesPassed: allPassed(accountGates),
    haltTrading,
    haltReason: haltTrading && halt ? `${halt.code}: ${halt.message}` : null,
    recommendations,
    spyPlaybook,
    nciTa: ta
      ? {
          masterDir: ta.masterDir,
          masterPct: ta.masterPct,
          trigger: ta.trigger,
          fireBuy: ta.fireBuy,
          fireSell: ta.fireSell,
          allGatesPass: ta.allGatesPass,
          abcStage: ta.abcStage,
          source: ta.source,
          degraded: ta.degraded,
        }
      : null,
    accountSnapshot: {
      equity: account.equity,
      cash: account.cash,
      optionsFloat: account.optionsFloat,
      portfolioCore: account.portfolioCore,
      openRiskDollars: account.openRiskDollars,
      remainingRiskBudget: remainingRiskBudget(account),
    },
    disclaimer: PORTFOLIO_POLICY.disclaimer,
    marketNotes: [
      ...context.notes,
      ...spyNotes,
      ...(ta?.notes ?? []),
      ...(ta
        ? [
            `NCI TA live: master=${ta.masterDir} ${ta.masterPct}% trigger=${ta.trigger} source=${ta.source}`,
          ]
        : ["NCI TA not loaded — attach Pine on TV + webhook, or POST /api/nci-ta/compute"]),
    ],
  };
}
