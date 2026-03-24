# CSPR.trade MCP Landing Page — Design Spec

## Overview

A static landing page and documentation site for `mcp.cspr.trade` — the public face of the CSPR.trade MCP project. Serves as a documentation hub for both human developers and AI agents, replacing the default nginx page.

**Built with Astro** as a new `packages/site` workspace in the monorepo. Produces pure static HTML/CSS/JS. Docs pages import directly from existing README.md files so content stays in sync with source.

## Tech Stack

- **Framework:** Astro (static site generator, SSG mode only)
- **Styling:** Tailwind CSS v4
- **Syntax highlighting:** Shiki (built into Astro)
- **Fonts:** Inter (headings + body), JetBrains Mono (code) — self-hosted
- **Output:** Static HTML/CSS/JS → served by nginx
- **No runtime, no client-side framework, no JS frameworks needed**

## Site Map

```
mcp.cspr.trade/                → Landing page (hero + architecture + CTAs)
mcp.cspr.trade/docs/mcp        → MCP Server docs (from packages/mcp/README.md)
mcp.cspr.trade/docs/sdk        → SDK docs (from packages/sdk/README.md)
mcp.cspr.trade/docs/agent      → Agent guide (rendered from docs/SKILL.md)
mcp.cspr.trade/SKILL.md        → Raw text (served by nginx, not Astro)
mcp.cspr.trade/llms.txt        → Raw text (served by nginx, not Astro)
mcp.cspr.trade/mcp             → Proxy to MCP server (existing, unchanged)
mcp.cspr.trade/health          → Proxy to health endpoint (existing, unchanged)
```

## Design Language

### Color Palette

| Role | Value | Usage |
|------|-------|-------|
| Background | `#0a0a0f` | Page base, dark theme |
| Surface | `#151520` | Cards, code blocks, sidebar |
| Border | `rgba(255,255,255,0.06)` | Card edges, dividers |
| Border hover | `rgba(255,255,255,0.12)` | Interactive elements |
| Primary accent | `#FF0012` | CTAs, active nav, logo color |
| Primary hover | `#ff1a2e` | Button hover states |
| Primary glow | `rgba(255,0,18,0.15)` | Subtle glow behind accent elements |
| Text primary | `#f5f5f5` | Headings, body text |
| Text secondary | `#a0a0a0` | Descriptions, metadata |
| Text muted | `#666666` | Footer, less important text |

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Hero headline | Inter | 800 | 3.5rem (desktop), 2.25rem (mobile) |
| Section headings | Inter | 700 | 1.875rem |
| Body text | Inter | 400 | 1rem |
| Nav links | Inter | 500 | 0.875rem |
| Code inline | JetBrains Mono | 400 | 0.875rem |
| Code blocks | JetBrains Mono | 400 | 0.8125rem |

### Visual Effects

- **Glass-morphism cards:** Semi-transparent backgrounds (`rgba(255,255,255,0.03)`), subtle border, soft backdrop blur
- **Gradient overlays:** Radial red glow behind hero section (very subtle), gradient mesh on background
- **Architecture diagram:** CSS-styled boxes with connecting lines (not ASCII), optional subtle animated dots flowing along paths
- **Hover states:** Cards lift slightly on hover with border brightening
- **Code blocks:** Dark surface with Shiki syntax highlighting, copy-to-clipboard button

## Page Designs

### Landing Page (`/`)

**Navigation bar:**
- Left: CSPR.trade logo SVG + "MCP" text badge (small, pill-shaped)
- Right: "Docs" link, "GitHub" link (icon), "cspr.trade" link
- Sticky, transparent background that gets a backdrop blur on scroll

**Hero section:**
- Headline: `AI Agent Integration for CSPR.trade DEX`
- Subtitle: `Connect AI agents to on-chain DeFi on Casper — market data, swaps, liquidity management. Non-custodial by design.`
- Two CTA buttons side by side:
  - **"I'm a Developer"** → Red filled button → `/docs/mcp`
  - **"I'm an Agent"** → Red outlined/ghost button → `/docs/agent`
