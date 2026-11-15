import type { HTTPRequestContext, RouteConfig } from '@x402/core/server';
import { ExpressAdapter } from '@x402/express';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import {
  getX402RoutesConfig,
  priceForHTTPRequestContext,
} from '../../src/x402-bazaar-manifest.js';

function expressRequestWithBody(body: unknown): Request {
  return {
    body,
    method: 'POST',
    path: '/mcp',
    originalUrl: '/mcp',
    protocol: 'https',
    get: () => undefined,
    headers: {},
    query: {},
  } as unknown as Request;
}

function httpContextFromExpressBody(body: unknown): HTTPRequestContext {
  const adapter = new ExpressAdapter(expressRequestWithBody(body));
  return {
    adapter,
    method: 'POST',
    path: '/mcp',
  };
}

async function routePriceFor(context: HTTPRequestContext): Promise<string> {
  const routes = getX402RoutesConfig({
    publicUrl: 'https://mcp.cspr.trade',
    payTo: '0x1111111111111111111111111111111111111111',
  }) as Record<string, RouteConfig>;
  const route = routes['POST /mcp'];
  const accepts = Array.isArray(route.accepts) ? route.accepts[0] : route.accepts;
  if (typeof accepts.price !== 'function') throw new Error('Expected dynamic price function');
  return accepts.price(context) as Promise<string>;
}

describe('x402 real adapter pricing contract', () => {
  it('reads MCP tool calls through @x402/express ExpressAdapter.getBody()', async () => {
    const premiumContext = httpContextFromExpressBody({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'get_quote' },
    });
    const freeContext = httpContextFromExpressBody({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'get_tokens' },
    });

    expect(priceForHTTPRequestContext(premiumContext)).toBe('$0.001');
    expect(priceForHTTPRequestContext(freeContext)).toBe('$0');
    expect(await routePriceFor(premiumContext)).toBe('$0.001');
    expect(await routePriceFor(freeContext)).toBe('$0');
  });

  it('charges once for a JSON-RPC batch containing any premium tool call', async () => {
    const context = httpContextFromExpressBody([
      { jsonrpc: '2.0', method: 'tools/call', params: { name: 'get_tokens' } },
      { jsonrpc: '2.0', method: 'tools/call', params: { name: 'get_swap_history' } },
    ]);

    expect(await routePriceFor(context)).toBe('$0.001');
  });
});
