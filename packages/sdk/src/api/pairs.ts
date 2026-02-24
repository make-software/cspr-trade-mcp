import type { Pair, PairApiResponse, PaginatedApiResponse, ApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export interface PairQuery {
  page?: number;
  pageSize?: number;
  orderBy?: 'timestamp' | 'reserve0' | 'reserve1';
  orderDirection?: 'asc' | 'desc';
  token0Hash?: string;
  token1Hash?: string;
  currencyId?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  itemCount: number;
  pageCount: number;
}

export class PairsApi {
  constructor(private readonly http: HttpClient) {}

  async getPairs(opts?: PairQuery): Promise<PaginatedResult<Pair>> {
    const response = await this.http.get<PaginatedApiResponse<PairApiResponse>>('/pairs', {
      page: opts?.page !== undefined ? String(opts.page) : undefined,
      page_size: opts?.pageSize !== undefined ? String(opts.pageSize) : undefined,
      order_by: opts?.orderBy,
      order_direction: opts?.orderDirection,
      token0_contract_package_hash: opts?.token0Hash,
      token1_contract_package_hash: opts?.token1Hash,
      includes: opts?.currencyId !== undefined ? `csprtrade_data(${opts.currencyId})` : undefined,
    });

    return {
      data: response.data.map(mapPair),
      itemCount: response.item_count,
      pageCount: response.page_count,
    };
  }

  async getPairDetails(contractPackageHash: string, currencyId?: number): Promise<Pair> {
    const response = await this.http.get<ApiResponse<PairApiResponse>>(
      `/pairs/${contractPackageHash}`,
      {
        includes: currencyId !== undefined ? `csprtrade_data(${currencyId})` : undefined,
      }
    );
    return mapPair(response.data);
  }
}

function mapPair(api: PairApiResponse): Pair {
  const meta0 = api.token0_contract_package?.metadata;
  const meta1 = api.token1_contract_package?.metadata;
  return {
    contractPackageHash: api.contract_package_hash,
    token0: {
      packageHash: api.token0_contract_package_hash,
      symbol: meta0?.symbol ?? '',
      name: meta0?.name ?? '',
      decimals: api.decimals0,
      iconUrl: api.token0_contract_package?.icon_url ?? null,
    },
    token1: {
      packageHash: api.token1_contract_package_hash,
      symbol: meta1?.symbol ?? '',
      name: meta1?.name ?? '',
      decimals: api.decimals1,
      iconUrl: api.token1_contract_package?.icon_url ?? null,
    },
    reserve0: api.reserve0,
    reserve1: api.reserve1,
    timestamp: api.timestamp,
    fiatPrice0: api.token0_contract_package?.csprtrade_data?.price ?? null,
    fiatPrice1: api.token1_contract_package?.csprtrade_data?.price ?? null,
  };
}
