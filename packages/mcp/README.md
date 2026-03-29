# @make-software/cspr-trade-mcp

MCP (Model Context Protocol) server for [CSPR.trade](https://cspr.trade), a Uniswap V2 DEX on the Casper Network. Connects AI agents and LLMs to on-chain DeFi — market data, swaps, liquidity, and local transaction signing.

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
CSPR_TRADE_NETWORK=testnet CSPR_TRADE_TRANSPORT=http CSPR_TRADE_PORT=3001 \
  npx @make-software/cspr-trade-mcp
```

Point any MCP client at `http://your-host:3001/mcp`.

The HTTP transport also exposes a health endpoint at `/health`.

### Public production endpoint

The intended public mainnet endpoint is:

- MCP: `https://mcp.cspr.trade/mcp`
- Health: `https://mcp.cspr.trade/health`

Expected health response:

```json
{"status":"ok","version":"0.1.0","network":"mainnet","transport":"http"}
```

Deployment examples are included here:

- `deploy/systemd/cspr-trade-mcp.service`
- `deploy/nginx/mcp.cspr.trade.conf`

### Local signer (--signer mode)

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

Agent flow: `build_swap` (remote) -> `sign_deploy` (local) -> `submit_transaction` (remote). Private key never leaves the machine.

## Tools

### Market Data

| Tool | Description |
|------|-------------|
| `get_tokens` | List tradable tokens with optional fiat pricing |
| `get_pairs` | List trading pairs with reserves, pagination, sorting |
| `get_pair_details` | Detailed info for a specific pair |
| `get_quote` | Swap quote with routing path, price impact, slippage |
| `get_currencies` | Supported fiat currencies |

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

### Account

| Tool | Description |
|------|-------------|
| `get_liquidity_positions` | Liquidity positions for an account |
| `get_impermanent_loss` | Impermanent loss for a position |
| `get_swap_history` | Swap history, filterable by account or pair |

### Trade Analysis

| Tool | Description |
|------|-------------|
| `estimate_price_impact` | Estimate price impact before a swap — severity classification, execution vs. spot price |
| `estimate_slippage` | Estimate expected output and recommended slippage tolerance |
| `analyze_trade` | Comprehensive pre-trade analysis: impact + slippage + actionable recommendation |
| `optimal_liquidity_amounts` | Calculate optimal paired token amount for LP deposits |

### Signer (--signer mode only)

| Tool | Description |
|------|-------------|
| `sign_deploy` | Sign an unsigned deploy locally |

## Tool Details

### get_quote

```
token_in:  "CSPR"          # Symbol, name, or contract hash
token_out: "USDT"
amount:    "1000"           # Human-readable
type:      "exact_in"       # or "exact_out"
```

Returns quote with path, price impact, execution price, and recommended slippage.

### build_swap

```
token_in:          "CSPR"
token_out:         "USDT"
amount:            "1000"
type:              "exact_in"
sender_public_key: "01abc..."
slippage_bps:      300        # Optional, default 3%
deadline_minutes:  20         # Optional, default 20
```

Returns unsigned deploy JSON, human-readable summary, and safety warnings (high price impact, excessive slippage).

### estimate_price_impact

```
token_in:  "CSPR"          # Input token symbol
token_out: "USDT"          # Output token symbol
amount:    "50000"         # Human-readable input amount
```

Returns: Price impact percentage, severity (low/medium/high/very_high), execution price, spot price, and optional warning.

### estimate_slippage

```
token_in:               "CSPR"
token_out:              "USDT"
amount:                 "10000"
slippage_tolerance_bps: 300    # Optional, default 3%
```

Returns: Expected output, minimum output at given tolerance, actual slippage in bps, recommended tolerance. Warns if expected slippage exceeds your tolerance.

### analyze_trade

```
token_in:               "CSPR"
token_out:              "USDT"
amount:                 "500000"
slippage_tolerance_bps: 300    # Optional
```

Returns: Combined price impact + slippage analysis, recommendation (proceed/caution/high_risk/not_recommended), human-readable recommendation text, and all warnings. **Use this before large swaps.**

### optimal_liquidity_amounts

```
token_a:  "CSPR"
token_b:  "USDT"
amount_a: "100000"         # Amount of token A to deposit
```

Returns: Optimal paired amount of token B, estimated pool share percentage, and whether this creates a new pool.

### sign_deploy

```
deploy_json:    '{"hash":"...","header":{...},"approvals":[]}'
key_source:     "pem_file"   # or "pem_env" or "mnemonic"
algorithm:      "ed25519"    # Optional, default ed25519
mnemonic_index: 0            # Optional, for HD wallet derivation
```

Key sources:
- **`pem_file`** — reads PEM from file at `CSPR_TRADE_KEY_PATH`
- **`pem_env`** — reads PEM content from `CSPR_TRADE_KEY_PEM` env var
- **`mnemonic`** — derives key from BIP-39 phrase in `CSPR_TRADE_MNEMONIC` (BIP-44 path `m/44'/506'/0'/0/{index}`)

Supports Ed25519 and Secp256k1 key algorithms.

## Environment Variables

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `CSPR_TRADE_NETWORK` | `mainnet` | `mainnet` or `testnet` |
| `CSPR_TRADE_API_URL` | (from config) | Override API endpoint |
| `CSPR_TRADE_TRANSPORT` | `stdio` | `stdio` or `http` |
| `CSPR_TRADE_HOST` | `0.0.0.0` | HTTP listen host |
| `CSPR_TRADE_PORT` | `3000` | HTTP listen port |

### Signer (--signer mode)

| Variable | Description |
|----------|-------------|
| `CSPR_TRADE_KEY_PATH` | Path to PEM private key file |
| `CSPR_TRADE_KEY_PEM` | PEM key content (inline) |
| `CSPR_TRADE_MNEMONIC` | BIP-39 mnemonic phrase (12 or 24 words) |

## Example: End-to-End Swap

An agent with both `cspr-trade` (remote) and `cspr-signer` (local) configured:

1. **Agent** calls `get_quote` -> sees "1000 CSPR -> 42.5 USDT, 0.3% impact"
2. **Agent** calls `build_swap` -> gets unsigned deploy JSON + summary
3. **Agent** calls `sign_deploy` (local signer) -> gets signed deploy JSON
4. **Agent** calls `submit_transaction` -> gets transaction hash
5. **Agent** reports: "Swapped 1000 CSPR for 42.5 USDT. Tx: abc123..."

The private key never left the user's machine. The LLM never saw it.

## Development

```bash
npm run build        # Build to dist/
npm test             # Run tests
npm run test:watch   # Watch mode
```

### Testing the HTTP transport

```bash
# Start server
CSPR_TRADE_NETWORK=testnet CSPR_TRADE_TRANSPORT=http CSPR_TRADE_PORT=3001 \
  node dist/index.js

# Initialize session
curl -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```
