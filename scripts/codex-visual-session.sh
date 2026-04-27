#!/usr/bin/env bash
# codex-visual-session.sh — Start an isolated dev server for Codex Desktop visual QA.
#
# Usage:
#   bash scripts/codex-visual-session.sh
#
# The script claims one session-pool slot, starts Next.js on that slot's port,
# prints the URL, and releases the slot when the process exits.

set -euo pipefail

eval "$(bash scripts/session-acquire.sh)"
echo "$$" > ".sessions/locks/${SESSION_NAME}/pid"

cleanup() {
  local code=$?

  if [[ -n "${DEV_PID:-}" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill -TERM "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi

  if [[ -n "${_ACQUIRED_SESSION:-}" ]]; then
    bash scripts/session-release.sh "$_ACQUIRED_SESSION" >/dev/null 2>&1 || true
  fi

  exit "$code"
}

trap cleanup EXIT INT TERM

URL="http://localhost:${PORT}"
export PORT
export NEXT_DIST_DIR=".next-${SESSION_NAME}"

echo "Codex visual session"
echo "Slot: ${SESSION_NAME}"
echo "Port: ${PORT}"
echo "Cache: ${NEXT_DIST_DIR}"
echo "URL: ${URL}"
echo

npm run dev:session &
DEV_PID=$!

echo "Waiting for ${URL} ..."
for _ in {1..90}; do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    echo "Ready: ${URL}"
    echo
    echo "Open this URL in the Codex in-app browser. Press Ctrl+C here to stop and release ${SESSION_NAME}."
    wait "$DEV_PID"
    exit $?
  fi
  sleep 1
done

echo "Timed out waiting for ${URL}" >&2
exit 1
