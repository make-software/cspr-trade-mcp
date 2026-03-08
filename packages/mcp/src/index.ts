#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer, createSignerServer } from './server.js';

const signerMode = process.argv.includes('--signer');
const network = (process.env.CSPR_TRADE_NETWORK as 'mainnet' | 'testnet') ?? 'mainnet';
const apiUrl = process.env.CSPR_TRADE_API_URL;
const transport = process.env.CSPR_TRADE_TRANSPORT ?? 'stdio';

if (transport === 'http') {
  const { randomUUID } = await import('node:crypto');
  const { StreamableHTTPServerTransport: StreamableTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );
  const { createMcpExpressApp } = await import(
    '@modelcontextprotocol/sdk/server/express.js'
  );

  const host = process.env.CSPR_TRADE_HOST ?? '0.0.0.0';
  const port = Number(process.env.CSPR_TRADE_PORT ?? '3000');

  const app = createMcpExpressApp({ host });

  // Track transports by session ID for cleanup
  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.post('/mcp', async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    // Reuse existing session if client sends a session ID
    const existingSessionId = req.headers['mcp-session-id'] as string | undefined;
    const existing = existingSessionId ? transports.get(existingSessionId) : undefined;
    if (existing) {
      await existing.handleRequest(req, res, req.body);
      return;
    }

    // New session (initialize request)
    const sessionTransport = new StreamableTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    sessionTransport.onclose = () => {
      const sid = sessionTransport.sessionId;
      if (sid) transports.delete(sid);
    };

    const server = createServer({ network, apiUrl });
    await server.connect(sessionTransport);
    await sessionTransport.handleRequest(req, res, req.body);

    // Session ID is assigned during handleRequest (initialize)
    const sid = sessionTransport.sessionId;
    if (sid) transports.set(sid, sessionTransport);
  });

  app.get('/mcp', async (req: IncomingMessage, res: ServerResponse) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const sessionTransport = sessionId ? transports.get(sessionId) : undefined;
    if (!sessionTransport) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No valid session. Send an initialize request first.' }));
      return;
    }
    await sessionTransport.handleRequest(req, res);
  });

  app.delete('/mcp', async (req: IncomingMessage, res: ServerResponse) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const sessionTransport = sessionId ? transports.get(sessionId) : undefined;
    if (!sessionTransport) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No valid session.' }));
      return;
    }
    await sessionTransport.handleRequest(req, res);
  });

  // JSON 404 for unmatched routes (prevents Express HTML errors breaking MCP clients)
  app.use((_req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  app.listen(port, host, () => {
    console.error(`CSPR.trade MCP server listening on http://${host}:${port}/mcp`);
  });
} else if (signerMode) {
  // Local-only signer mode: only exposes sign_deploy tool
  const server = createSignerServer();
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
} else {
  const server = createServer({ network, apiUrl });
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}
