import fs from 'node:fs';
import path from 'node:path';

function findRepoRoot(startDir: string): string {
  let current = startDir;

  while (true) {
    if (fs.existsSync(path.join(current, 'package.json')) && fs.existsSync(path.join(current, 'packages', 'mcp', 'README.md'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not locate repository root from ${startDir}`);
    }
    current = parent;
  }
}

const repoRoot = findRepoRoot(process.cwd());

export interface DocPageConfig {
  title: string;
  description: string;
  sourcePath: string;
}

export interface HeadingLink {
  depth: 2 | 3;
  slug: string;
  text: string;
}

export interface LoadedDoc {
  title: string;
  description: string;
  content: string;
  headings: HeadingLink[];
}

export const DOC_PAGES: Record<'getting-started' | 'agent' | 'self-hosting' | 'sdk' | 'mcp', DocPageConfig> = {
  'getting-started': {
    title: 'Getting Started',
    description: 'Connect your AI agent to the CSPR.trade public MCP endpoint in under a minute.',
    sourcePath: 'docs/getting-started.md',
  },
  agent: {
    title: 'Agent Guide',
    description: 'Agent-facing workflow guide for using the CSPR.trade MCP tools.',
    sourcePath: 'docs/SKILL.md',
  },
  'self-hosting': {
    title: 'Self-Hosting',
    description: 'Run your own CSPR.trade MCP server using the npm packages.',
    sourcePath: 'docs/self-hosting.md',
  },
  sdk: {
    title: 'SDK Reference',
    description: 'TypeScript SDK docs for CSPR.trade.',
    sourcePath: 'packages/sdk/README.md',
  },
  mcp: {
    title: 'MCP Server Reference',
    description: 'Full MCP server docs — tools, env vars, signer mode.',
    sourcePath: 'packages/mcp/README.md',
  },
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function stripFrontmatter(input: string): string {
  return input.replace(/^---\n[\s\S]*?\n---\n+/, '');
}

export function stripLeadingH1(input: string): string {
  return input.replace(/^# .+\n+/, '');
}

export function extractHeadings(markdown: string): HeadingLink[] {
  return markdown
    .split('\n')
    .map((line) => line.match(/^(##|###)\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      depth: match[1] === '##' ? 2 : 3,
      text: match[2].trim(),
      slug: slugify(match[2]),
    }));
}

export function loadDoc(page: keyof typeof DOC_PAGES): LoadedDoc {
  const config = DOC_PAGES[page];
  const absolutePath = path.resolve(repoRoot, config.sourcePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const normalized = stripLeadingH1(stripFrontmatter(raw)).trim();

  return {
    title: config.title,
    description: config.description,
    content: normalized,
    headings: extractHeadings(normalized),
  };
}
