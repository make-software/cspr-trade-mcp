import type { QuoteApiResponse, ApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export interface QuoteApiParams {
  tokenIn: string;   // contract package hash
  tokenOut: string;   // contract package hash
  amount: string;     // raw amount
  typeId: 1 | 2;     // 1=exact_in, 2=exact_out
}

export class QuotesApi {
  constructor(private readonly http: HttpClient) {}

  async getQuote(params: QuoteApiParams): Promise<QuoteApiResponse> {
    const response = await this.http.get<ApiResponse<QuoteApiResponse>>('/quote', {
      token_in: params.tokenIn,
      token_out: params.tokenOut,
      amount: params.amount,
      type_id: String(params.typeId),
    });
    return response.data;
  }
}
