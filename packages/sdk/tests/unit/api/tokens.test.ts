import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokensApi } from '../../../src/api/tokens.js';
import { HttpClient } from '../../../src/api/http.js';

vi.mock('../../../src/api/http.js');

describe('TokensApi', () => {
  let api: TokensApi;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = new HttpClient('https://api.example.com');
    vi.mocked(mockHttp.get).mockResolvedValue({
      data: [
        {
          contract_package_hash: 'hash-abc123',
          contract_package: {
            contract_package_hash: 'hash-abc123',
            name: 'USD Tether',
            metadata: { symbol: 'USDT', name: 'USD Tether', decimals: 6 },
            icon_url: 'https://example.com/usdt.png',
            csprtrade_data: { price: 1.0 },
          },
          listed_at: '2025-01-01T00:00:00Z',
          sorting_order: 1,
        },
      ],
    });
    api = new TokensApi(mockHttp);
  });

  it('should fetch tokens with currency includes', async () => {
    const tokens = await api.getTokens(1);

    expect(mockHttp.get).toHaveBeenCalledWith('/tokens', {
      includes: 'csprtrade_data(1)',
    });
    // CSPR is prepended as first token, USDT is second
    expect(tokens).toHaveLength(2);
    expect(tokens[0].symbol).toBe('CSPR');
    expect(tokens[1].symbol).toBe('USDT');
    expect(tokens[1].decimals).toBe(6);
    expect(tokens[1].fiatPrice).toBe(1.0);
  });

  it('should fetch tokens without currency', async () => {
    await api.getTokens();
    expect(mockHttp.get).toHaveBeenCalledWith('/tokens', {
      includes: undefined,
    });
  });

  it('should not duplicate CSPR if already in API response', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({
      data: [
        {
          contract_package_hash: 'cspr',
          contract_package: {
            contract_package_hash: 'cspr',
            name: 'Casper',
            metadata: { symbol: 'CSPR', name: 'Casper', decimals: 9 },
            icon_url: null,
            csprtrade_data: { price: 0.02 },
          },
          listed_at: '2025-01-01T00:00:00Z',
          sorting_order: 0,
        },
      ],
    });

    const tokens = await api.getTokens(1);
    const csprTokens = tokens.filter(t => t.id === 'cspr');
    expect(csprTokens).toHaveLength(1);
  });

  it('should return raw API response via getTokensRaw', async () => {
    const raw = await api.getTokensRaw(1);
    expect(raw).toHaveLength(1);
    expect(raw[0].contract_package_hash).toBe('hash-abc123');
  });
});
