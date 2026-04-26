import { describe, it, expect } from 'vitest';
import {
  validateAmount,
  validateSlippageBps,
  validatePublicKey,
  validateTokensNotEqual,
  ValidationError,
} from '../../../src/tools/validation.js';

describe('validateAmount', () => {
  it('rejects non-numeric strings', () => {
    const result = validateAmount('abc', 'amount');
    expect(result).toEqual({
      valid: false,
      error: 'amount must be a positive number, got: "abc"',
    });
  });

  it('rejects zero', () => {
    const result = validateAmount('0', 'amount');
    expect(result).toEqual({
      valid: false,
      error: 'amount must be a positive number, got: "0"',
    });
  });

  it('rejects negative numbers', () => {
    const result = validateAmount('-5', 'amount');
    expect(result).toEqual({
      valid: false,
      error: 'amount must be a positive number, got: "-5"',
    });
  });

  it('rejects empty string', () => {
    const result = validateAmount('', 'amount');
    expect(result).toEqual({
      valid: false,
      error: 'amount must be a positive number, got: ""',
    });
  });

  it('rejects whitespace-only string', () => {
    const result = validateAmount('  ', 'amount');
    expect(result).toEqual({
      valid: false,
      error: 'amount must be a positive number, got: "  "',
    });
  });

  it('accepts positive integers', () => {
    const result = validateAmount('100', 'amount');
    expect(result).toEqual({ valid: true });
  });

  it('accepts positive decimals', () => {
    const result = validateAmount('0.5', 'amount');
    expect(result).toEqual({ valid: true });
  });

  it('accepts large numbers', () => {
    const result = validateAmount('1000000000', 'amount');
    expect(result).toEqual({ valid: true });
  });

  it('uses custom field name in error', () => {
    const result = validateAmount('abc', 'amount_a');
    expect(result).toEqual({
      valid: false,
      error: 'amount_a must be a positive number, got: "abc"',
    });
  });
});

describe('validateSlippageBps', () => {
  it('rejects negative values', () => {
    const result = validateSlippageBps(-1);
    expect(result).toEqual({
      valid: false,
      error: 'slippage_bps must be between 0 and 10000, got: -1',
    });
  });

  it('rejects values above 10000', () => {
    const result = validateSlippageBps(10001);
    expect(result).toEqual({
      valid: false,
      error: 'slippage_bps must be between 0 and 10000, got: 10001',
    });
  });

  it('accepts 0 (no slippage)', () => {
    const result = validateSlippageBps(0);
    expect(result).toEqual({ valid: true });
  });

  it('accepts 10000 (100%)', () => {
    const result = validateSlippageBps(10000);
    expect(result).toEqual({ valid: true });
  });

  it('accepts typical values', () => {
    expect(validateSlippageBps(300)).toEqual({ valid: true });
    expect(validateSlippageBps(50)).toEqual({ valid: true });
    expect(validateSlippageBps(1000)).toEqual({ valid: true });
  });
});

describe('validatePublicKey', () => {
  it('rejects non-hex characters', () => {
    const result = validatePublicKey('01xyz' + '0'.repeat(59));
    expect(result?.valid).toBe(false);
    expect(result?.error).toContain('sender_public_key must be a 66-character hex string with 01/02 prefix');
  });

  it('rejects too-short keys', () => {
    const result = validatePublicKey('01abcd');
    expect(result?.valid).toBe(false);
    expect(result?.error).toContain('sender_public_key must be a 66-character hex string with 01/02 prefix');
  });

  it('rejects too-long keys', () => {
    const result = validatePublicKey('01' + 'a'.repeat(65));
    expect(result?.valid).toBe(false);
    expect(result?.error).toContain('sender_public_key must be a 66-character hex string with 01/02 prefix');
  });

  it('rejects keys without 01/02 prefix', () => {
    const result = validatePublicKey('03' + 'a'.repeat(64));
    expect(result?.valid).toBe(false);
    expect(result?.error).toContain('sender_public_key must be a 66-character hex string with 01/02 prefix');
  });

  it('accepts valid ed25519 key (01 prefix, 66 chars)', () => {
    const key = '01' + 'a'.repeat(64);
    const result = validatePublicKey(key);
    expect(result).toEqual({ valid: true });
  });

  it('accepts valid secp256k1 key (02 prefix, 66 chars)', () => {
    const key = '02' + 'b'.repeat(64);
    const result = validatePublicKey(key);
    expect(result).toEqual({ valid: true });
  });

  it('accepts uppercase hex', () => {
    const key = '01' + 'A'.repeat(64);
    const result = validatePublicKey(key);
    expect(result).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    const result = validatePublicKey('');
    expect(result?.valid).toBe(false);
  });
});

describe('validateTokensNotEqual', () => {
  it('rejects same token (case-insensitive)', () => {
    const result = validateTokensNotEqual('CSPR', 'cspr');
    expect(result).toEqual({
      valid: false,
      error: 'Cannot swap a token for itself (token_in and token_out are both "CSPR")',
    });
  });

  it('rejects same token (exact match)', () => {
    const result = validateTokensNotEqual('USDT', 'USDT');
    expect(result).toEqual({
      valid: false,
      error: 'Cannot swap a token for itself (token_in and token_out are both "USDT")',
    });
  });

  it('accepts different tokens', () => {
    const result = validateTokensNotEqual('CSPR', 'USDT');
    expect(result).toEqual({ valid: true });
  });

  it('accepts tokens with hash- prefix that differ', () => {
    const result = validateTokensNotEqual('hash-abc123', 'hash-def456');
    expect(result).toEqual({ valid: true });
  });
});

describe('ValidationError', () => {
  it('formats as MCP tool error response', () => {
    const err = new ValidationError('amount must be a positive number, got: "abc"');
    expect(err.toMcpResponse()).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'Validation error: amount must be a positive number, got: "abc"' }],
    });
  });
});
