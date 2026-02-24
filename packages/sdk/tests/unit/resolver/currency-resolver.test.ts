import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CurrencyResolver } from '../../../src/resolver/currency-resolver.js';
import type { Currency } from '../../../src/types/index.js';

const MOCK_CURRENCIES: Currency[] = [
  { id: 1, code: 'USD', name: 'US Dollar', symbol: '$' },
  { id: 2, code: 'EUR', name: 'Euro', symbol: '€' },
];

describe('CurrencyResolver', () => {
  let resolver: CurrencyResolver;

  beforeEach(() => {
    const fetchCurrencies = vi.fn().mockResolvedValue(MOCK_CURRENCIES);
    resolver = new CurrencyResolver(fetchCurrencies);
  });

  it('should resolve currency code to ID', async () => {
    const id = await resolver.resolveToId('USD');
    expect(id).toBe(1);
  });

  it('should be case-insensitive', async () => {
    const id = await resolver.resolveToId('eur');
    expect(id).toBe(2);
  });

  it('should return undefined for unknown currency', async () => {
    const id = await resolver.resolveToId('JPY');
    expect(id).toBeUndefined();
  });
});
