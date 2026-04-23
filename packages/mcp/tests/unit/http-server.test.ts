import { afterEach, describe, expect, it, vi } from 'vitest';

const createServerMock = vi.fn(() => ({ connect: vi.fn().mockResolvedValue(undefined) }));
const createSignerServerMock = vi.fn(() => ({ connect: vi.fn().mockResolvedValue(undefined) }));
const rateLimitMock = vi.fn((config) => ({ __rateLimitConfig: config }));
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
      version: '0.4.2',
      transport: 'http',
      fileDeployInputEnabled: true,
    });
  });
});
