// @ts-nocheck
/**
 * Synthetic Market Data Generator — Regime-Switching Model
 * 
 * OBSERVATION STAGE OF THE SCIENTIFIC METHOD
 * ===========================================
 * 
 * Real markets are too short for rigorous strategy testing.
 * SPY has only ~30 years of history — not enough to see how
 * a strategy handles a 1929-style crash, a 1970s stagflation,
 * or a decade-long bull run.
 * 
 * This generator creates synthetic but statistically realistic
 * market data using a Hidden Markov Regime-Switching Model:
 * 
 *   Regimes: BULL | BEAR | CRISIS | SIDEWAYS
 *   
 *   Each regime has distinct:
 *   - Mean daily return (mu)
 *   - Daily volatility (sigma)
 *   - Mean duration (how long it lasts)
 *   - Kurtosis (fat tails in crisis)
 *   
 *   Transitions between regimes follow a Markov chain with
 *   empirically-estimated transition probabilities derived
 *   from real SPY behavior since 1993.
 * 
 * CRITICAL DESIGN PRINCIPLE: Reproducibility
 * Every synthetic market generated with the same seed produces
 * the exact same data. This is the scientific method's requirement
 * for controlled, repeatable experiments.
 */

import { SeededRNG } from './rng';

export type MarketRegime = 'bull' | 'bear' | 'crisis' | 'sideways';

export interface RegimeParams {
  mu: number;           // Mean daily return (log)
  sigma: number;        // Daily volatility
  kurtosis: number;     // Excess kurtosis (0 = normal, >0 = fat tails)
  meanDuration: number; // Mean days in this regime
  description: string;
}

export interface MarketBar {
  day: number;
  date: string;          // Synthetic date string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  regime: MarketRegime;
  regimeDay: number;     // Day within current regime
  dailyReturn: number;   // Log return
  realizedVol: number;   // Rolling 21-day realized vol
  drawdown: number;      // From peak
}

export interface SyntheticMarket {
  bars: MarketBar[];
  totalDays: number;
  regimes: Record<MarketRegime, { days: number; returnSum: number; returnSq: number }>;
  finalPrice: number;
  maxDrawdown: number;
  sharpeRatio: number;
  annualizedReturn: number;
  annualizedVol: number;
}

// Regime parameters calibrated to approximate real SPY behavior
const REGIME_CONFIG: Record<MarketRegime, RegimeParams> = {
  bull: {
    mu: 0.0004,        // ~10% annualized
    sigma: 0.008,      // ~12.7% annualized
    kurtosis: 0.5,
    meanDuration: 200,  // ~10 months
    description: 'Rising prices, moderate volatility, positive drift',
  },
  bear: {
    mu: -0.0006,       // ~-15% annualized
    sigma: 0.015,      // ~23.8% annualized
    kurtosis: 1.0,
    meanDuration: 120,  // ~6 months
    description: 'Declining prices, elevated volatility, negative drift',
  },
  crisis: {
    mu: -0.003,        // ~-55% annualized (short, sharp)
    sigma: 0.04,       // ~63% annualized (extreme)
    kurtosis: 5.0,     // Very fat tails
    meanDuration: 20,   // ~1 month
    description: 'Crash conditions, extreme volatility, panic selling',
  },
  sideways: {
    mu: 0.00005,       // ~1.3% annualized
    sigma: 0.006,      // ~9.5% annualized
    kurtosis: 0.2,
    meanDuration: 150,  // ~7 months
    description: 'Range-bound, low volatility, mean-reverting',
  },
};

// Transition probabilities (row = from, col = to)
const TRANSITION_MATRIX: Record<MarketRegime, Record<MarketRegime, number>> = {
  bull:     { bull: 0.85, bear: 0.07, crisis: 0.02, sideways: 0.06 },
  bear:     { bull: 0.08, bear: 0.70, crisis: 0.10, sideways: 0.12 },
  crisis:   { bull: 0.15, bear: 0.25, crisis: 0.40, sideways: 0.20 },
  sideways: { bull: 0.12, bear: 0.05, crisis: 0.01, sideways: 0.82 },
};

/**
 * Generate a synthetic market with the given parameters
 */
