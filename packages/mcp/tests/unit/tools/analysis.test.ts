import { describe, it, expect, vi } from 'vitest';
import { registerAnalysisTools } from '../../../src/tools/analysis.js';

describe('Analysis tools', () => {
  it('should register estimate_price_impact, estimate_slippage, analyze_trade, and optimal_liquidity_amounts tools', () => {
    const mockServer = { tool: vi.fn() };
    registerAnalysisTools(mockServer as any, {} as any);

    const names = mockServer.tool.mock.calls.map((c: any[]) => c[0]);
    expect(names).toContain('estimate_price_impact');
    expect(names).toContain('estimate_slippage');
    expect(names).toContain('analyze_trade');
    expect(names).toContain('optimal_liquidity_amounts');
    expect(names).toHaveLength(4);
  });

  it('estimate_price_impact calls client.estimatePriceImpact and formats result', async () => {
    const mockResult = {
      priceImpactPct: 1.5,
      severity: 'medium',
      spotPrice: 0.05,
      executionPrice: 0.049,
      warning: undefined,
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      estimatePriceImpact: vi.fn().mockResolvedValue(mockResult),
    } as any;

    registerAnalysisTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'estimate_price_impact');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({ token_in: 'CSPR', token_out: 'USDT', amount: '1000' });

    expect(mockClient.estimatePriceImpact).toHaveBeenCalledWith({
      tokenIn: 'CSPR',
      tokenOut: 'USDT',
      amount: '1000',
    });
    expect(result.content[0].text).toContain('1.5%');
    expect(result.content[0].text).toContain('medium');
    expect(result.content[0].text).toContain('CSPR → USDT');
  });

  it('estimate_price_impact appends warning when present', async () => {
    const mockResult = {
      priceImpactPct: 8.0,
      severity: 'high',
      spotPrice: 0.05,
      executionPrice: 0.046,
      warning: 'High price impact — consider splitting trade',
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      estimatePriceImpact: vi.fn().mockResolvedValue(mockResult),
    } as any;

    registerAnalysisTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'estimate_price_impact');
    const handler = call![3];
    const result = await handler({ token_in: 'CSPR', token_out: 'USDT', amount: '100000' });

    expect(result.content[0].text).toContain('⚠️');
    expect(result.content[0].text).toContain('High price impact');
  });

  it('estimate_slippage calls client.estimateSlippage and formats result', async () => {
    const mockResult = {
      expectedOutputFormatted: '49.25',
      minimumOutputFormatted: '47.77',
      maxSlippageBps: 150,
      recommendedSlippageBps: 200,
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      estimateSlippage: vi.fn().mockResolvedValue(mockResult),
    } as any;

    registerAnalysisTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'estimate_slippage');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({
      token_in: 'CSPR',
      token_out: 'USDT',
      amount: '1000',
      slippage_tolerance_bps: 300,
    });

    expect(mockClient.estimateSlippage).toHaveBeenCalledWith({
      tokenIn: 'CSPR',
      tokenOut: 'USDT',
      amount: '1000',
      slippageToleranceBps: 300,
    });
    expect(result.content[0].text).toContain('49.25');
    expect(result.content[0].text).toContain('47.77');
  });

  it('estimate_slippage warns when expected slippage exceeds tolerance', async () => {
    const mockResult = {
      expectedOutputFormatted: '45.0',
      minimumOutputFormatted: '43.65',
      maxSlippageBps: 500,
      recommendedSlippageBps: 600,
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      estimateSlippage: vi.fn().mockResolvedValue(mockResult),
    } as any;

    registerAnalysisTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'estimate_slippage');
    const handler = call![3];
    const result = await handler({
      token_in: 'CSPR',
      token_out: 'USDT',
      amount: '10000',
      slippage_tolerance_bps: 300,
    });

    expect(result.content[0].text).toContain('⚠️');
    expect(result.content[0].text).toContain('transaction may revert');
  });

  it('analyze_trade calls client.analyzeTrade and formats comprehensive result', async () => {
    const mockResult = {
      priceImpact: { priceImpactPct: 0.8, severity: 'low' },
      slippage: {
        maxSlippageBps: 80,
        expectedOutputFormatted: '49.60',
        minimumOutputFormatted: '48.11',
        recommendedSlippageBps: 150,
      },
      recommendation: 'proceed',
      recommendationText: 'Price impact and slippage are within acceptable ranges.',
      warnings: [],
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      analyzeTrade: vi.fn().mockResolvedValue(mockResult),
    } as any;

    registerAnalysisTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'analyze_trade');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({
      token_in: 'CSPR',
      token_out: 'USDT',
      amount: '1000',
      slippage_tolerance_bps: 300,
    });

    expect(mockClient.analyzeTrade).toHaveBeenCalledWith({
      tokenIn: 'CSPR',
      tokenOut: 'USDT',
      amount: '1000',
      slippageToleranceBps: 300,
    });
    expect(result.content[0].text).toContain('PROCEED');
    expect(result.content[0].text).toContain('0.8%');
    expect(result.content[0].text).toContain('49.60');
  });

  it('analyze_trade includes warnings section when warnings are present', async () => {
    const mockResult = {
      priceImpact: { priceImpactPct: 12.0, severity: 'very_high' },
      slippage: {
        maxSlippageBps: 1200,
        expectedOutputFormatted: '44.0',
        minimumOutputFormatted: '38.72',
        recommendedSlippageBps: 1500,
      },
      recommendation: 'caution',
      recommendationText: 'Very high price impact detected.',
      warnings: ['Price impact > 10%', 'Consider splitting trade into smaller amounts'],
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      analyzeTrade: vi.fn().mockResolvedValue(mockResult),
    } as any;

    registerAnalysisTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'analyze_trade');
    const handler = call![3];
    const result = await handler({
      token_in: 'CSPR',
      token_out: 'USDT',
      amount: '500000',
    });

    expect(result.content[0].text).toContain('⚠️ Warnings:');
    expect(result.content[0].text).toContain('Price impact > 10%');
    expect(result.content[0].text).toContain('splitting trade');
  });

  it('optimal_liquidity_amounts calls client.getOptimalLiquidityAmounts and formats result', async () => {
    const mockResult = {
      amountA: '100',
      amountB: '5.2',
      estimatedPoolSharePct: 0.12,
      isNewPool: false,
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      getOptimalLiquidityAmounts: vi.fn().mockResolvedValue(mockResult),
    } as any;

    registerAnalysisTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'optimal_liquidity_amounts');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({ token_a: 'CSPR', token_b: 'USDT', amount_a: '100' });

    expect(mockClient.getOptimalLiquidityAmounts).toHaveBeenCalledWith({
      tokenA: 'CSPR',
      tokenB: 'USDT',
      amountA: '100',
    });
    expect(result.content[0].text).toContain('CSPR / USDT');
    expect(result.content[0].text).toContain('5.2');
    expect(result.content[0].text).toContain('0.12%');
  });

  it('optimal_liquidity_amounts flags new pool creation', async () => {
    const mockResult = {
      amountA: '100',
      amountB: '10',
      estimatedPoolSharePct: 100,
      isNewPool: true,
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      getOptimalLiquidityAmounts: vi.fn().mockResolvedValue(mockResult),
    } as any;

    registerAnalysisTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'optimal_liquidity_amounts');
    const handler = call![3];
    const result = await handler({ token_a: 'CSPR', token_b: 'NEWTOKEN', amount_a: '100' });

    expect(result.content[0].text).toContain('🆕');
    expect(result.content[0].text).toContain('new liquidity pool');
  });
});
