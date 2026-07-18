// @ts-nocheck
/**
 * Backtester Engine — Strategy + DTE + Ticker Specific
 * 
 * EXPERIMENT STAGE OF THE SCIENTIFIC METHOD
 * ==========================================
 * 
 * Now tests a SPECIFIC strategy at a SPECIFIC DTE on a SPECIFIC ticker.
 * The genome evolves the HOW (entry timing, exit rules, risk management)
 * while the strategy/DTE/ticker are the controlled variables.
 */

import { Genome } from './genome';
import { SyntheticMarket, MarketBar, MarketRegime } from './market-generator';
import { SeededRNG } from './rng';
import { blackScholes } from './black-scholes';
import { legPayoff, TradeLeg, analyzeTrade } from './payoff';
import { getTickerProfile, TickerProfile } from './ticker-profiles';
import type { StrategyDef } from './strategies';

export interface Position {
  entryDay: number;
  exitDay: number | null;
  legs: TradeLeg[];
  strategyId: string;
  entryPrice: number;
  underlyingAtEntry: number;
  regime: MarketRegime;
  dteAtEntry: number;
  maxRisk: number;
  maxProfit: number;
  pnl: number | null;
  holdingDays: number | null;
  exitReason: string | null;
  realizedEdge: number | null;  // PnL / maxRisk
}

export interface BacktestResult {
  genome: Genome;
  strategyId: string;
  dte: number;
  ticker: string;
  equity: number[];
  dailyReturns: number[];
  totalReturn: number;
  annualizedReturn: number;
  annualizedVol: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgTradePnL: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  expectedValue: number;      // E[trade] = WR * avgWin - (1-WR) * avgLoss
  kellyOptimal: number;        // Optimal Kelly fraction
  statisticalEdge: number;     // EV / avgLoss (how big is the edge?)
  positions: Position[];
  regimeResults: Record<MarketRegime, {
    trades: number; winRate: number; avgPnL: number; totalPnL: number;
  }>;
  sharpeConfidence: number;
  returnConfidence: number;
}

/**
 * Build option legs for a specific strategy at given market conditions
 */
