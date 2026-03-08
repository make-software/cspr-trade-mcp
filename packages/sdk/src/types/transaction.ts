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
