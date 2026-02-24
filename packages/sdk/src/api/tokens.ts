import type { Token, TokenApiResponse, ApiResponse } from '../types/index.js';
import { CSPR_TOKEN_ID, CSPR_DECIMALS, ZERO_HASH } from '../config.js';
import type { HttpClient } from './http.js';

export class TokensApi {
  constructor(private readonly http: HttpClient) {}

  async getTokens(currencyId?: number): Promise<Token[]> {
    const response = await this.http.get<ApiResponse<TokenApiResponse[]>>('/tokens', {
      includes: currencyId !== undefined ? `csprtrade_data(${currencyId})` : undefined,
    });

    const tokens = response.data.map(mapApiTokenToToken);

    // Always include native CSPR as a token
    const hasCSPR = tokens.some(t => t.id === CSPR_TOKEN_ID);
    if (!hasCSPR) {
      tokens.unshift({
        id: CSPR_TOKEN_ID,
        name: 'Casper',
        symbol: 'CSPR',
        decimals: CSPR_DECIMALS,
        packageHash: `hash-${ZERO_HASH}`,
        iconUrl: null,
        fiatPrice: null,
      });
    }

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
