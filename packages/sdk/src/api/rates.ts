import type { ApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export class RatesApi {
  constructor(private readonly http: HttpClient) {}

  async getCsprRate(currencyId: number): Promise<unknown> {
    const response = await this.http.get<ApiResponse<unknown>>(`/rates/${currencyId}/latest`);
    return response.data;
  }

  async getTokenRate(contractPackageHash: string, currencyId?: number, dexId?: number): Promise<unknown> {
    const response = await this.http.get<ApiResponse<unknown>>(
      `/ft/${contractPackageHash}/rates/latest`,
      {
        currency_id: currencyId !== undefined ? String(currencyId) : undefined,
        dex_id: dexId !== undefined ? String(dexId) : undefined,
      }
    );
    return response.data;
  }

  async getTokenDexRate(contractPackageHash: string, targetHash?: string, dexId?: number): Promise<unknown> {
    const response = await this.http.get<ApiResponse<unknown>>(
      `/ft/${contractPackageHash}/dex-rates/latest`,
      {
        target_contract_package_hash: targetHash,
        dex_id: dexId !== undefined ? String(dexId) : undefined,
      }
    );
    return response.data;
  }
}
