import { createRequire } from 'module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CsprTradeClient, type CsprTradeClientConfig } from '@make-software/cspr-trade-mcp-sdk';

import { registerMarketDataTools } from './tools/market-data.js';
import { registerTradingTools } from './tools/trading.js';
import { registerLiquidityTools } from './tools/liquidity.js';
import { registerAccountTools } from './tools/account.js';
import { registerAnalysisTools } from './tools/analysis.js';
import { registerSignerTools } from './tools/signer.js';

const _require = createRequire(import.meta.url);
export const { version } = _require('../package.json') as { version: string };

export function createServer(config: CsprTradeClientConfig): McpServer {
  const client = new CsprTradeClient(config);

  const server = new McpServer({
    name: 'cspr-trade',
    version,
  });

  registerMarketDataTools(server, client);
  registerTradingTools(server, client);
  registerLiquidityTools(server, client);
  registerAccountTools(server, client);
  registerAnalysisTools(server, client);

  return server;
}

export function createSignerServer(): McpServer {
  const server = new McpServer({
    name: 'cspr-trade-signer',
    version,
  });

  registerSignerTools(server);

  return server;
}
