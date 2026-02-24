import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenResolver } from '../../../src/resolver/token-resolver.js';
import type { Token } from '../../../src/types/index.js';

const MOCK_TOKENS: Token[] = [
  { id: 'cspr', name: 'Casper', symbol: 'CSPR', decimals: 9, packageHash: 'hash-0000000000000000000000000000000000000000000000000000000000000000', iconUrl: null, fiatPrice: null },
  { id: 'hash-aaa111', name: 'USD Tether', symbol: 'USDT', decimals: 6, packageHash: 'hash-aaa111', iconUrl: null, fiatPrice: 1.0 },
  { id: 'hash-bbb222', name: 'Wrapped Casper', symbol: 'WCSPR', decimals: 9, packageHash: 'hash-bbb222', iconUrl: null, fiatPrice: null },
];

describe('TokenResolver', () => {
  let resolver: TokenResolver;
  let fetchTokens: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchTokens = vi.fn().mockResolvedValue(MOCK_TOKENS);
    resolver = new TokenResolver(fetchTokens);
  });

  it('should resolve by symbol (case-insensitive)', async () => {
    const token = await resolver.resolve('usdt');
    expect(token.symbol).toBe('USDT');
    expect(token.packageHash).toBe('hash-aaa111');
  });

  it('should resolve CSPR as native token', async () => {
    const token = await resolver.resolve('CSPR');
    expect(token.id).toBe('cspr');
    expect(token.decimals).toBe(9);
  });

  it('should resolve by contract package hash', async () => {
    const token = await resolver.resolve('hash-aaa111');
    expect(token.symbol).toBe('USDT');
  });

  it('should resolve by name', async () => {
    const token = await resolver.resolve('USD Tether');
    expect(token.symbol).toBe('USDT');
  });

  it('should throw for unknown token', async () => {
    await expect(resolver.resolve('UNKNOWN')).rejects.toThrow('Token not found');
  });

  it('should cache token list', async () => {
    await resolver.resolve('CSPR');
    await resolver.resolve('USDT');
    expect(fetchTokens).toHaveBeenCalledTimes(1);
  });
});
