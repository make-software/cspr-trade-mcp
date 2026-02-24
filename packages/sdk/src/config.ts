export interface NetworkConfig {
  chainName: string;
  apiUrl: string;
  routerPackageHash: string;
  wcsprPackageHash: string;
  gasPrice: number;
  ttl: number;
}

export const TESTNET_CONFIG: NetworkConfig = {
  chainName: 'casper-test',
  apiUrl: 'https://cspr-trade-api.dev.make.services',
  routerPackageHash: 'hash-04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867',
  wcsprPackageHash: 'hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e',
  gasPrice: 1,
  ttl: 1_800_000, // 30 minutes
};

export const MAINNET_CONFIG: NetworkConfig = {
  chainName: 'casper',
  apiUrl: 'https://api.cspr.trade',
  // TODO: confirm mainnet addresses
  routerPackageHash: 'hash-0000000000000000000000000000000000000000000000000000000000000000',
  wcsprPackageHash: 'hash-0000000000000000000000000000000000000000000000000000000000000000',
  gasPrice: 1,
  ttl: 1_800_000,
};

export function getNetworkConfig(network: 'mainnet' | 'testnet'): NetworkConfig {
  return network === 'testnet' ? TESTNET_CONFIG : MAINNET_CONFIG;
}

/** Default slippage in basis points (3% = 300 bps) */
export const DEFAULT_SLIPPAGE_BPS = 300;

/** Default deadline in minutes */
export const DEFAULT_DEADLINE_MINUTES = 20;

/** Gas costs in motes (1 CSPR = 1_000_000_000 motes) */
export const GAS_COSTS = {
  approve: 5_000_000_000n,            // 5 CSPR
  swapCsprForToken: 30_000_000_000n,   // 30 CSPR
  swapTokenForToken: 30_000_000_000n,  // 30 CSPR
  addLiquidity: 50_000_000_000n,       // 50 CSPR
  addNewLiquidity: 500_000_000_000n,   // 500 CSPR
  removeLiquidity: 30_000_000_000n,    // 30 CSPR
} as const;

/** CSPR token constants */
export const CSPR_TOKEN_ID = 'cspr';
export const CSPR_DECIMALS = 9;
export const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/** Safety thresholds */
export const PRICE_IMPACT_WARNING_THRESHOLD = 5;
export const PRICE_IMPACT_HIGH_THRESHOLD = 15;
export const SLIPPAGE_WARNING_THRESHOLD = 10;
