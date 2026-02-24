import type { Currency } from '../types/index.js';

export class CurrencyResolver {
  private cache: Currency[] | null = null;

  constructor(private readonly fetchCurrencies: () => Promise<Currency[]>) {}

  async resolveToId(code: string): Promise<number | undefined> {
    const currencies = await this.getCurrencies();
    const match = currencies.find(c => c.code.toLowerCase() === code.toLowerCase());
    return match?.id;
  }

  async getCurrencies(): Promise<Currency[]> {
    if (this.cache) return this.cache;
    this.cache = await this.fetchCurrencies();
    return this.cache;
  }
}
