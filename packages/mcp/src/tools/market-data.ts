import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@make-software/cspr-trade-mcp-sdk';
import {
  validateAmount,
  validateTokensNotEqual,
  firstFailure,
  validationErrorResponse,
} from './validation.js';

export function registerMarketDataTools(server: McpServer, client: CsprTradeClient) {
  server.tool(
    'get_tokens',
    'List all tradable tokens on CSPR.trade with optional fiat pricing',
    { currency: z.string().optional().describe('Fiat currency code (e.g., "USD", "EUR"). Omit for no fiat prices.') },
    async ({ currency }) => {
      const tokens = await client.getTokens(currency);
      return { content: [{ type: 'text' as const, text: JSON.stringify(tokens, null, 2) }] };
    },
  );

  server.tool(
    'get_pairs',
    'List trading pairs on CSPR.trade with reserves and pricing data',
    {
      page: z.number().optional().describe('Page number (default 1)'),
      page_size: z.number().optional().describe('Items per page (default 10, max 250)'),
      order_by: z.enum(['timestamp', 'reserve0', 'reserve1']).optional(),
      order_direction: z.enum(['asc', 'desc']).optional(),
      currency: z.string().optional().describe('Fiat currency code for pricing'),
    },
    async (args) => {
      const result = await client.getPairs({
        page: args.page,
        pageSize: args.page_size,
        orderBy: args.order_by,
        orderDirection: args.order_direction,
        currency: args.currency,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_pair_details',
    'Get detailed information about a specific trading pair',
    {
      pair: z.string().describe('Pair contract package hash (e.g., "hash-abc123...")'),
      currency: z.string().optional().describe('Fiat currency code'),
    },
    async ({ pair, currency }) => {
      const result = await client.getPairDetails(pair, currency);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_quote',
    'Get a swap quote for trading between two tokens. Returns amounts, price impact, and routing path.',
    {
      token_in: z.string().describe('Input token: symbol (e.g., "CSPR"), name, or contract hash'),
      token_out: z.string().describe('Output token: symbol (e.g., "USDT"), name, or contract hash'),
      amount: z.string().describe('Human-readable amount (e.g., "100" for 100 CSPR)'),
      type: z.enum(['exact_in', 'exact_out']).describe('"exact_in" = specify input amount, "exact_out" = specify desired output amount'),
    },
    async ({ token_in, token_out, amount, type }) => {
      // — Input Validation
      const failure = firstFailure(
        validateAmount(amount, 'amount'),
        validateTokensNotEqual(token_in, token_out),
      );
      if (failure && !failure.valid) {
        return validationErrorResponse(failure.error);
      }

      const quote = await client.getQuote({ tokenIn: token_in, tokenOut: token_out, amount, type });
      return { content: [{ type: 'text' as const, text: JSON.stringify(quote, null, 2) }] };
    },
  );

  server.tool(
    'get_currencies',
    'List supported fiat currencies for price display',
    {},
    async () => {
      const currencies = await client.getCurrencies();
      return { content: [{ type: 'text' as const, text: JSON.stringify(currencies, null, 2) }] };
    },
  );
}
