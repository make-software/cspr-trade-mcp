import { describe, it, expect } from 'vitest';
import { toRawAmount, toFormattedAmount, calculateMinWithSlippage, calculateMaxWithSlippage } from '../../../src/utils/amounts.js';

describe('Amount conversion', () => {
  it('should convert human amount to raw (CSPR, 9 decimals)', () => {
    expect(toRawAmount('100', 9)).toBe('100000000000');
  });

  it('should convert human amount to raw (USDT, 6 decimals)', () => {
    expect(toRawAmount('50.5', 6)).toBe('50500000');
  });

  it('should convert human amount to raw (1.23456789, 9 decimals)', () => {
    expect(toRawAmount('1.23456789', 9)).toBe('1234567890');
  });

  it('should convert raw to human (CSPR)', () => {
    expect(toFormattedAmount('100000000000', 9)).toBe('100');
  });

  it('should convert raw to human (USDT)', () => {
    expect(toFormattedAmount('50500000', 6)).toBe('50.5');
  });

  it('should handle zero', () => {
    expect(toRawAmount('0', 9)).toBe('0');
    expect(toFormattedAmount('0', 9)).toBe('0');
  });
});

describe('Slippage calculations', () => {
  it('should calculate min amount with 3% slippage', () => {
    expect(calculateMinWithSlippage('100000000000', 300)).toBe('97000000000');
  });

  it('should calculate max amount with 3% slippage', () => {
    expect(calculateMaxWithSlippage('100000000000', 300)).toBe('103000000000');
  });

  it('should round min down and max up', () => {
    expect(calculateMinWithSlippage('333', 300)).toBe('323');
    expect(calculateMaxWithSlippage('333', 300)).toBe('343');
  });
});
