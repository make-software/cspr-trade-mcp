import fs from 'node:fs';
import path from 'node:path';

const repoRoot = fs.existsSync(path.resolve(process.cwd(), 'packages/mcp/README.md'))
  ? process.cwd()
  : path.resolve(process.cwd(), '..', '..');

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

export const DOC_PAGES: Record<'mcp' | 'sdk' | 'agent', DocPageConfig> = {
  mcp: {
    title: 'MCP Server',
    description: 'Model Context Protocol server docs for CSPR.trade.',
    sourcePath: 'packages/mcp/README.md',
  },
  sdk: {
    title: 'SDK',
    description: 'TypeScript SDK docs for CSPR.trade.',
    sourcePath: 'packages/sdk/README.md',
  },
  agent: {
    title: 'Agent Guide',
    description: 'Agent-facing workflow guide for using the CSPR.trade MCP tools.',
    sourcePath: 'docs/SKILL.md',
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
