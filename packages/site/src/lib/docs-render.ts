import { marked } from 'marked';
import { codeToHtml } from 'shiki';
import { slugify } from '../content/docs';

const FALLBACK_LANGUAGE = 'text';
const SHIKI_THEME = 'github-dark-default';

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
  return value;
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

const renderer = new marked.Renderer();

renderer.heading = ({ tokens, depth }) => {
  const text = renderer.parser.parseInline(tokens);
  const plainText = decodeHtml(text).trim();
  const id = depth === 2 || depth === 3 ? slugify(plainText) : undefined;
  const attrs = id ? ` id="${id}"` : '';
  return `<h${depth}${attrs}>${text}</h${depth}>\n`;
};

renderer.code = async ({ text, lang }) => {
  const language = normalizeLanguage(lang);
  const highlighted = await codeToHtml(text, {
    lang: language,
    theme: SHIKI_THEME,
    defaultColor: false,
  });
  return `${withCopyButton(highlighted, text)}\n`;
};

marked.setOptions({
  gfm: true,
  breaks: false,
  async: true,
  renderer,
});

export async function renderMarkdown(markdown: string): Promise<string> {
  return marked.parse(markdown) as Promise<string>;
}
