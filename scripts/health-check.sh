#!/bin/bash
# Health check script for mcp.cspr.trade — designed for Scotty monitoring
# Usage: ./health-check.sh [--deep] [--json]
# Exit codes: 0 = healthy, 1 = degraded, 2 = down

set -euo pipefail

HEALTH_URL="https://mcp.cspr.trade/health"
DEEP=""
JSON=""

for arg in "$@"; do
  case "$arg" in
    --deep) DEEP="?deep=1" ;;
    --json) JSON=1 ;;
  esac
done

# Fetch health with 10s timeout
RESPONSE=$(timeout 10 curl -sf "${HEALTH_URL}${DEEP}" 2>/dev/null) || {
  if [ -n "$JSON" ]; then
    echo '{"status":"down","error":"health endpoint unreachable"}'
  else
    echo "❌ mcp.cspr.trade: DOWN — health endpoint unreachable"
  fi
  exit 2
}

STATUS=$(echo "$RESPONSE" | jq -r '.status // "unknown"')
VERSION=$(echo "$RESPONSE" | jq -r '.version // "?"')
UPTIME=$(echo "$RESPONSE" | jq -r '.uptime // 0' | awk '{printf "%.0f", $1/3600}')
MEMORY=$(echo "$RESPONSE" | jq -r '.memoryMB // "?"')
SESSIONS=$(echo "$RESPONSE" | jq -r '.activeSessions // 0')

if [ -n "$JSON" ]; then
  echo "$RESPONSE"
elif [ "$STATUS" = "ok" ]; then
  echo "✅ mcp.cspr.trade: OK (v${VERSION}, up ${UPTIME}h, ${MEMORY}MB RAM, ${SESSIONS} sessions)"
  if echo "$RESPONSE" | jq -e '.casperProtocol' >/dev/null 2>&1; then
    PROTO=$(echo "$RESPONSE" | jq -r '.casperProtocol')
    echo "   Casper RPC: connected (protocol ${PROTO})"
  fi
  exit 0
elif [ "$STATUS" = "degraded" ]; then
  echo "⚠️ mcp.cspr.trade: DEGRADED (v${VERSION}, up ${UPTIME}h)"
  RPC=$(echo "$RESPONSE" | jq -r '.casperRpc // "unknown"')
  [ "$RPC" != "ok" ] && echo "   Casper RPC: ${RPC}"
  API=$(echo "$RESPONSE" | jq -r '.csprTradeApi // "n/a"')
  [ "$API" != "n/a" ] && [ "$API" != "ok" ] && echo "   CSPR.trade API: ${API}"
  exit 1
else
  echo "❌ mcp.cspr.trade: UNKNOWN STATUS (${STATUS})"
  exit 2
fi
