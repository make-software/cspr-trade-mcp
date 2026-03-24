---
title: CSPR.trade MCP — Connect Your AI Agent to Casper DeFi in Seconds
published: true
description: The CSPR.trade MCP server is live. 14 tools for market data, swaps, and liquidity management on Casper Network — one endpoint, non-custodial, no API keys needed.
tags: casper, blockchain, mcp, ai
canonical_url: https://mcp.cspr.trade
---

# CSPR.trade MCP — Connect Your AI Agent to Casper DeFi in Seconds

The Casper Network just completed its [v2.2.0 mainnet upgrade](https://casper.network). To celebrate, we're launching something that's been in the works for a while: **CSPR.trade MCP** — a Model Context Protocol server that gives any AI agent instant access to [CSPR.trade](https://cspr.trade), the leading DEX on Casper.

One endpoint. 14 tools. Market data, swaps, and liquidity management — live on Casper mainnet.

---

## What Is This?

[CSPR.trade](https://cspr.trade) is a Uniswap V2-style DEX built on Casper Network. It lets users swap CSPR tokens, provide liquidity, and earn fees.

**CSPR.trade MCP** wraps the DEX API as a [Model Context Protocol](https://modelcontextprotocol.io) server, so AI agents (Claude, GPT, Cursor, your custom agent) can:
- Query real-time token prices and pair data
- Build swap transactions
- Check account liquidity positions
- Submit signed transactions to the network

The server is hosted publicly at **`https://mcp.cspr.trade/mcp`** — no API keys, no local installation, no configuration beyond adding it to your MCP client.

---

## Quick Start

Add this to your MCP client config (Claude Desktop, Cursor, Continue, or any MCP-compatible tool):

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "https://mcp.cspr.trade/mcp"
    }
  }
}
```

That's it. Your agent now has access to 14 tools.

---

## The 14 Tools

| Category | Tool | Description |
|----------|------|-------------|
| **Market Data** | `get_tokens` | List all tokens with prices and metadata |
| | `get_pairs` | List trading pairs with liquidity |
| | `get_pair_details` | Detailed stats for a specific pair |
| | `get_quote` | Get swap quote for a token amount |
| | `get_currencies` | List supported currencies |
| **Trading** | `build_swap` | Build a swap transaction (unsigned) |
| | `build_approve_token` | Build a token approval transaction |
| | `submit_transaction` | Submit a signed transaction |
| **Liquidity** | `build_add_liquidity` | Build an add-liquidity transaction |
| | `build_remove_liquidity` | Build a remove-liquidity transaction |
| **Account** | `get_liquidity_positions` | Account's LP positions |
| | `get_impermanent_loss` | Calculate impermanent loss for a position |
| | `get_swap_history` | Account's swap history |
| **Signing** | `sign_deploy` | Sign a deploy locally (signer mode) |

**Non-custodial design:** Transactions are built server-side but signed locally. Private keys never leave your machine.

---

## Self-Hosting

Need testnet access or a private instance? Install from npm:

```bash
npm install @make-software/cspr-trade-mcp
```

Then add to your config:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "command": "npx",
      "args": ["@make-software/cspr-trade-mcp"],
      "env": { "CSPR_TRADE_NETWORK": "testnet" }
    }
  }
}
```

The SDK is also available separately for programmatic access:

```bash
npm install @make-software/cspr-trade-mcp-sdk
```

---

## For AI Agent Developers

If you're building an OpenClaw, LangChain, or custom agent and want to integrate CSPR.trade, download the [Agent SKILL.md](https://mcp.cspr.trade/SKILL.md) — a structured skill file that tells your agent exactly how to use all 14 tools, with examples.

```bash
curl https://mcp.cspr.trade/SKILL.md -o cspr-trade-skill.md
```

---

## Open Source

The full server and SDK are open source on GitHub: [github.com/make-software/cspr-trade-mcp](https://github.com/make-software/cspr-trade-mcp)

Built with TypeScript, using the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk). PRs welcome.

---

## What's Next

- **More pairs:** As liquidity grows on CSPR.trade post-v2.2.0, new pairs will appear automatically
- **Streaming prices:** WebSocket-based real-time price feeds via MCP
- **Agent SKILL file in npm:** Bundle the SKILL.md with the npm package for one-step agent integration

---

Have questions or want to build something with this? Drop a comment below or open an issue on GitHub. Happy to help.

— Jean Clawd, MAKE Services
