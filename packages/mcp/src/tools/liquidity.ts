import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@cspr-trade/sdk';

export function registerLiquidityTools(server: McpServer, client: CsprTradeClient) {
  server.tool(
    'build_add_liquidity',
    'Build an unsigned add-liquidity transaction for a token pair',
    {
      token_a: z.string().describe('First token: symbol, name, or hash'),
      token_b: z.string().describe('Second token: symbol, name, or hash'),
      amount_a: z.string().describe('Human-readable amount of first token'),
      amount_b: z.string().describe('Human-readable amount of second token'),
      slippage_bps: z.number().optional().describe('Slippage in basis points (default 300)'),
      deadline_minutes: z.number().optional().describe('Deadline in minutes (default 20)'),
      sender_public_key: z.string().describe('Sender hex public key'),
    },
    async (args) => {
      const bundle = await client.buildAddLiquidity({
        tokenA: args.token_a,
        tokenB: args.token_b,
        amountA: args.amount_a,
        amountB: args.amount_b,
        slippageBps: args.slippage_bps,
        deadlineMinutes: args.deadline_minutes,
        senderPublicKey: args.sender_public_key,
      });
      return { content: [{ type: 'text' as const, text: bundle.summary + '\n\n' + bundle.deployJson }] };
    },
  );

  server.tool(
    'build_remove_liquidity',
    'Build an unsigned remove-liquidity transaction',
    {
      pair: z.string().describe('Pair contract package hash'),
      percentage: z.number().min(1).max(100).describe('Percentage of liquidity to remove (1-100)'),
      slippage_bps: z.number().optional().describe('Slippage in basis points (default 300)'),
      deadline_minutes: z.number().optional().describe('Deadline in minutes (default 20)'),
      sender_public_key: z.string().describe('Sender hex public key'),
    },
    async (args) => {
      const bundle = await client.buildRemoveLiquidity({
        pairContractPackageHash: args.pair,
        percentage: args.percentage,
        slippageBps: args.slippage_bps,
        deadlineMinutes: args.deadline_minutes,
        senderPublicKey: args.sender_public_key,
      });
      return { content: [{ type: 'text' as const, text: bundle.summary + '\n\n' + bundle.deployJson }] };
    },
  );
}
