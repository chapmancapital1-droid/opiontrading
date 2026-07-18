// @ts-nocheck
/**
 * Ticker Profiles
 * 
 * Different tickers have fundamentally different characteristics:
 * - SPY: Low vol (~15%), tight spreads, high liquidity, index-like behavior
 * - QQQ: Moderate vol (~20%), tech-heavy, trendier than SPY
 * - AAPL: Moderate vol (~25%), earnings-driven vol spikes, mean-reverting
 * - TSLA: High vol (~55%), extreme moves, momentum-driven
 * - IWM: Moderate vol (~22%), small-cap risk premium
 * - AMD: High vol (~40%), semiconductor cycle exposure
 * 
 * The brain uses these profiles to:
 * 1. Calibrate the synthetic market generator for each ticker's vol regime
 * 2. Adjust commission/slippage estimates based on liquidity
 * 3. Set appropriate strategy constraints (e.g., no naked options on TSLA)
 */

export interface TickerProfile {
  symbol: string;
  name: string;
  baseIV: number;            // Average annualized implied volatility
  ivRange: [number, number]; // [low, high] annualized IV range
  avgDailyMove: number;      // Average absolute daily move %
  beta: number;              // Beta vs SPY
  bidAskSpread: number;      // Typical bid-ask as % of mid (affects slippage)
  commission: number;        // Per-contract commission
  minOptionPrice: number;    // Minimum viable option premium ($)
  maxPositionSize: number;   // Max contracts per position
  characteristics: string[];
  bestStrategies: string[];  // Strategy IDs that tend to work
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}

