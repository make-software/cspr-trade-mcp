# CSPR.trade SDK v0.2.0: Pre-Trade Intelligence for AI Agents

*AI agents trading on DEXs need to know before they swap whether the trade will cost them. Now they can.*

---

## The Problem

An AI agent wants to swap 500,000 CSPR for USDT on a DEX. It builds the transaction, signs, submits — and loses 12% to price impact because the pool was too thin. The agent had no way to know in advance.

This is the norm in agentic DeFi today. Agents execute blind. They don't check liquidity depth, don't estimate slippage, don't know when to split a large trade into smaller chunks.

## What's New in v0.2.0

Four new analysis functions in the SDK — and four matching MCP tools — that give agents pre-trade intelligence:

### 1. `estimate_price_impact`

How much will this trade move the price?

Uses the constant-product AMM formula (x × y = k) with 0.3% fee to compute the execution price vs. the spot price. Returns a severity classification:

| Severity | Impact | What it means |
|----------|--------|---------------|
| `low` | < 1% | Normal — proceed |
| `medium` | 1–5% | Noticeable — consider trade size |
| `high` | 5–15% | Significant — recommend splitting |
| `very_high` | > 15% | Dangerous — strongly discourage |

### 2. `estimate_slippage`

What's the minimum I'll receive?

Given your trade parameters and slippage tolerance, returns the expected output, minimum output (worst case), and a recommended tolerance setting. If your expected slippage exceeds your tolerance, warns you before the transaction reverts on-chain.

### 3. `analyze_trade`

Should I execute this trade?

The comprehensive tool. Combines price impact + slippage into an actionable recommendation:

- **`proceed`** — Trade looks good, execute normally
- **`caution`** — Moderate impact, show details to user, let them decide
- **`high_risk`** — Recommend splitting into smaller trades
- **`not_recommended`** — Advise against, suggest waiting for deeper liquidity

### 4. `optimal_liquidity_amounts`

How much of token B should I deposit alongside token A?

For agents adding liquidity: given an amount of one token, computes the matching amount of the other token to maintain the pool's ratio. Returns the estimated pool share percentage and flags if this would create a new pool.

## Agent Workflow Example

Here's how an autonomous agent uses these tools:

```typescript
// Step 1: Analyze the intended trade
const analysis = await client.analyzeTrade({
  tokenIn: 'CSPR',
  tokenOut: 'USDT',
  amount: '500000',
  slippageToleranceBps: 300,
});

// Step 2: Act on the recommendation
switch (analysis.recommendation) {
  case 'proceed':
    // Safe — build and submit the swap
    const bundle = await client.buildSwap({ ... });
    break;

  case 'caution':
    // Moderate impact — log warning, proceed with smaller amount
    console.log(`Warning: ${analysis.recommendationText}`);
    break;

  case 'high_risk':
    // Split into 5 smaller trades
    for (let i = 0; i < 5; i++) {
      await client.buildSwap({ amount: '100000', ... });
    }
    break;

  case 'not_recommended':
    // Skip — try again later when liquidity is deeper
    console.log('Trade skipped: insufficient liquidity');
    break;
}
```

## MCP Tools for Any Agent

The same four functions are exposed as MCP tools, accessible from any MCP-compatible agent (Claude, Cursor, OpenClaw, custom frameworks):

```
analyze_trade({ token_in: "CSPR", token_out: "USDT", amount: "500000" })
```

No SDK installation needed — just connect to the public endpoint at `mcp.cspr.trade/mcp`.

## Technical Details

- **AMM model**: Constant product (x × y = k) with 0.3% fee, matching Uniswap V2 / CSPR.trade
- **Severity thresholds**: low <1%, medium 1–5%, high 5–15%, very_high >15%
- **Fee accounting**: 0.3% fee is deducted from input before computing output
- **Recommendation logic**: Combines price impact severity + slippage ratio to determine recommendation level
- **91 unit tests** covering all analysis functions, edge cases (zero reserves, very large trades, new pools)

## Get Started

### Public endpoint (no setup)
```
https://mcp.cspr.trade/mcp
```

### npm packages
```bash
npm install @make-software/cspr-trade-mcp-sdk  # SDK
npm install @make-software/cspr-trade-mcp       # MCP server
```

### Documentation
- [SDK Reference](https://mcp.cspr.trade/docs/sdk) — Full TypeScript API
- [Agent Guide](https://mcp.cspr.trade/docs/agent) — Workflow patterns for AI agents
- [llms.txt](https://mcp.cspr.trade/llms.txt) — Machine-readable tool reference
- [GitHub](https://github.com/make-software/cspr-trade-mcp) — Open source, MIT license

---

*CSPR.trade MCP is the reference MCP server for Casper DeFi. Built by [MAKE](https://make.services).*
