import { describe, it, expect } from 'vitest';
import {
  getSwapEntryPoint,
  buildSwapInnerArgs,
} from '../../../src/transactions/swap.js';

describe('Swap transaction builder', () => {
  describe('getSwapEntryPoint', () => {
    it('should return swap_exact_cspr_for_tokens for CSPR->Token exact_in', () => {
      expect(getSwapEntryPoint(true, false, 'exact_in')).toBe('swap_exact_cspr_for_tokens');
    });

    it('should return swap_cspr_for_exact_tokens for CSPR->Token exact_out', () => {
      expect(getSwapEntryPoint(true, false, 'exact_out')).toBe('swap_cspr_for_exact_tokens');
    });

    it('should return swap_exact_tokens_for_cspr for Token->CSPR exact_in', () => {
      expect(getSwapEntryPoint(false, true, 'exact_in')).toBe('swap_exact_tokens_for_cspr');
    });

    it('should return swap_tokens_for_exact_cspr for Token->CSPR exact_out', () => {
      expect(getSwapEntryPoint(false, true, 'exact_out')).toBe('swap_tokens_for_exact_cspr');
    });

    it('should return swap_exact_tokens_for_tokens for Token->Token exact_in', () => {
      expect(getSwapEntryPoint(false, false, 'exact_in')).toBe('swap_exact_tokens_for_tokens');
    });

    it('should return swap_tokens_for_exact_tokens for Token->Token exact_out', () => {
      expect(getSwapEntryPoint(false, false, 'exact_out')).toBe('swap_tokens_for_exact_tokens');
    });
  });

  describe('buildSwapInnerArgs', () => {
    const ACCOUNT_HASH = 'account-hash-0000000000000000000000000000000000000000000000000000000000000000';
    const WCSPR_HASH = 'hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e';
    const USDT_HASH = 'hash-1111111111111111111111111111111111111111111111111111111111111111';
    const TOKEN_A_HASH = 'hash-2222222222222222222222222222222222222222222222222222222222222222';
    const TOKEN_B_HASH = 'hash-3333333333333333333333333333333333333333333333333333333333333333';

    it('should build inner args for CSPR->Token exact_in', () => {
      const args = buildSwapInnerArgs({
        isFirstTokenNative: true,
        isSecondTokenNative: false,
        quoteType: 'exact_in',
        path: [WCSPR_HASH, USDT_HASH],
        accountHash: ACCOUNT_HASH,
        deadline: Date.now() + 20 * 60 * 1000,
        amountIn: '100000000000',
        amountOut: '50000000',
        amountInMax: '103000000000',
        amountOutMin: '48500000',
      });

      const bytes = args.toBytes();
      expect(bytes.length).toBeGreaterThan(0);
    });

    it('should build inner args for Token->Token exact_in', () => {
      const args = buildSwapInnerArgs({
        isFirstTokenNative: false,
        isSecondTokenNative: false,
        quoteType: 'exact_in',
        path: [TOKEN_A_HASH, TOKEN_B_HASH],
        accountHash: ACCOUNT_HASH,
        deadline: Date.now() + 20 * 60 * 1000,
        amountIn: '1000000',
        amountOut: '2000000',
        amountInMax: '1030000',
        amountOutMin: '1940000',
      });

      const bytes = args.toBytes();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });
});
