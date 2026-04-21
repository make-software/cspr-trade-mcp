import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CsprTradeClient } from '../../src/client.js';

// Mainnet WCSPR package hash (used in client networkConfig)
const WCSPR_HASH = '3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e';

function mockPosition(overrides: Record<string, unknown> = {}) {
  return {
    account_hash: 'account-hash-abc',
    pair_contract_package_hash: overrides.pairHash ?? 'hash-pair1',
    lp_token_balance: '500000',
    pair_lp_tokens_total_supply: '1000000',
    pair: {
      token0_contract_package: {
        contract_package_hash: overrides.token0Hash ?? `hash-${WCSPR_HASH}`,
        metadata: { symbol: overrides.token0Symbol ?? 'WCSPR', decimals: 9 },
      },
      token1_contract_package: {
        contract_package_hash: overrides.token1Hash ?? 'hash-usdt',
        metadata: { symbol: overrides.token1Symbol ?? 'USDT', decimals: 6 },
      },
      reserve0: overrides.reserve0 ?? '10000000000000',
      reserve1: overrides.reserve1 ?? '10000000',
    },
    ...overrides,
  };
}

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

  it('should separate WCSPR positions from unpriced non-WCSPR positions in getPortfolioValue', async () => {
    const wcspr = `hash-${WCSPR_HASH}`;

    // Mock getLiquidityPositions and rates fetch
    const csrpPosition = {
      accountHash: 'acct',
      pairContractPackageHash: 'hash-wcspr-usdt',
      lpTokenBalance: '500000',
      lpTokenTotalSupply: '1000000',
      pair: {
        token0Symbol: 'WCSPR',
        token1Symbol: 'USDT',
        token0PackageHash: wcspr,
        token1PackageHash: 'hash-usdt',
        reserve0: '1000000000',
        reserve1: '1000000',
        decimals0: 9,
        decimals1: 6,
      },
      poolShare: '50.00',
      estimatedToken0Amount: '500000000',
      estimatedToken1Amount: '500000',
    };

    const nonCsprPosition = {
      accountHash: 'acct',
      pairContractPackageHash: 'hash-usdt-usdc',
      lpTokenBalance: '200000',
      lpTokenTotalSupply: '1000000',
      pair: {
        token0Symbol: 'USDT',
        token1Symbol: 'USDC',
        token0PackageHash: 'hash-usdt',
        token1PackageHash: 'hash-usdc',
        reserve0: '10000000',
        reserve1: '10000000',
        decimals0: 6,
        decimals1: 6,
      },
      poolShare: '20.00',
      estimatedToken0Amount: '2000000',
      estimatedToken1Amount: '2000000',
    };

    vi.spyOn(client, 'getLiquidityPositions').mockResolvedValueOnce([csrpPosition, nonCsprPosition]);
    // Rate fetch will fail — best-effort
    vi.mocked(fetch).mockRejectedValueOnce(new Error('no rate'));

    const result = await client.getPortfolioValue('01abc');

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].pairContractPackageHash).toBe('hash-wcspr-usdt');
    expect(result.unpricedPositions).toHaveLength(1);
    expect(result.unpricedPositions[0].pairContractPackageHash).toBe('hash-usdt-usdc');
    expect(parseFloat(result.totalCsprValue)).toBeGreaterThan(0);
    expect(result.totalUsdValue).toBeNull();
  });

  it('getPortfolioValue with empty positions returns zero totals', async () => {
    vi.spyOn(client, 'getLiquidityPositions').mockResolvedValueOnce([]);
    vi.mocked(fetch).mockRejectedValueOnce(new Error('no rate'));

    const result = await client.getPortfolioValue('01abc');

    expect(result.positions).toHaveLength(0);
    expect(result.unpricedPositions).toHaveLength(0);
    expect(result.totalCsprValue).toBe('0.000000');
    expect(result.totalUsdValue).toBeNull();
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
