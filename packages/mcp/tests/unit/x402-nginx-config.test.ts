import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../..');
const nginxConfig = fs.readFileSync(path.join(repoRoot, 'packages/mcp/deploy/nginx/mcp.cspr.trade.conf'), 'utf8');

describe('x402 hosted deploy config', () => {
  it('proxies Agentic.Market discovery through nginx instead of falling through to static 404', () => {
    expect(nginxConfig).toContain('location = /cdp-resource');
    expect(nginxConfig).toContain('proxy_pass http://127.0.0.1:3010/cdp-resource;');
  });
});
