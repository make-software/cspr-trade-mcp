#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { createServer, createSignerServer } from './server.js';

const signerMode = process.argv.includes('--signer');
const network = (process.env.CSPR_TRADE_NETWORK as 'mainnet' | 'testnet') ?? 'mainnet';
const apiUrl = process.env.CSPR_TRADE_API_URL;
const transport = process.env.CSPR_TRADE_TRANSPORT ?? 'stdio';
const version = '0.2.0';

function getRateLimitConfig() {
  return {
    windowMs: Number(process.env.CSPR_TRADE_RATE_LIMIT_WINDOW_MS ?? '60000'),
    max: Number(process.env.CSPR_TRADE_RATE_LIMIT_MAX ?? '60'),
  };
}

if (transport === 'http') {
  const { randomUUID } = await import('node:crypto');
  const { rateLimit } = await import('express-rate-limit');
  const { StreamableHTTPServerTransport: StreamableTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );
  const { createMcpExpressApp } = await import(
    '@modelcontextprotocol/sdk/server/express.js'
  );

  const host = process.env.CSPR_TRADE_HOST ?? '0.0.0.0';
  const port = Number(process.env.CSPR_TRADE_PORT ?? '3000');
  const allowedHosts = process.env.CSPR_TRADE_ALLOWED_HOSTS
    ? process.env.CSPR_TRADE_ALLOWED_HOSTS.split(',').map(h => h.trim())
    : undefined;
  const app = createMcpExpressApp({ host, allowedHosts });
  const rateLimitConfig = getRateLimitConfig();

  app.set('trust proxy', 1);
  app.use('/mcp', rateLimit({
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.max,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 503,
    message: {
      error: 'Rate limit exceeded',
      retryable: true,
    },
  }));

  // Track transports by session ID for cleanup
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const startedAt = new Date().toISOString();

  app.get('/health', async (req: Request, res: Response) => {
    const deep = req.query.deep === '1' || req.query.deep === 'true';
    const base = {
      status: 'ok' as string,
      version,
      network,
      transport: 'http',
      uptime: process.uptime(),
      startedAt,
      activeSessions: transports.size,
      memoryMB: Math.round(process.memoryUsage.rss() / 1048576),
    };

    if (deep) {
      // Deep check: verify Casper RPC connectivity
      const rpcUrl = network === 'mainnet'
        ? 'https://node.mainnet.casper.network/rpc'
        : 'https://node.testnet.casper.network/rpc';
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const rpcRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'info_get_status', params: [] }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (rpcRes.ok) {
          const data = await rpcRes.json() as { result?: { protocol_version?: string; build_version?: string } };
          Object.assign(base, {
            casperRpc: 'ok',
            casperProtocol: data?.result?.protocol_version ?? 'unknown',
            casperBuild: data?.result?.build_version ?? 'unknown',
          });
        } else {
          base.status = 'degraded';
          Object.assign(base, { casperRpc: 'error', casperRpcStatus: rpcRes.status });
        }
      } catch (err: unknown) {
        base.status = 'degraded';
        Object.assign(base, { casperRpc: 'unreachable', casperRpcError: (err as Error).message });
      }

      // Check CSPR.trade API if configured
      if (apiUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const apiRes = await fetch(apiUrl, { signal: controller.signal });
          clearTimeout(timeout);
          Object.assign(base, { csprTradeApi: apiRes.ok ? 'ok' : 'error' });
        } catch {
          base.status = 'degraded';
          Object.assign(base, { csprTradeApi: 'unreachable' });
        }
      }
    }

    const statusCode = base.status === 'ok' ? 200 : 503;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(base));
  });

  app.post('/mcp', async (req: Request & { body?: unknown }, res: Response) => {
    const existingSessionId = req.headers['mcp-session-id'] as string | undefined;
    const existing = existingSessionId ? transports.get(existingSessionId) : undefined;
    if (existing) {
      await existing.handleRequest(req, res, req.body);
      return;
    }

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

    const sid = sessionTransport.sessionId;
    if (sid) transports.set(sid, sessionTransport);
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const sessionTransport = sessionId ? transports.get(sessionId) : undefined;
    if (!sessionTransport) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No valid session. Send an initialize request first.' }));
      return;
    }
    await sessionTransport.handleRequest(req, res);
  });

  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const sessionTransport = sessionId ? transports.get(sessionId) : undefined;
    if (!sessionTransport) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No valid session.' }));
      return;
    }
    await sessionTransport.handleRequest(req, res);
  });

  app.use((_req: Request, res: Response) => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  app.listen(port, host, () => {
    console.error(`CSPR.trade MCP server listening on http://${host}:${port}/mcp`);
  });
} else if (signerMode) {
  const server = createSignerServer();
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
} else {
  const server = createServer({ network, apiUrl });
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}
