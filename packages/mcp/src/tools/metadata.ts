import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

/**
 * Display title + behavior hints for every tool.
 *
 * Connector directories (Anthropic Connectors Directory, OpenAI Apps/Plugins)
 * require a `title` and an explicit `readOnlyHint` / `destructiveHint` on every
 * tool, and clients use the hints to decide when to ask the user for
 * confirmation. A tool without hints is treated as the worst case (destructive).
 *
 * Classification rules:
 * - Reads (market data, balances, analysis): readOnlyHint true.
 * - build_*: read-only. They only return an unsigned transaction for the caller
 *   to sign elsewhere; nothing on chain or on this server changes.
 * - submit_transaction: the only write. Broadcasting a signed transaction to
 *   mainnet is irreversible, so destructiveHint true. Resubmitting the same
 *   signed transaction cannot execute it twice, so idempotentHint true.
 * - sign_deploy (local signer server only): signs in memory with a local key,
 *   no network access and no state change.
 */
type ToolMetadata = { title: string; annotations: Omit<ToolAnnotations, 'title'> };

const READ_NETWORK: Omit<ToolAnnotations, 'title'> = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
};

export const TOOL_METADATA: Record<string, ToolMetadata> = {
  // market data
  get_tokens: { title: 'List Tokens', annotations: READ_NETWORK },
  get_pairs: { title: 'List Trading Pairs', annotations: READ_NETWORK },
  get_pair_details: { title: 'Get Pair Details', annotations: READ_NETWORK },
  get_quote: { title: 'Get Swap Quote', annotations: READ_NETWORK },
  get_currencies: { title: 'List Fiat Currencies', annotations: READ_NETWORK },
  get_pair_price_history: { title: 'Get Pair Price History', annotations: READ_NETWORK },
  get_token_price_history: { title: 'Get Token Price History', annotations: READ_NETWORK },
  // account
  get_native_cspr_balance: { title: 'Get CSPR Balance', annotations: READ_NETWORK },
  get_token_balance: { title: 'Get Token Balances', annotations: READ_NETWORK },
  get_liquidity_positions: { title: 'Get Liquidity Positions', annotations: READ_NETWORK },
  get_impermanent_loss: { title: 'Get Impermanent Loss', annotations: READ_NETWORK },
  get_swap_history: { title: 'Get Swap History', annotations: READ_NETWORK },
  get_portfolio_value: { title: 'Get Portfolio Value', annotations: READ_NETWORK },
  get_position_status: { title: 'Get Position Status', annotations: READ_NETWORK },
  // analysis
  estimate_price_impact: { title: 'Estimate Price Impact', annotations: READ_NETWORK },
  estimate_slippage: { title: 'Estimate Slippage', annotations: READ_NETWORK },
  analyze_trade: { title: 'Analyze Trade', annotations: READ_NETWORK },
  optimal_liquidity_amounts: { title: 'Calculate Optimal Liquidity Amounts', annotations: READ_NETWORK },
  // unsigned transaction builders
  build_swap: { title: 'Build Swap Transaction', annotations: READ_NETWORK },
  build_approve_token: { title: 'Build Token Approval Transaction', annotations: READ_NETWORK },
  build_add_liquidity: { title: 'Build Add Liquidity Transaction', annotations: READ_NETWORK },
  build_remove_liquidity: { title: 'Build Remove Liquidity Transaction', annotations: READ_NETWORK },
  // the only write
  submit_transaction: {
    title: 'Submit Signed Transaction',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
  // local signer server
  sign_deploy: {
    title: 'Sign Transaction Locally',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
};

/**
 * Wrap `server.tool` so every registration gets its title + annotations from
 * TOOL_METADATA. Registering a tool that has no entry throws, so a new tool
 * cannot ship without directory metadata.
 */
export function withToolMetadata(server: McpServer): McpServer {
  const register = server.tool.bind(server) as (...args: unknown[]) => RegisteredTool;
  (server as unknown as { tool: (...args: unknown[]) => RegisteredTool }).tool = (...args: unknown[]) => {
    const name = args[0] as string;
    const meta = TOOL_METADATA[name];
    if (!meta) {
      throw new Error(`Tool "${name}" has no title/annotations. Add it to TOOL_METADATA in src/tools/metadata.ts.`);
    }
    const registered = register(...args);
    registered.update({ title: meta.title, annotations: { title: meta.title, ...meta.annotations } });
    return registered;
  };
  return server;
}
