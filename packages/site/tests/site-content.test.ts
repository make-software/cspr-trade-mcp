import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const siteDistDir = path.resolve(currentDir, '..', 'dist');
const hasBuiltSite = fs.existsSync(siteDistDir);
const testIfBuilt = hasBuiltSite ? test : test.skip;

function readBuiltPage(...segments: string[]): string {
  return fs.readFileSync(path.join(siteDistDir, ...segments), 'utf8');
}

describe('built site content', () => {
  testIfBuilt('landing page leads with public endpoint and connection CTA', () => {
    const html = readBuiltPage('index.html');

    expect(html).toContain('Connect Your AI Agent to Casper DeFi');
    expect(html).toContain('mcp.cspr.trade/mcp');
    expect(html).toContain('/docs/getting-started');
    expect(html).toContain('/docs/self-hosting');
    expect(html).toContain('Connect Now');
  });

  testIfBuilt('getting started page focuses on public endpoint connection', () => {
    const doc = readBuiltPage('docs', 'getting-started', 'index.html');

    expect(doc).toContain('Getting Started');
    expect(doc).toContain('https://mcp.cspr.trade/mcp');
    expect(doc).toContain('Claude Desktop');
    expect(doc).toContain('No API key');
  });

  testIfBuilt('self-hosting page covers npm packages and local setup', () => {
    const doc = readBuiltPage('docs', 'self-hosting', 'index.html');

    expect(doc).toContain('Self-Hosting');
    expect(doc).toContain('@make-software/cspr-trade-mcp');
    expect(doc).toContain('@make-software/cspr-trade-mcp-sdk');
  });

  testIfBuilt('docs pages are generated from source content entry points', () => {
    const mcpDoc = readBuiltPage('docs', 'mcp', 'index.html');
    const sdkDoc = readBuiltPage('docs', 'sdk', 'index.html');
    const agentDoc = readBuiltPage('docs', 'agent', 'index.html');

    expect(mcpDoc).toContain('@make-software/cspr-trade-mcp');
    expect(sdkDoc).toContain('@make-software/cspr-trade-mcp-sdk');
    expect(agentDoc).toContain('Executing a Swap');
  });
});
