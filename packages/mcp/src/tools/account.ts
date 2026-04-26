import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@make-software/cspr-trade-mcp-sdk';

export function registerAccountTools(server: McpServer, client: CsprTradeClient) {
  server.tool(
    'get_native_cspr_balance',
    'Get the native CSPR balance for a Casper account. Queries the Casper node RPC directly using the account public key. Returns balance in both motes (raw) and CSPR (human-readable). Note: does not include CEP-18 token balances — use get_token_balance for those.',
    {
      account_public_key: z.string().describe('Account public key (hex, with algorithm prefix e.g. "01abc..." for Ed25519 or "02abc..." for secp256k1)'),
    },
    async ({ account_public_key }) => {
      const result = await client.getNativeCsprBalance(account_public_key);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_token_balance',
    'Get CEP-18 fungible token balances for a Casper account. Returns all CEP-18 tokens held, or filters to a specific token if `token` matches a symbol, name, or contract package hash. Native CSPR balance is not included (this endpoint covers CEP-18 tokens only).',
    {
      account_public_key: z.string().describe('Account public key (hex)'),
      token: z.string().optional().describe('Filter by token symbol, name, or contract package hash'),
    },
    async ({ account_public_key, token }) => {
      const balances = await client.getTokenBalance(account_public_key, token);
      return { content: [{ type: 'text' as const, text: JSON.stringify(balances, null, 2) }] };
    },
  );

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
    'get_position_status',
    'Get current position status for liquidity positions. Returns impermanent loss and current token amounts per position. Note: this is not cost-basis PnL — no historical entry price is used.',
    {
      account_public_key: z.string().describe('Account public key (hex)'),
      pair_contract_package_hash: z.string().optional().describe('Filter by specific pair contract package hash'),
    },
    async ({ account_public_key, pair_contract_package_hash }) => {
      const result = await client.getPositionStatus(account_public_key, pair_contract_package_hash);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
