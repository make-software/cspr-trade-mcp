import Big from 'big.js';
import { toRawAmount, toFormattedAmount } from '../utils/amounts.js';

/** Price impact severity level */
export type PriceImpactSeverity = 'low' | 'medium' | 'high' | 'very_high';

/** Result of estimating price impact from pool reserves */
export interface PriceImpactEstimate {
  /** Price impact as a percentage string (e.g. "2.45") */
  priceImpactPct: string;
  /** Severity classification */
  severity: PriceImpactSeverity;
  /** Human-readable warning message, if any */
  warning: string | null;
  /** Effective execution price (amount out per amount in) */
  executionPrice: string;
  /** Mid (spot) price before the trade */
  spotPrice: string;
}

/** Result of estimating slippage for a trade */
export interface SlippageEstimate {
  /** Expected output amount (raw) */
  expectedOutput: string;
  /** Expected output (human-readable) */
  expectedOutputFormatted: string;
  /** Minimum output with given slippage tolerance (raw) */
  minimumOutput: string;
  /** Minimum output (human-readable) */
  minimumOutputFormatted: string;
  /** Maximum slippage in basis points that would still execute */
  maxSlippageBps: number;
  /** Recommended slippage tolerance in basis points */
  recommendedSlippageBps: number;
}

/** Result of computing optimal liquidity amounts */
export interface OptimalLiquidityResult {
  /** Amount of token A (human-readable) */
  amountA: string;
  /** Amount of token B (human-readable) */
  amountB: string;
  /** Pool share after adding this liquidity (percentage) */
  estimatedPoolSharePct: string;
  /** Whether this creates a new pool */
  isNewPool: boolean;
}

/** Comprehensive trade analysis */
export interface TradeAnalysis {
  /** Price impact */
  priceImpact: PriceImpactEstimate;
  /** Slippage estimate */
  slippage: SlippageEstimate;
  /** Whether the trade is advisable */
  recommendation: 'proceed' | 'caution' | 'high_risk' | 'not_recommended';
  /** Human-readable recommendation text */
  recommendationText: string;
  /** All warnings collected */
  warnings: string[];
}

/**
 * Estimate price impact using constant-product AMM formula (x * y = k).
 *
 * Given reserves and an input amount, computes the execution price vs spot price.
 */
export function estimatePriceImpact(
  reserveIn: string,
  reserveOut: string,
  amountIn: string,
  decimalsIn: number,
  decimalsOut: number,
  isRawAmount = false,
): PriceImpactEstimate {
  const rIn = new Big(reserveIn);
  const rOut = new Big(reserveOut);
  const aIn = isRawAmount ? new Big(amountIn) : new Big(toRawAmount(amountIn, decimalsIn));

  if (rIn.eq(0) || rOut.eq(0)) {
    return {
      priceImpactPct: '0',
      severity: 'low',
      warning: null,
      executionPrice: '0',
      spotPrice: '0',
    };
  }

  // Constant product formula with 0.3% fee
  const amountInWithFee = aIn.times(997);
  const numerator = amountInWithFee.times(rOut);
  const denominator = rIn.times(1000).plus(amountInWithFee);
  const amountOut = numerator.div(denominator);

  // Spot price = reserveOut / reserveIn (how much out per 1 in)
  const spotPrice = rOut.div(rIn);

  // Execution price = amountOut / amountIn
  const execPrice = aIn.gt(0) ? amountOut.div(aIn) : new Big(0);

  // Price impact = (spotPrice - execPrice) / spotPrice * 100
  const impact = spotPrice.gt(0)
    ? spotPrice.minus(execPrice).div(spotPrice).times(100)
    : new Big(0);

  const impactNum = impact.toNumber();
  const severity: PriceImpactSeverity =
    impactNum > 15 ? 'very_high' :
    impactNum > 5 ? 'high' :
    impactNum > 1 ? 'medium' : 'low';

  const warning =
    impactNum > 15 ? `Extreme price impact: ${impact.toFixed(2)}%. You will lose a significant portion of value.` :
    impactNum > 5 ? `High price impact: ${impact.toFixed(2)}%. Consider reducing trade size.` :
    impactNum > 1 ? `Moderate price impact: ${impact.toFixed(2)}%.` : null;

  return {
    priceImpactPct: impact.toFixed(4),
    severity,
    warning,
    executionPrice: execPrice.toFixed(12),
    spotPrice: spotPrice.toFixed(12),
  };
}

/**
 * Estimate expected output and slippage for a given swap using pool reserves.
 */
