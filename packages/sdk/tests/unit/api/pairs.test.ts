import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PairsApi } from '../../../src/api/pairs.js';
import { HttpClient } from '../../../src/api/http.js';

vi.mock('../../../src/api/http.js');

const MOCK_PAIR = {
  contract_package_hash: 'hash-pair1',
  token0_contract_package_hash: 'hash-token0',
  token1_contract_package_hash: 'hash-token1',
  decimals0: 9,
  decimals1: 6,
  reserve0: '1000000000000',
  reserve1: '500000000',
  timestamp: '2025-01-01T00:00:00Z',
  latest_event_id: '123',
  contract_package: { name: 'Pair' },
  token0_contract_package: { metadata: { symbol: 'CSPR', name: 'Casper', decimals: 9 }, icon_url: null, csprtrade_data: { price: 0.02 } },
  token1_contract_package: { metadata: { symbol: 'USDT', name: 'Tether', decimals: 6 }, icon_url: null, csprtrade_data: { price: 1.0 } },
};

describe('PairsApi', () => {
  let api: PairsApi;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = new HttpClient('https://api.example.com');
    api = new PairsApi(mockHttp);
  });

  it('should fetch paginated pairs', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({
      data: [MOCK_PAIR],
      item_count: 1,
      page_count: 1,
    });

    const result = await api.getPairs({ page: 1, pageSize: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].token0.symbol).toBe('CSPR');
    expect(result.itemCount).toBe(1);
  });

  it('should fetch pair by hash', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({ data: MOCK_PAIR });

    const pair = await api.getPairDetails('hash-pair1');

    expect(pair.contractPackageHash).toBe('hash-pair1');
    expect(pair.token0.symbol).toBe('CSPR');
  });
});
