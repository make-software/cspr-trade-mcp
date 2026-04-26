import { describe, it, expect, vi } from 'vitest';
import { registerTradingTools } from '../../../src/tools/trading.js';
import { registerLiquidityTools } from '../../../src/tools/liquidity.js';
import { registerMarketDataTools } from '../../../src/tools/market-data.js';
import { registerAccountTools } from '../../../src/tools/account.js';

// — Helper: extract tool handler from mock server
function getToolHandler(toolName: string, registerFn: (server: any, client: any) => void) {
  const mockServer = { tool: vi.fn() };
  const mockClient = {} as any;
  registerFn(mockServer, mockClient);
  const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === toolName);
  if (!call) throw new Error(`Tool ${toolName} not registered`);
  // handler is the last argument (after name, description, schema)
  return call[call.length - 1] as (args: any) => Promise<any>;
}

describe('build_swap validation', () => {
  const handler = getToolHandler('build_swap', registerTradingTools);

  it('rejects non-numeric amount', async () => {
    const result = await handler({
      token_in: 'CSPR',
      token_out: 'USDT',
      amount: 'abc',
      type: 'exact_in',
      sender_public_key: '01' + 'a'.repeat(64),
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('amount must be a positive number, got: "abc"');
  });

  it('rejects same token swap', async () => {
    const result = await handler({
      token_in: 'CSPR',
      token_out: 'CSPR',
      amount: '100',
      type: 'exact_in',
      sender_public_key: '01' + 'a'.repeat(64),
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Cannot swap a token for itself');
  });

  it('rejects invalid public key', async () => {
    const result = await handler({
      token_in: 'CSPR',
      token_out: 'USDT',
      amount: '100',
      type: 'exact_in',
      sender_public_key: 'not-a-valid-key',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sender_public_key must be a 66-character hex string');
  });

  it('rejects invalid slippage_bps', async () => {
    const result = await handler({
      token_in: 'CSPR',
      token_out: 'USDT',
      amount: '100',
      type: 'exact_in',
      sender_public_key: '01' + 'a'.repeat(64),
      slippage_bps: -1,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('slippage_bps must be between 0 and 10000, got: -1');
  });
});

describe('build_approve_token validation', () => {
  const handler = getToolHandler('build_approve_token', registerTradingTools);

  it('rejects non-numeric amount', async () => {
    const result = await handler({
      token: 'hash-abc',
      amount: 'xyz',
      sender_public_key: '01' + 'a'.repeat(64),
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('amount must be a positive number');
  });

  it('rejects invalid public key', async () => {
    const result = await handler({
      token: 'hash-abc',
      amount: '1000',
      sender_public_key: 'bad',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sender_public_key');
  });
});

describe('build_add_liquidity validation', () => {
  const handler = getToolHandler('build_add_liquidity', registerLiquidityTools);

  it('rejects non-numeric amount_a', async () => {
    const result = await handler({
      token_a: 'CSPR',
      token_b: 'USDT',
      amount_a: 'bad',
      amount_b: '100',
      sender_public_key: '01' + 'a'.repeat(64),
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('amount_a must be a positive number');
  });

  it('rejects non-numeric amount_b', async () => {
    const result = await handler({
      token_a: 'CSPR',
      token_b: 'USDT',
      amount_a: '100',
      amount_b: '',
      sender_public_key: '01' + 'a'.repeat(64),
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('amount_b must be a positive number');
  });

  it('rejects invalid slippage', async () => {
    const result = await handler({
      token_a: 'CSPR',
      token_b: 'USDT',
      amount_a: '100',
      amount_b: '200',
      sender_public_key: '01' + 'a'.repeat(64),
      slippage_bps: 99999,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('slippage_bps must be between 0 and 10000');
  });
});

describe('build_remove_liquidity validation', () => {
  const handler = getToolHandler('build_remove_liquidity', registerLiquidityTools);

  it('rejects invalid public key', async () => {
    const result = await handler({
      pair: 'hash-abc',
      percentage: 50,
      sender_public_key: 'xyz',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sender_public_key');
  });
});

describe('get_quote validation', () => {
  const handler = getToolHandler('get_quote', registerMarketDataTools);

  it('rejects non-numeric amount', async () => {
    const result = await handler({
      token_in: 'CSPR',
      token_out: 'USDT',
      amount: 'not-a-number',
      type: 'exact_in',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('amount must be a positive number');
  });

  it('rejects same-token quote', async () => {
    const result = await handler({
      token_in: 'USDT',
      token_out: 'usdt',
      amount: '100',
      type: 'exact_in',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Cannot swap a token for itself');
  });
});

describe('get_liquidity_positions validation', () => {
  const handler = getToolHandler('get_liquidity_positions', registerAccountTools);

  it('rejects invalid public key', async () => {
    const result = await handler({
      account_public_key: 'invalid',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sender_public_key must be a 66-character hex string');
  });
});

describe('get_impermanent_loss validation', () => {
  const handler = getToolHandler('get_impermanent_loss', registerAccountTools);

  it('rejects invalid public key', async () => {
    const result = await handler({
      account_public_key: '03' + 'a'.repeat(64),
      pair: 'hash-abc',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sender_public_key');
  });
});

describe('get_swap_history validation', () => {
  const handler = getToolHandler('get_swap_history', registerAccountTools);

  it('rejects invalid public_key when provided', async () => {
    const result = await handler({
      public_key: 'short',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sender_public_key');
  });

  it('does not validate when public_key is omitted', async () => {
    const mockClient = {
      getSwapHistory: vi.fn().mockResolvedValue({ swaps: [] }),
    };
    const mockServer = { tool: vi.fn() };
    registerAccountTools(mockServer as any, mockClient as any);
    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'get_swap_history');
    const h = call![call!.length - 1] as (args: any) => Promise<any>;
    const result = await h({});
    expect(result.isError).toBeUndefined();
    expect(mockClient.getSwapHistory).toHaveBeenCalled();
  });
});
