# CSPR.trade MCP

[![MCP Server](https://badge.mcpservers.org/make-software/cspr-trade-mcp)](https://glama.ai/mcp/servers/make-software/cspr-trade-mcp)

AI agent integration for [CSPR.trade](https://cspr.trade), the leading DEX on the Casper Network.

[![CSPR[dot]trade MCP server](https://glama.ai/mcp/servers/make-software/cspr-trade-mcp/badges/card.svg)](https://glama.ai/mcp/servers/make-software/cspr-trade-mcp)

**🔗 Public endpoint:** [`https://mcp.cspr.trade/mcp`](https://mcp.cspr.trade/mcp) — connect any MCP client, no setup required.

**📖 Documentation:** [mcp.cspr.trade](https://mcp.cspr.trade)

## Connect Your Agent

Add to Claude Desktop, Cursor, or any MCP client config:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "https://mcp.cspr.trade/mcp"
    }
  }
}
```

That's it. Your agent now has access to **22 public tools** for market data, swaps, liquidity management, trade analysis, portfolio tracking, and account queries on the Casper Network.

## What's Available

### Public MCP surface: 22 tools

| Category | Tools | Wallet Required |
|----------|-------|----------------|
| **Market Data** | `get_tokens`, `get_pairs`, `get_pair_details`, `get_quote`, `get_currencies`, `get_pair_price_history`, `get_token_price_history` | No |
| **Trading** | `build_swap`, `build_approve_token`, `submit_transaction` | Yes |
| **Liquidity** | `build_add_liquidity`, `build_remove_liquidity` | Yes |
| **Trade Analysis** | `estimate_price_impact`, `estimate_slippage`, `analyze_trade`, `optimal_liquidity_amounts` | No |
| **Account** | `get_token_balance`, `get_liquidity_positions`, `get_impermanent_loss`, `get_swap_history`, `get_portfolio_value`, `get_position_status` | No |

### Optional local signer: +1 tool

Run a second local MCP instance in `--signer` mode to add:

- `sign_deploy` — local-only deploy signing with keys loaded from your machine

That gives you **23 total tools across the full two-server setup**.

**Non-custodial by design.** The public MCP server never handles private keys. Transactions are built remotely and signed locally when you enable signer mode.

## OpenClaw Skill

Using [OpenClaw](https://openclaw.ai)? Install the agent skill from [ClawHub](https://clawhub.com):

```bash
npx clawhub@latest install cspr-trade-mcp
```

The skill teaches your agent the full workflow — intent classification, quote-before-swap patterns, price-impact warnings, local signing flows, price-history lookups, portfolio checks, and error recovery. Works with any OpenClaw-compatible agent.

## Self-Hosting

Want testnet access or a private instance? Install the npm packages:

```bash
npm install @make-software/cspr-trade-mcp
```

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

See the [Self-Hosting guide](https://mcp.cspr.trade/docs/self-hosting) for HTTP server setup, local signer mode, and production deployment.

## Packages

| Package | Description |
|---------|-------------|
| [`@make-software/cspr-trade-mcp`](https://www.npmjs.com/package/@make-software/cspr-trade-mcp) | MCP server — 22 public tools over stdio or HTTP, plus optional `sign_deploy` in local signer mode |
| [`@make-software/cspr-trade-mcp-sdk`](https://www.npmjs.com/package/@make-software/cspr-trade-mcp-sdk) | TypeScript SDK — market data, price history, quotes, analysis, and transaction building |

## Development

```bash
npm install         # Install dependencies
npm run build       # Build all packages
npm test            # Run tests
```

## License

MIT
