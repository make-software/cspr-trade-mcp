import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../..');

const publicToolFiles = [
  'packages/mcp/src/tools/market-data.ts',
  'packages/mcp/src/tools/trading.ts',
  'packages/mcp/src/tools/liquidity.ts',
  'packages/mcp/src/tools/account.ts',
  'packages/mcp/src/tools/analysis.ts',
] as const;

const signerToolFiles = ['packages/mcp/src/tools/signer.ts'] as const;

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function getToolNames(relativePaths: readonly string[]): string[] {
  return relativePaths.flatMap((relativePath) => {
    const content = readRepoFile(relativePath);
    return [...content.matchAll(/server\.tool\(\s*'([^']+)'/g)].map((match) => match[1]);
  });
}

describe('documentation consistency', () => {
  const publicToolNames = getToolNames(publicToolFiles);
  const signerToolNames = getToolNames(signerToolFiles);
  const allToolNames = [...publicToolNames, ...signerToolNames];

  it('source-of-truth tool counts match the expected public and full setup totals', () => {
    expect(publicToolNames).toHaveLength(22);
    expect(signerToolNames).toEqual(['sign_deploy']);
    expect(allToolNames).toHaveLength(23);
  });

  it('public docs and site assets use the current tool counts', () => {
    const filesExpectingPublic22 = [
      'README.md',
      'docs/getting-started.md',
      'docs/self-hosting.md',
      'packages/mcp/README.md',
      'packages/site/src/components/Hero.astro',
      'packages/site/src/components/FeatureCards.astro',
      'packages/site/src/pages/index.astro',
    ];

    for (const relativePath of filesExpectingPublic22) {
      const content = readRepoFile(relativePath);
      expect(content, relativePath).toContain('22');
      expect(content, relativePath).not.toContain('21 tools');
      expect(content, relativePath).not.toContain('21 MCP tools');
      expect(content, relativePath).not.toContain('21 MCP Tools');
      expect(content, relativePath).not.toContain('18 MCP Tools');
      expect(content, relativePath).not.toContain('14 tools');
      expect(content, relativePath).not.toContain('14 MCP tools');
      expect(content, relativePath).not.toContain('14 MCP Tools');
    }
  });

  it('reference assets document every current tool and no stale parameter names', () => {
    const filesExpectingAllTools = [
      'docs/llms.txt',
      'docs/SKILL.md',
      'skill/cspr-trade/SKILL.md',
    ];

    for (const relativePath of filesExpectingAllTools) {
      const content = readRepoFile(relativePath);
      for (const toolName of allToolNames) {
        expect(content, `${relativePath} missing ${toolName}`).toContain(toolName);
      }
      expect(content, relativePath).not.toMatch(/`account_hash`\s*(?:\||\()/);
    }
  });

  it('marketing assets no longer describe the stale 14-tool launch surface', () => {
    const files = [
      'docs/x-thread-launch.md',
      'docs/launch-announcement-devto.md',
    ];

    for (const relativePath of files) {
      const content = readRepoFile(relativePath);
      expect(content, relativePath).not.toContain('14 tools');
      expect(content, relativePath).not.toContain('14 MCP tools');
      expect(content, relativePath).not.toContain('14 MCP Tools');
    }
  });
});
