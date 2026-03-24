import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CsprTradeClient, type CsprTradeClientConfig } from '@make-software/cspr-trade-mcp-sdk';

import { registerMarketDataTools } from './tools/market-data.js';
import { registerTradingTools } from './tools/trading.js';
import { registerLiquidityTools } from './tools/liquidity.js';
import { registerAccountTools } from './tools/account.js';
import { registerSignerTools } from './tools/signer.js';

export function createServer(config: CsprTradeClientConfig): McpServer {
  const client = new CsprTradeClient(config);

  const server = new McpServer({
    name: 'cspr-trade',
    version: '0.1.0',
  });

  registerMarketDataTools(server, client);
  registerTradingTools(server, client);
  registerLiquidityTools(server, client);
  registerAccountTools(server, client);

  return server;
}

export function createSignerServer(): McpServer {
  const server = new McpServer({
    name: 'cspr-trade-signer',
    version: '0.1.0',
  });

  registerSignerTools(server);

  return server;
}