function buildStrategyLegs(params: {
  strategy: StrategyDef;
  S: number;           // Current price
  T: number;           // Time to expiry (years)
  r: number;           // Risk-free rate
  iv: number;          // Implied volatility
  genome: Genome;
  direction: number;   // 1 = bullish, -1 = bearish, 0 = neutral
}): { legs: TradeLeg[]; maxRisk: number; maxProfit: number } {
  const { strategy, S, T, r, iv, genome, direction } = params;
  const legs: TradeLeg[] = [];
  let maxRisk = 0;
  let maxProfit = 0;

  const atmStrike = Math.round(S * 100) / 100;
  const delta = genome.strikeDelta;
  const sw = genome.spreadWidth;
  const ww = genome.wingWidth;

  // Strike calculations
  const nearStrike = Math.round((atmStrike * (1 - direction * delta * T * 2)) * 100) / 100;
  const farStrike = Math.round((atmStrike * (1 + direction * delta * T * 2 + sw)) * 100) / 100;
  const farWingStrike = Math.round((atmStrike * (1 + direction * delta * T * 2 + sw * ww)) * 100) / 100;
  const putWingStrike = Math.round((atmStrike * (1 - sw * ww)) * 100) / 100;
  const putBodyStrike = Math.round((atmStrike * (1 - sw)) * 100) / 100;
  const callBodyStrike = Math.round((atmStrike * (1 + sw)) * 100) / 100;
  const callWingStrike = Math.round((atmStrike * (1 + sw * ww)) * 100) / 100;

  // Price all needed strikes
  const bsAtm = blackScholes(S, atmStrike, T, r, iv);
  const bsNear = blackScholes(S, nearStrike, T, r, iv);
  const bsFar = blackScholes(S, farStrike, T, r, iv);
  const bsFarWing = blackScholes(S, farWingStrike, T, r, iv);
  const bsPutWing = blackScholes(S, putWingStrike, T, r, iv);
  const bsPutBody = blackScholes(S, putBodyStrike, T, r, iv);
  const bsCallBody = blackScholes(S, callBodyStrike, T, r, iv);
  const bsCallWing = blackScholes(S, callWingStrike, T, r, iv);

  const sid = strategy.id;

  if (sid.includes('vertical_call') || sid.includes('bull_call') || sid === 'short_dte_vertical_spread') {
    const buyStrike = nearStrike;
    const sellStrike = farStrike;
    const bsBuy = buyStrike < sellStrike ? bsNear : bsFar;
    const bsSell = buyStrike < sellStrike ? bsFar : bsNear;
    legs.push({ optionType: 'call', side: 'long', strike: buyStrike, premium: bsBuy.callPrice, quantity: 1 });
    legs.push({ optionType: 'call', side: 'short', strike: sellStrike, premium: bsSell.callPrice, quantity: 1 });
    const analysis = analyzeTrade(legs, S);
    maxRisk = Math.abs(analysis.maxLoss) * 100;
    maxProfit = Math.abs(analysis.maxProfit) * 100;
  } else if (sid.includes('vertical_put') || sid.includes('bear_put')) {
    const buyStrike = nearStrike;
    const sellStrike = farStrike;
    const bsBuy = buyStrike > sellStrike ? bsNear : bsFar;
    const bsSell = buyStrike > sellStrike ? bsFar : bsNear;
    legs.push({ optionType: 'put', side: 'long', strike: buyStrike, premium: bsBuy.putPrice, quantity: 1 });
    legs.push({ optionType: 'put', side: 'short', strike: sellStrike, premium: bsSell.putPrice, quantity: 1 });
    const analysis = analyzeTrade(legs, S);
    maxRisk = Math.abs(analysis.maxLoss) * 100;
    maxProfit = Math.abs(analysis.maxProfit) * 100;
  } else if (sid.includes('credit_spread') || sid === '1dte_credit_spread') {
    if (direction >= 0) {
      legs.push({ optionType: 'put', side: 'short', strike: putBodyStrike, premium: bsPutBody.putPrice, quantity: 1 });
      legs.push({ optionType: 'put', side: 'long', strike: putWingStrike, premium: bsPutWing.putPrice, quantity: 1 });
    } else {
      legs.push({ optionType: 'call', side: 'short', strike: callBodyStrike, premium: bsCallBody.callPrice, quantity: 1 });
      legs.push({ optionType: 'call', side: 'long', strike: callWingStrike, premium: bsCallWing.callPrice, quantity: 1 });
    }
    const analysis = analyzeTrade(legs, S);
    maxRisk = Math.abs(analysis.maxLoss) * 100;
    maxProfit = Math.abs(analysis.maxProfit) * 100;
  } else if (sid.includes('iron_condor') || sid.includes('iron_butterfly')) {
    legs.push({ optionType: 'put', side: 'long', strike: putWingStrike, premium: bsPutWing.putPrice, quantity: 1 });
    legs.push({ optionType: 'put', side: 'short', strike: putBodyStrike, premium: bsPutBody.putPrice, quantity: 1 });
    legs.push({ optionType: 'call', side: 'short', strike: callBodyStrike, premium: bsCallBody.callPrice, quantity: 1 });
    legs.push({ optionType: 'call', side: 'long', strike: callWingStrike, premium: bsCallWing.callPrice, quantity: 1 });
    const analysis = analyzeTrade(legs, S);
    maxRisk = Math.abs(analysis.maxLoss) * 100;
    maxProfit = Math.abs(analysis.maxProfit) * 100;
  } else if (sid.includes('butterfly')) {
    const lowerStrike = Math.round((atmStrike * (1 - sw)) * 100) / 100;
    const upperStrike = Math.round((atmStrike * (1 + sw)) * 100) / 100;
    const bsLower = blackScholes(S, lowerStrike, T, r, iv);
    const bsUpper = blackScholes(S, upperStrike, T, r, iv);
    if (direction >= 0) {
      legs.push({ optionType: 'call', side: 'long', strike: lowerStrike, premium: bsLower.callPrice, quantity: 1 });
      legs.push({ optionType: 'call', side: 'short', strike: atmStrike, premium: bsAtm.callPrice, quantity: 2 });
      legs.push({ optionType: 'call', side: 'long', strike: upperStrike, premium: bsUpper.callPrice, quantity: 1 });
    } else {
      legs.push({ optionType: 'put', side: 'long', strike: upperStrike, premium: bsUpper.putPrice, quantity: 1 });
      legs.push({ optionType: 'put', side: 'short', strike: atmStrike, premium: bsAtm.putPrice, quantity: 2 });
      legs.push({ optionType: 'put', side: 'long', strike: lowerStrike, premium: bsLower.putPrice, quantity: 1 });
    }
    const analysis = analyzeTrade(legs, S);
    maxRisk = Math.abs(analysis.maxLoss) * 100;
    maxProfit = Math.abs(analysis.maxProfit) * 100;
  } else if (sid.includes('jade_lizard')) {
    // Short put + call spread (no upside risk)
    legs.push({ optionType: 'put', side: 'short', strike: putBodyStrike, premium: bsPutBody.putPrice, quantity: 1 });
    legs.push({ optionType: 'call', side: 'long', strike: callWingStrike, premium: bsCallWing.callPrice, quantity: 1 });
    legs.push({ optionType: 'call', side: 'short', strike: callBodyStrike, premium: bsCallBody.callPrice, quantity: 2 });
    const analysis = analyzeTrade(legs, S);
    maxRisk = Math.abs(analysis.maxLoss) * 100;
    maxProfit = Math.abs(analysis.maxProfit) * 100;
  } else if (sid.includes('calendar') || sid.includes('diagonal')) {
    // Simplified calendar: sell near-term, buy same strike longer-term
    // In backtest, we simulate this as a single-leg with reduced premium
    legs.push({ optionType: 'call', side: 'long', strike: nearStrike, premium: bsNear.callPrice * 0.6, quantity: 1 });
    legs.push({ optionType: 'call', side: 'short', strike: nearStrike, premium: bsNear.callPrice, quantity: 1 });
    const analysis = analyzeTrade(legs, S);
    maxRisk = Math.abs(analysis.maxLoss) * 100;
    maxProfit = Math.abs(analysis.maxProfit) * 100;
  } else if (sid.includes('ratio_spread')) {
    legs.push({ optionType: 'call', side: 'long', strike: nearStrike, premium: bsNear.callPrice, quantity: 1 });
    legs.push({ optionType: 'call', side: 'short', strike: farStrike, premium: bsFar.callPrice, quantity: 2 });
    const analysis = analyzeTrade(legs, S);
    maxRisk = Math.abs(analysis.maxLoss) * 100;
    maxProfit = Math.abs(analysis.maxProfit) * 100;
  } else if (sid.includes('double_calendar')) {
    legs.push({ optionType: 'put', side: 'long', strike: putWingStrike, premium: bsPutWing.putPrice * 0.6, quantity: 1 });
    legs.push({ optionType: 'put', side: 'short', strike: putBodyStrike, premium: bsPutBody.putPrice, quantity: 1 });
    legs.push({ optionType: 'call', side: 'long', strike: callWingStrike, premium: bsCallWing.callPrice * 0.6, quantity: 1 });
    legs.push({ optionType: 'call', side: 'short', strike: callBodyStrike, premium: bsCallBody.callPrice, quantity: 1 });
    const analysis = analyzeTrade(legs, S);
    maxRisk = Math.abs(analysis.maxLoss) * 100;
    maxProfit = Math.abs(analysis.maxProfit) * 100;
  } else if (sid.includes('covered_call') || sid.includes('wheel')) {
    // Simplified: just the short call leg (stock assumed)
    legs.push({ optionType: 'call', side: 'short', strike: callBodyStrike, premium: bsCallBody.callPrice, quantity: 1 });
    maxRisk = S * 100; // stock risk
    maxProfit = bsCallBody.callPrice * 100 + sw * S * 100;
  } else if (sid.includes('protective_put') || sid.includes('long_put')) {
    legs.push({ optionType: 'put', side: 'long', strike: nearStrike, premium: bsNear.putPrice, quantity: 1 });
    maxRisk = bsNear.putPrice * 100;
    maxProfit = S * 100; // theoretical unlimited for protective put context
  } else {
    // Fallback: simple vertical
    legs.push({ optionType: 'call', side: 'long', strike: nearStrike, premium: bsNear.callPrice, quantity: 1 });
    legs.push({ optionType: 'call', side: 'short', strike: farStrike, premium: bsFar.callPrice, quantity: 1 });
    const analysis = analyzeTrade(legs, S);
    maxRisk = Math.abs(analysis.maxLoss) * 100;
    maxProfit = Math.abs(analysis.maxProfit) * 100;
  }

  return { legs, maxRisk: Math.max(maxRisk, 1), maxProfit };
}

