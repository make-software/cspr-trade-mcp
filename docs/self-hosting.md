# Self-Hosting

Run your own CSPR.trade MCP server using the npm packages. This is for developers who want a private instance, need testnet access, or want to customize the setup.

> **Just want to connect?** Use the [public endpoint](https://mcp.cspr.trade/mcp) — no setup needed. See the [Getting Started](/docs/getting-started) guide.

## Packages

| Package | Description |
|---------|-------------|
| [`@make-software/cspr-trade-mcp`](https://www.npmjs.com/package/@make-software/cspr-trade-mcp) | MCP server — exposes 20 tools over stdio or HTTP |
| [`@make-software/cspr-trade-mcp-sdk`](https://www.npmjs.com/package/@make-software/cspr-trade-mcp-sdk) | TypeScript SDK — market data, quotes, transaction building |

## Quick Start (stdio)

The simplest way to run your own instance — connects directly to your MCP client via stdio:

```bash
npm install @make-software/cspr-trade-mcp
```

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

## HTTP Server

For remote agents or shared deployments, run as an HTTP server:

```bash
CSPR_TRADE_NETWORK=mainnet CSPR_TRADE_TRANSPORT=http CSPR_TRADE_PORT=3001 \
  npx @make-software/cspr-trade-mcp
```

Point any MCP client at `http://your-host:3001/mcp`.

Health check: `http://your-host:3001/health`

## Local Signer Mode

A separate, local-only MCP instance that signs deploys without exposing private keys to the network or the LLM.

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "https://mcp.cspr.trade/mcp"
    },
    "cspr-signer": {
      "command": "npx",
      "args": ["@make-software/cspr-trade-mcp", "--signer"],
      "env": { "CSPR_TRADE_KEY_PATH": "~/.casper/secret_key.pem" }
    }
  }
}
```

Agent flow: `build_swap` (remote) → `sign_deploy` (local) → `submit_transaction` (remote). Private key never leaves your machine.

### Key Sources

| Source | Env Variable | Description |
|--------|-------------|-------------|
| `pem_file` | `CSPR_TRADE_KEY_PATH` | Path to PEM private key file |
| `pem_env` | `CSPR_TRADE_KEY_PEM` | PEM key content (inline) |
| `mnemonic` | `CSPR_TRADE_MNEMONIC` | BIP-39 phrase, derives via BIP-44 `m/44'/506'/0'/0/{index}` |

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

## Production Deployment

The repo includes deployment configs:

- `deploy/systemd/cspr-trade-mcp.service` — systemd unit file
- `deploy/nginx/mcp.cspr.trade.conf` — nginx reverse proxy config

### Example with nginx + TLS

```bash
# Build
git clone https://github.com/make-software/cspr-trade-mcp.git
cd cspr-trade-mcp
npm install && npm run build

# Start the service
CSPR_TRADE_NETWORK=mainnet CSPR_TRADE_TRANSPORT=http \
  CSPR_TRADE_HOST=127.0.0.1 CSPR_TRADE_PORT=3010 \
  node packages/mcp/dist/index.js
```

Put nginx in front with TLS (see `deploy/nginx/mcp.cspr.trade.conf` for a template).

## Using the SDK Directly

For programmatic use without MCP:

```bash
npm install @make-software/cspr-trade-mcp-sdk
```

```typescript
import { CsprTradeClient } from '@make-software/cspr-trade-mcp-sdk';

const client = new CsprTradeClient({ network: 'mainnet' });

// Get a swap quote
const quote = await client.getQuote({
  tokenIn: 'CSPR',
  tokenOut: 'USDT',
  amount: '1000',
  type: 'exact_in',
});
console.log(`${quote.amountInFormatted} CSPR → ${quote.amountOutFormatted} USDT`);
console.log(`Price impact: ${quote.priceImpact}%`);
```

Full SDK API reference: [SDK docs](/docs/sdk)
