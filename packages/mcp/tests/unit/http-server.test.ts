import { afterEach, describe, expect, it, vi } from 'vitest';

const createServerMock = vi.fn(() => ({ connect: vi.fn().mockResolvedValue(undefined) }));
const createSignerServerMock = vi.fn(() => ({ connect: vi.fn().mockResolvedValue(undefined) }));
const rateLimitMock = vi.fn((config) => ({ __rateLimitConfig: config }));
const paymentMiddlewareHandlerMock = vi.fn();
const paymentMiddlewareFromConfigMock = vi.fn((routes, facilitator, schemes) => Object.assign(
  paymentMiddlewareHandlerMock,
  {
    __paymentRoutes: routes,
    __facilitator: facilitator,
    __schemes: schemes,
  },
));
const HTTPFacilitatorClientMock = vi.fn((config) => ({ __facilitatorConfig: config }));
const ExactEvmSchemeMock = vi.fn(() => ({ __scheme: 'exact-evm' }));
const appUse = vi.fn();
const appGet = vi.fn();
const appPost = vi.fn();
const appDelete = vi.fn();
const appSet = vi.fn();
const appListen = vi.fn((_port, _host, cb) => {
  cb?.();
  return { close: vi.fn() };
});
const createMcpExpressAppMock = vi.fn(() => ({
  use: appUse,
  get: appGet,
  post: appPost,
  delete: appDelete,
  set: appSet,
  listen: appListen,
}));

vi.mock('../../src/server.js', () => ({
  createServer: createServerMock,
  createSignerServer: createSignerServerMock,
  version: '0.7.0',
}));

vi.mock('@modelcontextprotocol/sdk/server/express.js', () => ({
  createMcpExpressApp: createMcpExpressAppMock,
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: class {
    sessionId = 'test-session';
    onclose?: () => void;
    async handleRequest() {}
  },
}));

vi.mock('express-rate-limit', () => ({
  rateLimit: rateLimitMock,
}));

vi.mock('@x402/express', () => ({
  paymentMiddlewareFromConfig: paymentMiddlewareFromConfigMock,
}));

vi.mock('@x402/core/server', () => ({
  HTTPFacilitatorClient: HTTPFacilitatorClientMock,
}));

vi.mock('@x402/evm/exact/server', () => ({
  ExactEvmScheme: ExactEvmSchemeMock,
}));

