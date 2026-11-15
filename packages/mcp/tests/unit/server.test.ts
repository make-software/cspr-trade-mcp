import { createRequire } from 'module';
import { describe, expect, it } from 'vitest';
import { createServer, createSignerServer, version } from '../../src/server.js';

const _require = createRequire(import.meta.url);
const pkgVersion = (_require('../../package.json') as { version: string }).version;

describe('createServer', () => {
  it('creates a mainnet MCP server instance without resolving workspace package exports', () => {
    const server = createServer({ network: 'mainnet' });
    expect(server).toBeDefined();
  });

  it('creates a testnet MCP server instance with custom API URL', () => {
    const server = createServer({ network: 'testnet', apiUrl: 'https://custom-api.example.com' });
    expect(server).toBeDefined();
  });

  it('advertises the package version in both public MCP server variants', () => {
    const hosted = createServer({ network: 'mainnet' }) as unknown as { server: { _serverInfo: { version: string } } };
    const signer = createSignerServer() as unknown as { server: { _serverInfo: { version: string } } };

    expect(version).toBe(pkgVersion);
    expect(hosted.server._serverInfo.version).toBe(version);
    expect(signer.server._serverInfo.version).toBe(version);
  });
});
