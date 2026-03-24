# CSPR.trade MCP Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static landing page and documentation site for mcp.cspr.trade using Astro, Tailwind CSS, and content sourced from existing README files.

**Architecture:** Astro SSG in `packages/site` workspace. Landing page is a hand-crafted Astro component. Docs pages import markdown from `packages/mcp/README.md`, `packages/sdk/README.md`, and `docs/SKILL.md` at build time. Output is pure static HTML/CSS/JS served by nginx.

**Tech Stack:** Astro 5, Tailwind CSS v4, Shiki (syntax highlighting), Inter + JetBrains Mono fonts (self-hosted), TypeScript

**Design spec:** `docs/superpowers/specs/task-363-design.md`

---

### Task 1: Scaffold `packages/site` Astro workspace

**Files:**
- Create: `packages/site/package.json`
- Create: `packages/site/astro.config.mjs`
- Create: `packages/site/tsconfig.json`
- Modify: `package.json` (root — workspaces already includes `packages/*`, verify)

- [ ] **Step 1: Create `packages/site/package.json`**

```json
{
  "name": "@cspr-trade/site",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/tailwind": "^6.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/site/astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwindcss()],
  output: 'static',
  build: {
    format: 'directory',
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
    },
  },
});
```

- [ ] **Step 3: Create `packages/site/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 4: Install dependencies**

Run:
```bash
cd packages/site && npm install
```

- [ ] **Step 5: Verify root workspace picks it up**

Run:
```bash
cd /home/jeanclaude/workspace/cspr-trade-mcp && npm ls --workspaces --depth=0
```
Expected: `@cspr-trade/site` appears in the list.

- [ ] **Step 6: Commit**

```bash
git add packages/site/package.json packages/site/astro.config.mjs packages/site/tsconfig.json package-lock.json
git commit -m "feat(site): scaffold Astro workspace for landing page"
```

---

### Task 2: Set up global styles, fonts, and base layout

**Files:**
- Create: `packages/site/src/styles/global.css`
- Create: `packages/site/src/layouts/BaseLayout.astro`
- Create: `packages/site/src/assets/logo.svg`
- Create: `packages/site/public/favicon.svg`
- Create: `packages/site/public/favicon.png`
- Create: `packages/site/src/pages/index.astro` (placeholder)

- [ ] **Step 1: Create `packages/site/src/styles/global.css`**

Set up Tailwind imports and CSS custom properties for the design tokens. Define `@font-face` rules for Inter and JetBrains Mono using Google Fonts CDN (simpler than self-hosting for v1 — can switch to self-hosted later if needed).

```css
@import 'tailwindcss';

@theme {
  --color-bg: #0a0a0f;
  --color-surface: #151520;
  --color-border: rgba(255, 255, 255, 0.06);
  --color-border-hover: rgba(255, 255, 255, 0.12);
  --color-accent: #FF0012;
  --color-accent-hover: #ff1a2e;
  --color-accent-glow: rgba(255, 0, 18, 0.15);
  --color-text: #f5f5f5;
  --color-text-secondary: #a0a0a0;
  --color-text-muted: #666666;

  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

/* Base styles */
html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: var(--color-bg);
}
::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 3px;
}

/* Code block overrides */
pre {
  background-color: var(--color-surface) !important;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}

