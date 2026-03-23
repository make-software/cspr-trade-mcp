#!/bin/bash
# CCC Activity Logger — used by agents to log activities to the CCC activity feed
# Usage: ./ccc-log.sh <stream> <type> <title> [body] [status] [url]
#
# Environment:
#   CCC_URL      — CCC server URL (default: http://localhost:18500)
#   CCC_API_KEY  — API key for authentication (required)
#
# Examples:
#   ./ccc-log.sh dev-orchestrator agent-spawn "Spawned agent for task #5" "" info
#   ./ccc-log.sh my-stream health-check "API healthy" "" success
#   ./ccc-log.sh my-stream error "Build failed" "Exit code 1" error

CCC_URL="${CCC_URL:-http://localhost:18500}"

# Fall back to config file if env var not set
if [ -z "$CCC_API_KEY" ]; then
  CONFIG_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/config/local.yaml"
  if [ -f "$CONFIG_FILE" ]; then
    CCC_API_KEY=$(grep 'key:' "$CONFIG_FILE" | head -1 | sed 's/.*key: *"//' | sed 's/".*//')
  fi
fi

if [ -z "$CCC_API_KEY" ]; then
  echo "Error: CCC_API_KEY not set and could not read from config/local.yaml"
  exit 1
fi

STREAM="$1"
TYPE="$2"
TITLE="$3"
BODY="${4:-}"
STATUS="${5:-info}"
URL="${6:-}"

if [ -z "$STREAM" ] || [ -z "$TYPE" ] || [ -z "$TITLE" ]; then
  echo "Usage: ccc-log.sh <stream> <type> <title> [body] [status] [url]"
  exit 1
fi

JSON=$(python3 -c "
import json, sys
print(json.dumps({
    'stream': sys.argv[1],
    'type': sys.argv[2],
    'title': sys.argv[3],
    'body': sys.argv[4] or None,
    'status': sys.argv[5],
    'url': sys.argv[6] or None,
}))
" "$STREAM" "$TYPE" "$TITLE" "$BODY" "$STATUS" "$URL")

curl -s "$CCC_URL/api/activities" \
  -H "X-API-Key: $CCC_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "$JSON"
