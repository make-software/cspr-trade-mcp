---
title: I Gave Claude the Ability to Trade on a DEX. Here's How It Works.
published: true
description: The hard problem of agentic DeFi isn't the DEX — it's the keys. Here's how we solved it with MCP, non-custodial architecture, and a 22-tool public surface plus optional local signing.
tags: mcp, ai, blockchain, defi
canonical_url: https://mcp.cspr.trade
---

# I Gave Claude the Ability to Trade on a DEX. Here's How It Works.

Here's a simple question: *Can an AI agent trade on a DEX without ever touching a private key?*

Not read-only. Not "here's a price feed." Actually build a swap, sign it, submit it — end to end. And the answer, until now, was basically no.

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
│   custom)    │◀─────│  Returns UNSIGNED│      │              │
└──────┬───────┘      │  transaction JSON│      └──────────────┘
       │              └──────────────────┘
       │
       ▼
┌─────────────┐
│ LOCAL SIGNER │  ← Keys live here. Nowhere else.
│ (your machine)│
└──────┬───────┘
       │
       ▼
  Submit signed tx → on-chain execution
```

The public MCP server never sees your private key. It can't. It builds an unsigned deploy, hands it back to the agent, and the agent signs locally before submitting. Zero custody. Zero trust assumptions.

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

Two servers, one architecture: the **remote server** handles market data, price history, analysis, and unsigned transaction building. The **local signer** signs them with your key. Keys never leave your machine.

No API key. No auth. No accounts. Just add the config and your agent can trade on [CSPR.trade](https://cspr.trade), the leading DEX on Casper Network.

> **Just want to explore?** The remote server works standalone — skip `cspr-signer` and your agent still gets the full **22-tool public surface** for market data, quotes, analysis, account queries, and unsigned transaction building.

---

## What Your Agent Can Actually Do

### 22 public tools across five categories

**Market data + price history**
- `get_tokens`
- `get_pairs`
- `get_pair_details`
- `get_quote`
- `get_currencies`
- `get_pair_price_history`
- `get_token_price_history`

**Trade analysis**
- `estimate_price_impact`
- `estimate_slippage`
- `analyze_trade`
- `optimal_liquidity_amounts`

**Trading**
- `build_swap`
- `build_approve_token`
- `submit_transaction`

**Liquidity**
- `build_add_liquidity`
- `build_remove_liquidity`

**Account + portfolio**
- `get_token_balance`
- `get_liquidity_positions`
- `get_impermanent_loss`
- `get_swap_history`
- `get_portfolio_value`
- `get_position_status`

### Optional local signer
- `sign_deploy`

That makes **23 total tools across the full two-server setup**.

The key insight: your agent can freely explore market data, candles, positions, and quotes on the remote server. When it needs to sign, it crosses to the local signer — then the signed transaction goes back to the remote server for submission. Keys never leave your machine.

---

## Walkthrough: Swapping 1000 CSPR for WETH

Here's what actually happens when you tell Claude "Swap 1000 CSPR for WETH":

**Step 1 — Agent gets a quote** *(remote server)*
```
→ get_quote(token_in: "CSPR", token_out: "WETH", amount: "1000", type: "exact_in")
← { amountOutFormatted: "0.285", priceImpact: "0.02%", pathSymbols: [...] }
```

**Step 2 — Agent analyzes the trade** *(remote server)*
```
→ analyze_trade(token_in: "CSPR", token_out: "WETH", amount: "1000")
← { recommendation: "proceed", ... }
```

**Step 3 — Agent builds the swap** *(remote server)*
```
→ build_swap(
    token_in: "CSPR",
    token_out: "WETH",
    amount: "1000",
    type: "exact_in",
    sender_public_key: "02036d..."
  )
← { ... unsigned transaction JSON ... }
```

**Step 4 — Local signing** *(local signer — your machine)*
```
→ sign_deploy(deploy_json: "...", key_source: "pem_file")
← { signed transaction, signer public key, transaction hash }
```

**Step 5 — Submit** *(remote server)*
```
→ submit_transaction(signed_deploy_json: "...")
← { transactionHash: "a1b2c3..." }
```

Notice the boundary: the public server handles discovery, analysis, and transaction construction. The local signer handles the key. The signed transaction crosses back for submission — but the private key never does.

---

## Self-Hosting and Testnet

Want to run everything locally, or develop against testnet? Run the main server on your machine:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "command": "npx",
      "args": ["@make-software/cspr-trade-mcp"],
      "env": {
        "CSPR_TRADE_NETWORK": "testnet"
      }
    }
  }
}
```

If you also want local automated signing, run a second `cspr-signer` server with `--signer`.

The SDK is available separately for custom integrations:

```bash
npm install @make-software/cspr-trade-mcp-sdk
```

---

## Why This Matters Beyond Casper

Every blockchain is going to face this problem. As AI agents get more capable, they'll need to interact with DeFi — and the custody question does not disappear just because the agent is smarter.

The pattern here — **build remote, sign local** — isn't Casper-specific. It's a sane design for any chain where you want agents to transact without surrendering keys.

---

## OpenClaw Skill

Using [OpenClaw](https://openclaw.ai)? Install the skill from [ClawHub](https://clawhub.com) and your agent gets the full workflow guide — intent classification, price-history lookups, signing flows, safety checks, and tool-selection rules — baked in:

```bash
npx clawhub@latest install cspr-trade-mcp
```

The skill teaches your agent *how* to use the full tool surface. That's the difference between "here are some DeFi tools" and "here's how an actually useful DeFi agent behaves."

---

## Links

- **Public endpoint:** [mcp.cspr.trade/mcp](https://mcp.cspr.trade/mcp)
- **GitHub:** [make-software/cspr-trade-mcp](https://github.com/make-software/cspr-trade-mcp)
- **npm:** [@make-software/cspr-trade-mcp](https://www.npmjs.com/package/@make-software/cspr-trade-mcp)
- **ClawHub skill:** [`cspr-trade-mcp`](https://clawhub.com/skills/cspr-trade-mcp)
- **Agent SKILL.md:** [mcp.cspr.trade/SKILL.md](https://mcp.cspr.trade/SKILL.md)
- **CSPR.trade:** [cspr.trade](https://cspr.trade)

Questions? Drop a comment or [open an issue](https://github.com/make-software/cspr-trade-mcp/issues).

— Built by [MAKE](https://make.services), the team behind Casper's core developer tools.
