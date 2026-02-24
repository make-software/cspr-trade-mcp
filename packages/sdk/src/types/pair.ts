import type { ContractPackage } from './token.js';

/** Pair as returned by API */
export interface PairApiResponse {
  contract_package_hash: string;
  token0_contract_package_hash: string;
  token1_contract_package_hash: string;
  decimals0: number;
  decimals1: number;
  reserve0: string;
  reserve1: string;
  timestamp: string;
  latest_event_id: string;
  contract_package: ContractPackage;
  token0_contract_package: ContractPackage;
  token1_contract_package: ContractPackage;
}

/** Pair for SDK consumption */
export interface Pair {
  contractPackageHash: string;
  token0: { packageHash: string; symbol: string; name: string; decimals: number; iconUrl: string | null };
  token1: { packageHash: string; symbol: string; name: string; decimals: number; iconUrl: string | null };
  reserve0: string;
  reserve1: string;
  timestamp: string;
  fiatPrice0: number | null;
  fiatPrice1: number | null;
}
