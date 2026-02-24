import casperSdk from 'casper-js-sdk';
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

export function buildAddLiquidityInnerArgs(params: AddLiquidityInnerArgsParams): Args {
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

  return Args.fromMap({
    token_a: CLValue.newCLKey(Key.newKey(params.tokenAHash)),
    token_b: CLValue.newCLKey(Key.newKey(params.tokenBHash)),
    amount_a_desired: CLValue.newCLUInt256(params.amountADesired),
    amount_b_desired: CLValue.newCLUInt256(params.amountBDesired),
    amount_a_min: CLValue.newCLUInt256(params.amountAMin),
    amount_b_min: CLValue.newCLUInt256(params.amountBMin),
    to: CLValue.newCLKey(Key.newKey(params.accountHash)),
    deadline: CLValue.newCLUint64(params.deadline),
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

export function buildRemoveLiquidityInnerArgs(params: RemoveLiquidityInnerArgsParams): Args {
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

  return Args.fromMap({
    token_a: CLValue.newCLKey(Key.newKey(params.tokenAHash)),
    token_b: CLValue.newCLKey(Key.newKey(params.tokenBHash)),
    liquidity: CLValue.newCLUInt256(params.liquidity),
    amount_a_min: CLValue.newCLUInt256(params.amountAMin),
    amount_b_min: CLValue.newCLUInt256(params.amountBMin),
    to: CLValue.newCLKey(Key.newKey(params.accountHash)),
    deadline: CLValue.newCLUint64(params.deadline),
  });
}
