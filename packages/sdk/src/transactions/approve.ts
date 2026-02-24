import casperSdk from 'casper-js-sdk';
const { Args, CLValue, Key } = casperSdk;

export interface ApproveArgsParams {
  spenderPackageHash: string;
  amount: string;
}

export function buildApproveArgs(params: ApproveArgsParams): Args {
  return Args.fromMap({
    spender: CLValue.newCLKey(Key.newKey(params.spenderPackageHash)),
    amount: CLValue.newCLUInt256(params.amount),
  });
}
