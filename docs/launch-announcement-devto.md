---
title: I Gave Claude the Ability to Trade on a DEX. Here's How It Works.
published: true
description: The hard problem of agentic DeFi isn't the DEX — it's the keys. Here's how we solved it with MCP, non-custodial architecture, and one line of config.
tags: mcp, ai, blockchain, defi
canonical_url: https://mcp.cspr.trade
---

# I Gave Claude the Ability to Trade on a DEX. Here's How It Works.

Here's a simple question: *Can an AI agent trade on a DEX without ever touching a private key?*

Not read-only. Not "here's a price feed." Actually build a swap, sign it, submit it — end to end. And the answer, until now, was no.

Every DeFi MCP server I looked at fell into one of two camps:

1. **Read-only** — your agent can look at prices, maybe get a quote, but can't actually do anything
2. **Custodial** — hand over your keys and trust the server not to drain your wallet

Neither is acceptable. Read-only is a toy. Custodial is a liability. So we built a third option.

---

## The Hard Problem: It's Not the DEX. It's the Keys.

The hard problem of agentic DeFi isn't connecting to a DEX. Any wrapper can do that. The hard problem is: **who holds the keys?**

CSPR.trade MCP does neither read-only nor custody. The agent builds the transaction remotely, your machine signs it locally, and **keys never move**. That's not a feature. That's the architecture.

Here's the flow:

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│  AI Agent    │─────▶│  CSPR.trade MCP  │─────▶│  Casper DEX │
│  (Claude,    │      │  Server          │      │  (on-chain)  │
│   Cursor,    │      │                  │      │              │
│   custom)    │◀─────│  Returns UNSIGNED │      │              │
└──────┬───────┘      │  transaction JSON │      └──────────────┘
       │              └──────────────────┘
       │
       ▼
┌─────────────┐
│  LOCAL SIGNER│  ← Keys live here. Nowhere else.
│  (your      │
│   machine)   │
└──────┬───────┘
       │
       ▼
  Submit signed tx → on-chain execution
```

The MCP server never sees your private key. It can't. It builds an unsigned deploy, hands it back to the agent, and the agent signs locally before submitting. Zero custody. Zero trust assumptions.

---

## Try It: Two Servers, Zero Custody

Add this to Claude Desktop, Cursor, or any MCP client:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "https://mcp.cspr.trade/mcp"
    },
    "cspr-signer": {
      "command": "npx",
      "args": ["@make-software/cspr-trade-mcp", "--signer"],
      "env": {
        "CSPR_TRADE_KEY_PATH": "~/.casper/secret_key.pem"
      }
    }
  }
}
```

Two servers, one architecture: the **remote server** handles market data and builds unsigned transactions. The **local signer** signs them with your key. Keys never leave your machine — and the remote server doesn't even have the signing tools. It *can't* touch your keys, by design.

No API key. No auth. No accounts. Just add the config and your agent can trade on [CSPR.trade](https://cspr.trade), the leading DEX on Casper Network.

> **Just want to explore?** The remote server works standalone — skip `cspr-signer` and your agent gets full market data, quotes, and can build unsigned transactions. Add the signer when you're ready to execute.

---

## What Your Agent Can Actually Do

14 tools, three categories:

**See everything (no wallet needed):**
- `get_tokens` — all tokens with live prices
- `get_pairs` — trading pairs with liquidity depth
- `get_pair_details` — deep stats on any pair
- `get_quote` — "How much WETH do I get for 10,000 CSPR?"
- `get_currencies` — supported currencies
- `get_swap_history` — any account's trade history
- `get_liquidity_positions` — LP positions and value
- `get_impermanent_loss` — calculate IL for any position

**Build transactions (returns unsigned JSON):**
- `build_swap` — construct a swap deploy
- `build_approve_token` — token approval for the router
- `build_add_liquidity` — add to a liquidity pool
- `build_remove_liquidity` — withdraw from a pool

**Sign locally:**
- `sign_deploy` — sign with a local key (signer mode only)

**Submit (back to remote server):**
- `submit_transaction` — broadcast the signed deploy to the Casper network

The key insight: your agent can freely explore market data and build transactions on the remote server. When it needs to sign, it crosses to the local signer — then the signed transaction goes *back* to the remote server for submission. Keys never leave your machine.

---

## Walkthrough: Swapping 1000 CSPR for WETH

Here's what actually happens when you tell Claude "Swap 1000 CSPR for WETH":

**Step 1 — Agent gets a quote** *(remote server)*
```
→ get_quote(tokenIn: "CSPR", tokenOut: "WETH", amountIn: "1000")
← { amountOut: "0.285", priceImpact: "0.02%", route: [...] }
```

**Step 2 — Agent builds the swap** *(remote server)*
```
→ build_swap(
    publicKey: "02036d...",
    tokenIn: "CSPR",
    tokenOut: "WETH",
    amountIn: "1000",
    slippage: 0.5
  )
← { deploy: { ... unsigned transaction JSON ... } }
```

**Step 3 — Local signing** *(local signer — your machine)*
```
→ sign_deploy(deploy_json: "...", key_source: "pem_file")
← { signedDeploy: { ... } }
```

**Step 4 — Submit** *(remote server)*
```
→ submit_transaction(signed_deploy_json: "...")
← { deployHash: "a1b2c3...", status: "submitted" }
```

Notice the boundary: Steps 1-2 hit the remote server, Step 3 runs on the local signer, and Step 4 goes back to the remote server to submit. The signed transaction crosses back — but the private key never does. Your agent routes each tool call to the right server automatically.

---

## Self-Hosting and Testnet

Want to run everything locally, or develop against testnet? Run the full server on your machine:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "command": "npx",
      "args": ["@make-software/cspr-trade-mcp"],
      "env": {
        "CSPR_TRADE_NETWORK": "testnet",
        "CSPR_TRADE_KEY_PATH": "~/.casper/secret_key.pem"
      }
    }
  }
}
```

In stdio mode, the full server includes all tools — market data, transaction building, signing, and submission — in a single process. Your keys stay local because the server *is* local.

The SDK is also available separately for custom integrations:

```bash
npm install @make-software/cspr-trade-mcp-sdk
```

---

## Why This Matters Beyond Casper

Every blockchain is going to face this problem. As AI agents get more capable, they'll need to interact with DeFi — and the custody question doesn't go away just because the agent is smarter.

The pattern we're using here — **build remote, sign local** — isn't Casper-specific. It's a design pattern for any chain where you want agents to transact without surrendering keys. We just shipped it first.

---

## Context: Casper v2.2.0

This ships the same week Casper Network upgraded to v2.2.0 on mainnet. The v2.2.0 release marks a notable protocol upgrade, and CSPR.trade MCP is the first DeFi MCP server built for it. If you want to see what building on Casper looks like right now — this is it.

---

## Links

- **Public endpoint:** [mcp.cspr.trade/mcp](https://mcp.cspr.trade/mcp) — add it and go
- **GitHub:** [make-software/cspr-trade-mcp](https://github.com/make-software/cspr-trade-mcp) — MIT, PRs welcome
- **npm:** [@make-software/cspr-trade-mcp](https://www.npmjs.com/package/@make-software/cspr-trade-mcp)
- **Agent SKILL.md:** [mcp.cspr.trade/SKILL.md](https://mcp.cspr.trade/SKILL.md) — structured instructions for AI agents
- **CSPR.trade:** [cspr.trade](https://cspr.trade) — the DEX itself

Questions? Drop a comment or [open an issue](https://github.com/make-software/cspr-trade-mcp/issues).

— Built by [MAKE](https://make.services), the team behind Casper's core developer tools.
