# @make-software/cspr-trade-mcp

MCP (Model Context Protocol) server for [CSPR.trade](https://cspr.trade), a Uniswap V2 DEX on the Casper Network. Connects AI agents and LLMs to on-chain DeFi — market data, price history, swaps, liquidity, trade analysis, account queries, and optional local transaction signing.

Supports **stdio** (local, e.g. Claude Code) and **HTTP** (remote, Streamable HTTP) transports.

## Installation

```bash
npm install @make-software/cspr-trade-mcp
```

## Usage

### stdio (Claude Code, local MCP clients)

Add to `.claude.json`:

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

### HTTP (remote agents)

```bash
CSPR_TRADE_NETWORK=testnet CSPR_TRADE_TRANSPORT=http CSPR_TRADE_PORT=3001   npx @make-software/cspr-trade-mcp
```

Point any MCP client at `http://your-host:3001/mcp`.

The HTTP transport also exposes a health endpoint at `/health`.

### Public production endpoint

- MCP: `https://mcp.cspr.trade/mcp`
- Health: `https://mcp.cspr.trade/health`

The hosted endpoint keeps `CSPR_TRADE_ENABLE_FILE_DEPLOY_INPUT` off, so `submit_transaction` accepts inline signed JSON only.

### Local signer (`--signer` mode)

A separate, local-only MCP instance that signs deploys without exposing private keys to the network or the LLM.

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "http://your-host:3001/mcp"
    },
    "cspr-signer": {
      "command": "npx",
      "args": ["@make-software/cspr-trade-mcp", "--signer"],
      "env": { "CSPR_TRADE_KEY_PATH": "~/.casper/secret_key.pem" }
    }
  }
}
```

Agent flow: `build_swap` → `sign_deploy` → `submit_transaction`.

By default, deploy handoff is JSON-only. Enable `CSPR_TRADE_ENABLE_FILE_DEPLOY_INPUT=true` on local installs if you want build/sign/submit to exchange temp-file paths on the same machine.

## Tool counts

- **Main server only:** 24 public tools
- **Main server + signer:** 23 total tools

## Tools

### Market Data

| Tool | Description |
|------|-------------|
| `get_tokens` | List tradable tokens with optional fiat pricing |
| `get_pairs` | List trading pairs with reserves, pagination, and sorting |
| `get_pair_details` | Detailed info for a specific pair |
| `get_quote` | Swap quote with routing path, price impact, and slippage |
| `get_currencies` | Supported fiat currencies |
| `get_pair_price_history` | OHLCV candle history for a specific pair |
| `get_token_price_history` | OHLCV candle history for a token via its primary pair |

### Trading

| Tool | Description |
|------|-------------|
| `build_swap` | Build unsigned swap transaction |
| `build_approve_token` | Build unsigned token approval |
| `submit_transaction` | Submit a signed deploy to the network |

### Liquidity

| Tool | Description |
|------|-------------|
| `build_add_liquidity` | Build unsigned add-liquidity transaction |
| `build_remove_liquidity` | Build unsigned remove-liquidity transaction |

### Account / Portfolio

| Tool | Description |
|------|-------------|
| `get_token_balance` | CEP-18 token balances for an account |
| `get_liquidity_positions` | Liquidity positions for an account |
| `get_impermanent_loss` | Impermanent loss for a position |
| `get_swap_history` | Swap history, filterable by public key or pair |
| `get_portfolio_value` | Aggregate LP portfolio value across positions |
| `get_position_status` | Current token amounts and IL per position |

### Trade Analysis

| Tool | Description |
|------|-------------|
| `estimate_price_impact` | Estimate price impact before a swap |
| `estimate_slippage` | Estimate expected output and recommended slippage tolerance |
| `analyze_trade` | Comprehensive pre-trade analysis with recommendation |
| `optimal_liquidity_amounts` | Calculate optimal paired token amount for LP deposits |

### Signer (`--signer` mode only)

| Tool | Description |
|------|-------------|
| `sign_deploy` | Sign an unsigned deploy locally |

## Key parameter notes

- `get_swap_history` uses `public_key`, not `account_hash`
- `get_token_balance` uses `account_public_key` and optionally `token`
- `build_swap` supports optional `token_in_balance`
- `build_add_liquidity` supports optional `token_a_balance` and `token_b_balance`
- `sign_deploy`, `build_swap`, `build_add_liquidity`, `build_remove_liquidity`, and `submit_transaction` use inline JSON by default
- Set `CSPR_TRADE_ENABLE_FILE_DEPLOY_INPUT=true` only for local installs that need temp-file path handoff on the same machine

## Environment Variables

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `CSPR_TRADE_NETWORK` | `mainnet` | `mainnet` or `testnet` |
| `CSPR_TRADE_API_URL` | (from config) | Override API endpoint |
| `CSPR_TRADE_TRANSPORT` | `stdio` | `stdio` or `http` |
| `CSPR_TRADE_HOST` | `0.0.0.0` | HTTP listen host |
| `CSPR_TRADE_PORT` | `3000` | HTTP listen port |
| `CSPR_TRADE_ALLOWED_HOSTS` | unset | Optional comma-separated host allowlist |
| `CSPR_TRADE_RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window |
| `CSPR_TRADE_RATE_LIMIT_MAX` | `60` | Max requests per window |
| `CSPR_TRADE_ENABLE_FILE_DEPLOY_INPUT` | `false` | Enable local temp-file deploy workflow for build/sign/submit tools |

### Signer

| Variable | Description |
|----------|-------------|
| `CSPR_TRADE_KEY_PATH` | Path to PEM private key file |
| `CSPR_TRADE_KEY_PEM` | PEM key content |
| `CSPR_TRADE_MNEMONIC` | BIP-39 mnemonic phrase |

## Development

```bash
npm run build
npm test
npm run test:watch
```
