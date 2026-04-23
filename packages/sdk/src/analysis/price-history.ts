import type { OHLCVCandle, PriceHistoryInterval } from '../types/index.js';

/** Interval durations in seconds */
const INTERVAL_SECONDS: Record<PriceHistoryInterval, number> = {
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

/** Raw swap record from CSPR.trade /swaps API */
export interface RawSwap {
  timestamp: string;
  amount0In: string | null;
  amount0Out: string | null;
  amount1In: string | null;
  amount1Out: string | null;
  decimals0: number;
  decimals1: number;
}

/**
 * Compute the execution price of a single swap as (token1 per token0).
 * Returns null if the swap has no valid amounts.
 */
function swapPrice(swap: RawSwap): number | null {
  const d0 = swap.decimals0 || 9;
  const d1 = swap.decimals1 || 9;
  const scale0 = Math.pow(10, d0);
  const scale1 = Math.pow(10, d1);

  const a0in = Number(swap.amount0In ?? 0) / scale0;
  const a0out = Number(swap.amount0Out ?? 0) / scale0;
  const a1in = Number(swap.amount1In ?? 0) / scale1;
  const a1out = Number(swap.amount1Out ?? 0) / scale1;

  if (a0in > 0 && a1out > 0) {
    // Selling token0, buying token1: price = token1_out / token0_in
    return a1out / a0in;
  }
  if (a0out > 0 && a1in > 0) {
    // Buying token0, selling token1: price = token1_in / token0_out
    return a1in / a0out;
  }
  return null;
}

/** Truncate a timestamp to the start of an interval bucket (UTC) */
function bucketTimestamp(ts: string, intervalSecs: number): number {
  const ms = new Date(ts).getTime();
  const bucket = Math.floor(ms / (intervalSecs * 1000)) * (intervalSecs * 1000);
  return bucket;
}

/**
 * Aggregate raw swap records into OHLCV candlesticks.
 *
 * @param swaps - Swap records ordered by timestamp ASC
 * @param interval - Candle interval ('1h', '4h', '1d')
 * @param limit - Max number of candles to return (most recent first)
 */
export function aggregateOHLCV(
  swaps: RawSwap[],
  interval: PriceHistoryInterval = '1h',
  limit = 24,
): OHLCVCandle[] {
  const intervalSecs = INTERVAL_SECONDS[interval];
  const buckets = new Map<number, {
    open: number;
    high: number;
    low: number;
    close: number;
    volToken0: number;
    volToken1: number;
    swapCount: number;
  }>();

  for (const swap of swaps) {
    const price = swapPrice(swap);
    if (price === null || price <= 0) continue;

    const d0 = swap.decimals0 || 9;
    const d1 = swap.decimals1 || 9;
    const scale0 = Math.pow(10, d0);
    const scale1 = Math.pow(10, d1);

    const a0 = (Number(swap.amount0In ?? 0) + Number(swap.amount0Out ?? 0)) / scale0;
    const a1 = (Number(swap.amount1In ?? 0) + Number(swap.amount1Out ?? 0)) / scale1;
    const bucket = bucketTimestamp(swap.timestamp, intervalSecs);

    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, {
        open: price,
        high: price,
        low: price,
        close: price,
        volToken0: a0,
        volToken1: a1,
        swapCount: 1,
      });
    } else {
      existing.high = Math.max(existing.high, price);
      existing.low = Math.min(existing.low, price);
      existing.close = price;
      existing.volToken0 += a0;
      existing.volToken1 += a1;
      existing.swapCount += 1;
    }
  }

  // Sort descending (most recent first), apply limit
  const sorted = Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .reverse(); // return chronological order

  return sorted.map(([ts, c]) => ({
    timestamp: new Date(ts).toISOString(),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volumeToken0: c.volToken0,
    volumeToken1: c.volToken1,
    swapCount: c.swapCount,
  }));
}
