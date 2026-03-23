import { describe, expect, it } from 'vitest';
import { createServer } from '../../src/server.js';

describe('createServer', () => {
  it('creates a mainnet MCP server instance without resolving workspace package exports', () => {
    const server = createServer({ network: 'mainnet' });
    expect(server).toBeDefined();
  });

  it('creates a testnet MCP server instance with custom API URL', () => {
    const server = createServer({ network: 'testnet', apiUrl: 'https://custom-api.example.com' });
    expect(server).toBeDefined();
  });
});