code {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

:not(pre) > code {
  background-color: var(--color-surface);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}
```

- [ ] **Step 2: Copy CSPR.trade logo SVG to `packages/site/src/assets/logo.svg`**

Copy the SVG from `https://cspr.trade/favicons/favicon.svg` (already fetched — it's the red chart arrow logo).

- [ ] **Step 3: Copy favicons to `packages/site/public/`**

```bash
curl -o packages/site/public/favicon.svg https://cspr.trade/favicons/favicon.svg
curl -o packages/site/public/favicon.png https://cspr.trade/favicons/favicon.png
```

- [ ] **Step 4: Create `packages/site/src/layouts/BaseLayout.astro`**

```astro
---
interface Props {
  title: string;
  description?: string;
}

const { title, description = 'AI agent integration for CSPR.trade DEX on Casper Network' } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <title>{title}</title>
  </head>
  <body class="min-h-screen">
    <slot />
  </body>
</html>
```

- [ ] **Step 5: Create placeholder `packages/site/src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="CSPR.trade MCP">
  <main class="flex items-center justify-center min-h-screen">
    <h1 class="text-4xl font-bold text-text">CSPR.trade MCP</h1>
  </main>
</BaseLayout>
```

- [ ] **Step 6: Verify dev server starts**

Run:
```bash
cd packages/site && npx astro dev --port 4321
```
Expected: Dev server starts, visiting `http://localhost:4321` shows the placeholder page with correct dark background and white text.

- [ ] **Step 7: Commit**

```bash
git add packages/site/src/ packages/site/public/
git commit -m "feat(site): base layout, global styles, fonts, design tokens"
```

---

### Task 3: Build the Navbar component

**Files:**
- Create: `packages/site/src/components/Navbar.astro`

- [ ] **Step 1: Create `packages/site/src/components/Navbar.astro`**

Sticky nav bar with:
- Left: CSPR.trade logo SVG inline + "MCP" pill badge
- Right: "Docs" link (→ `/docs/mcp`), GitHub icon link (→ repo URL), "cspr.trade" link (→ external)
- Transparent background with backdrop blur activated via a small `<script>` that adds a class on scroll

```astro
---
const navLinks = [
  { label: 'Docs', href: '/docs/mcp' },
  { label: 'GitHub', href: 'https://github.com/cspr-trade/mcp', external: true },
  { label: 'cspr.trade', href: 'https://cspr.trade', external: true },
];
---

<nav id="navbar" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
    <!-- Logo + MCP badge -->
    <a href="/" class="flex items-center gap-3 group">
      <svg width="46" height="40" viewBox="0 0 46 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-8 h-7">
        <path d="M10.4274 26.8938C10.4625 27.0639 10.4815 27.2403 10.4815 27.4209V37.4066C10.4813 38.8387 9.31824 39.9999 7.88407 40C6.44995 39.9999 5.28734 38.8387 5.28709 37.4066V31.7352C5.72406 31.4875 6.13652 31.1792 6.50909 30.8072L10.4274 26.8938Z" fill="#FF0012"/>
        <path d="M19.1025 18.2305C19.3176 18.6082 19.4417 19.0446 19.4417 19.5101V37.4066C19.4415 38.8387 18.2788 39.9998 16.8447 40C15.4106 39.9999 14.2475 38.8387 14.2473 37.4066V23.0795L19.1025 18.2305Z" fill="#FF0012"/>
        <path d="M23.2079 21.3183C24.8032 22.2201 26.633 22.5533 28.4019 22.318V37.4066C28.4016 38.8387 27.2391 39.9999 25.8049 40C24.3708 39.9999 23.2082 38.8387 23.2079 37.4066V21.3183Z" fill="#FF0012"/>
        <path d="M37.3625 37.4066C37.3623 38.8387 36.1996 39.9998 34.7656 40C33.3314 39.9999 32.1684 38.8387 32.1681 37.4066V20.8187C32.5204 20.5637 32.8579 20.2779 33.1754 19.9609L37.3625 15.7794V37.4066Z" fill="#FF0012"/>
        <path d="M42.7508 0C44.1852 -3.02357e-08 45.3482 1.16104 45.3483 2.59344V14.2649C45.3482 15.6972 44.1852 16.8583 42.7508 16.8583C41.3165 16.8583 40.1539 15.6972 40.1538 14.2649V8.85499L31.1001 17.8964C29.0716 19.9222 25.7824 19.9222 23.7538 17.8964L19.5244 13.6727L4.43379 28.7428C3.41955 29.7556 1.77494 29.7556 0.760677 28.7428C-0.253569 27.7299 -0.253549 26.0875 0.760677 25.0747L15.8513 10.0046C17.8797 7.97895 21.1685 7.97902 23.197 10.0046L27.427 14.2288L36.4807 5.18688L31.0635 5.18736C29.6292 5.18725 28.4665 4.0258 28.4665 2.59344C28.4665 1.16109 29.6292 9.4264e-05 31.0635 0H42.7508Z" fill="#FF0012"/>
      </svg>
      <span class="text-text font-bold text-lg">CSPR.trade</span>
      <span class="text-[0.65rem] font-semibold bg-accent/15 text-accent px-2 py-0.5 rounded-full uppercase tracking-wider">MCP</span>
    </a>

    <!-- Nav links -->
    <div class="hidden sm:flex items-center gap-6">
      {navLinks.map(link => (
        <a
          href={link.href}
          class="text-text-secondary hover:text-text text-sm font-medium transition-colors"
          {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {link.label}
        </a>
      ))}
    </div>

    <!-- Mobile hamburger -->
    <button id="mobile-menu-btn" class="sm:hidden text-text-secondary hover:text-text" aria-label="Menu">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  </div>

  <!-- Mobile menu dropdown -->
  <div id="mobile-menu" class="hidden sm:hidden bg-surface/95 backdrop-blur-lg border-b border-border px-4 pb-4">
    {navLinks.map(link => (
      <a
        href={link.href}
        class="block py-2 text-text-secondary hover:text-text text-sm font-medium transition-colors"
        {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {link.label}
      </a>
    ))}
  </div>
</nav>

<script>
  // Backdrop blur on scroll
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar?.classList.add('bg-bg/80', 'backdrop-blur-lg', 'border-b', 'border-border');
    } else {
      navbar?.classList.remove('bg-bg/80', 'backdrop-blur-lg', 'border-b', 'border-border');
    }
  });

  // Mobile menu toggle
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  btn?.addEventListener('click', () => menu?.classList.toggle('hidden'));
</script>
```

- [ ] **Step 2: Add Navbar to `BaseLayout.astro`**

Import and render `<Navbar />` as the first child of `<body>`, before `<slot />`.

- [ ] **Step 3: Verify navbar renders**

Run dev server, confirm:
- Logo + MCP badge visible on the left
- Nav links on the right (desktop)
- Hamburger on mobile viewport
- Backdrop blur kicks in on scroll

- [ ] **Step 4: Commit**

```bash
git add packages/site/src/components/Navbar.astro packages/site/src/layouts/BaseLayout.astro
git commit -m "feat(site): navbar component with logo, links, mobile menu"
```

---

### Task 4: Build the Hero section

**Files:**
- Create: `packages/site/src/components/Hero.astro`

- [ ] **Step 1: Create `packages/site/src/components/Hero.astro`**

Hero section with:
- Large headline: "AI Agent Integration for CSPR.trade DEX"
- Subtitle text
- Two CTA buttons: "I'm a Developer" (filled red), "I'm an Agent" (outlined red)
- Subtle red radial glow behind the section
- Generous vertical padding (pt-32 to account for fixed navbar)

```astro
<section class="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
  <!-- Background glow -->
  <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div class="w-[600px] h-[400px] bg-accent-glow rounded-full blur-[120px] opacity-50"></div>
  </div>

  <div class="relative max-w-4xl mx-auto text-center">
    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
      AI Agent Integration for<br />
      <span class="text-accent">CSPR.trade</span> DEX
    </h1>

    <p class="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
      Connect AI agents to on-chain DeFi on Casper — market data, swaps, liquidity management. Non-custodial by design.
    </p>

    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a
        href="/docs/mcp"
        class="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-base transition-all hover:shadow-lg hover:shadow-accent/25"
      >
        I'm a Developer
      </a>
      <a
        href="/docs/agent"
        class="inline-flex items-center justify-center px-8 py-3 rounded-lg border-2 border-accent text-accent hover:bg-accent/10 font-semibold text-base transition-all"
      >
        I'm an Agent
      </a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add Hero to `index.astro`**

Import and render `<Hero />` as the first component inside `<main>`.

- [ ] **Step 3: Verify hero renders**

Check:
- Headline and subtitle display correctly
- CTA buttons are side-by-side on desktop, stacked on mobile
- Red glow is visible but subtle behind the text
- Links navigate to correct pages (will 404 until docs pages exist — that's fine)

- [ ] **Step 4: Commit**

```bash
git add packages/site/src/components/Hero.astro packages/site/src/pages/index.astro
git commit -m "feat(site): hero section with CTAs and background glow"
```

---

### Task 5: Build the Architecture diagram

**Files:**
- Create: `packages/site/src/components/Architecture.astro`

- [ ] **Step 1: Create `packages/site/src/components/Architecture.astro`**

Visual architecture diagram rendered as CSS-styled boxes with connecting lines. Shows the flow:

```
AI Agent → MCP Server → SDK → CSPR.trade API
                 ↓
          Local Signer
```

Use CSS grid or flexbox with pseudo-elements for connecting lines. Each box is a styled card with an icon and label. The "Local Signer" branches off below the MCP Server box with a note "Key stays here".

Style: Glass-morphism cards with `bg-surface`, subtle border, and the connecting lines in `text-muted` or `border-border`. Include a brief explanation paragraph below the diagram.

- [ ] **Step 2: Add Architecture to `index.astro`**

Render below `<Hero />` with section heading "How It Works".

- [ ] **Step 3: Verify diagram renders**

Check boxes are aligned, connecting lines visible, responsive (wraps/stacks cleanly on mobile).

- [ ] **Step 4: Commit**

```bash
git add packages/site/src/components/Architecture.astro packages/site/src/pages/index.astro
git commit -m "feat(site): architecture diagram with styled flow visualization"
```

---

### Task 6: Build the Feature Cards section

**Files:**
- Create: `packages/site/src/components/FeatureCards.astro`

- [ ] **Step 1: Create `packages/site/src/components/FeatureCards.astro`**

4 cards in a responsive grid:

1. **14 MCP Tools** — icon: terminal/command — "Market data, swaps, liquidity, and local signing — all via the Model Context Protocol."
2. **Non-Custodial** — icon: shield/lock — "Transaction signing stays local. Private keys never touch the network or the LLM."
3. **Dual Transport** — icon: arrows/plug — "stdio for local tools (Claude Code), HTTP Streamable for remote agents."
4. **TypeScript SDK** — icon: code/package — "Programmatic access with full type safety. Use the SDK directly or through MCP."

Each card: glass-morphism style, slight hover lift (`hover:-translate-y-1`), icon at top, bold title, description text. Grid: 4 across on desktop, 2 on tablet, 1 on mobile.

Use inline SVG icons (simple, no dependencies).

- [ ] **Step 2: Add FeatureCards to `index.astro`**

Render below Architecture section.

- [ ] **Step 3: Verify cards render**

Check responsive grid behavior, hover effects, card styling.

- [ ] **Step 4: Commit**

```bash
git add packages/site/src/components/FeatureCards.astro packages/site/src/pages/index.astro
git commit -m "feat(site): feature cards section with responsive grid"
```

---

### Task 7: Build the Quick Start section

**Files:**
- Create: `packages/site/src/components/QuickStart.astro`

- [ ] **Step 1: Create `packages/site/src/components/QuickStart.astro`**

Section with two tabbed code examples:
- Tab 1: "Claude Code (stdio)" — shows the `.claude.json` config snippet
- Tab 2: "HTTP (remote)" — shows the env vars + command

Tabs are pure HTML/CSS/JS (no framework needed). Active tab highlighted with accent underline. Code blocks with syntax highlighting (use `<pre><code>` with manually applied classes or let Astro handle via markdown rendering).

Include a copy-to-clipboard button on each code block (small `<script>` island).

Also include the "Public Endpoint" callout card below the tabs:
- Text: "Public mainnet endpoint available"
- `https://mcp.cspr.trade/mcp` shown as a code snippet
- Health check endpoint mentioned

- [ ] **Step 2: Add QuickStart to `index.astro`**

Render below FeatureCards section.

- [ ] **Step 3: Verify tabs and copy buttons work**

Check:
- Tab switching works
- Code displays with monospace font
- Copy button copies text to clipboard
- Public endpoint callout renders

- [ ] **Step 4: Commit**

```bash
git add packages/site/src/components/QuickStart.astro packages/site/src/pages/index.astro
git commit -m "feat(site): quick start section with tabbed code examples"
```

---

### Task 8: Build the Footer

**Files:**
- Create: `packages/site/src/components/Footer.astro`

- [ ] **Step 1: Create `packages/site/src/components/Footer.astro`**

Simple footer with:
- Links row: GitHub, cspr.trade, Casper Network, Docs
- "MIT License" text
- Subtle top border

- [ ] **Step 2: Add Footer to `BaseLayout.astro`**

Render as the last child of `<body>`, after `<slot />`.

- [ ] **Step 3: Verify footer renders on all pages**

- [ ] **Step 4: Commit**

```bash
git add packages/site/src/components/Footer.astro packages/site/src/layouts/BaseLayout.astro
git commit -m "feat(site): footer component with links"
```

---

### Task 9: Build the Docs layout (sidebar + TOC)

**Files:**
- Create: `packages/site/src/layouts/DocsLayout.astro`
- Create: `packages/site/src/components/DocsSidebar.astro`
- Create: `packages/site/src/components/TableOfContents.astro`

- [ ] **Step 1: Create `packages/site/src/components/DocsSidebar.astro`**

Left sidebar with nav links:
- "MCP Server" → `/docs/mcp`
- "SDK" → `/docs/sdk`
- "Agent Guide" → `/docs/agent`
- Divider
- "GitHub" → external
- "cspr.trade" → external

Active page highlighted with red left border + subtle background tint. Accept a `currentPath` prop to determine which item is active.

- [ ] **Step 2: Create `packages/site/src/components/TableOfContents.astro`**

Right sidebar that accepts a `headings` prop (array of `{ depth, slug, text }` — Astro provides this from markdown). Renders h2/h3 entries as a nested list with anchor links. Sticky positioning.

Include a small `<script>` for scroll-spy: observe heading elements with IntersectionObserver, highlight the current TOC entry.

- [ ] **Step 3: Create `packages/site/src/layouts/DocsLayout.astro`**

Three-column layout wrapping `BaseLayout`:
- Left: `DocsSidebar` (240px, hidden on mobile → hamburger)
- Center: `<slot />` (flex grow, markdown content)
- Right: `TableOfContents` (200px, hidden on tablet/mobile)

Add prose styling for the markdown content area: heading anchors, table styling (alternating rows), blockquote styling, list styling. Use Tailwind's `@apply` or a scoped `<style>` block.

Props: `title`, `description`, `headings`, `currentPath`.

- [ ] **Step 4: Verify layout with a test page**

Create a temporary test docs page to verify the three-column layout renders correctly before building the real content pages.

- [ ] **Step 5: Commit**

```bash
git add packages/site/src/components/DocsSidebar.astro packages/site/src/components/TableOfContents.astro packages/site/src/layouts/DocsLayout.astro
git commit -m "feat(site): docs layout with sidebar navigation and table of contents"
```

---

### Task 10: Build the MCP Server docs page

**Files:**
- Create: `packages/site/src/pages/docs/mcp.astro`

- [ ] **Step 1: Create `packages/site/src/pages/docs/mcp.astro`**

Import `packages/mcp/README.md` content at build time. Astro can import `.md` files and render them. Use a raw file read (via Vite's `?raw` import or `fs.readFileSync` in the frontmatter) to get the README content, strip the H1 line, then render it through Astro's markdown pipeline.

Alternatively, if Astro's markdown import provides the compiled HTML and headings directly, use that.

The page wraps the content in `DocsLayout` with `currentPath="/docs/mcp"`.

Pass the extracted headings to the layout for TOC generation.

- [ ] **Step 2: Verify the page renders**

Run dev server, visit `/docs/mcp`. Confirm:
- Sidebar shows with "MCP Server" highlighted
- Content renders with proper headings, tables, code blocks
- TOC on the right shows section headings
- Code blocks have syntax highlighting

- [ ] **Step 3: Commit**

```bash
git add packages/site/src/pages/docs/mcp.astro
git commit -m "feat(site): MCP Server docs page sourced from README"
```

---

### Task 11: Build the SDK docs page

**Files:**
- Create: `packages/site/src/pages/docs/sdk.astro`

- [ ] **Step 1: Create `packages/site/src/pages/docs/sdk.astro`**

Same approach as Task 10 but importing from `packages/sdk/README.md`. Strip H1, render in `DocsLayout` with `currentPath="/docs/sdk"`.

- [ ] **Step 2: Verify the page renders**

Visit `/docs/sdk`. Confirm content, sidebar active state, TOC, and code highlighting.

- [ ] **Step 3: Commit**

```bash
git add packages/site/src/pages/docs/sdk.astro
git commit -m "feat(site): SDK docs page sourced from README"
```

---

### Task 12: Build the Agent Guide docs page

**Files:**
- Create: `packages/site/src/pages/docs/agent.astro`

- [ ] **Step 1: Create `packages/site/src/pages/docs/agent.astro`**

Import `docs/SKILL.md`, strip the YAML frontmatter (`---` block at the top), render the remaining markdown in `DocsLayout` with `currentPath="/docs/agent"`.

- [ ] **Step 2: Verify the page renders**

Visit `/docs/agent`. Confirm:
- YAML frontmatter is NOT displayed
- Content renders cleanly
- Sidebar shows "Agent Guide" as active
- All sections (workflows, tool tables, safety checks, etc.) render properly

- [ ] **Step 3: Commit**

```bash
git add packages/site/src/pages/docs/agent.astro
git commit -m "feat(site): Agent Guide docs page sourced from SKILL.md"
```

---

### Task 13: Update nginx configuration

**Files:**
- Modify: `packages/mcp/deploy/nginx/mcp.cspr.trade.conf`

- [ ] **Step 1: Read the current nginx config**

Read `packages/mcp/deploy/nginx/mcp.cspr.trade.conf` to confirm current state.

- [ ] **Step 2: Update the config**

Add:
- `root` directive pointing to `packages/site/dist`
- `index index.html`
- Exact location blocks for `/SKILL.md` and `/llms.txt` serving raw files from `docs/`
- `try_files` fallback for the static site
- Keep existing `/mcp` and `/health` proxy blocks unchanged

The updated config should look like:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name mcp.cspr.trade;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mcp.cspr.trade;

    ssl_certificate /etc/letsencrypt/live/mcp.cspr.trade/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.cspr.trade/privkey.pem;

    root /opt/cspr-trade-mcp/packages/site/dist;
    index index.html;

    # Raw doc files — served as plain text for agents
    location = /SKILL.md {
        alias /opt/cspr-trade-mcp/docs/SKILL.md;
        default_type text/plain;
        add_header Cache-Control "public, max-age=3600";
    }

    location = /llms.txt {
        alias /opt/cspr-trade-mcp/docs/llms.txt;
        default_type text/plain;
        add_header Cache-Control "public, max-age=3600";
    }

    # MCP server proxy (existing)
    location /health {
        proxy_pass http://127.0.0.1:3010/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /mcp {
        proxy_pass http://127.0.0.1:3010/mcp;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Static site
    location / {
        try_files $uri $uri/index.html $uri.html =404;
    }
}
```

**Note:** Use `$uri/index.html` instead of a blanket `/index.html` fallback — Astro generates directory-based output, so `/docs/mcp/index.html` is the actual file for `/docs/mcp`. A blanket SPA fallback isn't needed since all pages are pre-rendered.

- [ ] **Step 3: Verify config syntax (locally)**

Run:
```bash
nginx -t -c packages/mcp/deploy/nginx/mcp.cspr.trade.conf 2>&1 || echo "Note: full syntax check requires nginx installed with certs present"
```

The config file in the repo is a reference — actual deployment path (`/opt/cspr-trade-mcp/`) may differ. Add a comment at the top noting this.

- [ ] **Step 4: Commit**

```bash
git add packages/mcp/deploy/nginx/mcp.cspr.trade.conf
git commit -m "feat(site): update nginx config to serve landing page and raw doc files"
```

---

### Task 14: Full build and verification

**Files:**
- No new files — verification only

- [ ] **Step 1: Run the full build from monorepo root**

```bash
cd /home/jeanclaude/workspace/cspr-trade-mcp && npm run build
```

Expected: All packages (SDK, MCP, Site) build successfully.

- [ ] **Step 2: Check the build output**

```bash
ls -la packages/site/dist/
ls -la packages/site/dist/docs/
```

Expected files:
- `dist/index.html` — landing page
- `dist/docs/mcp/index.html` — MCP docs
- `dist/docs/sdk/index.html` — SDK docs
- `dist/docs/agent/index.html` — Agent guide
- CSS/JS assets in `dist/_astro/`

- [ ] **Step 3: Preview the built site**

```bash
cd packages/site && npx astro preview --port 4321
```

Visit `http://localhost:4321` and verify:
- Landing page: hero, architecture, features, quick start, footer all render
- `/docs/mcp` — content, sidebar, TOC
- `/docs/sdk` — content, sidebar, TOC
- `/docs/agent` — content, sidebar, TOC
- Mobile responsiveness (resize browser window)
- All internal links work
- External links open in new tab

- [ ] **Step 4: Verify no existing functionality is broken**

```bash
cd /home/jeanclaude/workspace/cspr-trade-mcp && npm test
```

Expected: All existing tests pass (site package has no tests, but SDK/MCP tests should still pass).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(site): complete landing page and documentation site

- Landing page with hero, architecture diagram, feature cards, quick start
- Developer docs sourced from MCP/SDK READMEs
- Agent guide sourced from SKILL.md
- Dark theme with CSPR.trade red branding
- Mobile responsive with collapsible sidebar
- Code blocks with syntax highlighting and copy buttons
- Updated nginx config for static site + raw doc files"
```

---

## Task Summary

| Task | Description | Estimate |
|------|-------------|----------|
| 1 | Scaffold Astro workspace | 3 min |
| 2 | Global styles, fonts, base layout | 5 min |
| 3 | Navbar component | 5 min |
| 4 | Hero section | 3 min |
| 5 | Architecture diagram | 5 min |
| 6 | Feature cards | 3 min |
| 7 | Quick start section | 5 min |
| 8 | Footer | 2 min |
| 9 | Docs layout (sidebar + TOC) | 8 min |
| 10 | MCP docs page | 3 min |
| 11 | SDK docs page | 2 min |
| 12 | Agent guide page | 3 min |
| 13 | Nginx config update | 3 min |
| 14 | Full build + verification | 5 min |

**Total estimated time: ~55 minutes**
