// @ts-nocheck
/**
 * Evolutionary Algorithm — The Scientific Method as Code
 * ======================================================
 * 
 * This is the CONCLUSION & ITERATION stage of the scientific method.
 * 
 * THE COMPLETE SCIENTIFIC METHOD PIPELINE:
 * 
 * 1. OBSERVE  → generateMarket() creates synthetic data with
 *                known statistical properties across 4 regimes
 * 
 * 2. QUESTION → "Which combination of 26 trading parameters
 *                maximizes risk-adjusted returns?"
 * 
 * 3. HYPOTHESIZE → Each genome IS a hypothesis. The initial
 *                   population mixes random & expert-biased
 *                   hypotheses.
 * 
 * 4. EXPERIMENT → runBacktest() tests each hypothesis against
 *                  the same observation data (controlled variable).
 * 
 * 5. ANALYZE   → Fitness function scores each experiment:
 *                  - Sharpe ratio (risk-adjusted return)
 *                  - Sortino ratio (downside risk)
 *                  - Max drawdown penalty
 *                  - Regime consistency (not just lucky in one regime)
 *                  - Statistical significance (is Sharpe > 0 by chance?)
 *                  - Trade count minimum (avoid overfitting to few trades)
 * 
 * 6. CONCLUDE  → Selection: keep the fittest hypotheses
 * 
 * 7. ITERATE   → Crossover + Mutation create new hypotheses
 *                  from the best conclusions. Repeat.
 * 
 * This loop is the essence of science: form hypotheses,
 * test rigorously, keep what works, improve iteratively.
 */

import { SeededRNG } from './rng';
import { Genome, randomGenome, expertGenome, crossover, mutate, clampGenome } from './genome';
import { generateMarket, SyntheticMarket } from './market-generator';
import { runBacktest, BacktestResult } from './backtester';
import { getTickerProfile, TickerProfile } from './ticker-profiles';
import type { StrategyDef } from './strategies';

// === TYPES ===

export interface FitnessScore {
  rawSharpe: number;
  rawSortino: number;
  maxDrawdownPenalty: number;
  regimeConsistency: number;
  statisticalSignificance: number;
  tradeCountBonus: number;
  composite: number;    // Final weighted fitness
  components: Record<string, number>;
}

export interface Individual {
  genome: Genome;
  fitness: FitnessScore | null;
  backtest: BacktestResult | null;
  id: number;
  parentIds: number[];  // Track lineage for analysis
  generation: number;
}

export interface GenerationResult {
  generation: number;
  individuals: Individual[];
  bestFitness: number;
  avgFitness: number;
  worstFitness: number;
  bestSharpe: number;
  avgSharpe: number;
  bestSortino: number;
  avgDrawdown: number;
  bestIndividual: Individual;
  diversity: number;  // Genomic diversity measure
}

export interface EvolutionConfig {
  seed: number;
  marketYears: number;
  evalYears: number;
  generations: number;
  populationSize: number;
  eliteCount: number;
  tournamentSize: number;
  startingCapital: number;
  // Strategy + DTE + Ticker (the controlled variables)
  strategy: StrategyDef;
  dte: number;
  ticker: TickerProfile;
  // Fitness weights
  wSharpe: number;
  wSortino: number;
  wDrawdown: number;
  wRegimeConsistency: number;
  wSignificance: number;
  wTradeCount: number;
  wEdge: number;  // NEW: weight for statistical edge
}

export interface EvolutionProgress {
  type: 'start' | 'generation_start' | 'individual_done' | 'generation_done' | 'complete' | 'market_generated';
  generation?: number;
  individualId?: number;
  individualCount?: number;
  result?: GenerationResult;
  market?: SyntheticMarket;
  champion?: Individual;
  totalGenerations?: number;
  elapsed?: number;
}

export type ProgressCallback = (event: EvolutionProgress) => void;

// === FITNESS FUNCTION ===
// This is the heart of the ANALYSIS stage

