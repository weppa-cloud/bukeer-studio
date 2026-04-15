#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${SESSION_NAME:-s1}"
PORT="${PORT:-3000}"
NODE_BIN="$(command -v node)"

if [[ -z "$NODE_BIN" ]]; then
  echo "Error: node no encontrado en PATH"
  exit 1
fi

export E2E_BASE_URL="http://localhost:${PORT}"
export E2E_WEBSERVER_CMD="PORT=${PORT} NEXT_DIST_DIR=.next-${SESSION_NAME} npm run dev:node"
export E2E_SESSION_NAME="$SESSION_NAME"

echo "E2E session: $SESSION_NAME"
echo "Base URL: $E2E_BASE_URL"
echo "Web server cmd: $E2E_WEBSERVER_CMD"

exec "$NODE_BIN" ./node_modules/@playwright/test/cli.js test "$@"
