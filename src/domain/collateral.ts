import type { Leg, OptionLeg } from "./types";

/** Estimate defined-risk collateral for common cases. Returns null when the
 *  position is undefined-risk (should be blocked in companion mode anyway). */
export function estimateCollateral(legs: Leg[]): number | null {
  // Cash-secured put: reserve strike * multiplier * contracts - premium.
  const shorts = legs.filter(
    (l): l is OptionLeg => l.assetType === "option" && l.side === "short"
  );
  const longs = legs.filter(
    (l): l is OptionLeg => l.assetType === "option" && l.side === "long"
  );

  // Vertical spread (same type, opposite sides): collateral ~= width * mult * qty.
  if (shorts.length === 1 && longs.length === 1) {
    const s = shorts[0]!, l = longs[0]!;
    if (s.optionType === l.optionType) {
      const width = Math.abs(s.strike - l.strike);
      const qty = Math.min(s.contracts, l.contracts);
      return Number((width * s.multiplier * qty).toFixed(2));
    }
  }

  // Single cash-secured put.
  if (shorts.length === 1 && longs.length === 0) {
    const s = shorts[0]!;
    if (s.optionType === "put") {
      const reserve = s.strike * s.multiplier * s.contracts - s.premiumPerShare * s.multiplier * s.contracts;
      return Number(reserve.toFixed(2));
    }
  }

  return null; // covered call collateral = the shares themselves; handled in UI
}
