# CSPR.trade MCP

AI agent integration for [CSPR.trade](https://cspr.trade), a Uniswap V2 DEX on the Casper Network.

This monorepo provides a TypeScript SDK and an MCP (Model Context Protocol) server that lets AI agents query market data, build swap and liquidity transactions, and submit them to the network — all without ever handling private keys.

## Packages

| Package | Description |
|---------|-------------|
| [`@cspr-trade/sdk`](./packages/sdk) | TypeScript client for the CSPR.trade API — market data, quotes, transaction building |
| [`@cspr-trade/mcp`](./packages/mcp) | MCP server exposing SDK functionality as tools for LLMs and AI agents |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│  AI Agent   │────▶│  MCP Server  │────▶│  @cspr-trade/  │────▶│  CSPR.trade  │
│  (Claude,   │     │  (stdio or   │     │  sdk           │     │  API          │
│   etc.)     │◀────│   HTTP)      │◀────│                │◀────│              │
└─────────────┘     └──────────────┘     └────────────────┘     └──────────────┘
                           │
                    ┌──────┴───────┐
                    │  Local       │
                    │  Signer      │
                    │  (--signer)  │
                    └──────────────┘
                     Key stays here
```

**Non-custodial by design.** Transaction-building tools return unsigned deploy JSON. Signing happens locally — either via a separate signer MCP instance, a wallet, or a CLI tool. The private key never touches the network or the LLM.

## Quick Start

```bash
# Install dependencies
npm install

# Build both packages
npm run build

# Run tests
npm test
```

### Use with Claude Code (stdio)

Add to your Claude Code MCP config (`.claude.json`):

```json
{
  "mcpServers": {
    "cspr-trade": {
      "command": "node",
      "args": ["/path/to/cspr-trade-mcp/packages/mcp/dist/index.js"],
      "env": { "CSPR_TRADE_NETWORK": "testnet" }
    }
  }
}
```

### Use as HTTP server (remote agents)

```bash
CSPR_TRADE_NETWORK=testnet CSPR_TRADE_TRANSPORT=http CSPR_TRADE_PORT=3001 \
  node packages/mcp/dist/index.js
```

Then point any MCP client at `http://your-host:3001/mcp`.

Health checks are available at `/health` and return:

```json
{"status":"ok","version":"0.1.0","network":"testnet","transport":"http"}
```

### Public mainnet endpoint

The production public MCP endpoint is:

- MCP: `https://mcp.cspr.trade/mcp`
- Health: `https://mcp.cspr.trade/health`

Expected health response:

```json
{"status":"ok","version":"0.1.0","network":"mainnet","transport":"http"}
```

Production deployment reference files live in:

- `packages/mcp/deploy/systemd/cspr-trade-mcp.service`
- `packages/mcp/deploy/nginx/mcp.cspr.trade.conf`

### Local signing

For end-to-end transaction flows, add a local signer alongside the main server:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "http://your-host:3001/mcp"
    },
    "cspr-signer": {
      "command": "node",
      "args": ["/path/to/cspr-trade-mcp/packages/mcp/dist/index.js", "--signer"],
      "env": { "CSPR_TRADE_KEY_PATH": "~/.casper/secret_key.pem" }
    }
  }
}
```

The agent chains: `build_swap` (remote) -> `sign_deploy` (local) -> `submit_transaction` (remote).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CSPR_TRADE_NETWORK` | `mainnet` | `mainnet` or `testnet` |
| `CSPR_TRADE_API_URL` | (from config) | Override API endpoint |
| `CSPR_TRADE_TRANSPORT` | `stdio` | `stdio` or `http` |
| `CSPR_TRADE_HOST` | `0.0.0.0` | HTTP listen host |
| `CSPR_TRADE_PORT` | `3000` | HTTP listen port |
| `CSPR_TRADE_KEY_PATH` | — | PEM key file path (signer mode) |
| `CSPR_TRADE_KEY_PEM` | — | PEM key content (signer mode) |
| `CSPR_TRADE_MNEMONIC` | — | BIP-39 mnemonic phrase (signer mode) |

## Networks

| | Testnet | Mainnet |
|---|---------|---------|
| Chain name | `casper-test` | `casper` |
| API | `https://cspr-trade-api.dev.make.services` | `https://api.cspr.trade` |
| Router | `hash-04a11a...402867` | TBD |
| WCSPR | `hash-3d80df...847c1e` | TBD |

## Development

```bash
npm install         # Install dependencies
npm run build       # Build both packages
npm test            # Run all tests
npm run lint        # Type-check
```

## License

MIT
