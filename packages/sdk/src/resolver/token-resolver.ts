import type { Token } from '../types/index.js';

export class TokenResolver {
  private cache: Token[] | null = null;
  private cacheTimestamp = 0;
  private readonly cacheTtlMs = 30_000; // 30 seconds

  constructor(private readonly fetchTokens: () => Promise<Token[]>) {}

  async resolve(identifier: string): Promise<Token> {
    const tokens = await this.getTokens();
    const id = identifier.trim();

    // 1. Match by symbol (case-insensitive)
    const bySymbol = tokens.find(t => t.symbol.toLowerCase() === id.toLowerCase());
    if (bySymbol) return bySymbol;

    // 2. Match by contract package hash
    const byHash = tokens.find(t => t.packageHash.toLowerCase() === id.toLowerCase());
    if (byHash) return byHash;

    // 3. Match by name (case-insensitive)
    const byName = tokens.find(t => t.name.toLowerCase() === id.toLowerCase());
    if (byName) return byName;

    throw new Error(`Token not found: "${identifier}". Use a token symbol (e.g., "CSPR"), name, or contract package hash.`);
  }

  async getTokens(): Promise<Token[]> {
    const now = Date.now();
    if (this.cache && now - this.cacheTimestamp < this.cacheTtlMs) {
      return this.cache;
    }
    this.cache = await this.fetchTokens();
    this.cacheTimestamp = now;
    return this.cache;
  }

  invalidateCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}
