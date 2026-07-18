// @ts-nocheck
/**
 * Option Payoff Calculations
 * 
 * Defines the profit/loss structure for each trade. The payoff function
 * is the "law of physics" that the evolution engine explores. By
 * combining different payoff structures (spreads, iron condors, etc.),
 * the algorithm discovers which structures best match each market regime.
 */

export type OptionType = 'call' | 'put';
export type PositionSide = 'long' | 'short';

export interface TradeLeg {
  optionType: OptionType;
  side: PositionSide;
  strike: number;
  premium: number;   // Premium paid (long) or received (short)
  quantity: number;  // Number of contracts
}

export interface TradeResult {
  grossPnL: number;
  netPnL: number;
  maxProfit: number;
  maxLoss: number;
  breakeven: number;
  roi: number;       // Return on max risk
}

/** Single leg payoff at a given underlying price */
export function legPayoff(leg: TradeLeg, underlyingPrice: number): number {
  const intrinsic =
    leg.optionType === 'call'
      ? Math.max(underlyingPrice - leg.strike, 0)
      : Math.max(leg.strike - underlyingPrice, 0);

  const perContract = leg.side === 'long'
    ? intrinsic - leg.premium
    : leg.premium - intrinsic;

  return perContract * leg.quantity;
}

/** Analyze a multi-leg trade */
export function analyzeTrade(legs: TradeLeg[], underlyingPrice: number): TradeResult {
  const grossPnL = legs.reduce((sum, leg) => sum + legPayoff(leg, underlyingPrice), 0);

  // Find max profit and max loss by scanning a range of prices
  const currentPrice = underlyingPrice;
  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  let breakevenLow: number | null = null;
  let breakevenHigh: number | null = null;

  // Scan from -50% to +50% of current price
  const scanLow = currentPrice * 0.5;
  const scanHigh = currentPrice * 1.5;
  const scanSteps = 500;
  const step = (scanHigh - scanLow) / scanSteps;

  for (let i = 0; i <= scanSteps; i++) {
    const price = scanLow + i * step;
    const pnl = legs.reduce((sum, leg) => sum + legPayoff(leg, price), 0);

    if (pnl > maxProfit) maxProfit = pnl;
    if (pnl < maxLoss) maxLoss = pnl;

    // Detect breakeven crossings
    const prevPrice = scanLow + (i - 1) * step;
    if (i > 0) {
      const prevPnl = legs.reduce((sum, leg) => sum + legPayoff(leg, prevPrice), 0);
      if ((prevPnl <= 0 && pnl >= 0) || (prevPnl >= 0 && pnl <= 0)) {
        // Linear interpolation for breakeven
        const frac = Math.abs(prevPnl) / (Math.abs(prevPnl) + Math.abs(pnl));
        const be = prevPrice + frac * step;
        if (breakevenLow === null) breakevenLow = be;
        breakevenHigh = be;
      }
    }
  }

  const maxRisk = Math.abs(maxLoss);
  const netPnL = grossPnL; // Already net of premiums

  return {
    grossPnL,
    netPnL,
    maxProfit,
    maxLoss,
    breakeven: breakevenLow ?? underlyingPrice,
    roi: maxRisk > 0 ? (grossPnL / maxRisk) * 100 : 0,
  };
}

/** Common option spread builders */

export function verticalSpread(
  direction: 'bullish' | 'bearish',
  strikes: [number, number],
  premium: [number, number],
  quantity: number = 1
): TradeLeg[] {
  const [low, high] = strikes.sort((a, b) => a - b);
  const [lowPrem, highPrem] = premium;

  if (direction === 'bullish') {
    return [
      { optionType: 'call', side: 'long', strike: low, premium: lowPrem, quantity },
      { optionType: 'call', side: 'short', strike: high, premium: highPrem, quantity },
    ];
  } else {
    return [
      { optionType: 'put', side: 'long', strike: high, premium: highPrem, quantity },
      { optionType: 'put', side: 'short', strike: low, premium: lowPrem, quantity },
    ];
  }
}

export function ironCondor(
  putStrikes: [number, number],
  callStrikes: [number, number],
  putPremiums: [number, number],
  callPremiums: [number, number],
  quantity: number = 1
): TradeLeg[] {
  return [
    { optionType: 'put', side: 'long', strike: putStrikes[0], premium: putPremiums[0], quantity },
    { optionType: 'put', side: 'short', strike: putStrikes[1], premium: putPremiums[1], quantity },
    { optionType: 'call', side: 'short', strike: callStrikes[0], premium: callPremiums[0], quantity },
    { optionType: 'call', side: 'long', strike: callStrikes[1], premium: callPremiums[1], quantity },
  ];
}
