import { describe, it, expect, vi } from 'vitest';
import { registerTradingTools } from '../../../src/tools/trading.js';

describe('Trading tools', () => {
  it('should register build_swap, build_approve_token, submit_transaction', () => {
    const mockServer = { tool: vi.fn() };
    registerTradingTools(mockServer as any, {} as any);

    const names = mockServer.tool.mock.calls.map((c: any[]) => c[0]);
    expect(names).toContain('build_swap');
    expect(names).toContain('build_approve_token');
    expect(names).toContain('submit_transaction');
  });
});
