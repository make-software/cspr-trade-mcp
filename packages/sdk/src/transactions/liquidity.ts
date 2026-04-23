import * as casperSdk from 'casper-js-sdk';
import type { Args as CasperArgs } from 'casper-js-sdk';

const { Args, CLValue, Key } = casperSdk;

export type AddLiquidityInnerArgsParams =
  | {
      isCSPRPair: false;
      tokenAHash: string;
      tokenBHash: string;
      amountADesired: string;
      amountBDesired: string;
      amountAMin: string;
      amountBMin: string;
      accountHash: string;
      deadline: number;
    }
  | {
      isCSPRPair: true;
      tokenHash: string;
      amountTokenDesired: string;
      amountTokenMin: string;
      amountCSPRMin: string;
      accountHash: string;
      deadline: number;
    };

export function buildAddLiquidityInnerArgs(params: AddLiquidityInnerArgsParams): CasperArgs {
  if (params.isCSPRPair) {
    return Args.fromMap({
      token: CLValue.newCLKey(Key.newKey(params.tokenHash)),
      amount_token_desired: CLValue.newCLUInt256(params.amountTokenDesired),
      amount_token_min: CLValue.newCLUInt256(params.amountTokenMin),
      amount_cspr_min: CLValue.newCLUInt256(params.amountCSPRMin),
      to: CLValue.newCLKey(Key.newKey(params.accountHash)),
      deadline: CLValue.newCLUint64(params.deadline),
    });
  }

  const tokenPairParams = params;
  return Args.fromMap({
    token_a: CLValue.newCLKey(Key.newKey(tokenPairParams.tokenAHash)),
    token_b: CLValue.newCLKey(Key.newKey(tokenPairParams.tokenBHash)),
    amount_a_desired: CLValue.newCLUInt256(tokenPairParams.amountADesired),
    amount_b_desired: CLValue.newCLUInt256(tokenPairParams.amountBDesired),
    amount_a_min: CLValue.newCLUInt256(tokenPairParams.amountAMin),
    amount_b_min: CLValue.newCLUInt256(tokenPairParams.amountBMin),
    to: CLValue.newCLKey(Key.newKey(tokenPairParams.accountHash)),
    deadline: CLValue.newCLUint64(tokenPairParams.deadline),
  });
}

export type RemoveLiquidityInnerArgsParams =
  | {
      isCSPRPair: false;
      tokenAHash: string;
      tokenBHash: string;
      liquidity: string;
      amountAMin: string;
      amountBMin: string;
      accountHash: string;
      deadline: number;
    }
  | {
      isCSPRPair: true;
      tokenHash: string;
      liquidity: string;
      amountTokenMin: string;
      amountCSPRMin: string;
      accountHash: string;
      deadline: number;
    };

export function buildRemoveLiquidityInnerArgs(params: RemoveLiquidityInnerArgsParams): CasperArgs {
  if (params.isCSPRPair) {
    return Args.fromMap({
      token: CLValue.newCLKey(Key.newKey(params.tokenHash)),
      liquidity: CLValue.newCLUInt256(params.liquidity),
      amount_token_min: CLValue.newCLUInt256(params.amountTokenMin),
      amount_cspr_min: CLValue.newCLUInt256(params.amountCSPRMin),
      to: CLValue.newCLKey(Key.newKey(params.accountHash)),
      deadline: CLValue.newCLUint64(params.deadline),
    });
  }

  const tokenPairParams = params;
  return Args.fromMap({
    token_a: CLValue.newCLKey(Key.newKey(tokenPairParams.tokenAHash)),
    token_b: CLValue.newCLKey(Key.newKey(tokenPairParams.tokenBHash)),
    liquidity: CLValue.newCLUInt256(tokenPairParams.liquidity),
    amount_a_min: CLValue.newCLUInt256(tokenPairParams.amountAMin),
    amount_b_min: CLValue.newCLUInt256(tokenPairParams.amountBMin),
    to: CLValue.newCLKey(Key.newKey(tokenPairParams.accountHash)),
    deadline: CLValue.newCLUint64(tokenPairParams.deadline),
  });
}
