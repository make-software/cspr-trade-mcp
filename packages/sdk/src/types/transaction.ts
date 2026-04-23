/** Swap parameters */
export interface SwapParams {
  tokenIn: string;             // symbol, name, or hash
  tokenOut: string;            // symbol, name, or hash
  amount: string;              // human-readable
  type: 'exact_in' | 'exact_out';
  slippageBps?: number;        // basis points (default 300 = 3%)
  deadlineMinutes?: number;    // default 20
  senderPublicKey: string;     // hex public key
  /** Raw token balance for approval amount (matching CSPR.trade pattern). Falls back to swap amount. */
  tokenInBalance?: string;
}

/** Token approval parameters */
export interface ApprovalParams {
  tokenContractPackageHash: string;
  spenderPackageHash: string;
  amount: string;              // raw amount
  senderPublicKey: string;
}

/** The result of building a transaction */
export interface TransactionBundle {
  /** The unsigned transaction as JSON */
  transactionJson: string;
  /** Human-readable description of what this transaction does */
  summary: string;
  /** Gas cost in CSPR */
  estimatedGasCost: string;
  /** If token approvals are needed first, these contain those transactions (sign & submit each before the main tx) */
  approvalsRequired?: TransactionBundle[];
  /** Safety warnings (high price impact, high slippage, etc.) */
  warnings: string[];
}

/** Result of submitting a transaction */
export interface SubmitResult {
  transactionHash: string;
}

/** Transaction status */
export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'success' | 'failed' | 'expired';
  errorMessage?: string;
}

/** Signer interface for pluggable signing */
export interface Signer {
  sign(deployJson: string): Promise<string>;
}

/** Swap history entry */
export interface SwapHistoryEntry {
  transactionHash: string;
  timestamp: string;
  token0ContractPackageHash: string;
  token1ContractPackageHash: string;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  senderAccountHash: string;
}

/** Swap history query params */
export interface SwapHistoryQuery {
  publicKey?: string;
  pairContractPackageHash?: string;
  page?: number;
  pageSize?: number;
}

/** OHLCV candlestick data for a trading pair */
export interface OHLCVCandle {
  /** ISO 8601 timestamp of the candle open (bucket start) */
  timestamp: string;
  /** Price at first swap in interval (token1 per token0) */
  open: number;
  /** Highest price in interval */
  high: number;
  /** Lowest price in interval */
  low: number;
  /** Price at last swap in interval */
  close: number;
  /** Total volume of token0 traded in this interval (human-readable) */
  volumeToken0: number;
  /** Total volume of token1 traded in this interval (human-readable) */
  volumeToken1: number;
  /** Number of swaps in this interval */
  swapCount: number;
}

/** Price history query interval */
export type PriceHistoryInterval = '1h' | '4h' | '1d';

/** Price history query params */
export interface PriceHistoryQuery {
  pairContractPackageHash: string;
  /** Candle interval (default '1h') */
  interval?: PriceHistoryInterval;
  /** Number of candles to return (default 24, max 200) */
  limit?: number;
}
