#!/bin/bash
# CCC Task Progress Logger — used by coding agents to report progress on tasks
# Usage: ./ccc-task-log.sh <task_id> <type> <content>
#
# Environment:
#   CCC_URL      — CCC server URL (default: http://localhost:18500)
#   CCC_API_KEY  — API key for authentication (required)
#
# Types:
#   progress   — Work in progress update
#   output     — Build/test output
#   error      — Error encountered
#   completed  — Task finished (triggers auto-transition to in_review)
#
# ⚠️  Agents must NEVER use type "review-requested" — that is only set by humans
#
# Examples:
#   ./ccc-task-log.sh 7 progress "Created API endpoint for user auth"
#   ./ccc-task-log.sh 7 output "Build succeeded — 54 modules in 1.02s"
#   ./ccc-task-log.sh 7 error "TypeScript error in Dashboard.tsx line 42"
#   ./ccc-task-log.sh 7 completed "All acceptance criteria met"

CCC_URL="${CCC_URL:-http://localhost:18500}"

if [ -z "$CCC_API_KEY" ]; then
  echo "Error: CCC_API_KEY environment variable is required"
  exit 1
fi

TASK_ID="$1"
TYPE="$2"
CONTENT="$3"

if [ -z "$TASK_ID" ] || [ -z "$TYPE" ] || [ -z "$CONTENT" ]; then
  echo "Usage: ccc-task-log.sh <task_id> <type> <content>"
  exit 1
fi

curl -s "$CCC_URL/api/projects/tasks/$TASK_ID/logs" \
  -H "X-API-Key: $CCC_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "$(python3 -c "import json,sys;print(json.dumps({'type':sys.argv[1],'content':sys.argv[2]}))" "$TYPE" "$CONTENT")"
