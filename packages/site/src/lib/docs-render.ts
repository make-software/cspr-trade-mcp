import { marked } from 'marked';
import { createHighlighter, type HighlighterGeneric } from 'shiki';
import { slugify } from '../content/docs';

const FALLBACK_LANGUAGE = 'text';
const SHIKI_THEME = 'github-dark-default';
const SHIKI_LANGUAGES = ['bash', 'json', 'javascript', 'markdown', 'md', 'text', 'ts', 'typescript', 'yaml'] as const;

let highlighterPromise: Promise<HighlighterGeneric<any, any>> | undefined;
let highlighter: HighlighterGeneric<any, any> | undefined;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function normalizeLanguage(lang?: string): string {
  const value = lang?.trim().toLowerCase();
  if (!value) return FALLBACK_LANGUAGE;
  if (value === 'shell' || value === 'zsh') return 'bash';
  if (value === 'plaintext') return FALLBACK_LANGUAGE;
  if (SHIKI_LANGUAGES.includes(value as (typeof SHIKI_LANGUAGES)[number])) return value;
  return FALLBACK_LANGUAGE;
}

function withCopyButton(codeHtml: string, rawCode: string): string {
  const escapedCode = escapeHtml(rawCode);

  return [
    '<div class="code-block">',
    `  <button type="button" class="copy-code-button" data-copy-code="${escapedCode}" aria-label="Copy code to clipboard">`,
    '    <span data-copy-label>Copy</span>',
    '  </button>',
    `  ${codeHtml}`,
    '</div>',
  ].join('\n');
}

async function getHighlighter(): Promise<HighlighterGeneric<any, any>> {
  if (highlighter) return highlighter;
  highlighterPromise ??= createHighlighter({
    themes: [SHIKI_THEME],
    langs: [...SHIKI_LANGUAGES],
  });
  highlighter = await highlighterPromise;
  return highlighter;
}

export async function renderMarkdown(markdown: string): Promise<string> {
  const renderer = new marked.Renderer();
  const shiki = await getHighlighter();

  renderer.heading = ({ tokens, depth }) => {
    const text = renderer.parser.parseInline(tokens);
    const plainText = decodeHtml(text).trim();
    const id = depth === 2 || depth === 3 ? slugify(plainText) : undefined;
    const attrs = id ? ` id="${id}"` : '';
    return `<h${depth}${attrs}>${text}</h${depth}>\n`;
  };

  renderer.code = ({ text, lang }) => {
    const language = normalizeLanguage(lang);
    const highlighted = shiki.codeToHtml(text, {
      lang: language,
      theme: SHIKI_THEME,
    });
    return `${withCopyButton(highlighted, text)}\n`;
  };

  marked.setOptions({
    gfm: true,
    breaks: false,
    renderer,
  });

  return marked.parse(markdown);
}
