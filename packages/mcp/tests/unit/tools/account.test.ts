import { describe, it, expect, vi } from 'vitest';
import { registerAccountTools } from '../../../src/tools/account.js';

describe('Account tools', () => {
  it('should register get_liquidity_positions, get_impermanent_loss, get_swap_history', () => {
    const mockServer = { tool: vi.fn() };
    registerAccountTools(mockServer as any, {} as any);

    const names = mockServer.tool.mock.calls.map((c: any[]) => c[0]);
    expect(names).toContain('get_liquidity_positions');
    expect(names).toContain('get_impermanent_loss');
    expect(names).toContain('get_swap_history');
  });
});