export function estimateSlippage(
  reserveIn: string,
  reserveOut: string,
  amountIn: string,
  decimalsIn: number,
  decimalsOut: number,
  slippageToleranceBps = 300,
  isRawAmount = false,
): SlippageEstimate {
  const rIn = new Big(reserveIn);
  const rOut = new Big(reserveOut);
  const aIn = isRawAmount ? new Big(amountIn) : new Big(toRawAmount(amountIn, decimalsIn));

  // Constant product output with 0.3% fee
  const amountInWithFee = aIn.times(997);
  const numerator = amountInWithFee.times(rOut);
  const denominator = rIn.times(1000).plus(amountInWithFee);
  const expectedOut = denominator.gt(0) ? numerator.div(denominator) : new Big(0);

  // Minimum output with slippage tolerance
  const slippageFactor = new Big(1).minus(new Big(slippageToleranceBps).div(10000));
  const minOut = expectedOut.times(slippageFactor);

  // Ideal output at spot price (no impact, no fee)
  const idealOut = rOut.gt(0) ? aIn.times(rOut).div(rIn) : new Big(0);

  // Max slippage = how much worse is execution vs spot price (in bps)
  const maxSlippageBps = idealOut.gt(0)
    ? idealOut.minus(expectedOut).div(idealOut).times(10000).round(0, Big.roundUp).toNumber()
    : 0;

  // Recommended slippage: max(actual slippage * 2, 50 bps)
  const recommended = Math.max(maxSlippageBps * 2, 50);

  const expectedOutStr = expectedOut.toFixed(0, Big.roundDown);

  return {
    expectedOutput: expectedOutStr,
    expectedOutputFormatted: toFormattedAmount(expectedOutStr, decimalsOut),
    minimumOutput: minOut.toFixed(0, Big.roundDown),
    minimumOutputFormatted: toFormattedAmount(minOut.toFixed(0, Big.roundDown), decimalsOut),
    maxSlippageBps,
    recommendedSlippageBps: Math.min(recommended, 5000), // cap at 50%
  };
}

/**
 * Given one token amount and pool reserves, compute the optimal paired amount for adding liquidity.
 */
export function computeOptimalLiquidityAmounts(
  reserveA: string,
  reserveB: string,
  amountA: string,
  decimalsA: number,
  decimalsB: number,
  totalLpSupply: string,
  isRawAmount = false,
): OptimalLiquidityResult {
  const rA = new Big(reserveA);
  const rB = new Big(reserveB);
  const aA = isRawAmount ? new Big(amountA) : new Big(toRawAmount(amountA, decimalsA));
  const lpSupply = new Big(totalLpSupply);

  // New pool: any ratio works
  if (rA.eq(0) || rB.eq(0)) {
    return {
      amountA: isRawAmount ? amountA : amountA,
      amountB: '0', // User must specify both amounts for new pools
      estimatedPoolSharePct: '100.00',
      isNewPool: true,
    };
  }

  // Optimal B = amountA * reserveB / reserveA
  const optimalB = aA.times(rB).div(rA);

  // Estimate LP tokens received: min(amountA/reserveA, optimalB/reserveB) * totalSupply
  const shareA = aA.div(rA);
  const shareB = optimalB.div(rB);
  const lpMinted = (shareA.lt(shareB) ? shareA : shareB).times(lpSupply);
  const newTotalLp = lpSupply.plus(lpMinted);
  const poolSharePct = newTotalLp.gt(0)
    ? lpMinted.div(newTotalLp).times(100)
    : new Big(0);

  return {
    amountA: isRawAmount ? amountA : amountA,
    amountB: toFormattedAmount(optimalB.toFixed(0, Big.roundDown), decimalsB),
    estimatedPoolSharePct: poolSharePct.toFixed(2),
    isNewPool: false,
  };
}

/**
 * Comprehensive trade analysis: combines price impact, slippage, and provides recommendation.
 */
export function analyzeTrade(
  reserveIn: string,
  reserveOut: string,
  amountIn: string,
  decimalsIn: number,
  decimalsOut: number,
  slippageToleranceBps = 300,
  isRawAmount = false,
): TradeAnalysis {
  const impact = estimatePriceImpact(reserveIn, reserveOut, amountIn, decimalsIn, decimalsOut, isRawAmount);
  const slippage = estimateSlippage(reserveIn, reserveOut, amountIn, decimalsIn, decimalsOut, slippageToleranceBps, isRawAmount);

  const warnings: string[] = [];
  if (impact.warning) warnings.push(impact.warning);

  const impactNum = parseFloat(impact.priceImpactPct);
  if (slippage.maxSlippageBps > slippageToleranceBps) {
    warnings.push(
      `Expected slippage (${(slippage.maxSlippageBps / 100).toFixed(2)}%) exceeds your tolerance (${(slippageToleranceBps / 100).toFixed(2)}%). Transaction may revert.`
    );
  }

  let recommendation: TradeAnalysis['recommendation'];
  let recommendationText: string;

  if (impactNum > 15 || slippage.maxSlippageBps > 3000) {
    recommendation = 'not_recommended';
    recommendationText = 'Trade has extreme price impact or slippage. Consider splitting into smaller trades or finding deeper liquidity.';
  } else if (impactNum > 5 || slippage.maxSlippageBps > 1000) {
    recommendation = 'high_risk';
    recommendationText = 'Trade has significant price impact. Consider reducing trade size for better execution.';
  } else if (impactNum > 1 || slippage.maxSlippageBps > 300) {
    recommendation = 'caution';
    recommendationText = 'Trade has moderate price impact. Execution is acceptable but not optimal.';
  } else {
    recommendation = 'proceed';
    recommendationText = 'Trade has minimal price impact and slippage. Good execution expected.';
  }

  return {
    priceImpact: impact,
    slippage,
    recommendation,
    recommendationText,
    warnings,
  };
}
