import casperSdk from 'casper-js-sdk';
const { Args, CLTypeKey, CLValue, Key } = casperSdk;
import type { QuoteType } from '../types/index.js';

export function getSwapEntryPoint(
  isFirstTokenNative: boolean,
  isSecondTokenNative: boolean,
  quoteType: QuoteType,
): string {
  if (isFirstTokenNative) {
    return quoteType === 'exact_in' ? 'swap_exact_cspr_for_tokens' : 'swap_cspr_for_exact_tokens';
  }
  if (isSecondTokenNative) {
    return quoteType === 'exact_in' ? 'swap_exact_tokens_for_cspr' : 'swap_tokens_for_exact_cspr';
  }
  return quoteType === 'exact_in' ? 'swap_exact_tokens_for_tokens' : 'swap_tokens_for_exact_tokens';
}

export interface SwapInnerArgsParams {
  isFirstTokenNative: boolean;
  isSecondTokenNative: boolean;
  quoteType: QuoteType;
  path: string[];
  accountHash: string;
  deadline: number;
  amountIn: string;
  amountOut: string;
  amountInMax: string;
  amountOutMin: string;
}

export function buildSwapInnerArgs(params: SwapInnerArgsParams): Args {
  const {
    isFirstTokenNative, isSecondTokenNative, quoteType,
    path, accountHash, deadline,
    amountIn, amountOut, amountInMax, amountOutMin,
  } = params;

  const isBothNotNative = !isFirstTokenNative && !isSecondTokenNative;

  const argsMap: Record<string, CLValue> = {
    path: CLValue.newCLList(
      CLTypeKey,
      path.map(hash => CLValue.newCLKey(Key.newKey(hash))),
    ),
    to: CLValue.newCLKey(Key.newKey(accountHash)),
    deadline: CLValue.newCLUint64(deadline),
  };

  if (isFirstTokenNative && quoteType === 'exact_in') {
    argsMap.amount_out_min = CLValue.newCLUInt256(amountOutMin);
  }
  if (isFirstTokenNative && quoteType === 'exact_out') {
    argsMap.amount_out = CLValue.newCLUInt256(amountOut);
  }
  if ((isSecondTokenNative || isBothNotNative) && quoteType === 'exact_in') {
    argsMap.amount_in = CLValue.newCLUInt256(amountIn);
    argsMap.amount_out_min = CLValue.newCLUInt256(amountOutMin);
  }
  if ((isSecondTokenNative || isBothNotNative) && quoteType === 'exact_out') {
    argsMap.amount_in_max = CLValue.newCLUInt256(amountInMax);
    argsMap.amount_out = CLValue.newCLUInt256(amountOut);
  }

  return Args.fromMap(argsMap);
}

export function getSwapAttachedValue(params: {
  isFirstTokenNative: boolean;
  quoteType: QuoteType;
  amountIn: string;
  amountInMax: string;
}): string {
  if (!params.isFirstTokenNative) return '0';
  return params.quoteType === 'exact_in' ? params.amountIn : params.amountInMax;
}
