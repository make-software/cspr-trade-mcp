import { describe, it, expect, vi } from 'vitest';
import { registerMarketDataTools } from '../../../src/tools/market-data.js';

describe('Market data tools', () => {
  it('should register get_tokens, get_pairs, get_pair_details, get_quote, get_currencies, get_pair_price_history, get_token_price_history tools', () => {
    const mockServer = { tool: vi.fn() };
    const mockClient = {} as any;

    registerMarketDataTools(mockServer as any, mockClient);

    const registeredToolNames = mockServer.tool.mock.calls.map((call: any[]) => call[0]);
    expect(registeredToolNames).toContain('get_tokens');
    expect(registeredToolNames).toContain('get_pairs');
    expect(registeredToolNames).toContain('get_pair_details');
    expect(registeredToolNames).toContain('get_quote');
    expect(registeredToolNames).toContain('get_currencies');
    expect(registeredToolNames).toContain('get_pair_price_history');
    expect(registeredToolNames).toContain('get_token_price_history');
  });

  it('get_pair_price_history calls client.getPairPriceHistory with correct args', async () => {
    const mockCandles = [
      { timestamp: '2026-04-22T10:00:00.000Z', open: 0.95, high: 0.98, low: 0.93, close: 0.96, volumeToken0: 500, volumeToken1: 475, swapCount: 5 },
    ];
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      getPairPriceHistory: vi.fn().mockResolvedValue(mockCandles),
    } as any;

    registerMarketDataTools(mockServer as any, mockClient);

    // Find and invoke the get_pair_price_history handler
    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'get_pair_price_history');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({ pair: 'hash-abc123', interval: '4h', limit: 10 });

    expect(mockClient.getPairPriceHistory).toHaveBeenCalledWith('hash-abc123', '4h', 10);
    expect(result.content[0].text).toContain('2026-04-22T10:00:00.000Z');
  });

  it('get_token_price_history calls client.getTokenPriceHistory with correct args', async () => {
    const mockResult = {
      pairContractPackageHash: 'hash-abc123',
      candles: [
        { timestamp: '2026-04-22T10:00:00.000Z', open: 0.95, high: 0.95, low: 0.95, close: 0.95, volumeToken0: 100, volumeToken1: 95, swapCount: 1 },
      ],
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      getTokenPriceHistory: vi.fn().mockResolvedValue(mockResult),
    } as any;

    registerMarketDataTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'get_token_price_history');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({ token: 'sCSPR', interval: '1d', limit: 7 });

    expect(mockClient.getTokenPriceHistory).toHaveBeenCalledWith('sCSPR', '1d', 7);
    expect(result.content[0].text).toContain('hash-abc123');
  });
});