function computeFitness(result: BacktestResult, config: EvolutionConfig): FitnessScore {
  // Component 1: Sharpe Ratio (risk-adjusted return)
  // Higher is better. Penalize negative Sharpe heavily.
  const rawSharpe = result.sharpeRatio;

  // Component 2: Sortino Ratio (downside risk focus)
  const rawSortino = result.sortinoRatio;

  // Component 3: Max Drawdown Penalty
  // Drawdown > 30% gets exponentially penalized
  const maxDrawdownPenalty = result.maxDrawdown > 0.3
    ? -10 * (result.maxDrawdown - 0.3) ** 2
    : 0;

  // Component 4: Regime Consistency
  // A strategy that works in only one regime is fragile.
  // We want positive PnL in at least 3 of 4 regimes.
  const regimePnLs = Object.values(result.regimeResults).map(r => r.avgPnL);
  const positiveRegimes = regimePnLs.filter(p => p > 0).length;
  const regimeConsistency = positiveRegimes >= 3
    ? 1 + (positiveRegimes - 3) * 0.5
    : positiveRegimes / 3;

  // Component 5: Statistical Significance
  // Is the Sharpe ratio statistically different from zero?
  // p < 0.05 is the standard threshold
  const statisticalSignificance = 1 - result.sharpeConfidence;

  // Component 6: Trade Count Bonus
  const idealTrades = 30 + config.dte * 2;
  const tradeCountBonus = Math.max(0, 1 - Math.abs(result.totalTrades - idealTrades) / idealTrades);

  // Component 7: Statistical Edge (NEW — the core metric)
  // positive edge = the strategy has a real, quantifiable advantage
  const edgeBonus = result.statisticalEdge > 0 ? result.statisticalEdge * 5 : result.statisticalEdge * 10;

  // Composite fitness (weighted sum)
  const composite =
    config.wSharpe * rawSharpe +
    config.wSortino * rawSortino +
    config.wDrawdown * maxDrawdownPenalty +
    config.wRegimeConsistency * regimeConsistency +
    config.wSignificance * statisticalSignificance * (rawSharpe > 0 ? 1 : -1) +
    config.wTradeCount * tradeCountBonus +
    config.wEdge * edgeBonus;

  return {
    rawSharpe,
    rawSortino,
    maxDrawdownPenalty,
    regimeConsistency,
    statisticalSignificance,
    tradeCountBonus,
    composite,
    components: {
      sharpe: rawSharpe,
      sortino: rawSortino,
      drawdownPenalty: maxDrawdownPenalty,
      regimeConsistency,
      significance: statisticalSignificance,
      tradeCount: tradeCountBonus,
      edge: edgeBonus,
    },
  };
}

// === SELECTION ===
// Tournament selection: pick K individuals, return the best one

function tournamentSelect(population: Individual[], rng: SeededRNG, size: number): Individual {
  let best: Individual | null = null;
  for (let i = 0; i < size; i++) {
    const idx = Math.floor(rng.next() * population.length);
    const candidate = population[idx];
    if (!best || (candidate.fitness?.composite ?? -Infinity) > (best.fitness?.composite ?? -Infinity)) {
      best = candidate;
    }
  }
  return best!;
}

// === DIVERSITY MEASURE ===
// Average pairwise genome distance (sampled for performance)

function measureDiversity(population: Individual[]): number {
  if (population.length < 2) return 1;
  const genome = population[0].genome;
  const keys = Object.keys(genome) as (keyof Genome)[];

  let totalDist = 0;
  let pairs = 0;
  const sampleSize = Math.min(population.length, 10);

  for (let i = 0; i < sampleSize; i++) {
    for (let j = i + 1; j < sampleSize; j++) {
      const g1 = population[i].genome;
      const g2 = population[j].genome;
      let dist = 0;
      for (const key of keys) {
        const range = Math.abs((g1[key] ?? 0) - (g2[key] ?? 0));
        dist += range * range;
      }
      totalDist += Math.sqrt(dist / keys.length);
      pairs++;
    }
  }

  return pairs > 0 ? totalDist / pairs : 0;
}

// === MAIN EVOLUTION LOOP ===