describe('HTTP server bootstrap', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.CSPR_TRADE_TRANSPORT;
    delete process.env.CSPR_TRADE_RATE_LIMIT_WINDOW_MS;
    delete process.env.CSPR_TRADE_RATE_LIMIT_MAX;
    delete process.env.CSPR_TRADE_HOST;
    delete process.env.CSPR_TRADE_PORT;
    delete process.env.CSPR_TRADE_ENABLE_FILE_DEPLOY_INPUT;
    delete process.env.CSPR_TRADE_X402_ENABLED;
    delete process.env.CSPR_TRADE_PUBLIC_URL;
    delete process.env.CSPR_TRADE_X402_PAYTO;
    delete process.env.CSPR_TRADE_PAYMENT_ADDRESS;
    delete process.env.CSPR_TRADE_X402_PRICE;
    delete process.env.CSPR_TRADE_CDP_FACILITATOR_URL;
  });

  it('registers a /health endpoint and configures trust proxy + scoped rate limiting defaults for HTTP transport', async () => {
    process.env.CSPR_TRADE_TRANSPORT = 'http';
    process.env.CSPR_TRADE_ENABLE_FILE_DEPLOY_INPUT = 'true';

    await import('../../src/index.js');

    expect(createMcpExpressAppMock).toHaveBeenCalled();
    expect(appSet).toHaveBeenCalledWith('trust proxy', 1);
    expect(appGet).toHaveBeenCalledWith('/health', expect.any(Function));
    expect(rateLimitMock).toHaveBeenCalledWith(expect.objectContaining({
      windowMs: 60000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      statusCode: 503,
      message: {
        error: 'Rate limit exceeded',
        retryable: true,
      },
    }));
    expect(appUse).toHaveBeenCalledWith('/mcp', expect.objectContaining({
      __rateLimitConfig: expect.objectContaining({
        statusCode: 503,
      }),
    }));
    expect(appPost).toHaveBeenCalledWith('/mcp', expect.any(Function));
    expect(appListen).toHaveBeenCalled();

    const healthHandler = appGet.mock.calls.find(([route]) => route === '/health')?.[1];
    expect(healthHandler).toBeTypeOf('function');

    const req = { query: {} };
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };
    await healthHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(res.end.mock.calls[0][0]);
    expect(payload).toMatchObject({
      status: 'ok',
      version: '0.7.0',
      transport: 'http',
      fileDeployInputEnabled: true,
    });
  });

  it('registers cdp-resource before the catch-all and returns bazaar discovery for all public MCP tools', async () => {
    process.env.CSPR_TRADE_TRANSPORT = 'http';
    process.env.CSPR_TRADE_PUBLIC_URL = 'https://mcp.cspr.trade';

    await import('../../src/index.js');

    const cdpGetOrder = appGet.mock.calls.findIndex(([route]) => route === '/cdp-resource');
    const catchAllOrder = appUse.mock.calls.findIndex(([first]) => typeof first === 'function');
    expect(cdpGetOrder).toBeGreaterThanOrEqual(0);
    expect(catchAllOrder).toBeGreaterThanOrEqual(0);
    expect(appGet.mock.invocationCallOrder[cdpGetOrder]).toBeLessThan(appUse.mock.invocationCallOrder[catchAllOrder]);

    const cdpHandler = appGet.mock.calls.find(([route]) => route === '/cdp-resource')?.[1];
    expect(cdpHandler).toBeTypeOf('function');

    const res = { writeHead: vi.fn(), end: vi.fn() };
    await cdpHandler({ query: {} }, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    const payload = JSON.parse(res.end.mock.calls[0][0]);
    expect(payload.bazaarResourceServerExtension).toMatchObject({
      resourceName: 'CSPR.trade MCP Server',
      supportedNetworks: ['casper-mainnet'],
    });
    expect(payload.declareDiscoveryExtension).toHaveLength(23);
    const pricesByTool = Object.fromEntries(payload.declareDiscoveryExtension.map((entry: { toolName: string; price: string }) => [entry.toolName, entry.price]));
    expect(pricesByTool.get_quote).toBe('0.001');
    expect(pricesByTool.build_swap).toBe('0');
    expect(payload.declareDiscoveryExtension[0]).toHaveProperty('targetRoute', '/mcp');
    const toolNames = payload.declareDiscoveryExtension.map((entry: { toolName: string }) => entry.toolName);
    expect(toolNames).toContain('get_swap_history');
    expect(toolNames).not.toContain('sign_deploy');
    expect(payload.declareDiscoveryExtension.every((entry: { extensions?: { bazaar?: unknown } }) => entry.extensions?.bazaar)).toBe(true);
  });

  it('does not install x402 payment middleware unless the kill-switch is enabled', async () => {
    process.env.CSPR_TRADE_TRANSPORT = 'http';

    await import('../../src/index.js');

    expect(paymentMiddlewareFromConfigMock).not.toHaveBeenCalled();
  });

  it('installs CDP Facilitator x402 middleware for /mcp with resource metadata when enabled', async () => {
    process.env.CSPR_TRADE_TRANSPORT = 'http';
    process.env.CSPR_TRADE_X402_ENABLED = 'true';
    process.env.CSPR_TRADE_PUBLIC_URL = 'https://mcp.cspr.trade';
    process.env.CSPR_TRADE_X402_PAYTO = '0x1111111111111111111111111111111111111111';
    process.env.CSPR_TRADE_X402_PRICE = '$0.001';
    process.env.CSPR_TRADE_CDP_FACILITATOR_URL = 'https://facilitator.example/x402';

    await import('../../src/index.js');

    expect(HTTPFacilitatorClientMock).toHaveBeenCalledWith({ url: 'https://facilitator.example/x402' });
    expect(ExactEvmSchemeMock).toHaveBeenCalled();
    expect(paymentMiddlewareFromConfigMock).toHaveBeenCalledTimes(1);
    const [routes, facilitator, schemes] = paymentMiddlewareFromConfigMock.mock.calls[0];
    expect(facilitator).toMatchObject({ __facilitatorConfig: { url: 'https://facilitator.example/x402' } });
    expect(schemes).toEqual([{ network: 'eip155:8453', server: { __scheme: 'exact-evm' } }]);
    expect(routes['POST /mcp']).toMatchObject({
      resource: 'https://mcp.cspr.trade/mcp',
      serviceName: 'CSPR.trade MCP Server',
      tags: ['casper', 'dex', 'mcp', 'x402'],
      accepts: {
        scheme: 'exact',
        network: 'eip155:8453',
        payTo: '0x1111111111111111111111111111111111111111',
        price: expect.any(Function),
      },
    });
    expect(await routes['POST /mcp'].accepts.price({
      adapter: { getBody: () => ({ method: 'tools/call', params: { name: 'get_quote' } }) },
    })).toBe('$0.001');
    expect(await routes['POST /mcp'].accepts.price({
      adapter: { getBody: () => ({ method: 'tools/call', params: { name: 'get_tokens' } }) },
    })).toBe('$0');
    expect(routes['POST /mcp'].extensions.bazaar).toBeTruthy();
    // The gate is mounted at the app root (see x402-gate.ts): under app.use('/mcp')
    // the x402 middleware would see req.path '/' and charge nothing.
    expect(appUse).not.toHaveBeenCalledWith('/mcp', expect.any(Function));
    const gatedMiddleware = appUse.mock.calls.findLast(([handler]) => typeof handler === 'function' && handler.length === 3)?.[0];
    expect(gatedMiddleware).toBeTypeOf('function');
    const next = vi.fn();
    gatedMiddleware({ method: 'POST', path: '/mcp', body: { method: 'tools/call', params: { name: 'get_tokens' } } }, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(paymentMiddlewareHandlerMock).not.toHaveBeenCalled();

    gatedMiddleware({ method: 'POST', path: '/mcp', body: { method: 'tools/call', params: { name: 'get_quote' } } }, {}, next);
    expect(paymentMiddlewareHandlerMock).toHaveBeenCalledTimes(1);
  });
});
