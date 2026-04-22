# Getting Started

Connect your AI agent to **CSPR.trade** — the Uniswap V2 DEX on the Casper Network — in under a minute. No local setup required.

## Public Endpoint

A production MCP server is live at:

```
https://mcp.cspr.trade/mcp
```

This is a Streamable HTTP endpoint on Casper **mainnet**. It exposes 20 tools for market data, swaps, liquidity, trade analysis, and account queries — ready for any MCP-compatible client.

Health check: [`https://mcp.cspr.trade/health`](https://mcp.cspr.trade/health)

## Connect Your Client

### Claude Desktop / Claude Code

Add to your MCP settings (`.claude.json` or Claude Desktop config):

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "https://mcp.cspr.trade/mcp"
    }
  }
}
```

That's it. Claude can now check token prices, get swap quotes, and explore liquidity pools on Casper.

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "https://mcp.cspr.trade/mcp"
    }
  }
}
```

### OpenClaw / AI Agent Frameworks

Install the skill from [ClawHub](https://clawhub.com):

```bash
npx clawhub@latest install cspr-trade-mcp
```

This installs a complete agent skill with workflow instructions — intent classification, quote-before-swap patterns, pre-trade analysis, price impact warnings, signing flows, and error handling. Your agent reads it and knows how to use all 20 tools correctly.

Alternatively, point your agent at the raw SKILL.md:

```
https://mcp.cspr.trade/SKILL.md
```

There's also an [`llms.txt`](https://mcp.cspr.trade/llms.txt) with the full tool reference for LLM context.

### Any MCP Client

Point your client at:

```
https://mcp.cspr.trade/mcp
```

The server speaks **Streamable HTTP** (the standard MCP HTTP transport). No API key required.

## What You Can Do

Once connected, your agent has access to **20 tools**:

### Market Data (read-only, no wallet needed)
- **`get_tokens`** — List tradable tokens with USD/EUR pricing
- **`get_pairs`** — Browse trading pairs with reserves and stats
- **`get_pair_details`** — Deep dive into a specific pair
- **`get_quote`** — Get swap quotes with routing, price impact, slippage
- **`get_currencies`** — Available fiat currencies for pricing

### Trade Analysis (read-only, no wallet needed)
- **`estimate_price_impact`** — Check how much your trade moves the price before executing
- **`estimate_slippage`** — Get expected output and recommended slippage tolerance
- **`analyze_trade`** — Full pre-trade analysis with actionable recommendation (proceed/caution/high_risk/not_recommended)
- **`optimal_liquidity_amounts`** — Calculate optimal paired token amounts for LP deposits

### Trading (requires a Casper wallet)
- **`build_swap`** — Build an unsigned swap transaction
- **`build_approve_token`** — Build a token approval transaction
- **`submit_transaction`** — Submit a signed transaction to the network

### Liquidity (requires a Casper wallet)
- **`build_add_liquidity`** — Build an add-liquidity transaction
- **`build_remove_liquidity`** — Build a remove-liquidity transaction

### Account
- **`get_liquidity_positions`** — View LP positions for any account
- **`get_impermanent_loss`** — Calculate IL for a position
- **`get_swap_history`** — Transaction history by account or pair
- **`get_portfolio_value`** — Aggregate LP positions into CSPR + USD totals
- **`get_position_status`** — Per-position IL and current token amounts

### Local Signing
- **`sign_deploy`** — Sign transactions locally (signer mode only, see [Self-Hosting](/docs/self-hosting))

## Try It Now

Ask your agent:

> "What tokens are available on CSPR.trade?"

> "Get me a quote for swapping 1000 CSPR to USDT"

> "Show me the top liquidity pools by reserves"

> "Analyze a trade of 500,000 CSPR to USDT — is it safe?"

Market data and trade analysis queries work immediately — no wallet needed.

## Non-Custodial Design

When executing trades, the MCP server **never** handles private keys. The flow is:

1. **Agent** calls `build_swap` → gets unsigned transaction JSON
2. **You** sign the transaction with your own key (locally or via a separate signer)
3. **Agent** calls `submit_transaction` with the signed transaction

Your private key never touches the MCP server or the network.

## Next Steps

- **[Agent Guide](/docs/agent)** — Detailed workflow guide for AI agents using these tools
- **[Self-Hosting](/docs/self-hosting)** — Run your own MCP server with the npm packages
- **[SDK Reference](/docs/sdk)** — Use the TypeScript SDK directly in your own code
