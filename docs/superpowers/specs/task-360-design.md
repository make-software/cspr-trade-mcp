# Task #360 — Deploy CSPR.trade MCP Server to mcp.cspr.trade

## Overview

Deploy the `@cspr-trade/mcp` server as a public Streamable HTTP MCP endpoint at `https://mcp.cspr.trade/mcp`, enabling AI agents and MCP clients to interact with the CSPR.trade DEX on Casper mainnet.

## Architecture

```
Client (MCP) ──HTTPS──▶ nginx (mcp.cspr.trade:443)
                             │
                             ├─ /health  → 127.0.0.1:3010/health
                             └─ /mcp     → 127.0.0.1:3010/mcp
                                              │
                                         Node.js (express + StreamableHTTPServerTransport)
                                              │
                                         CSPR.trade SDK → Casper mainnet RPC
```

## Components

### MCP Server (`@cspr-trade/mcp`)
- **Transport**: Streamable HTTP (MCP SDK `StreamableHTTPServerTransport`)
- **Port**: 3010 (localhost only)
- **Rate limiting**: 60 req/min per IP via `express-rate-limit`
- **Health endpoint**: `GET /health` returns `{ status, version, network, transport }`
- **MCP endpoint**: `/mcp` — supports MCP tool discovery and invocation

### Nginx Reverse Proxy
- TLS termination via Let's Encrypt (certbot)
- Proxy buffering disabled for streaming
- 300s read/send timeouts for long-running MCP calls

### Systemd Service
- User-level service (`cspr-trade-mcp.service`)
- Auto-restart on failure (3s delay)
- Environment: `CSPR_TRADE_NETWORK=mainnet`, `CSPR_TRADE_TRANSPORT=http`

## Security

- Server binds to 127.0.0.1 only (no direct external access)
- Rate limiting at application level (60/min)
- TLS enforced via nginx redirect
- No authentication required (public read-only DEX data)
- Signer mode available but NOT enabled in this deployment

## DNS

- `mcp.cspr.trade` → `175.110.114.28` (A record, 60s TTL)
