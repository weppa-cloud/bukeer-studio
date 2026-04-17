#!/usr/bin/env bash
# lighthouse-ci.sh — Run Lighthouse CI against product landing pages.
#
# - Claims a session pool slot (s1..s4) via scripts/session-acquire.sh.
# - Starts `npm run dev:session` on the claimed PORT with isolated NEXT_DIST_DIR.
# - Waits for the server to be reachable, then runs `npx lhci autorun`.
# - Releases the slot (and kills the dev server) on exit/error/CTRL+C.
#
# Thresholds are defined in lighthouserc.js.
# See docs/ops/lighthouse-ci.md for details.
#
# Usage:
#   bash scripts/lighthouse-ci.sh
#   LHCI_TENANT=othertenant bash scripts/lighthouse-ci.sh

set -euo pipefail

# --- Claim session pool slot -------------------------------------------------
eval "$(bash scripts/session-acquire.sh)"

DEV_PID=""

cleanup() {
  if [[ -n "$DEV_PID" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
  if [[ -n "${_ACQUIRED_SESSION:-}" ]]; then
    bash scripts/session-release.sh "$_ACQUIRED_SESSION" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "[lighthouse-ci] Claimed slot $SESSION_NAME on port $PORT"

# --- Start dev server --------------------------------------------------------
echo "[lighthouse-ci] Starting dev server (NEXT_DIST_DIR=.next-$SESSION_NAME)"
NEXT_DIST_DIR=".next-$SESSION_NAME" PORT="$PORT" npm run dev:session &
DEV_PID=$!

# --- Wait for server to be reachable ----------------------------------------
echo "[lighthouse-ci] Waiting for http://localhost:$PORT ..."
if ! timeout 90 bash -c "until curl -sf http://localhost:$PORT > /dev/null; do sleep 2; done"; then
  echo "[lighthouse-ci] ERROR: dev server did not become reachable on port $PORT within 90s" >&2
  exit 1
fi

echo "[lighthouse-ci] Server up. Running Lighthouse CI..."

# --- Run Lighthouse CI -------------------------------------------------------
# LHCI_PORT is consumed by lighthouserc.js to build the URL list.
LHCI_PORT="$PORT" npx --no-install lhci autorun --config=./lighthouserc.js || {
  status=$?
  echo "[lighthouse-ci] lhci autorun exited with status $status" >&2
  exit "$status"
}

echo "[lighthouse-ci] Done. Reports in .lighthouseci/"