- Subtle red radial glow behind the hero text

**Architecture section:**
- Section heading: `How It Works`
- Visual diagram showing the flow: `AI Agent → MCP Server → SDK → CSPR.trade API`
- Plus the local signer branch below MCP Server
- Rendered as styled CSS boxes with labels, connected by lines
- Brief description below: explains the non-custodial flow

**Feature cards section:**
- 4 cards in a responsive grid (2x2 on desktop, stacked on mobile):
  1. **14 MCP Tools** — Market data, swaps, liquidity, signing
  2. **Non-Custodial** — Transaction signing stays local, keys never leave your machine
  3. **Dual Transport** — stdio for local (Claude Code), HTTP for remote agents
  4. **TypeScript SDK** — Programmatic access, full type safety, tree-shakeable

**Quick start section:**
- Section heading: `Quick Start`
- Two tabbed code blocks:
  - Tab 1 "Claude Code (stdio)": Shows the `.claude.json` MCP config
  - Tab 2 "HTTP (remote)": Shows the env vars + command
- Copy button on each

**Public endpoint section:**
- Small callout card: "Public mainnet endpoint available at `https://mcp.cspr.trade/mcp`"
- Health check URL shown

**Footer:**
- Links: GitHub repo, cspr.trade, Casper Network, docs
- "MIT License" badge
- Built with ❤️ text

### Docs Layout (shared by `/docs/mcp`, `/docs/sdk`, `/docs/agent`)

**Three-column layout (desktop):**
- **Left sidebar (240px):** Navigation links
  - "MCP Server" → `/docs/mcp`
  - "SDK" → `/docs/sdk`
  - "Agent Guide" → `/docs/agent`
  - Divider
  - "GitHub" → external
  - "cspr.trade" → external
  - Active page highlighted with red left border + background tint
- **Main content (flex):** Rendered markdown
  - Proper heading hierarchy with anchor links
  - Tables styled with alternating row backgrounds
  - Code blocks with syntax highlighting + copy button
  - Inline code styled with surface background
- **Right sidebar (200px):** Table of contents
  - Auto-generated from h2/h3 headings
  - Scroll-spy highlighting current section
  - Sticky positioned

**Mobile responsive:**
- Left sidebar → hamburger menu (slide-in drawer)
- Right TOC → hidden (or collapsible above content)
- Content goes full-width with appropriate padding

### Docs Content Sources

| Page | Source | Processing |
|------|--------|-----------|
| `/docs/mcp` | `packages/mcp/README.md` | Strip H1, render as Astro markdown |
| `/docs/sdk` | `packages/sdk/README.md` | Strip H1, render as Astro markdown |
| `/docs/agent` | `docs/SKILL.md` | Strip YAML frontmatter, render as Astro markdown |

**Important:** Content is imported at build time from the source files. The docs pages are always in sync with the package READMEs. No content duplication.

## File Structure

```
packages/site/
├── package.json
├── astro.config.mjs
├── tailwind.config.mjs          # If needed (Tailwind v4 may use CSS config)
├── tsconfig.json
├── public/
│   ├── favicon.svg              # CSPR.trade favicon (from their site)
│   ├── favicon.png
│   └── fonts/
│       ├── inter/               # Self-hosted Inter font files
│       └── jetbrains-mono/      # Self-hosted JetBrains Mono font files
├── src/
│   ├── assets/
│   │   └── logo.svg             # CSPR.trade logo SVG
│   ├── components/
│   │   ├── Navbar.astro         # Sticky nav with logo + links
│   │   ├── Hero.astro           # Hero section with CTAs
│   │   ├── Architecture.astro   # Visual architecture diagram
│   │   ├── FeatureCards.astro   # 4-card grid section
│   │   ├── QuickStart.astro    # Tabbed code examples
│   │   ├── Footer.astro         # Site footer
│   │   ├── DocsSidebar.astro   # Left nav for docs
│   │   ├── TableOfContents.astro # Right TOC for docs
│   │   └── CopyButton.astro    # Code block copy button (small island)
│   ├── layouts/
│   │   ├── BaseLayout.astro     # HTML shell, fonts, meta tags
│   │   └── DocsLayout.astro     # Three-column docs layout
│   ├── pages/
│   │   ├── index.astro          # Landing page
│   │   └── docs/
│   │       ├── mcp.astro        # MCP Server docs page
│   │       ├── sdk.astro        # SDK docs page
│   │       └── agent.astro      # Agent guide page
│   └── styles/
│       └── global.css           # Tailwind imports, custom CSS, font-face
└── dist/                        # Build output (gitignored)
```

