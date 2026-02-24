/** Quote API response */
export interface QuoteApiResponse {
  amount_in: string;
  amount_out: string;
  execution_price: string;
  mid_price: string;
  path: string[];
  price_impact: string;
  recommended_slippage_bps: string;
  type_id: 1 | 2;
}

/** Quote type enum */
export type QuoteType = 'exact_in' | 'exact_out';

/** Quote parameters */
export interface QuoteParams {
  tokenIn: string;   // symbol, name, or hash
  tokenOut: string;   // symbol, name, or hash
  amount: string;     // human-readable amount
  type: QuoteType;
}

/** Resolved quote for SDK consumption */
export interface Quote {
  amountIn: string;           // raw amount
  amountOut: string;          // raw amount
  amountInFormatted: string;  // human-readable
  amountOutFormatted: string; // human-readable
  executionPrice: string;
  midPrice: string;
  path: string[];             // contract package hashes
  pathSymbols: string[];      // token symbols for display
  priceImpact: string;        // percentage string
  recommendedSlippageBps: string;
  type: QuoteType;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  tokenInDecimals: number;
  tokenOutDecimals: number;
}
