import { describe, it, expect } from 'vitest';
import { createServer } from '../../src/server.js';

describe('MCP Server Integration', () => {
  it('should create server without errors', () => {
    const server = createServer({ network: 'testnet' });
    expect(server).toBeDefined();
  });

  it('should create server with custom API URL', () => {
    const server = createServer({
      network: 'testnet',
      apiUrl: 'https://custom-api.example.com',
    });
    expect(server).toBeDefined();
  });

  it('should create server for mainnet', () => {
    const server = createServer({ network: 'mainnet' });
    expect(server).toBeDefined();
  });
});
