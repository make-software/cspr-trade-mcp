import type { Currency, ApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export class CurrenciesApi {
  constructor(private readonly http: HttpClient) {}

  async getCurrencies(): Promise<Currency[]> {
    const response = await this.http.get<ApiResponse<Currency[]>>('/currencies');
    return response.data;
  }
}
