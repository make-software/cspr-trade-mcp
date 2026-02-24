import Big from 'big.js';

export function toRawAmount(humanAmount: string, decimals: number): string {
  const big = new Big(humanAmount);
  const multiplier = new Big(10).pow(decimals);
  return big.times(multiplier).toFixed(0);
}

export function toFormattedAmount(rawAmount: string, decimals: number): string {
  const big = new Big(rawAmount);
  const divisor = new Big(10).pow(decimals);
  const result = big.div(divisor);
  const str = result.toFixed();
  if (str.includes('.')) {
    return str.replace(/\.?0+$/, '') || '0';
  }
  return str;
}

export function calculateMinWithSlippage(rawAmount: string, slippageBps: number): string {
  const amount = new Big(rawAmount);
  const factor = new Big(1).minus(new Big(slippageBps).div(10000));
  return amount.times(factor).toFixed(0, Big.roundDown);
}

export function calculateMaxWithSlippage(rawAmount: string, slippageBps: number): string {
  const amount = new Big(rawAmount);
  const factor = new Big(1).plus(new Big(slippageBps).div(10000));
  return amount.times(factor).toFixed(0, Big.roundUp);
}