## Nginx Configuration Updates

The existing `mcp.cspr.trade.conf` needs updates to:

1. **Serve the static site** from the Astro build output directory as the default root
2. **Serve raw files** at `/SKILL.md` and `/llms.txt` directly from `docs/`
3. **Keep existing proxy routes** for `/mcp` and `/health` unchanged

```nginx
server {
    # ... existing SSL config ...

    root /path/to/cspr-trade-mcp/packages/site/dist;
    index index.html;

    # Raw doc files — served as plain text
    location = /SKILL.md {
        alias /path/to/cspr-trade-mcp/docs/SKILL.md;
        default_type text/plain;
    }

    location = /llms.txt {
        alias /path/to/cspr-trade-mcp/docs/llms.txt;
        default_type text/plain;
    }

    # Existing MCP proxy (unchanged)
    location /health {
        proxy_pass http://127.0.0.1:3010/health;
        # ... existing proxy config ...
    }

    location /mcp {
        proxy_pass http://127.0.0.1:3010/mcp;
        # ... existing proxy config ...
    }

    # Static site fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Order matters:** Exact locations (`= /SKILL.md`) and proxy locations (`/mcp`, `/health`) match before the fallback `try_files`.

## Build & Deploy

```bash
# From monorepo root
npm run build              # Builds SDK + MCP + Site

# Or just the site
cd packages/site
npm run build              # Outputs to packages/site/dist/

# Deploy: just reload nginx (it serves from dist/)
sudo systemctl reload nginx
```

The `packages/site/package.json` will include:
- `"build"` script that runs `astro build`
- `"dev"` script that runs `astro dev` for local development

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 768px | Single column, hamburger nav, stacked cards |
| Tablet | 768–1024px | Two-column docs (no right TOC), 2-col card grid |
| Desktop | > 1024px | Full three-column docs, 4-col feature grid |

## Acceptance Criteria

- [ ] `https://mcp.cspr.trade/` shows landing page with CSPR.trade branding, hero, architecture diagram, feature cards, quick start
- [ ] "I'm a Developer" CTA navigates to `/docs/mcp`
- [ ] "I'm an Agent" CTA navigates to `/docs/agent`
- [ ] `/docs/mcp` shows MCP Server documentation with sidebar nav and TOC
- [ ] `/docs/sdk` shows SDK documentation with sidebar nav and TOC
- [ ] `/docs/agent` shows Agent Guide (SKILL.md content) with sidebar nav and TOC
- [ ] `https://mcp.cspr.trade/SKILL.md` serves raw `docs/SKILL.md` as `text/plain`
- [ ] `https://mcp.cspr.trade/llms.txt` serves raw `docs/llms.txt` as `text/plain`
- [ ] Existing `/mcp` and `/health` endpoints work unchanged
- [ ] Site is mobile responsive at all breakpoints
- [ ] Code blocks have syntax highlighting and copy buttons
- [ ] Dark theme with CSPR.trade red (`#FF0012`) accent
- [ ] Docs content is sourced from READMEs (no duplication)
- [ ] `npm run build` from monorepo root builds the site
- [ ] Build output is pure static files (no server-side runtime)
