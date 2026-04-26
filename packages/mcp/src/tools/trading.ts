import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@make-software/cspr-trade-mcp-sdk';
import { writeDeployFile, readDeployJson } from './deploy-file.js';
import {
  validateAmount,
  validateSlippageBps,
  validatePublicKey,
  validateTokensNotEqual,
  firstFailure,
  validationErrorResponse,
} from './validation.js';

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
      token_in_balance: z.string().optional().describe('Raw input token balance for one-time approval (e.g., from wallet). If omitted, approves exact swap amount only.'),
    },
    async (args) => {
      // — Input Validation
      const failure = firstFailure(
        validateAmount(args.amount, 'amount'),
        validatePublicKey(args.sender_public_key),
        validateTokensNotEqual(args.token_in, args.token_out),
        ...(args.slippage_bps != null ? [validateSlippageBps(args.slippage_bps)] : []),
      );
      if (failure && !failure.valid) {
        return validationErrorResponse(failure.error);
      }

      const bundle = await client.buildSwap({
        tokenIn: args.token_in,
        tokenOut: args.token_out,
        amount: args.amount,
        type: args.type,
        slippageBps: args.slippage_bps,
        deadlineMinutes: args.deadline_minutes,
        senderPublicKey: args.sender_public_key,
        tokenInBalance: args.token_in_balance,
      });

      const parts = [bundle.summary];
      if (bundle.warnings.length > 0) {
        parts.push('\nWARNINGS:\n' + bundle.warnings.join('\n'));
      }

      // Write approval transactions first, then the main swap
      if (bundle.approvalsRequired?.length) {
        parts.push('\n--- APPROVAL REQUIRED ---');
        for (let i = 0; i < bundle.approvalsRequired.length; i++) {
          const approval = bundle.approvalsRequired[i];
          const approvalPath = await writeDeployFile(approval.transactionJson);
          parts.push(`\nStep ${i + 1}: ${approval.summary}`);
          parts.push(`Approval transaction saved to: ${approvalPath}`);
          parts.push(`Gas: ${approval.estimatedGasCost}`);
        }
        parts.push('\n--- SWAP TRANSACTION ---');
      }

      const deployPath = await writeDeployFile(bundle.transactionJson);
      parts.push(`\nSwap transaction saved to: ${deployPath}`);

      if (bundle.approvalsRequired?.length) {
        parts.push('\nWorkflow: Sign and submit each approval with submit_transaction, then sign and submit the swap with submit_transaction.');
      } else {
        parts.push('Pass this path to sign_deploy, then use submit_transaction.');
      }

      return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
    },
  );

  server.tool(
    'build_approve_token',
    'Build an unsigned token approval transaction. Spender defaults to the CSPR.trade router.',
    {
      token: z.string().describe('Token contract package hash to approve'),
      amount: z.string().describe('Raw amount to approve (in smallest unit / motes)'),
      sender_public_key: z.string().describe('Sender hex public key'),
      spender: z.string().optional().describe('Spender contract package hash (defaults to CSPR.trade router)'),
    },
    async (args) => {
      // — Input Validation
      const failure = firstFailure(
        validateAmount(args.amount, 'amount'),
        validatePublicKey(args.sender_public_key),
      );
      if (failure && !failure.valid) {
        return validationErrorResponse(failure.error);
      }

      const bundle = await client.buildApproval({
        tokenContractPackageHash: args.token,
        spenderPackageHash: args.spender ?? '',
        amount: args.amount,
        senderPublicKey: args.sender_public_key,
      });
      const deployPath = await writeDeployFile(bundle.transactionJson);
      return { content: [{ type: 'text' as const, text: bundle.summary + `\n\nUnsigned transaction saved to: ${deployPath}` }] };
    },
  );

  server.tool(
    'submit_transaction',
    'Submit a signed transaction to the Casper network via node RPC.',
    {
      signed_deploy_json: z.string().describe('The signed deploy JSON string, or a file path to a signed deploy JSON file'),
    },
    async ({ signed_deploy_json }) => {
      const json = await readDeployJson(signed_deploy_json);
      const result = await client.submitTransaction(json);
      return { content: [{ type: 'text' as const, text: `Transaction submitted. Hash: ${result.transactionHash}` }] };
    },
  );
}
