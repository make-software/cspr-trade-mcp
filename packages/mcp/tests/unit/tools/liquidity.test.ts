import { describe, it, expect, vi } from 'vitest';
import { registerLiquidityTools } from '../../../src/tools/liquidity.js';

describe('Liquidity tools', () => {
  it('should register build_add_liquidity and build_remove_liquidity tools', () => {
    const mockServer = { tool: vi.fn() };
    registerLiquidityTools(mockServer as any, {} as any);

    const names = mockServer.tool.mock.calls.map((c: any[]) => c[0]);
    expect(names).toContain('build_add_liquidity');
    expect(names).toContain('build_remove_liquidity');
    expect(names).toHaveLength(2);
  });

  it('build_add_liquidity calls client.buildAddLiquidity with correct args', async () => {
    const mockBundle = {
      summary: 'Add liquidity: 100 CSPR + 50 USDT',
      transactionJson: '{"deploy":{"hash":"abc"}}',
      approvalsRequired: [],
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      buildAddLiquidity: vi.fn().mockResolvedValue(mockBundle),
    } as any;

    registerLiquidityTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'build_add_liquidity');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({
      token_a: 'CSPR',
      token_b: 'USDT',
      amount_a: '100',
      amount_b: '50',
      sender_public_key: '01abc123',
      slippage_bps: 200,
      deadline_minutes: 30,
    });

    expect(mockClient.buildAddLiquidity).toHaveBeenCalledWith({
      tokenA: 'CSPR',
      tokenB: 'USDT',
      amountA: '100',
      amountB: '50',
      senderPublicKey: '01abc123',
      slippageBps: 200,
      deadlineMinutes: 30,
      tokenABalance: undefined,
      tokenBBalance: undefined,
    });
    expect(result.content[0].text).toContain('Add liquidity: 100 CSPR + 50 USDT');
  });

  it('build_add_liquidity includes approval steps when approvalsRequired is non-empty', async () => {
    const mockBundle = {
      summary: 'Add liquidity bundle',
      transactionJson: '{"deploy":{"hash":"main"}}',
      approvalsRequired: [
        {
          summary: 'Approve CSPR',
          transactionJson: '{"deploy":{"hash":"approval"}}',
          estimatedGasCost: '1000000000',
        },
      ],
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      buildAddLiquidity: vi.fn().mockResolvedValue(mockBundle),
    } as any;

    registerLiquidityTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'build_add_liquidity');
    const handler = call![3];
    const result = await handler({
      token_a: 'CSPR',
      token_b: 'USDT',
      amount_a: '100',
      amount_b: '50',
      sender_public_key: '01abc123',
      token_a_balance: '1000000000000',
    });

    expect(result.content[0].text).toContain('APPROVALS REQUIRED');
    expect(result.content[0].text).toContain('Approve CSPR');
  });

  it('build_remove_liquidity calls client.buildRemoveLiquidity with correct args', async () => {
    const mockBundle = {
      summary: 'Remove 50% liquidity from CSPR/USDT',
      transactionJson: '{"deploy":{"hash":"remove"}}',
    };
    const mockServer = { tool: vi.fn() };
    const mockClient = {
      buildRemoveLiquidity: vi.fn().mockResolvedValue(mockBundle),
    } as any;

    registerLiquidityTools(mockServer as any, mockClient);

    const call = mockServer.tool.mock.calls.find((c: any[]) => c[0] === 'build_remove_liquidity');
    expect(call).toBeDefined();
    const handler = call![3];
    const result = await handler({
      pair: 'hash-abc123',
      percentage: 50,
      sender_public_key: '01abc123',
      slippage_bps: 300,
      deadline_minutes: 20,
    });

    expect(mockClient.buildRemoveLiquidity).toHaveBeenCalledWith({
      pairContractPackageHash: 'hash-abc123',
      percentage: 50,
      senderPublicKey: '01abc123',
      slippageBps: 300,
      deadlineMinutes: 20,
    });
    expect(result.content[0].text).toContain('Remove 50% liquidity');
  });
});
