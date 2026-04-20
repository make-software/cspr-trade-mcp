import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@make-software/cspr-trade-mcp-sdk';

export function registerAccountTools(server: McpServer, client: CsprTradeClient) {
  server.tool(
    'get_liquidity_positions',
    'Get liquidity positions for an account',
    {
      account_public_key: z.string().describe('Account public key (hex)'),
      currency: z.string().optional().describe('Fiat currency code'),
    },
    async ({ account_public_key, currency }) => {
      const positions = await client.getLiquidityPositions(account_public_key, currency);
      return { content: [{ type: 'text' as const, text: JSON.stringify(positions, null, 2) }] };
    },
  );

  server.tool(
    'get_impermanent_loss',
    'Calculate impermanent loss for a liquidity position',
    {
      account_public_key: z.string().describe('Account public key (hex)'),
      pair: z.string().describe('Pair contract package hash'),
    },
    async ({ account_public_key, pair }) => {
      const il = await client.getImpermanentLoss(account_public_key, pair);
      return { content: [{ type: 'text' as const, text: JSON.stringify(il, null, 2) }] };
    },
  );

  server.tool(
    'get_swap_history',
    'Get swap transaction history',
    {
      public_key: z.string().optional().describe('Filter by sender public key (hex)'),
      pair: z.string().optional().describe('Filter by pair contract package hash'),
      page: z.number().optional(),
      page_size: z.number().optional(),
    },
    async (args) => {
      const result = await client.getSwapHistory({
        publicKey: args.public_key,
        pairContractPackageHash: args.pair,
        page: args.page,
        pageSize: args.page_size,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_portfolio_value',
    'Get total portfolio value across all liquidity positions for an account. Returns estimated CSPR and USD values.',
    {
      account_public_key: z.string().describe('Account public key (hex)'),
      currency: z.string().optional().describe('Fiat currency code (e.g. USD)'),
    },
    async ({ account_public_key, currency }) => {
      const result = await client.getPortfolioValue(account_public_key, currency);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_pnl',
    'Get unrealized PnL for liquidity positions. Includes impermanent loss and current token amounts.',
    {
      account_public_key: z.string().describe('Account public key (hex)'),
      pair_contract_package_hash: z.string().optional().describe('Filter by specific pair contract package hash'),
    },
    async ({ account_public_key, pair_contract_package_hash }) => {
      const result = await client.getUnrealizedPnL(account_public_key, pair_contract_package_hash);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
