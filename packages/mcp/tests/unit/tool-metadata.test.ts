import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createServer, createSignerServer } from '../../src/server.js';
import { TOOL_METADATA, withToolMetadata } from '../../src/tools/metadata.js';

async function listTools(server: McpServer): Promise<Tool[]> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'metadata-contract-test', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const { tools } = await client.listTools();
  await client.close();
  return tools;
}

describe('tool directory metadata (contract)', async () => {
  const publicTools = await listTools(createServer({ network: 'mainnet' }));
  const signerTools = await listTools(createSignerServer());
  const allTools = [...publicTools, ...signerTools];

  it('exposes the expected tool counts', () => {
    expect(publicTools).toHaveLength(23);
    expect(signerTools).toHaveLength(1);
  });

  it.each(allTools.map((t) => [t.name, t]))('%s has a title and explicit read/write hints', (_name, tool) => {
    const t = tool as Tool;
    expect(t.title, 'top-level title').toBeTruthy();
    expect(t.annotations?.title).toBe(t.title);
    expect(typeof t.annotations?.readOnlyHint).toBe('boolean');
    expect(typeof t.annotations?.destructiveHint).toBe('boolean');
    expect(typeof t.annotations?.openWorldHint).toBe('boolean');
    // read-only and destructive are mutually exclusive
    expect(t.annotations?.readOnlyHint && t.annotations?.destructiveHint).toBe(false);
  });

  it('marks submit_transaction as the only destructive public tool', () => {
    const writes = publicTools.filter((t) => t.annotations?.readOnlyHint === false).map((t) => t.name);
    expect(writes).toEqual(['submit_transaction']);
    const submit = publicTools.find((t) => t.name === 'submit_transaction')!;
    expect(submit.annotations?.destructiveHint).toBe(true);
  });

  it('has no stale TOOL_METADATA entries', () => {
    const registered = new Set(allTools.map((t) => t.name));
    expect(Object.keys(TOOL_METADATA).filter((n) => !registered.has(n))).toEqual([]);
  });

  it('refuses to register a tool without metadata', () => {
    const server = withToolMetadata(new McpServer({ name: 'x', version: '0' }));
    expect(() => server.tool('unlisted_tool', 'no metadata', async () => ({ content: [] }))).toThrow(/TOOL_METADATA/);
  });
});
