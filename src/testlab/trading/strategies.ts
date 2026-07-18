// @ts-nocheck
/**
 * Option Strategy Definitions
 * 
 * Each strategy is defined with:
 * - Which DTE buckets it works in (0,1,2,3,5,10,30)
 * - Its payoff structure (legs)
 * - Risk profile (max profit, max loss, breakeven behavior)
 * - When it has a statistical edge (conditions)
 * 
 * The brain will test a SPECIFIC strategy at a SPECIFIC DTE
 * on a SPECIFIC ticker, then evolve the entry/exit/risk params
 * to find the statistical edge.
 */

export type DTE = 0 | 1 | 2 | 3 | 5 | 10 | 30;

export interface StrategyDef {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: 'defined_risk' | 'directional' | 'income' | 'hedging' | 'speculative';
  direction: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  legs: number;           // number of option legs
  defaultDTEs: DTE[];     // which DTE buckets this strategy works with
  typicalIV: 'low' | 'medium' | 'high' | 'any'; // IV environment where it shines
  riskReward: string;     // e.g. "1:3", "defined", "unlimited"
  description_long: string;
}

export const ALL_STRATEGIES: StrategyDef[] = [
  // === 0 DTE STRATEGIES ===
  {
    id: '0dte_vertical_call',
    name: '0 DTE Bull Call Spread',
    shortName: '0DTE Call Spread',
    description: 'Buy near-ATM call, sell OTM call, expire same day',
    category: 'defined_risk',
    direction: 'bullish',
    legs: 2,
    defaultDTEs: [0],
    typicalIV: 'high',
    riskReward: 'Defined 1:2',
    description_long: 'Exploit overpriced 0DTE options by selling premium near ATM. High gamma near expiry means rapid decay works in your favor if underlying stays flat or moves slightly up. Best in high IV environments.',
  },
  {
    id: '0dte_vertical_put',
    name: '0 DTE Bear Put Spread',
    shortName: '0DTE Put Spread',
    description: 'Buy near-ATM put, sell OTM put, expire same day',
    category: 'defined_risk',
    direction: 'bearish',
    legs: 2,
    defaultDTEs: [0],
    typicalIV: 'high',
    riskReward: 'Defined 1:2',
    description_long: 'Bearish counterpart to the 0DTE call spread. Works best when IV is elevated and you expect downside. The rapid time decay of 0DTE options accelerates profits if direction is correct.',
  },
  {
    id: '0dte_iron_butterfly',
    name: '0 DTE Iron Butterfly',
    shortName: '0DTE Iron BFly',
    description: 'Sell ATM straddle, buy OTM strangle, expire same day',
    category: 'income',
    direction: 'neutral',
    legs: 4,
    defaultDTEs: [0],
    typicalIV: 'high',
    riskReward: 'Defined 1:1',
    description_long: 'Maximum premium capture on 0DTE. Profits if underlying stays near the short strikes. Very tight profit zone but high probability. Best on high-IV days where you expect range-bound price action.',
  },
  // === 1 DTE STRATEGIES ===
  {
    id: '1dte_credit_spread',
    name: '1 DTE Credit Spread',
    shortName: '1DTE Credit Spread',
    description: 'Sell OTM spread, hold overnight, close before expiry',
    category: 'income',
    direction: 'neutral',
    legs: 2,
    defaultDTEs: [1],
    typicalIV: 'high',
    riskReward: 'Defined 1:0.5',
    description_long: 'Sell out-of-the-money vertical spread with 1 day to expiry. High win rate strategy that captures rapid time decay. Close before market close to avoid overnight gap risk. Best when IV rank is elevated.',
  },
  {
    id: '1dte_iron_condor',
    name: '1 DTE Iron Condor',
    shortName: '1DTE Iron Condor',
    description: 'OTM put spread + OTM call spread, 1 DTE',
    category: 'income',
    direction: 'neutral',
    legs: 4,
    defaultDTEs: [1],
    typicalIV: 'high',
    riskReward: 'Defined 1:0.3',
    description_long: 'Wider profit zone than credit spread alone. Sell both put and call spreads OTM. Profits from time decay and stable price action. Close before expiry to avoid gamma risk.',
  },
  // === 2-3 DTE STRATEGIES ===
  {
    id: 'short_dte_vertical_spread',
    name: '2-3 DTE Vertical Spread',
    shortName: 'Short Vertical',
    description: 'Directional vertical spread with 2-3 days to expiry',
    category: 'defined_risk',
    direction: 'bullish',
    legs: 2,
    defaultDTEs: [2, 3],
    typicalIV: 'medium',
    riskReward: 'Defined 1:1.5',
    description_long: 'Slightly longer window than 0-1 DTE gives more room for the trade to work out. Still benefits from accelerating theta decay. Good balance between probability and premium collected.',
  },
  {
    id: 'short_dte_calendar',
    name: '2-3 DTE Calendar Spread',
    shortName: 'Short Calendar',
    description: 'Sell near-term, buy longer-term same strike, 2-3 DTE',
    category: 'income',
    direction: 'neutral',
    legs: 2,
    defaultDTEs: [2, 3],
    typicalIV: 'low',
    riskReward: 'Defined',
    description_long: 'Profits from differences in time decay rates between near and far options. Works best in low IV environments where near-term options are relatively cheap. Benefits from term structure steepness.',
  },
  // === 5 DTE STRATEGIES ===
  {
    id: '5dte_iron_condor',
    name: '5 DTE Iron Condor',
    shortName: '5DTE Iron Condor',
    description: 'Standard iron condor with 5 days to expiry',
    category: 'income',
    direction: 'neutral',
    legs: 4,
    defaultDTEs: [5],
    typicalIV: 'any',
    riskReward: 'Defined 1:0.5',
    description_long: 'The classic options income strategy. 5 DTE gives a good balance of premium capture vs manageable gamma risk. The extra days allow for adjustments if the market moves against you. Works across most IV environments.',
  },
  {
    id: '5dte_double_calendar',
    name: '5 DTE Double Calendar',
    shortName: '5DTE Dbl Calendar',
    description: 'Put calendar + call calendar, 5 DTE',
    category: 'income',
    direction: 'neutral',
    legs: 4,
    defaultDTEs: [5],
    typicalIV: 'low',
    riskReward: 'Defined',
    description_long: 'Two calendar spreads (one using calls, one using puts) create a wider profit zone centered at the short strikes. Benefits from volatility term structure and time decay differential.',
  },
  // === 10 DTE STRATEGIES ===
  {
    id: '10dte_jade_lizard',
    name: '10 DTE Jade Lizard',
    shortName: '10DTE Jade Lizard',
    description: 'Short put + call spread, 10 DTE',
    category: 'income',
    direction: 'neutral_bullish',
    legs: 3,
    defaultDTEs: [10],
    typicalIV: 'high',
    riskReward: 'No upside risk',
    description_long: 'Sell a put and use the premium to buy a call spread for upside participation. No risk to the upside. Downside risk is defined by the short put. Best in high IV when put premiums are rich.',
  },
  {
    id: '10dte_diagonal_spread',
    name: '10 DTE Diagonal Spread',
    shortName: '10DTE Diagonal',
    description: 'Buy longer-dated ITM, sell shorter-dated OTM, 10 DTE',
    category: 'defined_risk',
    direction: 'bullish',
    legs: 2,
    defaultDTEs: [10],
    typicalIV: 'low',
    riskReward: 'Defined',
    description_long: 'Combines directional exposure with time decay. The long ITM option has less time decay while the short OTM option decays faster. Profits from both directional movement and volatility skew.',
  },
  // === 30 DTE STRATEGIES ===
  {
    id: '30dte_covered_call',
    name: '30 DTE Covered Call',
    shortName: '30DTE Covered Call',
    description: 'Long stock + short OTM call, 30 DTE',
    category: 'income',
    direction: 'neutral_bullish',
    legs: 1, // only the option leg; stock is assumed
    defaultDTEs: [30],
    typicalIV: 'low',
    riskReward: 'Capped upside',
    description_long: 'The most fundamental options strategy. Generates income from stocks you own or would own. 30 DTE is the sweet spot for covered calls — enough premium to matter, not so long that you lock up capital excessively.',
  },
  {
    id: '30dte_wheel',
    name: '30 DTE Wheel (CSP + CC)',
    shortName: '30DTE Wheel',
    description: 'Cash-secured put → assigned → covered call cycle, 30 DTE',
    category: 'income',
    direction: 'neutral_bullish',
    legs: 1, // executed in two phases
    defaultDTEs: [30],
    typicalIV: 'medium',
    riskReward: 'Defined',
    description_long: 'The wheel strategy: sell CSP to collect premium and potentially buy the stock at a discount. If assigned, sell covered calls to generate additional income. 30 DTE is optimal for balancing premium and assignment probability.',
  },
  {
    id: '30dte_iron_condor',
    name: '30 DTE Iron Condor',
    shortName: '30DTE Iron Condor',
    description: 'Wide iron condor, 30 DTE, adjust-friendly',
    category: 'income',
    direction: 'neutral',
    legs: 4,
    defaultDTEs: [30],
    typicalIV: 'high',
    riskReward: 'Defined 1:0.3',
    description_long: 'Longer-dated iron condor with more room for adjustments. Can roll untested side for credit or add contracts. 30 DTE gives you time to manage the trade actively. Best in high IV rank environments.',
  },
  {
    id: '30dte_butterfly',
    name: '30 DTE Long Butterfly',
    shortName: '30DTE Butterfly',
    description: 'Buy 1 ITM, sell 2 ATM, buy 1 OTM, same expiry',
    category: 'defined_risk',
    direction: 'neutral',
    legs: 4,
    defaultDTEs: [30],
    typicalIV: 'medium',
    riskReward: 'Defined 1:3+',
    description_long: 'High risk-reward ratio strategy that profits from pinning at the middle strike. 30 DTE allows the position to mature into its maximum profit zone. Requires precise strike selection and active management.',
  },
  {
    id: '30dte_ratio_spread',
    name: '30 DTE Ratio Spread',
    shortName: '30DTE Ratio Spread',
    description: 'Buy 1 ITM, sell 2+ OTM calls/puts, 30 DTE',
    category: 'speculative',
    direction: 'volatile',
    legs: 3,
    defaultDTEs: [30],
    typicalIV: 'low',
    riskReward: 'Defined one side',
    description_long: 'Sell more options than you buy to create a zero-cost or credit position. Profits from a move to the short strikes. 30 DTE gives time for the move to develop. Can be inverted for opposite direction.',
  },
];

/** Get strategies available for a specific DTE */
export function getStrategiesForDTE(dte: DTE): StrategyDef[] {
  return ALL_STRATEGIES.filter(s => s.defaultDTEs.includes(dte));
}

/** Get all unique DTE values that have strategies */
export const AVAILABLE_DTES: DTE[] = [0, 1, 2, 3, 5, 10, 30];

/** Get DTE label */
export function dteLabel(dte: DTE): string {
  return dte === 0 ? '0 DTE (Same Day)' : `${dte} DTE`;
}

/** Group strategies by DTE */
export function getStrategiesByDTE(): Record<DTE, StrategyDef[]> {
  const grouped = {} as Record<DTE, StrategyDef[]>;
  for (const dte of AVAILABLE_DTES) {
    grouped[dte] = getStrategiesForDTE(dte);
  }
  return grouped;
}