export function generateMarket(params: {
  years: number;
  startPrice?: number;
  seed: number;
  tradingDaysPerYear?: number;
}): SyntheticMarket {
  const {
    years,
    startPrice = 100,
    seed,
    tradingDaysPerYear = 252,
  } = params;

  const rng = new SeededRNG(seed);
  const totalDays = years * tradingDaysPerYear;

  // Regime tracking
  const regimes: Record<MarketRegime, { days: number; returnSum: number; returnSq: number }> = {
    bull: { days: 0, returnSum: 0, returnSq: 0 },
    bear: { days: 0, returnSum: 0, returnSq: 0 },
    crisis: { days: 0, returnSum: 0, returnSq: 0 },
    sideways: { days: 0, returnSum: 0, returnSq: 0 },
  };

  const bars: MarketBar[] = [];
  let price = startPrice;
  let peak = startPrice;
  let currentRegime: MarketRegime = 'sideways';
  let regimeDaysIn = 0;
  let returns: number[] = [];

  // Start date: January 1 of a synthetic year
  let syntheticDay = 0;
  let syntheticMonth = 0;
  let syntheticYear = 2000;

  for (let day = 0; day < totalDays; day++) {
    // Maybe transition regime (geometric distribution)
    const rp = REGIME_CONFIG[currentRegime];
    regimeDaysIn++;

    // Probability of leaving current regime today
    const leaveProb = 1 - Math.exp(-1 / rp.meanDuration);

    if (rng.chance(leaveProb) && regimeDaysIn > 5) {
      // Choose next regime based on transition matrix
      const transitions = TRANSITION_MATRIX[currentRegime];
      const roll = rng.next();
      let cumulative = 0;
      for (const [regime, prob] of Object.entries(transitions)) {
        cumulative += prob;
        if (roll <= cumulative) {
          currentRegime = regime as MarketRegime;
          break;
        }
      }
      regimeDaysIn = 0;
    }

    // Generate return for this day
    const config = REGIME_CONFIG[currentRegime];
    let dailyReturn: number;

    if (config.kurtosis > 0.5) {
      // Use Student-t-like distribution for fat tails
      // Approximation: mix of normal and a jump component
      const isJump = rng.chance(0.05); // 5% chance of jump
      if (isJump) {
        const jumpSize = rng.normal(0, config.sigma * config.kurtosis);
        dailyReturn = config.mu + jumpSize;
      } else {
        dailyReturn = config.mu + rng.normal(0, config.sigma);
      }
    } else {
      dailyReturn = config.mu + rng.normal(0, config.sigma);
    }

    // Generate OHLCV
    const intradayVol = config.sigma * 0.8;
    const open = price;
    const close = price * Math.exp(dailyReturn);
    
    // High and low using running maximum/minimum within the day
    const high = Math.max(open, close) * (1 + Math.abs(rng.normal(0, intradayVol * 0.5)));
    const low = Math.min(open, close) * (1 - Math.abs(rng.normal(0, intradayVol * 0.5)));
    
    // Volume: higher in crisis, lower in sideways
    const baseVolume = 1e6;
    const volMultiplier = currentRegime === 'crisis' ? 3.0 :
      currentRegime === 'bear' ? 1.8 :
      currentRegime === 'bull' ? 1.2 : 0.8;
    const volume = baseVolume * volMultiplier * (0.7 + rng.next() * 0.6);

    // Track statistics
    peak = Math.max(peak, close);
    const drawdown = (peak - close) / peak;
    returns.push(dailyReturn);

    // Rolling 21-day realized vol
    const recentReturns = returns.slice(-21);
    const meanReturn = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
    const realizedVol = Math.sqrt(
      recentReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / recentReturns.length
    ) * Math.sqrt(252);

    // Synthetic date
    syntheticDay++;
    if (syntheticDay > 21) { syntheticDay = 1; syntheticMonth++; }
    if (syntheticMonth > 11) { syntheticMonth = 0; syntheticYear++; }
    const dateStr = `${syntheticYear}-${String(syntheticMonth + 1).padStart(2, '0')}-${String(syntheticDay).padStart(2, '0')}`;

    bars.push({
      day,
      date: dateStr,
      open,
      high,
      low,
      close,
      volume,
      regime: currentRegime,
      regimeDay: regimeDaysIn,
      dailyReturn,
      realizedVol,
      drawdown,
    });

    // Track regime stats
    regimes[currentRegime].days++;
    regimes[currentRegime].returnSum += dailyReturn;
    regimes[currentRegime].returnSq += dailyReturn ** 2;

    price = close;
  }

  // Compute aggregate statistics
  const allReturns = bars.map(b => b.dailyReturn);
  const meanReturn = allReturns.reduce((a, b) => a + b, 0) / allReturns.length;
  const stdReturn = Math.sqrt(
    allReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / allReturns.length
  );
  const maxDrawdown = Math.max(...bars.map(b => b.drawdown));
  const totalYears = totalDays / 252;

  return {
    bars,
    totalDays,
    regimes,
    finalPrice: price,
    maxDrawdown,
    sharpeRatio: (meanReturn / stdReturn) * Math.sqrt(252),
    annualizedReturn: (1 + meanReturn) ** 252 - 1,
    annualizedVol: stdReturn * Math.sqrt(252),
  };
}
