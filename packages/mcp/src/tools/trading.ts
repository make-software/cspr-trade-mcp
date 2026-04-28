import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@make-software/cspr-trade-mcp-sdk';
import { formatDeployArtifact, getDeployInputDescription, isDeployFileInputEnabled, readDeployJson } from './deploy-file.js';
import { withActionableErrors } from './errors.js';
import { validateAmount, validatePublicKey, validateSlippageBps, validateTokensNotEqual, validationErrorResponse } from './validation.js';

export function registerTradingTools(server: McpServer, client: CsprTradeClient) {
  server.tool(
    'build_swap',
    'Build an unsigned swap transaction. Returns the deploy JSON for external signing, plus a human-readable summary.',
    {
      token_in: z.string().describe('Input token: symbol (e.g., "CSPR" (native), "WCSPR" (hash-8df5d2…05b6), "sCSPR" (hash-a4f6d5…60f1)), name, or contract hash. Use get_tokens for full list.'),
      token_out: z.string().describe('Output token: symbol (e.g., "CSPR" (native), "WCSPR" (hash-8df5d2…05b6), "sCSPR" (hash-a4f6d5…60f1)), name, or contract hash. Use get_tokens for full list.'),
      amount: z.string().describe('Human-readable amount (e.g., "100")'),
      type: z.enum(['exact_in', 'exact_out']).describe('"exact_in" or "exact_out"'),
      slippage_bps: z.number().optional().describe('Slippage tolerance in basis points (default 300 = 3%)'),
      deadline_minutes: z.number().optional().describe('Transaction deadline in minutes (default 20)'),
      sender_public_key: z.string().describe('Sender hex public key (e.g., "01abc...")'),
      token_in_balance: z.string().optional().describe('Raw input token balance for one-time approval (e.g., from wallet). If omitted, approves exact swap amount only.'),
    },
    async (args) => withActionableErrors(args, async (args) => {
      const amountErr = validateAmount(args.amount, 'amount');
      if (amountErr) return validationErrorResponse(amountErr);
      const pkErr = validatePublicKey(args.sender_public_key);
      if (pkErr) return validationErrorResponse(pkErr);
      const tokenErr = validateTokensNotEqual(args.token_in, args.token_out);
      if (tokenErr) return validationErrorResponse(tokenErr);
      if (args.slippage_bps !== undefined) {
        const slipErr = validateSlippageBps(args.slippage_bps);
        if (slipErr) return validationErrorResponse(slipErr);
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
          parts.push(`\nStep ${i + 1}: ${approval.summary}`);
          parts.push(await formatDeployArtifact('Approval transaction', approval.transactionJson));
          parts.push(`Gas: ${approval.estimatedGasCost}`);
        }
        parts.push('\n--- SWAP TRANSACTION ---');
      }

      parts.push(`\n${await formatDeployArtifact('Swap transaction', bundle.transactionJson)}`);

      if (bundle.approvalsRequired?.length) {
        if (isDeployFileInputEnabled()) {
          parts.push('\nWorkflow: Sign and submit each approval path with submit_transaction, then sign and submit the swap path with submit_transaction.');
        } else {
          parts.push('\nWorkflow: Sign and submit each approval JSON payload with submit_transaction, then sign and submit the swap JSON payload with submit_transaction.');
        }
      } else {
        if (isDeployFileInputEnabled()) {
          parts.push('Pass this path to sign_deploy, then use submit_transaction.');
        } else {
          parts.push('Pass this JSON to sign_deploy, then submit the signed JSON with submit_transaction.');
        }
      }

      return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
    }),
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
    async (args) => withActionableErrors(args, async (args) => {
      const amountErr = validateAmount(args.amount, 'amount');
      if (amountErr) return validationErrorResponse(amountErr);
      const pkErr = validatePublicKey(args.sender_public_key);
      if (pkErr) return validationErrorResponse(pkErr);
      const bundle = await client.buildApproval({
        tokenContractPackageHash: args.token,
        spenderPackageHash: args.spender ?? '',
        amount: args.amount,
        senderPublicKey: args.sender_public_key,
      });
      return { content: [{ type: 'text' as const, text: bundle.summary + `\n\n${await formatDeployArtifact('Unsigned transaction', bundle.transactionJson)}` }] };
    }),
  );

  server.tool(
    'submit_transaction',
    'Submit a signed transaction to the Casper network via node RPC.',
    {
      signed_deploy_json: z.string().describe(getDeployInputDescription('signed')),
    },
    async ({ signed_deploy_json }) => withActionableErrors({ signed_deploy_json }, async ({ signed_deploy_json }) => {
      const json = await readDeployJson(signed_deploy_json);
      const result = await client.submitTransaction(json);
      return { content: [{ type: 'text' as const, text: `Transaction submitted. Hash: ${result.transactionHash}` }] };
    }),
  );
}
