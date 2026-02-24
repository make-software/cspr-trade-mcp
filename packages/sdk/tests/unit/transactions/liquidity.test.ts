import { describe, it, expect } from 'vitest';
import { buildAddLiquidityInnerArgs, buildRemoveLiquidityInnerArgs } from '../../../src/transactions/liquidity.js';

const ACCOUNT_HASH = 'account-hash-0000000000000000000000000000000000000000000000000000000000000000';
const DEADLINE = Date.now() + 20 * 60 * 1000;
const TOKEN_A_HASH = 'hash-1111111111111111111111111111111111111111111111111111111111111111';
const TOKEN_B_HASH = 'hash-2222222222222222222222222222222222222222222222222222222222222222';
const USDT_HASH = 'hash-3333333333333333333333333333333333333333333333333333333333333333';

describe('Liquidity transaction builders', () => {
  describe('buildAddLiquidityInnerArgs', () => {
    it('should build args for token-token add_liquidity', () => {
      const args = buildAddLiquidityInnerArgs({
        isCSPRPair: false,
        tokenAHash: TOKEN_A_HASH,
        tokenBHash: TOKEN_B_HASH,
        amountADesired: '1000000',
        amountBDesired: '2000000',
        amountAMin: '970000',
        amountBMin: '1940000',
        accountHash: ACCOUNT_HASH,
        deadline: DEADLINE,
      });
      const bytes = args.toBytes();
      expect(bytes.length).toBeGreaterThan(0);
    });

    it('should build args for CSPR pair add_liquidity_cspr', () => {
      const args = buildAddLiquidityInnerArgs({
        isCSPRPair: true,
        tokenHash: USDT_HASH,
        amountTokenDesired: '50000000',
        amountTokenMin: '48500000',
        amountCSPRMin: '97000000000',
        accountHash: ACCOUNT_HASH,
        deadline: DEADLINE,
      });
      const bytes = args.toBytes();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe('buildRemoveLiquidityInnerArgs', () => {
    it('should build args for token-token remove_liquidity', () => {
      const args = buildRemoveLiquidityInnerArgs({
        isCSPRPair: false,
        tokenAHash: TOKEN_A_HASH,
        tokenBHash: TOKEN_B_HASH,
        liquidity: '500000',
        amountAMin: '485000',
        amountBMin: '970000',
        accountHash: ACCOUNT_HASH,
        deadline: DEADLINE,
      });
      const bytes = args.toBytes();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });
});
