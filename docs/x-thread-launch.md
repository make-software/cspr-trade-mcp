# X Thread — CSPR.trade MCP Launch

## Tweet 1 (main)
Casper just upgraded to v2.2.0 mainnet 🎉

To celebrate: CSPR.trade MCP is live.

Your AI agent can now query prices, fetch candles, build swaps, and manage liquidity on @CasperNetwork's leading DEX — one endpoint, 22 public tools, non-custodial.

mcp.cspr.trade

## Tweet 2
One line of config:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "https://mcp.cspr.trade/mcp"
    }
  }
}
```

That's it. Claude Desktop, Cursor, or any MCP client — your agent now talks to Casper DeFi.

## Tweet 3
22 public MCP tools:

📊 Market data + price history — tokens, pairs, quotes, candles
💱 Trading — build swaps + approvals, submit transactions  
💧 Liquidity + portfolio — add/remove LP, balances, positions, status
🧠 Trade analysis — impact, slippage, recommendations before execution

Optional local signer adds `sign_deploy` for a 23-tool full setup.

## Tweet 4
Want testnet or self-hosted?

npm install @make-software/cspr-trade-mcp

Point at testnet with CSPR_TRADE_NETWORK=testnet

Full docs + self-hosting guide: mcp.cspr.trade/docs

## Tweet 5
Using @OpenClawAI? One command:

npx clawhub install cspr-trade-mcp

Your agent gets the full playbook — when to quote, when to warn on slippage, how to use price history, how to sign locally. Not just tools — behavior.

clawhub.com/skills/cspr-trade-mcp

## Tweet 6
Open source. MIT license.

github.com/make-software/cspr-trade-mcp

Building an agent that needs Casper DeFi access? Connect the endpoint, install the skill, and go.

Drop a reply or open an issue 🔧
