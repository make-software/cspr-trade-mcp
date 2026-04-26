import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@make-software/cspr-trade-mcp-sdk';
import { writeDeployFile } from './deploy-file.js';
import {
  validateAmount,
  validateSlippageBps,
  validatePublicKey,
  firstFailure,
  validationErrorResponse,
} from './validation.js';

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
      token_a_balance: z.string().optional().describe('Raw token A balance for one-time approval'),
      token_b_balance: z.string().optional().describe('Raw token B balance for one-time approval'),
    },
    async (args) => {
      // — Input Validation
      const failure = firstFailure(
        validateAmount(args.amount_a, 'amount_a'),
        validateAmount(args.amount_b, 'amount_b'),
        validatePublicKey(args.sender_public_key),
        ...(args.slippage_bps != null ? [validateSlippageBps(args.slippage_bps)] : []),
      );
      if (failure && !failure.valid) {
        return validationErrorResponse(failure.error);
      }

      const bundle = await client.buildAddLiquidity({
        tokenA: args.token_a,
        tokenB: args.token_b,
        amountA: args.amount_a,
        amountB: args.amount_b,
        slippageBps: args.slippage_bps,
        deadlineMinutes: args.deadline_minutes,
        senderPublicKey: args.sender_public_key,
        tokenABalance: args.token_a_balance,
        tokenBBalance: args.token_b_balance,
      });

      const parts = [bundle.summary];

      if (bundle.approvalsRequired?.length) {
        parts.push('\n--- APPROVALS REQUIRED ---');
        for (let i = 0; i < bundle.approvalsRequired.length; i++) {
          const approval = bundle.approvalsRequired[i];
          const approvalPath = await writeDeployFile(approval.transactionJson);
          parts.push(`\nStep ${i + 1}: ${approval.summary}`);
          parts.push(`Approval transaction saved to: ${approvalPath}`);
          parts.push(`Gas: ${approval.estimatedGasCost}`);
        }
        parts.push('\n--- ADD LIQUIDITY TRANSACTION ---');
      }

      const deployPath = await writeDeployFile(bundle.transactionJson);
      parts.push(`\nTransaction saved to: ${deployPath}`);

      if (bundle.approvalsRequired?.length) {
        parts.push('\nWorkflow: Sign and submit each approval with submit_transaction, then sign and submit the add-liquidity transaction with submit_transaction.');
      }

      return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
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
      // — Input Validation
      const failure = firstFailure(
        validatePublicKey(args.sender_public_key),
        ...(args.slippage_bps != null ? [validateSlippageBps(args.slippage_bps)] : []),
      );
      if (failure && !failure.valid) {
        return validationErrorResponse(failure.error);
      }

      const bundle = await client.buildRemoveLiquidity({
        pairContractPackageHash: args.pair,
        percentage: args.percentage,
        slippageBps: args.slippage_bps,
        deadlineMinutes: args.deadline_minutes,
        senderPublicKey: args.sender_public_key,
      });
      const deployPath = await writeDeployFile(bundle.transactionJson);
      return { content: [{ type: 'text' as const, text: bundle.summary + `\n\nUnsigned transaction saved to: ${deployPath}` }] };
    },
  );
}
