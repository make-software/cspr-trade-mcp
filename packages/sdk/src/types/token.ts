/** Contract package metadata from CSPR.cloud */
export interface ContractPackage {
  contract_package_hash: string;
  owner_public_key: string;
  name: string;
  description: string | null;
  metadata: TokenMetadata;
  icon_url: string | null;
  website_url: string | null;
  latest_version_contract_hash: string | null;
  csprtrade_data: { price: number } | null;
}

export interface TokenMetadata {
  balances_uref: string;
  decimals: number;
  name: string;
  symbol: string;
  total_supply_uref: string;
}

/** Token as returned by GET /tokens */
export interface TokenApiResponse {
  contract_package_hash: string;
  contract_package: ContractPackage;
  listed_at: string;
  sorting_order: number;
  total_value_locked?: string;
}

/** Resolved token for SDK consumption */
export interface Token {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  packageHash: string;
  iconUrl: string | null;
  fiatPrice: number | null;
}

/** Currency for fiat display */
export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

/** Raw API response for /accounts/{id}/ft-token-ownership */
export interface FTTokenOwnershipApiResponse {
  contract_package_hash: string;
  balance: string;
  owner_hash: string;
  owner_type: number;
  contract_package?: ContractPackage;
}

/** Resolved CEP-18 token balance for SDK consumption */
export interface TokenBalance {
  contractPackageHash: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Raw balance in atomic units */
  balance: string;
  /** Human-readable balance (balance / 10^decimals) */
  balanceFormatted: string;
  iconUrl: string | null;
}
