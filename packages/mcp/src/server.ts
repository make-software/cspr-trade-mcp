import { createRequire } from 'module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CsprTradeClient, type CsprTradeClientConfig } from '@make-software/cspr-trade-mcp-sdk';

import { registerMarketDataTools } from './tools/market-data.js';
import { registerTradingTools } from './tools/trading.js';
import { registerLiquidityTools } from './tools/liquidity.js';
import { registerAccountTools } from './tools/account.js';
import { registerAnalysisTools } from './tools/analysis.js';
import { registerSignerTools } from './tools/signer.js';
import { withToolMetadata } from './tools/metadata.js';

const _require = createRequire(import.meta.url);
export const { version } = _require('../package.json') as { version: string };

/**
 * Tool profiles.
 * - `full` (default): every public tool, including the unsigned transaction
 *   builders and `submit_transaction`.
 * - `read-only`: market data, account lookups and analysis only. No transaction
 *   is built or broadcast. This is the profile for directories whose policy
 *   bars plugins from executing or enabling crypto transfers or trades
 *   (OpenAI Plugins Directory, plugin-guidelines "Commerce and monetization").
 */
export type ToolProfile = 'full' | 'read-only';

export const TOOL_PROFILES: readonly ToolProfile[] = ['full', 'read-only'];

/** Tools that build or broadcast a transaction. Excluded from `read-only`. */
export const TRANSACTION_TOOLS: readonly string[] = [
  'build_swap',
  'build_approve_token',
  'build_add_liquidity',
  'build_remove_liquidity',
  'submit_transaction',
];

export function parseToolProfile(value: string | undefined): ToolProfile {
  if (value === undefined || value === '') return 'full';
  if ((TOOL_PROFILES as readonly string[]).includes(value)) return value as ToolProfile;
  throw new Error(`Unknown tool profile "${value}". Expected one of: ${TOOL_PROFILES.join(', ')}.`);
}

/**
 * Skip registration of transaction tools. Applied outside withToolMetadata, so a
 * skipped tool never registers and never appears in tools/list.
 */
function withToolProfile(server: McpServer, profile: ToolProfile): McpServer {
  if (profile === 'full') return server;
  const register = server.tool.bind(server) as (...args: unknown[]) => unknown;
  (server as unknown as { tool: (...args: unknown[]) => unknown }).tool = (...args: unknown[]) => {
    const name = args[0] as string;
    if (TRANSACTION_TOOLS.includes(name)) return undefined;
    return register(...args);
  };
  return server;
}

export interface CreateServerOptions {
  profile?: ToolProfile;
}

export function createServer(config: CsprTradeClientConfig, options: CreateServerOptions = {}): McpServer {
  const client = new CsprTradeClient(config);
  const profile = options.profile ?? 'full';

  const server = withToolProfile(withToolMetadata(new McpServer({
    name: profile === 'read-only' ? 'cspr-trade-read-only' : 'cspr-trade',
    version,
  })), profile);

  registerMarketDataTools(server, client);
  registerTradingTools(server, client);
  registerLiquidityTools(server, client);
  registerAccountTools(server, client);
  registerAnalysisTools(server, client);

  return server;
}

export function createSignerServer(): McpServer {
  const server = withToolMetadata(new McpServer({
    name: 'cspr-trade-signer',
    version,
  }));

  registerSignerTools(server);

  return server;
}
