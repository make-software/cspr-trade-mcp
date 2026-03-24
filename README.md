# CSPR.trade MCP

[![MCP Server](https://badge.mcpservers.org/make-software/cspr-trade-mcp)](https://glama.ai/mcp/servers/make-software/cspr-trade-mcp)

AI agent integration for [CSPR.trade](https://cspr.trade), the leading DEX on the Casper Network.

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

That's it. Your agent now has access to 14 tools for market data, swaps, liquidity management, and account queries on the Casper Network.

## What's Available

| Category | Tools | Wallet Required |
|----------|-------|----------------|
| **Market Data** | `get_tokens`, `get_pairs`, `get_pair_details`, `get_quote`, `get_currencies` | No |
| **Trading** | `build_swap`, `build_approve_token`, `submit_transaction` | Yes |
| **Liquidity** | `build_add_liquidity`, `build_remove_liquidity` | Yes |
| **Account** | `get_liquidity_positions`, `get_impermanent_loss`, `get_swap_history` | No |
| **Signing** | `sign_deploy` (signer mode only) | Local key |

**Non-custodial by design.** The MCP server never handles private keys. Transactions are built remotely and signed locally.

## OpenClaw Skill

Using [OpenClaw](https://openclaw.ai)? Install the agent skill from [ClawHub](https://clawhub.com):

```bash
npx clawhub@latest install cspr-trade-mcp
```

The skill teaches your agent the full workflow — intent classification, quote-before-swap patterns, price impact warnings, local signing flows, and error recovery. Works with any OpenClaw-compatible agent.

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
| [`@make-software/cspr-trade-mcp`](https://www.npmjs.com/package/@make-software/cspr-trade-mcp) | MCP server — 14 tools over stdio or HTTP |
| [`@make-software/cspr-trade-mcp-sdk`](https://www.npmjs.com/package/@make-software/cspr-trade-mcp-sdk) | TypeScript SDK — market data, quotes, transaction building |

## Development

```bash
npm install         # Install dependencies
npm run build       # Build all packages
npm test            # Run tests
```

## License

MIT
