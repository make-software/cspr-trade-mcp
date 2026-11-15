#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${CSPR_TRADE_MCP_REPO:-/home/jeanclaude/workspace/cspr-trade-mcp}"
PAYER_ENV_FILE="${CSPR_TRADE_X402_PAYER_ENV_FILE:-/home/jeanclaude/.hermes/.secrets/cspr-trade-x402-payer.env}"

if [[ ! -d "$REPO_DIR" ]]; then
  echo "CSPR.trade x402 activity cron BLOCKED: repo directory not found: $REPO_DIR"
  exit 0
fi

if [[ -f "$PAYER_ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$PAYER_ENV_FILE"
  set +a
fi

cd "$REPO_DIR"

if [[ -n "${CSPR_TRADE_X402_PAYER_PRIVATE_KEY:-}" ]]; then
  echo "CSPR.trade x402 activity cron: attempting paid settlement ping against ${CSPR_TRADE_MCP_URL:-https://mcp.cspr.trade/mcp}"
  npm run x402:settlement-ping
else
  echo "CSPR.trade x402 activity cron BLOCKED: CSPR_TRADE_X402_PAYER_PRIVATE_KEY is not configured. Running side-effect-free manifest dry-run so the cron stays visible until Michael confirms wallet custody/funding."
  npm run x402:settlement-ping -- --dry-run
fi
