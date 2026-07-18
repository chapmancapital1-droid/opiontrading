/**
 * Bridge Trade Lab UI legs → typed domain engine (payoff, MC, Greeks).
 * Keeps the unit-tested domain as source of truth for standard same-expiry structures.
 */

import type { Leg, OptionLeg, PayoffResult } from "@/domain/types";
import { analyzePayoff } from "@/domain/payoff";
import { runMonteCarlo, type MCResult } from "@/domain/montecarlo";
import { aggregateGreeks, type ValuationParams } from "@/domain/valuation";
import type { Greeks } from "@/domain/blackScholes";

/** UI leg shape used by OptionScopeBuilder (inline demo engine). */
export type UiBuilderLeg =
  | {
      kind: "opt";
      type: "call" | "put";
      side: "long" | "short";
      strike: number;
      qty: number;
      prem: number;
      fees?: number;
      term?: "near" | "far" | null;
      remainingT?: number;
    }
  | {
      kind: "stk";
      side: "long" | "short";
      shares: number;
      entry: number;
      fees?: number;
    };

function expISO(dte: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Math.max(1, Math.floor(dte)));
  return d.toISOString().slice(0, 10);
}

/** Convert builder UI legs to domain Legs (single expiry = near DTE). */
export function uiLegsToDomain(
  legs: UiBuilderLeg[],
  opts: { dte: number; farDte?: number; sigma: number }
): Leg[] {
  const nearExp = expISO(opts.dte);
  const farExp = expISO(opts.farDte ?? opts.dte + 90);
  return legs.map((l): Leg => {
    if (l.kind === "stk") {
      return {
        assetType: "stock",
        side: l.side,
        shares: l.shares,
        entryPrice: l.entry,
        feesTotal: l.fees ?? 0,
        quoteTimestamp: null,
      };
    }
    const exp = l.term === "far" ? farExp : nearExp;
    return {
      assetType: "option",
      side: l.side,
      optionType: l.type,
      contracts: l.qty,
      strike: l.strike,
      expiration: exp,
      premiumPerShare: l.prem,
      multiplier: 100,
      impliedVol: opts.sigma,
      exerciseStyle: "american",
      feesTotal: l.fees ?? 0,
      quoteTimestamp: null,
    };
  });
}

export function domainPayoff(
  domainLegs: Leg[],
  spot: number
): PayoffResult {
  return analyzePayoff({ underlying: "LIVE", legs: domainLegs, currentPrice: spot });
}

export function domainMonteCarlo(
  domainLegs: Leg[],
  ctx: {
    spot: number;
    dte: number;
    sigma: number;
    r: number;
    q: number;
    simulations: number;
    seed: number;
    userDrift?: number | null;
  }
): MCResult {
  return runMonteCarlo({
    legs: domainLegs,
    spot: ctx.spot,
    tYears: Math.max(1 / 365, ctx.dte / 365),
    sigma: ctx.sigma,
    r: ctx.r,
    q: ctx.q,
    drift:
      ctx.userDrift != null
        ? { kind: "user", annualDrift: ctx.userDrift }
        : { kind: "risk-neutral" },
    simulations: ctx.simulations,
    seed: ctx.seed,
  });
}

export function domainGreeks(
  domainLegs: Leg[],
  ctx: { spot: number; sigma: number; r: number; q: number }
): Greeks {
  const today = new Date().toISOString().slice(0, 10);
  const p: ValuationParams = {
    targetSpot: ctx.spot,
    targetDate: today,
    r: ctx.r,
    q: ctx.q,
    ivScenario: { kind: "fixed" },
  };
  const optionLegs = domainLegs.filter((l): l is OptionLeg => l.assetType === "option");
  // Apply fixed sigma override for scenario consistency with builder slider
  const withSigma = optionLegs.map((l) => ({
    ...l,
    impliedVol: l.impliedVol ?? ctx.sigma,
  }));
  let stockShares = 0;
  for (const l of domainLegs) {
    if (l.assetType === "stock") {
      stockShares += l.side === "long" ? l.shares : -l.shares;
    }
  }
  return aggregateGreeks(withSigma, p, stockShares);
}

export function isDiagonalStructure(legs: UiBuilderLeg[]): boolean {
  return legs.some((l) => l.kind === "opt" && (l.term === "near" || l.term === "far"));
}
