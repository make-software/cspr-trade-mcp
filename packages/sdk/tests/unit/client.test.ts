import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CsprTradeClient } from '../../src/client.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('CsprTradeClient', () => {
  let client: CsprTradeClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new CsprTradeClient({ network: 'testnet' });
  });

  it('should create with testnet config', () => {
    expect(client).toBeDefined();
  });

  it('should create with custom API URL', () => {
    const custom = new CsprTradeClient({
      network: 'testnet',
      apiUrl: 'https://custom-api.example.com',
    });
    expect(custom).toBeDefined();
  });

  it('should expose getTokens method', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }))
    );

    const tokens = await client.getTokens();
    expect(Array.isArray(tokens)).toBe(true);
  });

  it('should expose getQuote method', async () => {
    // First call: getTokens for resolution (WCSPR gets transformed to CSPR)
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        data: [
          { contract_package_hash: 'hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e', contract_package: { metadata: { symbol: 'WCSPR', name: 'Wrapped CSPR', decimals: 9 } } },
          { contract_package_hash: 'hash-aaa', contract_package: { metadata: { symbol: 'USDT', name: 'Tether', decimals: 6 } } },
        ],
      }))
    );
    // Second call: the actual quote
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        data: {
          amount_in: '100000000000',
          amount_out: '50000000',
          execution_price: '0.5',
          mid_price: '0.5',
          path: ['hash-wcspr', 'hash-aaa'],
          price_impact: '0.1',
          recommended_slippage_bps: '10',
          type_id: 1,
        },
      }))
    );

    const quote = await client.getQuote({
      tokenIn: 'CSPR',
      tokenOut: 'USDT',
      amount: '100',
      type: 'exact_in',
    });

    expect(quote.amountIn).toBe('100000000000');
    expect(quote.amountOut).toBe('50000000');
    expect(quote.tokenInSymbol).toBe('CSPR');
  });
});
