import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@make-software/cspr-trade-mcp-sdk';
import { withActionableErrors } from './errors.js';

export function registerAnalysisTools(server: McpServer, client: CsprTradeClient) {
  server.tool(
    'estimate_price_impact',
    'Estimate the price impact of a swap before executing. Returns severity classification and execution vs. spot price.',
    {
      token_in: z.string().describe('Input token symbol (e.g., "CSPR" (native), "WCSPR" (hash-8df5d2…05b6), "sCSPR" (hash-a4f6d5…60f1))'),
      token_out: z.string().describe('Output token symbol (e.g., "CSPR" (native), "WCSPR" (hash-8df5d2…05b6), "sCSPR" (hash-a4f6d5…60f1))'),
      amount: z.string().describe('Human-readable input amount (e.g., "1000")'),
    },
    async (args) => withActionableErrors(args, async (args) => {
      const result = await client.estimatePriceImpact({
        tokenIn: args.token_in,
        tokenOut: args.token_out,
        amount: args.amount,
      });

      const lines = [
        `Price Impact Analysis: ${args.amount} ${args.token_in} → ${args.token_out}`,
        ``,
        `Price impact: ${result.priceImpactPct}%`,
        `Severity: ${result.severity}`,
        `Spot price: ${result.spotPrice}`,
        `Execution price: ${result.executionPrice}`,
      ];
      if (result.warning) lines.push(`\n⚠️ ${result.warning}`);

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }),
  );

  server.tool(
    'estimate_slippage',
    'Estimate the expected slippage and minimum output for a swap. Helps set optimal slippage tolerance.',
    {
      token_in: z.string().describe('Input token symbol (e.g., "CSPR" (native), "WCSPR" (hash-8df5d2…05b6), "sCSPR" (hash-a4f6d5…60f1))'),
      token_out: z.string().describe('Output token symbol (e.g., "CSPR" (native), "WCSPR" (hash-8df5d2…05b6), "sCSPR" (hash-a4f6d5…60f1))'),
      amount: z.string().describe('Human-readable input amount (e.g., "1000")'),
      slippage_tolerance_bps: z.number().optional().describe('Your slippage tolerance in bps (default 300 = 3%)'),
    },
    async (args) => withActionableErrors(args, async (args) => {
      const result = await client.estimateSlippage({
        tokenIn: args.token_in,
        tokenOut: args.token_out,
        amount: args.amount,
        slippageToleranceBps: args.slippage_tolerance_bps,
      });

      const toleranceBps = args.slippage_tolerance_bps ?? 300;
      const lines = [
        `Slippage Estimate: ${args.amount} ${args.token_in} → ${args.token_out}`,
        ``,
        `Expected output: ${result.expectedOutputFormatted} ${args.token_out}`,
        `Minimum output (at ${(toleranceBps / 100).toFixed(2)}% tolerance): ${result.minimumOutputFormatted} ${args.token_out}`,
        `Actual slippage from spot: ${(result.maxSlippageBps / 100).toFixed(2)}%`,
        `Recommended tolerance: ${(result.recommendedSlippageBps / 100).toFixed(2)}%`,
      ];

      if (result.maxSlippageBps > toleranceBps) {
        lines.push(`\n⚠️ Expected slippage exceeds your tolerance — transaction may revert.`);
        lines.push(`Consider increasing tolerance to at least ${(result.recommendedSlippageBps / 100).toFixed(2)}%.`);
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }),
  );

  server.tool(
    'analyze_trade',
    'Comprehensive trade analysis: price impact + slippage + execution recommendation. Use before large swaps.',
    {
      token_in: z.string().describe('Input token symbol (e.g., "CSPR" (native), "WCSPR" (hash-8df5d2…05b6), "sCSPR" (hash-a4f6d5…60f1))'),
      token_out: z.string().describe('Output token symbol (e.g., "CSPR" (native), "WCSPR" (hash-8df5d2…05b6), "sCSPR" (hash-a4f6d5…60f1))'),
      amount: z.string().describe('Human-readable input amount'),
      slippage_tolerance_bps: z.number().optional().describe('Slippage tolerance in bps (default 300 = 3%)'),
    },
    async (args) => withActionableErrors(args, async (args) => {
      const result = await client.analyzeTrade({
        tokenIn: args.token_in,
        tokenOut: args.token_out,
        amount: args.amount,
        slippageToleranceBps: args.slippage_tolerance_bps,
      });

      const lines = [
        `Trade Analysis: ${args.amount} ${args.token_in} → ${args.token_out}`,
        ``,
        `📊 Price Impact: ${result.priceImpact.priceImpactPct}% (${result.priceImpact.severity})`,
        `📉 Expected Slippage: ${(result.slippage.maxSlippageBps / 100).toFixed(2)}%`,
        `💰 Expected Output: ${result.slippage.expectedOutputFormatted}`,
        `🛡️ Minimum Output: ${result.slippage.minimumOutputFormatted}`,
        ``,
        `Recommendation: ${result.recommendation.toUpperCase()}`,
        result.recommendationText,
      ];

      if (result.warnings.length > 0) {
        lines.push('', '⚠️ Warnings:');
        result.warnings.forEach(w => lines.push(`  • ${w}`));
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }),
  );

  server.tool(
    'optimal_liquidity_amounts',
    'Given one token amount, calculate the optimal paired amount for adding liquidity to maintain the pool ratio.',
    {
      token_a: z.string().describe('First token: symbol (e.g., "CSPR" (native), "WCSPR" (hash-8df5d2…05b6), "sCSPR" (hash-a4f6d5…60f1))'),
      token_b: z.string().describe('Second token: symbol (e.g., "CSPR" (native), "WCSPR" (hash-8df5d2…05b6), "sCSPR" (hash-a4f6d5…60f1))'),
      amount_a: z.string().describe('Human-readable amount of token A to deposit'),
    },
    async (args) => withActionableErrors(args, async (args) => {
      const result = await client.getOptimalLiquidityAmounts({
        tokenA: args.token_a,
        tokenB: args.token_b,
        amountA: args.amount_a,
      });

      const lines = [
        `Optimal Liquidity: ${args.token_a} / ${args.token_b}`,
        ``,
        `${args.token_a}: ${result.amountA}`,
        `${args.token_b}: ${result.amountB}`,
        `Estimated pool share: ${result.estimatedPoolSharePct}%`,
      ];

      if (result.isNewPool) {
        lines.push(`\n🆕 This would create a new liquidity pool — you set the initial price ratio.`);
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }),
  );
}
