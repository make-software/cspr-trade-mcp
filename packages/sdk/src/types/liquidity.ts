import type { PairApiResponse } from './pair.js';

/** Liquidity position API response */
export interface LiquidityPositionApiResponse {
  account_hash: string;
  pair_contract_package_hash: string;
  lp_token_balance: string;
  pair: PairApiResponse;
  pair_lp_tokens_total_supply: string;
}

/** Liquidity position for SDK consumption */
export interface LiquidityPosition {
  accountHash: string;
  pairContractPackageHash: string;
  lpTokenBalance: string;
  lpTokenTotalSupply: string;
  pair: {
    token0Symbol: string;
    token1Symbol: string;
    token0PackageHash: string;
    token1PackageHash: string;
    reserve0: string;
    reserve1: string;
    decimals0: number;
    decimals1: number;
  };
  /** User's share of the pool as percentage */
  poolShare: string;
  /** Estimated token0 amount based on pool share */
  estimatedToken0Amount: string;
  /** Estimated token1 amount based on pool share */
  estimatedToken1Amount: string;
}

/** Impermanent loss response */
export interface ImpermanentLossApiResponse {
  pair_contract_package_hash: string;
  account_hash: string;
  value: string;
  timestamp: string;
}

export interface ImpermanentLoss {
  pairContractPackageHash: string;
  value: string;
  timestamp: string;
}

/** Add liquidity parameters */
export interface AddLiquidityParams {
  tokenA: string;              // symbol, name, or hash
  tokenB: string;              // symbol, name, or hash
  amountA: string;             // human-readable
  amountB: string;             // human-readable
  slippageBps?: number;        // basis points (default 300 = 3%)
  deadlineMinutes?: number;    // default 20
  senderPublicKey: string;     // hex public key
  /** Raw token A balance for approval amount. Falls back to amountA in motes. */
  tokenABalance?: string;
  /** Raw token B balance for approval amount. Falls back to amountB in motes. */
  tokenBBalance?: string;
}

/** Remove liquidity parameters */
export interface RemoveLiquidityParams {
  pairContractPackageHash: string;
  percentage: number;           // 1-100
  slippageBps?: number;
  deadlineMinutes?: number;
  senderPublicKey: string;
}

/** A single position detail within a portfolio */
export interface PortfolioPosition {
  pairContractPackageHash: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Amount: string;
  token1Amount: string;
  token0AmountFormatted: string;
  token1AmountFormatted: string;
  poolShare: string;
}

/** Portfolio value result */
export interface PortfolioValue {
  /** Positions that contain WCSPR — fully valued in CSPR */
  positions: PortfolioPosition[];
  /** Positions with no WCSPR side — cannot be priced in CSPR without additional routing */
  unpricedPositions: PortfolioPosition[];
  totalCsprValue: string;
  totalUsdValue: string | null;
}

/** Unrealized PnL result for a single position */
export interface UnrealizedPnL {
  pairContractPackageHash: string;
  token0Symbol: string;
  token1Symbol: string;
  impermanentLossValue: string;
  impermanentLossTimestamp: string;
  currentToken0Amount: string;
  currentToken1Amount: string;
  currentToken0AmountFormatted: string;
  currentToken1AmountFormatted: string;
  poolShare: string;
}
