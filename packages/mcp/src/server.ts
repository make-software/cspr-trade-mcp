import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CsprTradeClient, type CsprTradeClientConfig } from '@cspr-trade/sdk';

import { registerMarketDataTools } from './tools/market-data.js';

export function createServer(config: CsprTradeClientConfig): McpServer {
  const client = new CsprTradeClient(config);

  const server = new McpServer({
    name: 'cspr-trade',
    version: '0.1.0',
  });

  registerMarketDataTools(server, client);
  return server;
}
