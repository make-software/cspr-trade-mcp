import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TRANSACTION_TOOLS, createServer, parseToolProfile } from '../../src/server.js';

async function listTools(server: McpServer): Promise<Tool[]> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'profile-contract-test', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const { tools } = await client.listTools();
  await client.close();
  return tools;
}

describe('read-only tool profile (contract)', async () => {
  const full = await listTools(createServer({ network: 'mainnet' }));
  const readOnly = await listTools(createServer({ network: 'mainnet' }, { profile: 'read-only' }));

  it('drops exactly the transaction builders and submit_transaction', () => {
    const fullNames = full.map((t) => t.name).sort();
    const readNames = readOnly.map((t) => t.name).sort();
    expect(readOnly).toHaveLength(full.length - TRANSACTION_TOOLS.length);
    expect(fullNames.filter((n) => !readNames.includes(n)).sort()).toEqual([...TRANSACTION_TOOLS].sort());
  });

  it('exposes only read-only, non-destructive tools', () => {
    for (const t of readOnly) {
      expect(t.annotations?.readOnlyHint, t.name).toBe(true);
      expect(t.annotations?.destructiveHint, t.name).toBe(false);
      expect(typeof t.annotations?.openWorldHint, t.name).toBe('boolean');
    }
  });

  it('never points the model at a tool the profile does not expose', () => {
    const text = JSON.stringify(readOnly);
    for (const name of TRANSACTION_TOOLS) expect(text, name).not.toContain(name);
    expect(text).not.toContain('sign_deploy');
  });

  it('defaults to the full profile', async () => {
    expect(full.map((t) => t.name)).toContain('submit_transaction');
  });
});

describe('parseToolProfile', () => {
  it('accepts known profiles and defaults to full', () => {
    expect(parseToolProfile(undefined)).toBe('full');
    expect(parseToolProfile('')).toBe('full');
    expect(parseToolProfile('full')).toBe('full');
    expect(parseToolProfile('read-only')).toBe('read-only');
  });

  it('fails closed on an unknown profile', () => {
    expect(() => parseToolProfile('readonly')).toThrow(/Unknown tool profile/);
  });
});
