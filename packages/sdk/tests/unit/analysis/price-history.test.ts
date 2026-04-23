import { describe, it, expect } from 'vitest';
import { aggregateOHLCV, type RawSwap } from '../../../src/analysis/price-history.js';

/**
 * Helper to make a swap record.
 * By default: amount0In=100, amount1Out=95, decimals=9 → price ≈ 0.95
 */
function makeSwap(timestamp: string, overrides: Partial<RawSwap> = {}): RawSwap {
  return {
    timestamp,
    amount0In: '100000000000',   // 100 token0 (9 dec)
    amount0Out: null,
    amount1In: null,
    amount1Out: '95000000000',   // 95 token1 (9 dec) → price = 0.95
    decimals0: 9,
    decimals1: 9,
    ...overrides,
  };
}

describe('aggregateOHLCV', () => {
  it('returns empty array for empty input', () => {
    const result = aggregateOHLCV([], '1h', 24);
    expect(result).toEqual([]);
  });

  it('aggregates a single swap into one candle', () => {
    const swaps: RawSwap[] = [makeSwap('2026-04-22T10:00:00Z')];
    const candles = aggregateOHLCV(swaps, '1h', 24);
    expect(candles).toHaveLength(1);
    const c = candles[0];
    expect(c.open).toBeCloseTo(0.95);
    expect(c.close).toBeCloseTo(0.95);
    expect(c.high).toBeCloseTo(0.95);
    expect(c.low).toBeCloseTo(0.95);
    expect(c.swapCount).toBe(1);
    expect(c.timestamp).toBe('2026-04-22T10:00:00.000Z');
  });

  it('groups swaps in the same hour into one candle', () => {
    const swaps: RawSwap[] = [
      makeSwap('2026-04-22T10:05:00Z'),                       // price 0.95
      makeSwap('2026-04-22T10:45:00Z', { amount1Out: '98000000000' }), // price 0.98
    ];
    const candles = aggregateOHLCV(swaps, '1h', 24);
    expect(candles).toHaveLength(1);
    const c = candles[0];
    expect(c.open).toBeCloseTo(0.95);
    expect(c.close).toBeCloseTo(0.98);
    expect(c.high).toBeCloseTo(0.98);
    expect(c.low).toBeCloseTo(0.95);
    expect(c.swapCount).toBe(2);
  });

  it('separates swaps into different hour buckets', () => {
    const swaps: RawSwap[] = [
      makeSwap('2026-04-22T10:30:00Z'),                       // hour 10
      makeSwap('2026-04-22T11:30:00Z', { amount1Out: '90000000000' }), // hour 11, price 0.90
    ];
    const candles = aggregateOHLCV(swaps, '1h', 24);
    expect(candles).toHaveLength(2);
    expect(candles[0].timestamp).toBe('2026-04-22T10:00:00.000Z');
    expect(candles[1].timestamp).toBe('2026-04-22T11:00:00.000Z');
    expect(candles[0].open).toBeCloseTo(0.95);
    expect(candles[1].open).toBeCloseTo(0.90);
  });

  it('respects the limit parameter', () => {
    // Create 5 swaps in different hours
    const swaps: RawSwap[] = Array.from({ length: 5 }, (_, i) =>
      makeSwap(`2026-04-22T${String(i + 1).padStart(2, '0')}:00:00Z`),
    );
    const candles = aggregateOHLCV(swaps, '1h', 3);
    expect(candles).toHaveLength(3);
    // Should return the 3 most recent candles (hours 3, 4, 5)
    expect(candles[0].timestamp).toBe('2026-04-22T03:00:00.000Z');
    expect(candles[2].timestamp).toBe('2026-04-22T05:00:00.000Z');
  });

  it('handles sell-direction swaps (amount0Out, amount1In)', () => {
    const swaps: RawSwap[] = [
      {
        timestamp: '2026-04-22T10:00:00Z',
        amount0In: null,
        amount0Out: '100000000000',  // buying 100 token0
        amount1In: '105000000000',   // paying 105 token1 → price = 1.05
        amount1Out: null,
        decimals0: 9,
        decimals1: 9,
      },
    ];
    const candles = aggregateOHLCV(swaps, '1h', 24);
    expect(candles).toHaveLength(1);
    expect(candles[0].open).toBeCloseTo(1.05);
  });

  it('skips swaps with null/zero amounts', () => {
    const swaps: RawSwap[] = [
      { timestamp: '2026-04-22T10:00:00Z', amount0In: null, amount0Out: null, amount1In: null, amount1Out: null, decimals0: 9, decimals1: 9 },
      makeSwap('2026-04-22T10:30:00Z'),
    ];
    const candles = aggregateOHLCV(swaps, '1h', 24);
    expect(candles).toHaveLength(1);
    expect(candles[0].swapCount).toBe(1);
  });

  it('aggregates volume across swaps', () => {
    const swaps: RawSwap[] = [
      makeSwap('2026-04-22T10:00:00Z'),  // 100 token0, 95 token1
      makeSwap('2026-04-22T10:30:00Z'),  // 100 token0, 95 token1
    ];
    const candles = aggregateOHLCV(swaps, '1h', 24);
    expect(candles[0].volumeToken0).toBeCloseTo(200);
    expect(candles[0].volumeToken1).toBeCloseTo(190);
  });

  it('uses 4h interval to group across 4 hours', () => {
    const swaps: RawSwap[] = [
      makeSwap('2026-04-22T01:00:00Z'),  // bucket: 00:00
      makeSwap('2026-04-22T03:00:00Z'),  // bucket: 00:00
      makeSwap('2026-04-22T05:00:00Z'),  // bucket: 04:00
    ];
    const candles = aggregateOHLCV(swaps, '4h', 24);
    expect(candles).toHaveLength(2);
    expect(candles[0].swapCount).toBe(2);
    expect(candles[1].swapCount).toBe(1);
  });
});
