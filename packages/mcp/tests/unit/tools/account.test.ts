import { describe, it, expect, vi } from 'vitest';
import { registerAccountTools } from '../../../src/tools/account.js';

describe('Account tools', () => {
  it('should register all account tools including portfolio, position status, and token balance', () => {
    const mockServer = { tool: vi.fn() };
    registerAccountTools(mockServer as any, {} as any);

    const names = mockServer.tool.mock.calls.map((c: any[]) => c[0]);
    expect(names).toContain('get_token_balance');
    expect(names).toContain('get_liquidity_positions');
    expect(names).toContain('get_impermanent_loss');
    expect(names).toContain('get_swap_history');
    expect(names).toContain('get_portfolio_value');
    expect(names).toContain('get_position_status');
    expect(names).toContain('get_native_cspr_balance');
    expect(names).toHaveLength(7);
  });

  it('get_token_balance calls client.getTokenBalance and returns JSON', async () => {
    const mockBalances = [{ symbol: 'USDT', amount: '100', formattedAmount: '100.00' }];
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      getTokenBalance: vi.fn().mockResolvedValue(mockBalances),
    } as any;

    registerAccountTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'get_token_balance');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({ account_public_key: '01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', token: 'USDT' });

    expect(mockClient.getTokenBalance).toHaveBeenCalledWith('01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'USDT');
    expect(result.content[0].text).toContain('USDT');
  });

  it('get_swap_history calls client.getSwapHistory and returns JSON', async () => {
    const mockHistory = { data: [{ hash: 'abc', amountIn: '100', amountOut: '50' }], total: 1 };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      getSwapHistory: vi.fn().mockResolvedValue(mockHistory),
    } as any;

    registerAccountTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'get_swap_history');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({
      public_key: '01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      pair: 'hash-pair123',
      page: 1,
      page_size: 10,
    });

    expect(mockClient.getSwapHistory).toHaveBeenCalledWith({
      publicKey: '01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      pairContractPackageHash: 'hash-pair123',
      page: 1,
      pageSize: 10,
    });
    expect(result.content[0].text).toContain('"hash": "abc"');
  });

  it('get_liquidity_positions calls client.getLiquidityPositions and returns JSON', async () => {
    const mockPositions = [{ pair: 'CSPR/USDT', lpTokens: '1000', valueUsd: '52.50' }];
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      getLiquidityPositions: vi.fn().mockResolvedValue(mockPositions),
    } as any;

    registerAccountTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'get_liquidity_positions');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({ account_public_key: '01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', currency: 'USD' });

    expect(mockClient.getLiquidityPositions).toHaveBeenCalledWith('01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'USD');
    expect(result.content[0].text).toContain('CSPR/USDT');
  });

  it('get_portfolio_value calls client.getPortfolioValue and returns JSON', async () => {
    const mockValue = { totalCspr: '2500', totalUsd: '125.00', positions: [] };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      getPortfolioValue: vi.fn().mockResolvedValue(mockValue),
    } as any;

    registerAccountTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'get_portfolio_value');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({ account_public_key: '01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', currency: 'USD' });

    expect(mockClient.getPortfolioValue).toHaveBeenCalledWith('01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'USD');
    expect(result.content[0].text).toContain('125.00');
  });

  it('get_impermanent_loss calls client.getImpermanentLoss with correct args', async () => {
    const mockIL = { ilPct: 2.3, token0Loss: '5.0', token1Loss: '0.25' };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      getImpermanentLoss: vi.fn().mockResolvedValue(mockIL),
    } as any;

    registerAccountTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'get_impermanent_loss');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({ account_public_key: '01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', pair: 'hash-pair456' });

    expect(mockClient.getImpermanentLoss).toHaveBeenCalledWith('01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hash-pair456');
    expect(result.content[0].text).toContain('2.3');
  });

  it('get_position_status calls client.getPositionStatus with correct args', async () => {
    const mockStatus = [{ pair: 'CSPR/USDT', ilPct: 1.2, currentToken0: '105.0', currentToken1: '5.15' }];
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      getPositionStatus: vi.fn().mockResolvedValue(mockStatus),
    } as any;

    registerAccountTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'get_position_status');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({
      account_public_key: '01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      pair_contract_package_hash: 'hash-pair789',
    });

    expect(mockClient.getPositionStatus).toHaveBeenCalledWith('01aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hash-pair789');
    expect(result.content[0].text).toContain('CSPR/USDT');
  });
});
