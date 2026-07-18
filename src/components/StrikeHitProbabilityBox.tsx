"use client";

/**
 * Probability score box: chance the underlying hits your chosen strike by expiry.
 * Green = high hit probability · Red = low · Amber = coin-flip zone.
 * Educational Black–Scholes / GBM estimate — not investment advice.
 */

import { useEffect, useMemo, useState } from "react";
import {
  computeStrikeProbability,
  type HitTone,
} from "@/domain/strikeProbability";

export interface StrikeHitProbabilityBoxProps {
  spot: number;
  /** Initial strike — user can override in the box */
  strike: number;
  /** Days to expiration */
  dte: number;
  /** IV decimal e.g. 0.30 */
  sigma: number;
  r?: number;
  q?: number;
  /** Compact embed in builder */
  compact?: boolean;
}

const TONE_STYLE: Record<
  HitTone,
  { bg: string; border: string; fg: string; bar: string }
> = {
  green: {
    bg: "rgba(29, 158, 117, 0.14)",
    border: "rgba(29, 158, 117, 0.55)",
    fg: "var(--text-success, #1d9e75)",
    bar: "#1d9e75",
  },
  amber: {
    bg: "rgba(218, 155, 40, 0.14)",
    border: "rgba(218, 155, 40, 0.55)",
    fg: "var(--text-warning, #c98918)",
    bar: "#c98918",
  },
  red: {
    bg: "rgba(220, 60, 60, 0.12)",
    border: "rgba(220, 60, 60, 0.5)",
    fg: "var(--text-danger, #d63c3c)",
    bar: "#d63c3c",
  },
};

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

export default function StrikeHitProbabilityBox({
  spot,
  strike: strikeProp,
  dte,
  sigma,
  r = 0.045,
  q = 0.005,
  compact = false,
}: StrikeHitProbabilityBoxProps) {
  const [strikeIn, setStrikeIn] = useState(String(strikeProp));
  useEffect(() => {
    setStrikeIn(String(strikeProp));
  }, [strikeProp]);

  const strike = Number(strikeIn);
  const tYears = Math.max(dte, 0.25) / 365;

  const result = useMemo(() => {
    if (!(spot > 0) || !(strike > 0) || !(sigma > 0)) return null;
    return computeStrikeProbability({
      spot,
      strike,
      tYears,
      sigma,
      r,
      q,
    });
  }, [spot, strike, tYears, sigma, r, q]);

  if (!result) {
    return (
      <div className="os-panel p-3 text-sm text-[var(--text-muted)]">
        Enter spot, strike, IV, and DTE to score hit probability.
      </div>
    );
  }

  const style = TONE_STYLE[result.tone];
  const scorePct = Math.round(result.hitScore * 100);

  return (
    <div
      className="os-panel p-3 flex flex-col gap-2"
      style={{
        background: style.bg,
        borderColor: style.border,
        borderWidth: 1.5,
        borderStyle: "solid",
      }}
      data-tone={result.tone}
      data-level={result.level}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="os-kicker" style={{ color: style.fg }}>
            Strike hit probability
          </div>
          <div className="text-sm font-medium m-0" style={{ color: style.fg }}>
            {result.levelLabel}
          </div>
        </div>
        <div
          className="text-3xl font-semibold tabular-nums leading-none"
          style={{ color: style.fg }}
          title="Probability spot touches this strike by expiration (continuous GBM)"
        >
          {pct(result.hitScore)}
        </div>
      </div>

      {/* Score meter */}
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ background: "var(--surface-2, rgba(0,0,0,0.08))" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${scorePct}%`, background: style.bar }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
        <span>0% unlikely</span>
        <span>Score {scorePct}/100</span>
        <span>100% certain</span>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <label className="os-label text-[11px]">
          Your strike $
          <input
            className="os-input mt-0.5 w-full"
            type="number"
            step="0.5"
            value={strikeIn}
            onChange={(e) => setStrikeIn(e.target.value)}
          />
        </label>
        <div className="text-[11px] text-[var(--text-secondary)]">
          <div className="os-label">Spot</div>
          <div className="mt-1 font-medium tabular-nums">${spot.toFixed(2)}</div>
        </div>
        <div className="text-[11px] text-[var(--text-secondary)]">
          <div className="os-label">DTE · IV</div>
          <div className="mt-1 font-medium tabular-nums">
            {dte}d · {(sigma * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {!compact && (
        <div className="grid gap-1 text-[11px] text-[var(--text-secondary)] sm:grid-cols-3">
          <div>
            <span className="text-[var(--text-muted)]">Touch by expiry</span>
            <div className="font-medium tabular-nums" style={{ color: style.fg }}>
              {pct(result.touch)}
            </div>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Finish above strike</span>
            <div className="font-medium tabular-nums">{pct(result.finishAbove)}</div>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Finish below strike</span>
            <div className="font-medium tabular-nums">{pct(result.finishBelow)}</div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-[var(--text-muted)] m-0 leading-snug">
        {result.note}{" "}
        {result.direction === "up"
          ? "Higher score (green) = more likely price runs up to your strike."
          : result.direction === "down"
            ? "Higher score (green) = more likely price drops to your strike."
            : null}{" "}
        Risk-neutral GBM model — educational, not a guarantee.
      </p>
    </div>
  );
}
