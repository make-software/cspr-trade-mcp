import { describe, it, expect } from 'vitest';
import { validateAmount, validatePublicKey, validateSlippageBps, validateTokensNotEqual, validationErrorResponse } from '../../../src/tools/validation.js';

describe('Input validation', () => {
  describe('validateAmount', () => {
    it('returns null for valid positive number', () => {
      expect(validateAmount('100', 'amount')).toBeNull();
      expect(validateAmount('0.5', 'amount')).toBeNull();
      expect(validateAmount('1000000', 'amount')).toBeNull();
    });

    it('returns error for non-numeric input', () => {
      expect(validateAmount('abc', 'amount')).toContain('must be a positive number');
      expect(validateAmount('', 'amount')).toContain('must be a positive number');
    });

    it('returns error for zero or negative', () => {
      expect(validateAmount('0', 'amount')).toContain('must be a positive number');
      expect(validateAmount('-5', 'amount')).toContain('must be a positive number');
    });

    it('includes field name in error message', () => {
      expect(validateAmount('bad', 'amount_a')).toContain('amount_a');
    });
  });

  describe('validateSlippageBps', () => {
    it('returns null for valid range 0-10000', () => {
      expect(validateSlippageBps(0)).toBeNull();
      expect(validateSlippageBps(300)).toBeNull();
      expect(validateSlippageBps(10000)).toBeNull();
    });

    it('returns error for out-of-range values', () => {
      expect(validateSlippageBps(-1)).toContain('slippage_bps must be between 0 and 10000');
      expect(validateSlippageBps(10001)).toContain('slippage_bps must be between 0 and 10000');
    });
  });

  describe('validatePublicKey', () => {
    const validEd25519 = '01' + 'a'.repeat(64);
    const validSecp256k1 = '02' + 'b'.repeat(64);

    it('returns null for valid 66-char hex with 01/02 prefix', () => {
      expect(validatePublicKey(validEd25519)).toBeNull();
      expect(validatePublicKey(validSecp256k1)).toBeNull();
    });

    it('returns error for short keys', () => {
      expect(validatePublicKey('01abc123')).toContain('sender_public_key must be a 66-character hex string');
    });

    it('returns error for wrong prefix', () => {
      expect(validatePublicKey('03' + 'a'.repeat(64))).toContain('sender_public_key must be a 66-character hex string');
    });

    it('returns error for non-hex chars', () => {
      expect(validatePublicKey('01' + 'z'.repeat(64))).toContain('sender_public_key must be a 66-character hex string');
    });
  });

  describe('validateTokensNotEqual', () => {
    it('returns null when tokens differ', () => {
      expect(validateTokensNotEqual('CSPR', 'USDT')).toBeNull();
    });

    it('returns error when tokens are the same', () => {
      expect(validateTokensNotEqual('CSPR', 'CSPR')).toContain('Cannot swap a token for itself');
    });

    it('is case-insensitive', () => {
      expect(validateTokensNotEqual('cspr', 'CSPR')).toContain('Cannot swap a token for itself');
    });
  });

  describe('validationErrorResponse', () => {
    it('formats as MCP error response', () => {
      const resp = validationErrorResponse('bad input');
      expect(resp.isError).toBe(true);
      expect(resp.content[0].text).toContain('Validation error: bad input');
    });
  });
});
