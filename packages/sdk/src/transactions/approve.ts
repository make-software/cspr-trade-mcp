import { Args, CLValue, Key } from 'casper-js-sdk';

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
