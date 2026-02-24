import type { LiquidityPositionApiResponse, ImpermanentLossApiResponse, ApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export class LiquidityApi {
  constructor(private readonly http: HttpClient) {}

  async getPositions(accountIdentifier: string, currencyId?: number): Promise<LiquidityPositionApiResponse[]> {
    const response = await this.http.get<ApiResponse<LiquidityPositionApiResponse[]>>(
      `/accounts/${accountIdentifier}/liquidity-positions`,
      { includes: currencyId !== undefined ? `csprtrade_data(${currencyId})` : undefined }
    );
    return response.data;
  }

  async getImpermanentLoss(accountIdentifier: string, pairHash: string): Promise<ImpermanentLossApiResponse> {
    const response = await this.http.get<ApiResponse<ImpermanentLossApiResponse>>(
      `/accounts/${accountIdentifier}/liquidity-position-impermanent-loss`,
      { pair_contract_package_hash: pairHash }
    );
    return response.data;
  }
}
