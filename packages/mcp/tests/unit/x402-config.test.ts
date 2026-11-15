import { afterEach, describe, expect, it } from 'vitest';
import { CDP_FACILITATOR_URL, resolveX402Config } from '../../src/x402-config.js';

const ENV_KEYS = [
  'CSPR_TRADE_X402_ENABLED',
  'CSPR_TRADE_X402_PAYTO',
  'CSPR_TRADE_CDP_FACILITATOR_URL',
];

describe('x402 config', () => {
  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it('defaults to disabled when CSPR_TRADE_X402_ENABLED is unset', () => {
    const config = resolveX402Config({});

    expect(config).toEqual({
      enabled: false,
      payTo: null,
      facilitatorUrl: CDP_FACILITATOR_URL,
    });
  });

  it('is disabled for explicit falsy values', () => {
    for (const value of ['false', '0', '']) {
      const config = resolveX402Config({ CSPR_TRADE_X402_ENABLED: value });

      expect(config.enabled).toBe(false);
      expect(config.payTo).toBeNull();
    }
  });

  it('throws at startup when enabled without a payTo address', () => {
    expect(() => resolveX402Config({ CSPR_TRADE_X402_ENABLED: 'true' }))
      .toThrow(/CSPR_TRADE_X402_PAYTO/);
  });

  it('throws when payTo is not a valid EVM address', () => {
    expect(() => resolveX402Config({
      CSPR_TRADE_X402_ENABLED: 'true',
      CSPR_TRADE_X402_PAYTO: 'not-an-address',
    })).toThrow(/invalid/i);
  });

  it('returns enabled config with valid payTo and facilitator override', () => {
    const config = resolveX402Config({
      CSPR_TRADE_X402_ENABLED: '1',
      CSPR_TRADE_X402_PAYTO: '0x1111111111111111111111111111111111111111',
      CSPR_TRADE_CDP_FACILITATOR_URL: 'https://facilitator.example/x402',
    });

    expect(config).toEqual({
      enabled: true,
      payTo: '0x1111111111111111111111111111111111111111',
      facilitatorUrl: 'https://facilitator.example/x402',
    });
  });
});
