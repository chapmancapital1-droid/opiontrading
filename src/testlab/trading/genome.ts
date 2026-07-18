// @ts-nocheck
/**
 * Genome — Evolvable Trading Parameters
 * 
 * HYPOTHESIS STAGE OF THE SCIENTIFIC METHOD
 * =========================================
 * 
 * Each genome IS a hypothesis: "If I trade [STRATEGY] at [DTE] on [TICKER]
 * with these specific parameter values, I will achieve a positive
 * statistical edge."
 * 
 * The genome now evolves WITHIN a fixed strategy+DTE+ticker context.
 * The strategy and DTE are chosen by the user (the "question").
 * The genome evolves the HOW — entry timing, exit rules, risk management,
 * strike selection, and vol adjustments.
 */

export interface Genome {
  // === ENTRY CRITERIA ===
  minEntryScore: number;        // Minimum composite score to enter trade [0.3, 0.95]
  volPremiumThreshold: number;  // Min IV/RV spread to consider overpriced [0.0, 0.5]
  trendStrengthMin: number;     // Min trend strength (20-day momentum) [0.0, 0.05]
  meanReversionZ: number;       // Z-score threshold for mean reversion signals [0.5, 3.0]
  ivRankMin: number;            // Min IV rank percentile to trade [0.1, 0.9]
  rsiOversold: number;          // RSI threshold for oversold signal [15, 35]
  rsiOverbought: number;        // RSI threshold for overbought signal [65, 85]

  // === EXIT CRITERIA ===
  profitTargetPct: number;      // Take profit at this % of max risk [0.2, 2.0]
  stopLossPct: number;          // Stop loss at this % of max risk [0.3, 3.0]
  maxHoldingDays: number;       // Maximum days to hold a position [1, 30]
  timeDecayExit: number;        // Exit when remaining < this fraction of life [0.05, 0.3]
  dteExitMin: number;           // Exit when DTE falls below this [0, 0.5]

  // === RISK MANAGEMENT ===
  maxPortfolioRisk: number;     // Max % of portfolio at risk at any time [0.02, 0.2]
  maxPositions: number;         // Maximum concurrent positions [1, 10]
  kellyFraction: number;        // Kelly criterion fraction for sizing [0.1, 0.8]
  maxDailyLoss: number;         // Stop trading for the day at this % loss [0.01, 0.1]

  // === MODEL WEIGHTS (triangulation) ===
  bsWeight: number;             // Black-Scholes weight [0.05, 1]
  mcWeight: number;             // Monte Carlo weight [0.05, 1]
  binWeight: number;            // Binomial weight [0.05, 1]

  // === REGIME ADAPTATION ===
  bullVolAdjustment: number;    // Adjust IV by this factor in bull [0.7, 1.3]
  bearVolAdjustment: number;    // Adjust IV by this factor in bear [0.7, 1.3]
  crisisVolAdjustment: number;  // Adjust IV by this factor in crisis [0.7, 1.3]
  sidewaysVolAdjustment: number;// Adjust IV by this factor in sideways [0.7, 1.3]

  // === STRIKE SELECTION ===
  strikeDelta: number;          // Target delta for strike selection [0.05, 0.5]
  spreadWidth: number;          // Width of spreads as % of underlying [0.005, 0.15]
  wingWidth: number;            // Width of iron condor wings vs body [1.0, 3.0]

  // === META-PARAMETERS (evolved, not directly traded) ===
  mutationRate: number;         // How much to mutate offspring [0.01, 0.3]
  confidenceThreshold: number;  // Min confidence to accept a hypothesis [0.5, 0.99]
}

export const GENOME_BOUNDS: Record<keyof Genome, [number, number]> = {
  minEntryScore: [0.3, 0.95],
  volPremiumThreshold: [0.0, 0.5],
  trendStrengthMin: [0.0, 0.05],
  meanReversionZ: [0.5, 3.0],
  ivRankMin: [0.1, 0.9],
  rsiOversold: [15, 35],
  rsiOverbought: [65, 85],
  profitTargetPct: [0.2, 2.0],
  stopLossPct: [0.3, 3.0],
  maxHoldingDays: [1, 30],
  timeDecayExit: [0.05, 0.3],
  dteExitMin: [0, 0.5],
  maxPortfolioRisk: [0.02, 0.2],
  maxPositions: [1, 10],
  kellyFraction: [0.1, 0.8],
  maxDailyLoss: [0.01, 0.1],
  bsWeight: [0.05, 1],
  mcWeight: [0.05, 1],
  binWeight: [0.05, 1],
  bullVolAdjustment: [0.7, 1.3],
  bearVolAdjustment: [0.7, 1.3],
  crisisVolAdjustment: [0.7, 1.3],
  sidewaysVolAdjustment: [0.7, 1.3],
  strikeDelta: [0.05, 0.5],
  spreadWidth: [0.005, 0.15],
  wingWidth: [1.0, 3.0],
  mutationRate: [0.01, 0.3],
  confidenceThreshold: [0.5, 0.99],
};

