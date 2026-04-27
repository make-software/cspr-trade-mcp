# Getting Started

Connect your AI agent to **CSPR.trade** — the Uniswap V2 DEX on the Casper Network — in under a minute. No local setup required.

## Public Endpoint

A production MCP server is live at:

```
https://mcp.cspr.trade/mcp
```

This is a Streamable HTTP endpoint on Casper **mainnet**. It exposes **24 public tools** for market data, price history, swaps, liquidity, trade analysis, and account queries — ready for any MCP-compatible client.

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

That's it. Claude can now check token prices, fetch price history, get swap quotes, and explore liquidity pools on Casper.

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

This installs a complete agent skill with workflow instructions — intent classification, quote-before-swap patterns, pre-trade analysis, price-impact warnings, signing flows, price-history lookups, and error handling. Your agent reads it and knows how to use all **24 public tools** correctly.

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

Once connected, your agent has access to **24 public tools**:

### Market Data (read-only, no wallet needed)
- **`get_tokens`** — List tradable tokens with optional fiat pricing
- **`get_pairs`** — Browse trading pairs with reserves and stats
- **`get_pair_details`** — Deep dive into a specific pair
- **`get_quote`** — Get swap quotes with routing, price impact, and slippage
- **`get_currencies`** — Available fiat currencies for pricing
- **`get_pair_price_history`** — OHLCV candlestick history for a specific pair
- **`get_token_price_history`** — OHLCV history for a token via its primary trading pair

### Trade Analysis (read-only, no wallet needed)
- **`estimate_price_impact`** — Check how much your trade moves the price before executing
- **`estimate_slippage`** — Get expected output and recommended slippage tolerance
- **`analyze_trade`** — Full pre-trade analysis with actionable recommendation (`proceed`, `caution`, `high_risk`, `not_recommended`)
- **`optimal_liquidity_amounts`** — Calculate optimal paired token amounts for LP deposits

### Trading (requires a Casper wallet)
- **`build_swap`** — Build an unsigned swap transaction
- **`build_approve_token`** — Build a token approval transaction
- **`submit_transaction`** — Submit a signed transaction to the network

### Liquidity (requires a Casper wallet)
- **`build_add_liquidity`** — Build an add-liquidity transaction
- **`build_remove_liquidity`** — Build a remove-liquidity transaction

### Account
- **`get_token_balance`** — CEP-18 fungible token balances for an account
- **`get_liquidity_positions`** — View LP positions for any account
- **`get_impermanent_loss`** — Calculate IL for a position
- **`get_swap_history`** — Transaction history by public key or pair
- **`get_portfolio_value`** — Aggregate LP positions into estimated CSPR + fiat totals
- **`get_position_status`** — Per-position IL and current token amounts

### Optional Local Signing (+1 tool in signer mode)
- **`sign_deploy`** — Sign transactions locally in a separate signer-only MCP instance

That full two-server setup gives your agent **23 total tools**.

## Try It Now

Ask your agent:

> "What tokens are available on CSPR.trade?"

> "Get me a quote for swapping 1000 CSPR to USDT"

> "Show me the top liquidity pools by reserves"

> "Show me 7 daily candles for sCSPR"

> "Analyze a trade of 500,000 CSPR to USDT — is it safe?"

Market data and trade analysis queries work immediately — no wallet needed.

## Non-Custodial Design

When executing trades, the MCP server **never** handles private keys. The flow is:

1. **Agent** calls `build_swap` → gets unsigned transaction JSON
2. **You or a local signer** sign the transaction on your machine
3. **Agent** calls `submit_transaction` with the signed transaction

If you configure a separate `cspr-signer` MCP instance, the agent can call `sign_deploy` automatically without ever seeing the private key.

## Next Steps

- **[Agent Guide](/docs/agent)** — Detailed workflow guide for AI agents using these tools
- **[Self-Hosting](/docs/self-hosting)** — Run your own MCP server with the npm packages
- **[SDK Reference](/docs/sdk)** — Use the TypeScript SDK directly in your own code

## TypeScript Type Imports

All public types are exported from the package root, enabling clean type-only imports:

```typescript
import type {
  CsprTradeClientConfig,
  SwapParams, QuoteParams, Quote,
  PairQuery, PaginatedResult, Pair,
  Token, TokenBalance, NativeCsprBalance,
  TradeAnalysis, PriceImpactEstimate, SlippageEstimate,
  OHLCVCandle, PriceHistoryInterval,
  LiquidityPosition, AddLiquidityParams,
  QuoteApiParams,
} from '@make-software/cspr-trade-mcp-sdk';
```

These types are useful when building typed wrappers around the SDK or when passing parameters
to functions that accept SDK types.
