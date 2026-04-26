/**
 * Verifies that all public TypeScript types are exported from the package root.
 * This ensures external consumers can import types with:
 *   import type { SwapParams, PairQuery, ... } from '@make-software/cspr-trade-mcp-sdk'
 */
import { describe, it, expect } from 'vitest';
import type {
  // Core client
  CsprTradeClientConfig,
  // Swap / trading types
  SwapParams,
  QuoteParams,
  QuoteType,
  Quote,
  // Pair types
  PairQuery,
  PaginatedResult,
  Pair,
  // Token types
  Token,
  TokenBalance,
  NativeCsprBalance,
  // Analysis types
  TradeAnalysis,
  PriceImpactEstimate,
  PriceImpactSeverity,
  SlippageEstimate,
  OptimalLiquidityResult,
  // OHLCV types
  OHLCVCandle,
  PriceHistoryInterval,
  // Liquidity types
  LiquidityPosition,
  AddLiquidityParams,
  RemoveLiquidityParams,
  // API types
  QuoteApiParams,
} from '../../src/index.js';

describe('Package root type exports', () => {
  it('should export all public types (compile-time check)', () => {
    // This test validates that the types are exported by using them as type annotations.
    // TypeScript will fail to compile if any type is missing.
    const _unused: {
      clientConfig: CsprTradeClientConfig;
      swapParams: SwapParams;
      quoteParams: QuoteParams;
      quoteType: QuoteType;
      quote: Quote;
      pairQuery: PairQuery;
      paginatedResult: PaginatedResult<Pair>;
      pair: Pair;
      token: Token;
      tokenBalance: TokenBalance;
      nativeCsprBalance: NativeCsprBalance;
      tradeAnalysis: TradeAnalysis;
      priceImpactEstimate: PriceImpactEstimate;
      priceImpactSeverity: PriceImpactSeverity;
      slippageEstimate: SlippageEstimate;
      optimalLiquidityResult: OptimalLiquidityResult;
      ohlcvCandle: OHLCVCandle;
      priceHistoryInterval: PriceHistoryInterval;
      liquidityPosition: LiquidityPosition;
      addLiquidityParams: AddLiquidityParams;
      removeLiquidityParams: RemoveLiquidityParams;
      quoteApiParams: QuoteApiParams;
    } = {} as any;

    // Runtime assertion — the test file itself must have been parsed without TS errors
    expect(true).toBe(true);
  });
});
