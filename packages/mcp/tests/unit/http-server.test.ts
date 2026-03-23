import { afterEach, describe, expect, it, vi } from 'vitest';

const createServerMock = vi.fn(() => ({ connect: vi.fn().mockResolvedValue(undefined) }));
const createSignerServerMock = vi.fn(() => ({ connect: vi.fn().mockResolvedValue(undefined) }));
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

describe('HTTP server bootstrap', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.CSPR_TRADE_TRANSPORT;
    delete process.env.CSPR_TRADE_RATE_LIMIT_WINDOW_MS;
    delete process.env.CSPR_TRADE_RATE_LIMIT_MAX;
    delete process.env.CSPR_TRADE_HOST;
    delete process.env.CSPR_TRADE_PORT;
  });

  it('registers a /health endpoint and configures trust proxy + rate limiting defaults for HTTP transport', async () => {
    process.env.CSPR_TRADE_TRANSPORT = 'http';

    await import('../../src/index.js');

    expect(createMcpExpressAppMock).toHaveBeenCalled();
    expect(appSet).toHaveBeenCalledWith('trust proxy', 1);
    expect(appGet).toHaveBeenCalledWith('/health', expect.any(Function));
    expect(appUse).toHaveBeenCalled();
    expect(appPost).toHaveBeenCalledWith('/mcp', expect.any(Function));
    expect(appListen).toHaveBeenCalled();
  });
});