export const TICKER_PROFILES: Record<string, TickerProfile> = {
  SPY: {
    symbol: 'SPY',
    name: 'S&P 500 ETF',
    baseIV: 0.16,
    ivRange: [0.10, 0.45],
    avgDailyMove: 0.008,
    beta: 1.0,
    bidAskSpread: 0.001,
    commission: 0.65,
    minOptionPrice: 0.10,
    maxPositionSize: 50,
    characteristics: ['Index', 'High liquidity', 'Tight spreads', 'Mean-reverting'],
    bestStrategies: ['0dte_iron_butterfly', '5dte_iron_condor', '10dte_jade_lizard', '30dte_iron_condor'],
    riskLevel: 'low',
  },
  QQQ: {
    symbol: 'QQQ',
    name: 'Nasdaq 100 ETF',
    baseIV: 0.22,
    ivRange: [0.14, 0.55],
    avgDailyMove: 0.012,
    beta: 1.25,
    bidAskSpread: 0.002,
    commission: 0.65,
    minOptionPrice: 0.15,
    maxPositionSize: 40,
    characteristics: ['Tech-heavy', 'Trendier than SPY', 'Momentum', 'Higher beta'],
    bestStrategies: ['0dte_vertical_call', '5dte_iron_condor', '10dte_diagonal_spread', '30dte_iron_condor'],
    riskLevel: 'medium',
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc',
    baseIV: 0.25,
    ivRange: [0.15, 0.60],
    avgDailyMove: 0.015,
    beta: 1.1,
    bidAskSpread: 0.003,
    commission: 0.65,
    minOptionPrice: 0.20,
    maxPositionSize: 20,
    characteristics: ['Earnings vol spikes', 'Mean-reverting after events', 'High liquidity'],
    bestStrategies: ['1dte_credit_spread', '5dte_iron_condor', '30dte_wheel', '30dte_covered_call'],
    riskLevel: 'medium',
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla Inc',
    baseIV: 0.55,
    ivRange: [0.35, 1.20],
    avgDailyMove: 0.035,
    beta: 2.0,
    bidAskSpread: 0.005,
    commission: 0.65,
    minOptionPrice: 0.50,
    maxPositionSize: 10,
    characteristics: ['Extreme volatility', 'Momentum-driven', 'Gap risk', 'Earnings moves 10%+'],
    bestStrategies: ['5dte_double_calendar', '10dte_jade_lizard', '30dte_iron_condor'],
    riskLevel: 'extreme',
  },
  IWM: {
    symbol: 'IWM',
    name: 'Russell 2000 ETF',
    baseIV: 0.22,
    ivRange: [0.14, 0.50],
    avgDailyMove: 0.013,
    beta: 1.15,
    bidAskSpread: 0.003,
    commission: 0.65,
    minOptionPrice: 0.15,
    maxPositionSize: 30,
    characteristics: ['Small-cap risk premium', 'Less efficient than SPY', 'More mean-reverting'],
    bestStrategies: ['1dte_iron_condor', '5dte_iron_condor', '30dte_wheel', '30dte_butterfly'],
    riskLevel: 'medium',
  },
  AMD: {
    symbol: 'AMD',
    name: 'Advanced Micro Devices',
    baseIV: 0.40,
    ivRange: [0.25, 0.80],
    avgDailyMove: 0.025,
    beta: 1.7,
    bidAskSpread: 0.004,
    commission: 0.65,
    minOptionPrice: 0.30,
    maxPositionSize: 15,
    characteristics: ['Semiconductor cycle', 'High beta', 'Earnings-driven', 'Moderate liquidity'],
    bestStrategies: ['5dte_iron_condor', '10dte_diagonal_spread', '30dte_iron_condor', '30dte_ratio_spread'],
    riskLevel: 'high',
  },
  SPX: {
    symbol: 'SPX',
    name: 'S&P 500 Index (Cash Settled)',
    baseIV: 0.16,
    ivRange: [0.10, 0.45],
    avgDailyMove: 0.008,
    beta: 1.0,
    bidAskSpread: 0.002,
    commission: 1.20,
    minOptionPrice: 1.00,
    maxPositionSize: 10,
    characteristics: ['Cash settled', 'No assignment risk', '60/40 tax treatment', 'European style'],
    bestStrategies: ['0dte_iron_butterfly', '0dte_vertical_call', '1dte_credit_spread', '5dte_iron_condor'],
    riskLevel: 'low',
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    baseIV: 0.45,
    ivRange: [0.30, 0.90],
    avgDailyMove: 0.030,
    beta: 1.8,
    bidAskSpread: 0.003,
    commission: 0.65,
    minOptionPrice: 0.35,
    maxPositionSize: 15,
    characteristics: ['AI/mega-cap momentum', 'Extreme vol on earnings', 'Very high liquidity'],
    bestStrategies: ['5dte_iron_condor', '10dte_jade_lizard', '30dte_iron_condor', '30dte_ratio_spread'],
    riskLevel: 'high',
  },
};

/** Get all available ticker symbols */
export function getAvailableTickers(): string[] {
  return Object.keys(TICKER_PROFILES);
}

/** Get ticker profile, or default to SPY if unknown */
export function getTickerProfile(symbol: string): TickerProfile {
  return TICKER_PROFILES[symbol.toUpperCase()] ?? TICKER_PROFILES.SPY;
}

/** Get a custom ticker profile from user input (for unsupported tickers) */
export function createCustomProfile(symbol: string, avgIV: number): TickerProfile {
  const iv = avgIV / 100;
  return {
    symbol: symbol.toUpperCase(),
    name: `${symbol.toUpperCase()} (Custom)`,
    baseIV: iv,
    ivRange: [iv * 0.6, iv * 2.0],
    avgDailyMove: iv / Math.sqrt(252) * 1.2,
    beta: iv > 0.3 ? 1.5 : 1.0,
    bidAskSpread: iv > 0.3 ? 0.004 : 0.002,
    commission: 0.65,
    minOptionPrice: iv > 0.3 ? 0.30 : 0.15,
    maxPositionSize: iv > 0.4 ? 10 : 20,
    characteristics: ['Custom profile', `IV ~${avgIV.toFixed(0)}%`],
    bestStrategies: ['5dte_iron_condor', '30dte_iron_condor'],
    riskLevel: iv > 0.4 ? 'high' : iv > 0.25 ? 'medium' : 'low',
  };
}
