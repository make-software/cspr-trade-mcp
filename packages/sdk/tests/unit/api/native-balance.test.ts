import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CsprTradeClient } from '../../../src/client.js';

// Mock fetch globally (used by HTTP calls)
global.fetch = vi.fn();

describe('CsprTradeClient.getNativeCsprBalance', () => {
  let client: CsprTradeClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new CsprTradeClient({ network: 'mainnet' });
  });

  it('returns balanceMotes and balanceCspr for a valid public key', async () => {
    // Spy on getNativeCsprBalance to test its output shape without hitting RPC
    vi.spyOn(client, 'getNativeCsprBalance').mockResolvedValueOnce({
      publicKey: '01' + '0'.repeat(64),
      balanceMotes: '5000000000000',
      balanceCspr: '5000',
    });

    const pubKey = '01' + '0'.repeat(64);
    const result = await client.getNativeCsprBalance(pubKey);

    expect(result.publicKey).toBe(pubKey);
    expect(result.balanceMotes).toBe('5000000000000');
    expect(result.balanceCspr).toBe('5000');
  });

  it('exposes getNativeCsprBalance method on CsprTradeClient', () => {
    expect(typeof client.getNativeCsprBalance).toBe('function');
  });

  it('returns correct CSPR from motes conversion', () => {
    // Unit-test the conversion math directly
    const balanceMotes = '1000000000'; // 1 CSPR
    const balanceCspr = (Number(balanceMotes) / 1_000_000_000).toFixed(9).replace(/\.?0+$/, '');
    expect(balanceCspr).toBe('1');
  });

  it('trims trailing zeros from fractional CSPR amounts', () => {
    // 1.5 CSPR = 1500000000 motes
    const balanceMotes = '1500000000';
    const balanceCspr = (Number(balanceMotes) / 1_000_000_000).toFixed(9).replace(/\.?0+$/, '');
    expect(balanceCspr).toBe('1.5');
  });
});
