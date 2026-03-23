import { describe, expect, it } from 'vitest';
import { createServer } from '../../src/server.js';

describe('MCP server integration', () => {
  it('creates a mainnet MCP server instance with default API configuration', () => {
    const server = createServer({ network: 'mainnet' });
    expect(server).toBeDefined();
  });

  it('creates a testnet MCP server instance with custom API URL', () => {
    const server = createServer({ network: 'testnet', apiUrl: 'https://custom-api.example.com' });
    expect(server).toBeDefined();
  });

  it('creates distinct MCP server instances across repeated bootstrap calls', () => {
    const first = createServer({ network: 'mainnet' });
    const second = createServer({ network: 'mainnet' });

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first).not.toBe(second);
  });
});
