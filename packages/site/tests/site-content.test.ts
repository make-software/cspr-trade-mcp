import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const siteDistDir = path.resolve(process.cwd(), 'dist');

function readBuiltPage(...segments: string[]): string {
  return fs.readFileSync(path.join(siteDistDir, ...segments), 'utf8');
}

describe('built site content', () => {
  test('landing page exposes developer and agent entry points', () => {
    const html = readBuiltPage('index.html');

    expect(html).toContain('AI Agent Integration for CSPR.trade DEX');
    expect(html).toContain('I’m a Developer');
    expect(html).toContain('I’m an Agent');
    expect(html).toContain('/docs/mcp');
    expect(html).toContain('/docs/agent');
    expect(html).toContain('https://mcp.cspr.trade/mcp');
    expect(html).toContain('https://mcp.cspr.trade/health');
  });

  test('docs pages are generated from source content entry points', () => {
    const mcpDoc = readBuiltPage('docs', 'mcp', 'index.html');
    const sdkDoc = readBuiltPage('docs', 'sdk', 'index.html');
    const agentDoc = readBuiltPage('docs', 'agent', 'index.html');

    expect(mcpDoc).toContain('@cspr-trade/mcp');
    expect(mcpDoc).toContain('Public production endpoint');
    expect(sdkDoc).toContain('@cspr-trade/sdk');
    expect(sdkDoc).toContain('Transaction Building');
    expect(agentDoc).toContain('Agent Guide · CSPR.trade MCP');
    expect(agentDoc).toContain('Executing a Swap');
  });
});
