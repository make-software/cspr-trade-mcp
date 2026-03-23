# Task #360 — Deployment Plan

## Prerequisites
- [x] DNS: `mcp.cspr.trade` A record → 175.110.114.28
- [x] TLS: certbot certificate issued for mcp.cspr.trade
- [x] Build: `@cspr-trade/mcp` builds successfully (tsup, ESM)
- [x] Build fix: `@types/express` added as devDependency for DTS generation

## Deployment Steps

### 1. Build the MCP package
```bash
cd ~/workspace/cspr-trade-mcp
npm run build -w @cspr-trade/mcp
```

### 2. Install systemd user service
```bash
cp packages/mcp/deploy/systemd/cspr-trade-mcp.service ~/.config/systemd/user/
# Adjusted to user service (WantedBy=default.target, no User/Group)
systemctl --user daemon-reload
systemctl --user enable cspr-trade-mcp
systemctl --user start cspr-trade-mcp
```

### 3. Verify service health
```bash
curl http://127.0.0.1:3010/health
# Expected: {"status":"ok","version":"0.1.0","network":"mainnet","transport":"http"}
```

### 4. Install nginx config
```bash
sudo cp packages/mcp/deploy/nginx/mcp.cspr.trade /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/mcp.cspr.trade /etc/nginx/sites-enabled/
sudo certbot install --cert-name mcp.cspr.trade  # attach existing cert
sudo nginx -t && sudo systemctl reload nginx
```

### 5. Verify public endpoint
```bash
curl https://mcp.cspr.trade/health
# Expected: {"status":"ok","version":"0.1.0","network":"mainnet","transport":"http"}
```

### 6. Test MCP endpoint
```bash
curl -X POST https://mcp.cspr.trade/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

## Status

| Step | Status |
|------|--------|
| DNS | ✅ Done |
| TLS cert | ✅ Issued |
| Build | ✅ Passes |
| Systemd service | ✅ Running (port 3010) |
| Nginx config | ⏳ Pending (needs sudo) |
| Public health check | ⏳ Pending nginx |
| MCP endpoint test | ⏳ Pending nginx |

## Rollback
```bash
systemctl --user stop cspr-trade-mcp
systemctl --user disable cspr-trade-mcp
sudo rm /etc/nginx/sites-enabled/mcp.cspr.trade
sudo systemctl reload nginx
```
