import { describe, expect, it } from 'vitest';
import {
  BAZAAR_MANIFEST_ENTRIES,
  PREMIUM_PRICE_USDC,
  priceFor,
} from '../../src/x402-bazaar-manifest.js';

const PREMIUM_TOOLS = [
  'get_quote',
  'estimate_price_impact',
  'estimate_slippage',
  'analyze_trade',
  'optimal_liquidity_amounts',
  'get_pair_price_history',
  'get_token_price_history',
  'get_impermanent_loss',
  'get_portfolio_value',
  'get_swap_history',
];

describe('bazaar manifest tiers', () => {
  it('has one entry for every public hosted MCP tool and excludes local signing', () => {
    expect(BAZAAR_MANIFEST_ENTRIES).toHaveLength(23);
    expect(BAZAAR_MANIFEST_ENTRIES.map((entry) => entry.name)).not.toContain('sign_deploy');
  });

  it('prices exactly the agreed premium endpoints at $0.001', () => {
    const premium = BAZAAR_MANIFEST_ENTRIES
      .filter((entry) => entry.price === PREMIUM_PRICE_USDC)
      .map((entry) => entry.name)
      .sort();

    expect(premium).toEqual([...PREMIUM_TOOLS].sort());
    for (const tool of PREMIUM_TOOLS) {
      expect(priceFor(tool)).toBe(PREMIUM_PRICE_USDC);
    }
  });

  it('keeps all transaction builders and submit_transaction free', () => {
    for (const entry of BAZAAR_MANIFEST_ENTRIES) {
      if (entry.name.startsWith('build_') || entry.name === 'submit_transaction') {
        expect(entry.price, `${entry.name} must be free`).toBe('0');
      }
    }
  });

  it('every entry declares route, input schema, output schema, and bazaar extension metadata', () => {
    for (const entry of BAZAAR_MANIFEST_ENTRIES) {
      expect(entry.route, `${entry.name} missing route`).toBe('POST /mcp');
      expect(entry.inputSchema, `${entry.name} missing inputSchema`).toBeTruthy();
      expect(entry.outputSchema, `${entry.name} missing outputSchema`).toBeTruthy();
      expect(entry.extensions?.bazaar?.info?.input?.inputSchema, `${entry.name} missing bazaar inputSchema`).toBeTruthy();
      expect(entry.extensions?.bazaar?.info?.output, `${entry.name} missing bazaar output`).toBeTruthy();
    }
  });
});
