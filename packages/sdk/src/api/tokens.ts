import type { Token, TokenApiResponse, ApiResponse } from '../types/index.js';
import { CSPR_TOKEN_ID, CSPR_DECIMALS } from '../config.js';
import type { HttpClient } from './http.js';

export class TokensApi {
  constructor(
    private readonly http: HttpClient,
    private readonly wcsprPackageHash?: string,
  ) {}

  async getTokens(currencyId?: number): Promise<Token[]> {
    const response = await this.http.get<ApiResponse<TokenApiResponse[]>>('/tokens', {
      includes: currencyId !== undefined ? `csprtrade_data(${currencyId})` : undefined,
    });

    const wcsprHash = this.wcsprPackageHash?.replace('hash-', '') ?? '';
    const tokens = response.data.map(apiToken => {
      const rawHash = apiToken.contract_package_hash.replace('hash-', '');
      // Transform WCSPR into virtual "CSPR" token (matching frontend behavior)
      if (rawHash === wcsprHash) {
        const meta = apiToken.contract_package?.metadata;
        return {
          id: CSPR_TOKEN_ID,
          name: 'Casper',
          symbol: 'CSPR',
          decimals: meta?.decimals ?? CSPR_DECIMALS,
          packageHash: apiToken.contract_package_hash,
          iconUrl: apiToken.contract_package?.icon_url ?? null,
          fiatPrice: apiToken.contract_package?.csprtrade_data?.price ?? null,
        };
      }
      return mapApiTokenToToken(apiToken);
    });

    return tokens;
  }

  async getTokensRaw(currencyId?: number): Promise<TokenApiResponse[]> {
    const response = await this.http.get<ApiResponse<TokenApiResponse[]>>('/tokens', {
      includes: currencyId !== undefined ? `csprtrade_data(${currencyId})` : undefined,
    });
    return response.data;
  }
}

function mapApiTokenToToken(apiToken: TokenApiResponse): Token {
  const meta = apiToken.contract_package?.metadata;
  return {
    id: apiToken.contract_package_hash,
    name: meta?.name ?? apiToken.contract_package?.name ?? '',
    symbol: meta?.symbol ?? '',
    decimals: meta?.decimals ?? 0,
    packageHash: apiToken.contract_package_hash,
    iconUrl: apiToken.contract_package?.icon_url ?? null,
    fiatPrice: apiToken.contract_package?.csprtrade_data?.price ?? null,
  };
}
