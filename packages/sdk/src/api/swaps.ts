import type { PaginatedApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export interface SwapApiQuery {
  senderAccountHash?: string;
  pairContractPackageHash?: string;
  page?: number;
  pageSize?: number;
  orderDirection?: 'asc' | 'desc';
}

export class SwapsApi {
  constructor(private readonly http: HttpClient) {}

  async getSwaps(opts?: SwapApiQuery): Promise<PaginatedApiResponse<unknown>> {
    return this.http.get<PaginatedApiResponse<unknown>>('/swaps', {
      sender_account_hash: opts?.senderAccountHash,
      pair_contract_package_hash: opts?.pairContractPackageHash,
      page: opts?.page !== undefined ? String(opts.page) : undefined,
      page_size: opts?.pageSize !== undefined ? String(opts.pageSize) : undefined,
      order_direction: opts?.orderDirection,
    });
  }
}
