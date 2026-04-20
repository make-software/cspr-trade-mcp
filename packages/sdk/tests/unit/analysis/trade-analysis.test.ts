import { describe, it, expect } from 'vitest';
import {
  estimatePriceImpact,
  estimateSlippage,
  computeOptimalLiquidityAmounts,
  analyzeTrade,
} from '../../../src/analysis/trade-analysis.js';

describe('estimatePriceImpact', () => {
  it('returns low impact for small trade relative to reserves', () => {
    // Pool: 1M tokens each side, trade 100 tokens
    const result = estimatePriceImpact(
      '1000000000000000', // 1M with 9 decimals
      '1000000000000000',
      '100',
      9, 9,
    );
    expect(parseFloat(result.priceImpactPct)).toBeLessThan(1);
    expect(result.severity).toBe('low');
    expect(result.warning).toBeNull();
  });

  it('returns high impact for large trade relative to reserves', () => {
    // Pool: 1000 tokens each side, trade 500 tokens
    const result = estimatePriceImpact(
      '1000000000000', // 1000 with 9 decimals
      '1000000000000',
      '500',
      9, 9,
    );
    expect(parseFloat(result.priceImpactPct)).toBeGreaterThan(5);
    expect(['high', 'very_high']).toContain(result.severity);
    expect(result.warning).not.toBeNull();
  });

  it('handles empty pool gracefully', () => {
    const result = estimatePriceImpact('0', '0', '100', 9, 9);
    expect(result.priceImpactPct).toBe('0');
    expect(result.severity).toBe('low');
  });

  it('works with raw amounts', () => {
    const result = estimatePriceImpact(
      '1000000000000000',
      '1000000000000000',
      '100000000000', // 100 with 9 decimals
      9, 9,
      true,
    );
    expect(parseFloat(result.priceImpactPct)).toBeLessThan(1);
  });
});

describe('estimateSlippage', () => {
  it('returns expected output for a swap', () => {
    const result = estimateSlippage(
      '1000000000000000',
      '1000000000000000',
      '100',
      9, 9,
      300,
    );
    expect(result.expectedOutputFormatted).toBeTruthy();
    expect(parseFloat(result.expectedOutputFormatted)).toBeGreaterThan(0);
    expect(parseFloat(result.expectedOutputFormatted)).toBeLessThan(100);
    expect(result.recommendedSlippageBps).toBeGreaterThanOrEqual(50);
  });

  it('returns higher slippage for larger trades', () => {
    const small = estimateSlippage('1000000000000', '1000000000000', '10', 9, 9, 300);
    const large = estimateSlippage('1000000000000', '1000000000000', '500', 9, 9, 300);
    expect(large.maxSlippageBps).toBeGreaterThan(small.maxSlippageBps);
  });

  it('calculates minimum output with slippage tolerance', () => {
    const result = estimateSlippage(
      '1000000000000000',
      '1000000000000000',
      '100',
      9, 9,
      300,
    );
    const expected = parseFloat(result.expectedOutputFormatted);
    const minimum = parseFloat(result.minimumOutputFormatted);
    expect(minimum).toBeLessThan(expected);
    // With 3% slippage, minimum should be roughly 97% of expected
    expect(minimum / expected).toBeGreaterThan(0.96);
    expect(minimum / expected).toBeLessThan(0.98);
  });
});

describe('computeOptimalLiquidityAmounts', () => {
  it('computes optimal B for existing pool', () => {
    // Equal reserves: optimal B should equal A
    const result = computeOptimalLiquidityAmounts(
      '1000000000000', // 1000 with 9 decimals
      '1000000000000',
      '100',
      9, 9,
      '100000000000', // 100 LP tokens
    );
    expect(result.amountA).toBe('100');
    expect(parseFloat(result.amountB)).toBeCloseTo(100, 0);
    expect(result.isNewPool).toBe(false);
  });

  it('handles new pool', () => {
    const result = computeOptimalLiquidityAmounts('0', '0', '100', 9, 9, '0');
    expect(result.isNewPool).toBe(true);
    expect(result.estimatedPoolSharePct).toBe('100.00');
  });

  it('scales B proportionally for unbalanced pool', () => {
    // 2:1 ratio pool
    const result = computeOptimalLiquidityAmounts(
      '2000000000000', // 2000
      '1000000000000', // 1000
      '100',
      9, 9,
      '100000000000',
    );
    expect(parseFloat(result.amountB)).toBeCloseTo(50, 0);
  });
});

describe('analyzeTrade', () => {
  it('recommends proceed for small trade', () => {
    const result = analyzeTrade(
      '1000000000000000',
      '1000000000000000',
      '100',
      9, 9,
    );
    expect(result.recommendation).toBe('proceed');
    expect(result.warnings.length).toBe(0);
  });

  it('returns not_recommended for oversized trade', () => {
    const result = analyzeTrade(
      '1000000000000', // 1000
      '1000000000000', // 1000
      '900', // 90% of pool
      9, 9,
    );
    expect(['high_risk', 'not_recommended']).toContain(result.recommendation);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('includes both price impact and slippage data', () => {
    const result = analyzeTrade(
      '1000000000000000',
      '1000000000000000',
      '1000',
      9, 9,
    );
    expect(result.priceImpact).toBeDefined();
    expect(result.priceImpact.priceImpactPct).toBeDefined();
    expect(result.slippage).toBeDefined();
    expect(result.slippage.expectedOutputFormatted).toBeDefined();
    expect(result.recommendationText).toBeTruthy();
  });
});
