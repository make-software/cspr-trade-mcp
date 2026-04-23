import * as casperSdk from 'casper-js-sdk';
import type { Args as CasperArgs } from 'casper-js-sdk';

const { Args, CLValue, Key } = casperSdk;

export interface ApproveArgsParams {
  spenderPackageHash: string;
  amount: string;
}

export function buildApproveArgs(params: ApproveArgsParams): CasperArgs {
  return Args.fromMap({
    spender: CLValue.newCLKey(Key.newKey(params.spenderPackageHash)),
    amount: CLValue.newCLUInt256(params.amount),
  });
}
