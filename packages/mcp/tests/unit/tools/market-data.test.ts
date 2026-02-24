import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerMarketDataTools } from '../../../src/tools/market-data.js';

describe('Market data tools', () => {
  it('should register get_tokens, get_pairs, get_pair_details, get_quote, get_currencies tools', () => {
    const mockServer = { tool: vi.fn() };
    const mockClient = {} as any;

    registerMarketDataTools(mockServer as any, mockClient);

    const registeredToolNames = mockServer.tool.mock.calls.map((call: any[]) => call[0]);
    expect(registeredToolNames).toContain('get_tokens');
    expect(registeredToolNames).toContain('get_pairs');
    expect(registeredToolNames).toContain('get_pair_details');
    expect(registeredToolNames).toContain('get_quote');
    expect(registeredToolNames).toContain('get_currencies');
  });
});