/** Generate a random genome within bounds */
export function randomGenome(rng: { next: () => number; range: (min: number, max: number) => number }): Genome {
  const genome = {} as Genome;
  for (const [key, [lo, hi]] of Object.entries(GENOME_BOUNDS)) {
    (genome as Record<string, number>)[key] = rng.range(lo, hi);
  }
  return genome;
}

/** Clamp genome values to valid bounds */
export function clampGenome(g: Genome): Genome {
  const clamped = { ...g };
  for (const [key, [lo, hi]] of Object.entries(GENOME_BOUNDS)) {
    const val = (clamped as Record<string, number>)[key];
    (clamped as Record<string, number>)[key] = Math.max(lo, Math.min(hi, val));
  }
  return clamped;
}

/** Crossover two parent genomes (uniform crossover) */
export function crossover(parent1: Genome, parent2: Genome, rng: { next: () => number; chance: (p: number) => boolean }): Genome {
  const child = { ...parent1 };
  for (const key of Object.keys(GENOME_BOUNDS) as (keyof Genome)[]) {
    if (rng.chance(0.5)) {
      (child as Record<string, number>)[key] = (parent2 as Record<string, number>)[key];
    }
  }
  return clampGenome(child);
}

/** Mutate a genome */
export function mutate(genome: Genome, rng: { next: () => number; chance: (p: number) => boolean; normal: (mean: number, stddev: number) => number }, strength: number = 1.0): Genome {
  const mutated = { ...genome };
  for (const [key, [lo, hi]] of Object.entries(GENOME_BOUNDS)) {
    if (rng.chance(genome.mutationRate * strength)) {
      const range = hi - lo;
      const currentValue = (mutated as Record<string, number>)[key];
      const perturbation = rng.normal(0, range * 0.1 * strength);
      (mutated as Record<string, number>)[key] = currentValue + perturbation;
    }
  }
  return clampGenome(mutated);
}

/** Create a DTE-aware expert genome */
export function expertGenome(dte: number = 5): Genome {
  // Adjust expert priors based on DTE
  const dteFactor = Math.min(1, dte / 10);
  return clampGenome({
    minEntryScore: 0.55 + dteFactor * 0.1,
    volPremiumThreshold: 0.05 + (1 - dteFactor) * 0.1,
    trendStrengthMin: 0.005 + dteFactor * 0.005,
    meanReversionZ: 1.5,
    ivRankMin: 0.3,
    rsiOversold: 30,
    rsiOverbought: 70,
    profitTargetPct: 0.4 + (1 - dteFactor) * 0.3,
    stopLossPct: 1.0 + dteFactor * 0.5,
    maxHoldingDays: Math.max(1, dte),
    timeDecayExit: 0.1 + (1 - dteFactor) * 0.1,
    dteExitMin: Math.max(0, (dte - 1) / dte * 0.3),
    maxPortfolioRisk: 0.04 + dteFactor * 0.02,
    maxPositions: dte <= 1 ? 5 : 3,
    kellyFraction: 0.25 + dteFactor * 0.1,
    maxDailyLoss: 0.03,
    bsWeight: 0.5,
    mcWeight: 0.3,
    binWeight: 0.2,
    bullVolAdjustment: 0.9,
    bearVolAdjustment: 1.1,
    crisisVolAdjustment: 1.3,
    sidewaysVolAdjustment: 0.85,
    strikeDelta: dte <= 1 ? 0.15 : 0.3,
    spreadWidth: dte <= 1 ? 0.01 : 0.03,
    wingWidth: 1.5 + dteFactor * 0.5,
    mutationRate: 0.1,
    confidenceThreshold: 0.8,
  });
}
