import { describe, expect, test } from 'vitest';
import { extractHeadings, loadDoc, slugify, stripFrontmatter, stripLeadingH1 } from '../src/content/docs';

describe('docs content helpers', () => {
  test('strips yaml frontmatter from agent docs', () => {
    const input = ['---', 'name: demo', 'description: test', '---', '', '# Heading', '', 'Body'].join('\n');
    expect(stripFrontmatter(input)).toBe('# Heading\n\nBody');
  });

  test('strips leading h1 from imported markdown', () => {
    expect(stripLeadingH1('# Title\n\n## Section\n')).toBe('## Section\n');
  });

  test('extracts h2 and h3 headings for table of contents', () => {
    const headings = extractHeadings(['## First Section', '### Child Topic', '#### Ignored', '## Another One'].join('\n'));
    expect(headings).toEqual([
      { depth: 2, text: 'First Section', slug: 'first-section' },
      { depth: 3, text: 'Child Topic', slug: 'child-topic' },
      { depth: 2, text: 'Another One', slug: 'another-one' },
    ]);
  });

  test('slugifies headings into stable anchor ids', () => {
    expect(slugify('HTTP (remote agents)')).toBe('http-remote-agents');
  });

  test('loads MCP docs from the repository source files', () => {
    const doc = loadDoc('mcp');
    expect(doc.content.startsWith('MCP (Model Context Protocol) server')).toBe(true);
    expect(doc.headings.some((heading) => heading.slug === 'usage')).toBe(true);
  });
});