export function runEvolution(config: EvolutionConfig, onProgress: ProgressCallback): Individual {
  const rng = new SeededRNG(config.seed);
  const startTime = Date.now();

  // === STAGE 1: OBSERVE ===
  // Generate the synthetic market (our laboratory)
  const market = generateMarket({
    years: config.marketYears,
    seed: config.seed,
  });
  onProgress({ type: 'market_generated', market });

  // === STAGE 2: HYPOTHESIZE (Initial Population) ===
  // Mix of expert knowledge and random exploration
  let population: Individual[] = [];
  const expertCount = Math.floor(config.populationSize * 0.25); // 25% expert-biased

  for (let i = 0; i < config.populationSize; i++) {
    const genome = i < expertCount
      ? mutate(expertGenome(config.dte), rng, 0.3)
      : randomGenome(rng);

    population.push({
      genome,
      fitness: null,
      backtest: null,
      id: i,
      parentIds: [],
      generation: 0,
    });
  }

  onProgress({ type: 'start', totalGenerations: config.generations });

  let champion: Individual = population[0];

  // === STAGE 3-7: EXPERIMENT → ANALYZE → CONCLUDE → ITERATE ===
  for (let gen = 0; gen < config.generations; gen++) {
    onProgress({ type: 'generation_start', generation: gen, totalGenerations: config.generations });

    // === EXPERIMENT: Backtest each individual ===
    for (let i = 0; i < population.length; i++) {
      const individual = population[i];

      // Use a different market segment for evaluation each time
      // to prevent overfitting to a specific time window
      const evalSeed = config.seed + gen * 10000 + i * 100;
      const evalMarket = generateMarket({
        years: config.evalYears,
        seed: evalSeed,
      });

      const backtest = runBacktest({
        genome: individual.genome,
        market: evalMarket,
        strategy: config.strategy,
        dte: config.dte,
        ticker: config.ticker,
        startingCapital: config.startingCapital,
        seed: evalSeed,
      });

      individual.backtest = backtest;
      individual.fitness = computeFitness(backtest, config);
      individual.generation = gen;

      onProgress({
        type: 'individual_done',
        generation: gen,
        individualId: individual.id,
        individualCount: i + 1,
      });
    }

    // === ANALYZE: Sort and rank ===
    population.sort((a, b) => (b.fitness?.composite ?? -Infinity) - (a.fitness?.composite ?? -Infinity));

    // Track champion
    if (population[0].fitness && (!champion.fitness || population[0].fitness.composite > champion.fitness.composite)) {
      champion = population[0];
    }

    // === CONCLUDE: Record generation statistics ===
    const fitnesses = population.map(p => p.fitness?.composite ?? 0);
    const sharpes = population.map(p => p.backtest?.sharpeRatio ?? 0);
    const sortinos = population.map(p => p.backtest?.sortinoRatio ?? 0);
    const drawdowns = population.map(p => p.backtest?.maxDrawdown ?? 0);

    const genResult: GenerationResult = {
      generation: gen,
      individuals: population,
      bestFitness: Math.max(...fitnesses),
      avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      worstFitness: Math.min(...fitnesses),
      bestSharpe: Math.max(...sharpes),
      avgSharpe: sharpes.reduce((a, b) => a + b, 0) / sharpes.length,
      bestSortino: Math.max(...sortinos),
      avgDrawdown: drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length,
      bestIndividual: population[0],
      diversity: measureDiversity(population),
    };

    onProgress({
      type: 'generation_done',
      generation: gen,
      result: genResult,
      elapsed: Date.now() - startTime,
    });

    // === ITERATE: Create next generation (unless last) ===
    if (gen < config.generations - 1) {
      const nextPop: Individual[] = [];

      // Elitism: keep top performers unchanged
      for (let i = 0; i < config.eliteCount && i < population.length; i++) {
        nextPop.push({ ...population[i], id: gen * config.populationSize + i });
      }

      // Fill rest with offspring
      while (nextPop.length < config.populationSize) {
        const parent1 = tournamentSelect(population, rng, config.tournamentSize);
        const parent2 = tournamentSelect(population, rng, config.tournamentSize);

        let childGenome: Genome;

        if (rng.chance(0.7)) {
          // Crossover
          childGenome = crossover(parent1.genome, parent2.genome, rng);
        } else {
          // Clone the better parent
          childGenome = (parent1.fitness?.composite ?? 0) > (parent2.fitness?.composite ?? 0)
            ? { ...parent1.genome }
            : { ...parent2.genome };
        }

        // Mutation (strength decreases with generations — simulated annealing)
        const mutationStrength = 1 - (gen / config.generations) * 0.5;
        childGenome = mutate(childGenome, rng, mutationStrength);

        nextPop.push({
          genome: childGenome,
          fitness: null,
          backtest: null,
          id: gen * config.populationSize + nextPop.length,
          parentIds: [parent1.id, parent2.id],
          generation: gen + 1,
        });
      }

      population = nextPop;
    }
  }

  // === FINAL CONCLUSION ===
  champion.fitness = computeFitness(
    runBacktest({
      genome: champion.genome,
      market,
      strategy: config.strategy,
      dte: config.dte,
      ticker: config.ticker,
      startingCapital: config.startingCapital,
      seed: config.seed + 99999,
    }),
    config
  );

  onProgress({
    type: 'complete',
    champion,
    elapsed: Date.now() - startTime,
  });

  return champion;
}

/** Default evolution configuration */
export function defaultConfig(): EvolutionConfig {
  return {
    seed: 42,
    marketYears: 60,
    evalYears: 15,
    generations: 8,
    populationSize: 8,
    eliteCount: 2,
    tournamentSize: 3,
    startingCapital: 100000,
    strategy: { id: '5dte_iron_condor', name: '5 DTE Iron Condor', shortName: '5DTE Iron Condor', description: '', category: 'income', direction: 'neutral', legs: 4, defaultDTEs: [5], typicalIV: 'any', riskReward: 'Defined', description_long: '' },
    dte: 5,
    ticker: { symbol: 'SPY', name: 'S&P 500 ETF', baseIV: 0.16, ivRange: [0.10, 0.45], avgDailyMove: 0.008, beta: 1.0, bidAskSpread: 0.001, commission: 0.65, minOptionPrice: 0.10, maxPositionSize: 50, characteristics: [], bestStrategies: [], riskLevel: 'low' },
    wSharpe: 1.0,
    wSortino: 0.5,
    wDrawdown: 2.0,
    wRegimeConsistency: 1.5,
    wSignificance: 1.0,
    wTradeCount: 0.3,
    wEdge: 2.0,
  };
}
