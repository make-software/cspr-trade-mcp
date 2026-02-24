import { describe, it, expect } from 'vitest';
import { CsprTradeClient } from '../../src/client.js';

const SHOULD_RUN = !!process.env.CSPR_TRADE_INTEGRATION;

describe.skipIf(!SHOULD_RUN)('SDK Integration Tests (testnet)', () => {
  const client = new CsprTradeClient({ network: 'testnet' });

  it('should fetch tokens from testnet', async () => {
    const tokens = await client.getTokens();
    expect(tokens.length).toBeGreaterThan(0);
    const cspr = tokens.find(t => t.symbol === 'CSPR');
    expect(cspr).toBeDefined();
  });

  it('should fetch tokens with USD pricing', async () => {
    const tokens = await client.getTokens('USD');
    expect(tokens.length).toBeGreaterThan(0);
    const cspr = tokens.find(t => t.symbol === 'CSPR');
    expect(cspr).toBeDefined();
    expect(cspr!.fiatPrice).toBeTypeOf('number');
  });

  it('should fetch pairs from testnet', async () => {
    const result = await client.getPairs({ page: 1, pageSize: 5 });
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('should fetch currencies', async () => {
    const currencies = await client.getCurrencies();
    expect(currencies.length).toBeGreaterThan(0);
    const usd = currencies.find(c => c.code === 'USD');
    expect(usd).toBeDefined();
  });

  it('should resolve tokens by symbol', async () => {
    const token = await client.resolveToken('CSPR');
    expect(token.symbol).toBe('CSPR');
    expect(token.decimals).toBe(9);
  });

  it('should get a swap quote', async () => {
    const tokens = await client.getTokens();
    // Find any non-CSPR token to pair with
    const otherToken = tokens.find(t => t.symbol !== 'CSPR' && t.symbol !== 'WCSPR');
    if (!otherToken) {
      console.warn('No non-CSPR token found on testnet, skipping quote test');
      return;
    }

    const quote = await client.getQuote({
      tokenIn: 'CSPR',
      tokenOut: otherToken.symbol,
      amount: '100',
      type: 'exact_in',
    });

    expect(quote.amountIn).toBeDefined();
    expect(quote.amountOut).toBeDefined();
    expect(quote.tokenInSymbol).toBe('CSPR');
    expect(quote.tokenOutSymbol).toBe(otherToken.symbol);
    expect(quote.pathSymbols.length).toBeGreaterThanOrEqual(2);
  });
});
