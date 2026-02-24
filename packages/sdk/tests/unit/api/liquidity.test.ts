import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiquidityApi } from '../../../src/api/liquidity.js';
import { HttpClient } from '../../../src/api/http.js';

vi.mock('../../../src/api/http.js');

describe('LiquidityApi', () => {
  let api: LiquidityApi;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = new HttpClient('https://api.example.com');
    api = new LiquidityApi(mockHttp);
  });

  it('should fetch liquidity positions', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({
      data: [{
        account_hash: 'account-hash-abc',
        pair_contract_package_hash: 'hash-pair1',
        lp_token_balance: '1000000',
        pair: { token0_contract_package: { metadata: { symbol: 'CSPR' } }, token1_contract_package: { metadata: { symbol: 'USDT' } } },
        pair_lp_tokens_total_supply: '10000000',
      }],
    });

    const positions = await api.getPositions('01abc123');
    expect(positions).toHaveLength(1);
    expect(positions[0].pair_contract_package_hash).toBe('hash-pair1');
  });

  it('should fetch impermanent loss', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({
      data: { value: '-2.5', pair_contract_package_hash: 'hash-pair1', account_hash: 'account-hash-abc', timestamp: '2025-01-01T00:00:00Z' },
    });

    const il = await api.getImpermanentLoss('01abc123', 'hash-pair1');
    expect(il.value).toBe('-2.5');
  });
});
