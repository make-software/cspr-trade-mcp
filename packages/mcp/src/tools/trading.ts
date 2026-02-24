import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@cspr-trade/sdk';

export function registerTradingTools(server: McpServer, client: CsprTradeClient) {
  server.tool(
    'build_swap',
    'Build an unsigned swap transaction. Returns the deploy JSON for external signing, plus a human-readable summary.',
    {
      token_in: z.string().describe('Input token: symbol (e.g., "CSPR"), name, or contract hash'),
      token_out: z.string().describe('Output token: symbol (e.g., "USDT"), name, or contract hash'),
      amount: z.string().describe('Human-readable amount (e.g., "100")'),
      type: z.enum(['exact_in', 'exact_out']).describe('"exact_in" or "exact_out"'),
      slippage_bps: z.number().optional().describe('Slippage tolerance in basis points (default 300 = 3%)'),
      deadline_minutes: z.number().optional().describe('Transaction deadline in minutes (default 20)'),
      sender_public_key: z.string().describe('Sender hex public key (e.g., "01abc...")'),
    },
    async (args) => {
      const bundle = await client.buildSwap({
        tokenIn: args.token_in,
        tokenOut: args.token_out,
        amount: args.amount,
        type: args.type,
        slippageBps: args.slippage_bps,
        deadlineMinutes: args.deadline_minutes,
        senderPublicKey: args.sender_public_key,
      });

      const parts = [bundle.summary];
      if (bundle.warnings.length > 0) {
        parts.push('\nWARNINGS:\n' + bundle.warnings.join('\n'));
      }
      parts.push('\nUnsigned deploy JSON (sign externally, then use submit_transaction):');
      parts.push(bundle.deployJson);

      return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
    },
  );

  server.tool(
    'build_approve_token',
    'Build an unsigned token approval transaction.',
    {
      token: z.string().describe('Token contract package hash to approve'),
      amount: z.string().describe('Raw amount to approve'),
      sender_public_key: z.string().describe('Sender hex public key'),
    },
    async (args) => {
      const bundle = await client.buildApproval({
        tokenContractPackageHash: args.token,
        spenderPackageHash: '',
        amount: args.amount,
        senderPublicKey: args.sender_public_key,
      });
      return { content: [{ type: 'text' as const, text: bundle.summary + '\n\n' + bundle.deployJson }] };
    },
  );

  server.tool(
    'submit_transaction',
    'Submit a signed deploy/transaction to the Casper network via the CSPR.trade API',
    {
      signed_deploy_json: z.string().describe('The signed deploy JSON string'),
    },
    async ({ signed_deploy_json }) => {
      const result = await client.submitTransaction(signed_deploy_json);
      return { content: [{ type: 'text' as const, text: `Transaction submitted. Hash: ${result.transactionHash}` }] };
    },
  );
}