/**
 * Run a single backtest of a genome against synthetic market data
 * for a specific strategy, DTE, and ticker
 */
export function runBacktest(params: {
  genome: Genome;
  market: SyntheticMarket;
  strategy: StrategyDef;
  dte: number;
  ticker: TickerProfile;
  startingCapital: number;
  seed: number;
}): BacktestResult {
  const { genome, market, strategy, dte, ticker, startingCapital, seed } = params;
  const rng = new SeededRNG(seed);
  const bars = market.bars;

  let capital = startingCapital;
  const equity: number[] = [capital];
  const dailyReturns: number[] = [0];
  const positions: Position[] = [];
  const openPositions: Position[] = [];

  const riskFreeRate = 0.05;
  const T = dte / 252;
  const commission = ticker.commission;
  const slippagePct = ticker.bidAskSpread;

  const regimeResults: Record<MarketRegime, { trades: number; wins: number; totalPnL: number; pnls: number[] }> = {
    bull: { trades: 0, wins: 0, totalPnL: 0, pnls: [] },
    bear: { trades: 0, wins: 0, totalPnL: 0, pnls: [] },
    crisis: { trades: 0, wins: 0, totalPnL: 0, pnls: [] },
    sideways: { trades: 0, wins: 0, totalPnL: 0, pnls: [] },
  };

  const lookback = 20;
  let dailyPnL = 0; // Track daily P&L for max daily loss

  // Space entries based on DTE (trade every N days to simulate fresh entries)
  const tradeInterval = Math.max(1, dte);

  for (let i = lookback; i < bars.length; i++) {
    const bar = bars[i];
    dailyPnL = 0;

    // Current portfolio risk
    const totalRisk = openPositions.reduce((sum, p) => sum + p.maxRisk, 0);
    const portfolioRiskPct = totalRisk / capital;

    // === MANAGE OPEN POSITIONS ===
    for (let j = openPositions.length - 1; j >= 0; j--) {
      const pos = openPositions[j];
      const holdingDays = i - pos.entryDay;
      const legsPnL = pos.legs.reduce((sum, leg) => sum + legPayoff(leg, bar.close), 0);
      const netPnL = legsPnL - commission * pos.legs.length;
      const tradePnL = netPnL * 100;

      let shouldExit = false;
      let exitReason: string | null = null;

      if (tradePnL / pos.maxRisk >= genome.profitTargetPct) {
        shouldExit = true; exitReason = 'profit_target';
      }
      if (tradePnL / pos.maxRisk <= -genome.stopLossPct) {
        shouldExit = true; exitReason = 'stop_loss';
      }
      if (holdingDays >= genome.maxHoldingDays) {
        shouldExit = true; exitReason = 'max_holding';
      }
      // DTE-based exit
      const remainingDTE = dte - holdingDays;
      if (remainingDTE / dte <= genome.dteExitMin && remainingDTE > 0) {
        shouldExit = true; exitReason = 'dte_decay_exit';
      }

      if (shouldExit) {
        pos.exitDay = i;
        pos.pnl = tradePnL;
        pos.holdingDays = holdingDays;
        pos.exitReason = exitReason;
        pos.realizedEdge = tradePnL / pos.maxRisk;
        capital += tradePnL;
        dailyPnL += tradePnL;
        positions.push(pos);
        openPositions.splice(j, 1);
      }
    }

    // === SIGNAL GENERATION ===
    const canTrade = portfolioRiskPct < genome.maxPortfolioRisk
      && openPositions.length < genome.maxPositions
      && dailyPnL / capital > -genome.maxDailyLoss
      && (i - lookback) % tradeInterval === 0;

    if (canTrade) {
      const recentBars = bars.slice(i - lookback, i);
      const recentReturns = recentBars.map(b => b.dailyReturn);
      const meanReturn = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
      const stdReturn = Math.sqrt(recentReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / recentReturns.length);

      // Simple RSI
      let gains = 0, losses = 0;
      for (let k = 1; k < recentReturns.length; k++) {
        if (recentReturns[k] > 0) gains += recentReturns[k];
        else losses -= recentReturns[k];
      }
      const avgGain = gains / lookback;
      const avgLoss = losses / lookback;
      const rs = avgLoss > 0 ? avgGain / avgLoss : 100;
      const rsi = 100 - 100 / (1 + rs);

      const trendStrength = meanReturn;
      const ma20 = recentBars.reduce((s, b) => s + b.close, 0) / recentBars.length;
      const zScore = stdReturn > 0 ? (bar.close - ma20) / (ma20 * stdReturn) : 0;

      const volPremium = bar.realizedVol > 0
        ? Math.abs(bar.realizedVol - (bars[Math.max(0, i - 5)]?.realizedVol ?? bar.realizedVol)) / bar.realizedVol
        : 0;

      // IV rank proxy (where current RV sits in recent range)
      const rvHistory = bars.slice(Math.max(0, i - 252), i).map(b => b.realizedVol);
      const rvMin = Math.min(...rvHistory);
      const rvMax = Math.max(...rvHistory);
      const ivRank = rvMax > rvMin ? (bar.realizedVol - rvMin) / (rvMax - rvMin) : 0.5;

      // Composite entry score
      let score = 0;
      if (Math.abs(trendStrength) >= genome.trendStrengthMin) score += 0.2;
      if (volPremium >= genome.volPremiumThreshold) score += 0.2;
      if (Math.abs(zScore) >= genome.meanReversionZ) score += 0.15;
      if (ivRank >= genome.ivRankMin) score += 0.2;
      if (rsi < genome.rsiOversold || rsi > genome.rsiOverbought) score += 0.15;
      score += 0.1; // base opportunity score

      if (score >= genome.minEntryScore) {
        const regime = bar.regime;
        const volAdj = regime === 'bull' ? genome.bullVolAdjustment :
          regime === 'bear' ? genome.bearVolAdjustment :
          regime === 'crisis' ? genome.crisisVolAdjustment : genome.sidewaysVolAdjustment;

        const iv = bar.realizedVol * volAdj;
        const direction = trendStrength > 0 ? 1 : trendStrength < -0.001 ? -1 : 0;

        const { legs, maxRisk, maxProfit } = buildStrategyLegs({
          strategy, S: bar.close, T, r: riskFreeRate, iv, genome, direction,
        });

        const totalCost = commission * legs.length;
        if (maxRisk > 0 && capital - totalCost > maxRisk * 0.3) {
          capital -= totalCost;
          openPositions.push({
            entryDay: i, exitDay: null, legs,
            strategyId: strategy.id,
            entryPrice: bar.close, underlyingAtEntry: bar.close,
            regime, dteAtEntry: dte,
            maxRisk, maxProfit,
            pnl: null, holdingDays: null, exitReason: null, realizedEdge: null,
          });
        }
      }
    }

    // Mark-to-market equity
    let mtmPnL = 0;
    for (const pos of openPositions) {
      mtmPnL += pos.legs.reduce((sum, leg) => sum + legPayoff(leg, bar.close), 0) * 100;
    }
    const dailyEquity = capital + mtmPnL;
    equity.push(dailyEquity);
    if (equity.length > 1) {
      dailyReturns.push((dailyEquity - equity[equity.length - 2]) / equity[equity.length - 2]);
    }
  }

  // Close remaining
  for (const pos of openPositions) {
    const lastBar = bars[bars.length - 1];
    const legsPnL = pos.legs.reduce((sum, leg) => sum + legPayoff(leg, lastBar.close), 0);
    const netPnL = (legsPnL - commission * pos.legs.length) * 100;
    pos.exitDay = bars.length - 1;
    pos.pnl = netPnL;
    pos.holdingDays = bars.length - 1 - pos.entryDay;
    pos.exitReason = 'end_of_data';
    pos.realizedEdge = netPnL / pos.maxRisk;
    capital += netPnL;
    positions.push(pos);
  }

  // === ANALYSIS ===
  const closedPositions = positions.filter(p => p.pnl !== null);
  const wins = closedPositions.filter(p => (p.pnl ?? 0) > 0);
  const losses = closedPositions.filter(p => (p.pnl ?? 0) <= 0);

  const totalReturn = (capital - startingCapital) / startingCapital;
  const totalYears = bars.length / 252;
  const annualizedReturn = (1 + totalReturn) ** (1 / totalYears) - 1;

  const meanDailyReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const dailyStd = Math.sqrt(dailyReturns.reduce((s, r) => s + (r - meanDailyReturn) ** 2, 0) / Math.max(1, dailyReturns.length - 1));
  const annualizedVol = dailyStd * Math.sqrt(252);
  const sharpeRatio = dailyStd > 0 ? (meanDailyReturn / dailyStd) * Math.sqrt(252) : 0;

  const negativeReturns = dailyReturns.filter(r => r < 0);
  const downsideDev = negativeReturns.length > 0 ? Math.sqrt(negativeReturns.reduce((s, r) => s + r * r, 0) / negativeReturns.length) : 0.0001;
  const sortinoRatio = (meanDailyReturn / downsideDev) * Math.sqrt(252);

  let peak = -Infinity, maxDD = 0, ddStart = 0, maxDDDuration = 0;
  for (let i = 0; i < equity.length; i++) {
    if (equity[i] > peak) { peak = equity[i]; ddStart = i; }
    const dd = (peak - equity[i]) / peak;
    if (dd > maxDD) { maxDD = dd; maxDDDuration = i - ddStart; }
  }

  const winRate = closedPositions.length > 0 ? wins.length / closedPositions.length : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + (p.pnl ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, p) => s + (p.pnl ?? 0), 0) / losses.length) : 1;
  const grossWins = wins.reduce((s, p) => s + (p.pnl ?? 0), 0);
  const grossLosses = Math.abs(losses.reduce((s, p) => s + (p.pnl ?? 0), 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : 0;
  const expectedValue = winRate * avgWin - (1 - winRate) * avgLoss;
  const kellyOptimal = avgLoss > 0 ? Math.max(0, winRate - (1 - winRate) / (avgWin / avgLoss)) : 0;
  const statisticalEdge = avgLoss > 0 ? expectedValue / avgLoss : 0;

  const finalRegimeResults: BacktestResult['regimeResults'] = {
    bull: { trades: 0, winRate: 0, avgPnL: 0, totalPnL: 0 },
    bear: { trades: 0, winRate: 0, avgPnL: 0, totalPnL: 0 },
    crisis: { trades: 0, winRate: 0, avgPnL: 0, totalPnL: 0 },
    sideways: { trades: 0, winRate: 0, avgPnL: 0, totalPnL: 0 },
  };
  for (const pos of closedPositions) {
    const r = pos.regime;
    const pnl = pos.pnl ?? 0;
    regimeResults[r].trades++;
    regimeResults[r].totalPnL += pnl;
    regimeResults[r].pnls.push(pnl);
    if (pnl > 0) regimeResults[r].wins++;
  }
  for (const regime of Object.keys(regimeResults) as MarketRegime[]) {
    const data = regimeResults[regime];
    finalRegimeResults[regime] = {
      trades: data.trades,
      winRate: data.trades > 0 ? data.wins / data.trades : 0,
      avgPnL: data.trades > 0 ? data.totalPnL / data.trades : 0,
      totalPnL: data.totalPnL,
    };
  }

  const sharpeConfidence = dailyStd > 0 ? Math.max(0, 1 - normalCDFApprox(sharpeRatio * Math.sqrt(dailyReturns.length / 252))) : 0;
  const returnConfidence = annualizedVol / Math.sqrt(totalYears);

  return {
    genome,
    strategyId: strategy.id,
    dte,
    ticker: ticker.symbol,
    equity, dailyReturns, totalReturn, annualizedReturn, annualizedVol,
    sharpeRatio, sortinoRatio, maxDrawdown: maxDD, maxDrawdownDuration,
    calmarRatio: maxDD > 0 ? annualizedReturn / maxDD : 0,
    winRate, profitFactor, totalTrades: closedPositions.length,
    avgTradePnL: closedPositions.length > 0 ? closedPositions.reduce((s, p) => s + (p.pnl ?? 0), 0) / closedPositions.length : 0,
    avgWin: wins.length > 0 ? avgWin : 0,
    avgLoss: losses.length > 0 ? avgLoss : 0,
    bestTrade: closedPositions.length > 0 ? Math.max(...closedPositions.map(p => p.pnl ?? 0)) : 0,
    worstTrade: closedPositions.length > 0 ? Math.min(...closedPositions.map(p => p.pnl ?? 0)) : 0,
    expectedValue, kellyOptimal, statisticalEdge,
    positions,
    regimeResults: finalRegimeResults,
    sharpeConfidence, returnConfidence,
  };
}

function normalCDFApprox(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax / 2);
  return 0.5 * (1 + sign * y);
}
