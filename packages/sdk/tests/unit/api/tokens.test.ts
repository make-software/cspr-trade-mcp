import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokensApi } from '../../../src/api/tokens.js';
import { HttpClient } from '../../../src/api/http.js';

vi.mock('../../../src/api/http.js');

const WCSPR_HASH = 'hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e';

describe('TokensApi', () => {
  let api: TokensApi;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = new HttpClient('https://api.example.com');
    vi.mocked(mockHttp.get).mockResolvedValue({
      data: [
        {
          contract_package_hash: WCSPR_HASH,
          contract_package: {
            contract_package_hash: WCSPR_HASH,
            name: 'Wrapped CSPR',
            metadata: { symbol: 'WCSPR', name: 'Wrapped CSPR', decimals: 9 },
            icon_url: 'https://example.com/cspr.png',
            csprtrade_data: { price: 0.02 },
          },
          listed_at: '2025-01-01T00:00:00Z',
          sorting_order: 0,
        },
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
    api = new TokensApi(mockHttp, WCSPR_HASH);
  });

  it('should transform WCSPR into virtual CSPR token', async () => {
    const tokens = await api.getTokens(1);

    expect(mockHttp.get).toHaveBeenCalledWith('/tokens', {
      includes: 'csprtrade_data(1)',
    });
    expect(tokens).toHaveLength(2);
    // WCSPR is transformed into CSPR
    expect(tokens[0].id).toBe('cspr');
    expect(tokens[0].symbol).toBe('CSPR');
    expect(tokens[0].name).toBe('Casper');
    expect(tokens[0].packageHash).toBe(WCSPR_HASH); // keeps real WCSPR hash
    expect(tokens[0].decimals).toBe(9);
    expect(tokens[0].fiatPrice).toBe(0.02);
    // USDT unchanged
    expect(tokens[1].symbol).toBe('USDT');
    expect(tokens[1].decimals).toBe(6);
  });

  it('should fetch tokens without currency', async () => {
    await api.getTokens();
    expect(mockHttp.get).toHaveBeenCalledWith('/tokens', {
      includes: undefined,
    });
  });

  it('should not include CSPR if WCSPR is not in the token list', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({
      data: [
        {
          contract_package_hash: 'hash-abc123',
          contract_package: {
            contract_package_hash: 'hash-abc123',
            name: 'USD Tether',
            metadata: { symbol: 'USDT', name: 'USD Tether', decimals: 6 },
            icon_url: null,
            csprtrade_data: null,
          },
          listed_at: '2025-01-01T00:00:00Z',
          sorting_order: 1,
        },
      ],
    });

    const tokens = await api.getTokens();
    const csprTokens = tokens.filter(t => t.id === 'cspr');
    expect(csprTokens).toHaveLength(0);
  });

  it('should return raw API response via getTokensRaw', async () => {
    const raw = await api.getTokensRaw(1);
    expect(raw).toHaveLength(2);
    expect(raw[0].contract_package_hash).toBe(WCSPR_HASH);
  });
});
