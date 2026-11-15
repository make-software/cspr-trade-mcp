import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { x402HTTPResourceServer, x402ResourceServer } from '@x402/core/server';
import type { FacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { paymentMiddlewareFromHTTPServer } from '@x402/express';
import { afterEach, describe, expect, it } from 'vitest';
import { X402_NETWORK, getX402RoutesConfig, shouldRequireX402Payment } from '../../src/x402-bazaar-manifest.js';
import { installX402Gate } from '../../src/x402-gate.js';

// Real express app + real @x402/express middleware; only the facilitator is
// stubbed (it answers /supported, nothing ever gets verified or settled).
const facilitator: FacilitatorClient = {
  getSupported: async () => ({
    kinds: [{ x402Version: 2, scheme: 'exact', network: X402_NETWORK }],
    extensions: [],
    signers: {},
  }),
  verify: async () => { throw new Error('verify must not be called without a payment header'); },
  settle: async () => { throw new Error('settle must not be called without a payment header'); },
} as unknown as FacilitatorClient;

let server: Server | undefined;
afterEach(() => { server?.close(); server = undefined; });

async function startApp(paidPaths?: readonly string[]) {
  const routes = getX402RoutesConfig({ publicUrl: 'https://mcp.cspr.trade', payTo: '0x1111111111111111111111111111111111111111' });
  const resourceServer = new x402ResourceServer(facilitator).register(X402_NETWORK, new ExactEvmScheme());
  const httpServer = new x402HTTPResourceServer(resourceServer, routes);
  await httpServer.initialize();
  const app = express();
  app.use(express.json());
  installX402Gate(app, paymentMiddlewareFromHTTPServer(httpServer), shouldRequireX402Payment, paidPaths);
  // Stand-in for the MCP handler: reaching it means the call was not charged.
  app.post('/mcp', (_req, res) => { res.json({ served: true }); });
  await new Promise<void>((resolve) => { server = app.listen(0, '127.0.0.1', () => resolve()); });
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

const call = (base: string, path: string, name: string) => fetch(`${base}${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: {} } }),
});

describe('x402 gate with the real @x402/express middleware', () => {
  it('answers a premium call on /mcp with 402 and a payment challenge', async () => {
    const base = await startApp();
    const res = await call(base, '/mcp', 'get_quote');
    expect(res.status).toBe(402);
    const challenge = JSON.parse(Buffer.from(res.headers.get('payment-required')!, 'base64').toString());
    expect(challenge.accepts[0]).toMatchObject({ scheme: 'exact', network: X402_NETWORK, amount: '1000' });
  });

  it('lets free calls through unpaid', async () => {
    const base = await startApp();
    const res = await call(base, '/mcp', 'get_tokens');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ served: true });
  });
});
