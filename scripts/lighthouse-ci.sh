#!/usr/bin/env bash
# lighthouse-ci.sh — Run Lighthouse CI against product landing pages.
#
# - Claims a session pool slot (s1..s4) via scripts/session-acquire.sh.
# - Starts a server on the claimed PORT:
#   - default: production mode (`next build` + `next start`)
#   - opt-in dev mode with `LHCI_SERVER_MODE=dev`
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

if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

# --- Claim session pool slot -------------------------------------------------
SKIPPED_SESSIONS=()

claim_free_session() {
  local attempts=0
  while (( attempts < 4 )); do
    eval "$(bash scripts/session-acquire.sh)"
    echo "$$" > ".sessions/locks/${_ACQUIRED_SESSION}/pid"
    if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "[lighthouse-ci] Claimed slot $SESSION_NAME but port $PORT is already listening; holding lock and trying next slot" >&2
      SKIPPED_SESSIONS+=("$_ACQUIRED_SESSION")
      unset SESSION_NAME PORT _ACQUIRED_SESSION
      attempts=$((attempts + 1))
      continue
    fi
    return 0
  done

  echo "[lighthouse-ci] ERROR: no free session port available" >&2
  for skipped in "${SKIPPED_SESSIONS[@]+"${SKIPPED_SESSIONS[@]}"}"; do
    bash scripts/session-release.sh "$skipped" >/dev/null 2>&1 || true
  done
  return 1
}

claim_free_session

DEV_PID=""

cleanup() {
  if [[ -n "$DEV_PID" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
  if [[ -n "${_ACQUIRED_SESSION:-}" ]]; then
    bash scripts/session-release.sh "$_ACQUIRED_SESSION" 2>/dev/null || true
  fi
  for skipped in "${SKIPPED_SESSIONS[@]+"${SKIPPED_SESSIONS[@]}"}"; do
    bash scripts/session-release.sh "$skipped" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "[lighthouse-ci] Claimed slot $SESSION_NAME on port $PORT"
export LHCI_ALLOW_INDEX="${LHCI_ALLOW_INDEX:-1}"
export LHCI_BLOCK_STREAMING_METADATA="${LHCI_BLOCK_STREAMING_METADATA:-1}"

# --- Start server ------------------------------------------------------------
SERVER_MODE="${LHCI_SERVER_MODE:-prod}"
DIST_DIR="${LHCI_DIST_DIR:-.next}"

if [[ "$SERVER_MODE" == "dev" ]]; then
  echo "[lighthouse-ci] Starting dev server (NEXT_DIST_DIR=$DIST_DIR)"
  NEXT_DIST_DIR="$DIST_DIR" PORT="$PORT" npm run dev:session &
  DEV_PID=$!
else
  if [[ "${LHCI_FORCE_BUILD:-0}" == "1" || ! -d "$DIST_DIR" ]]; then
    echo "[lighthouse-ci] Building production bundle (NEXT_DIST_DIR=$DIST_DIR)"
    NEXT_DIST_DIR="$DIST_DIR" npm run build
  else
    echo "[lighthouse-ci] Using existing production bundle at $DIST_DIR"
  fi
  echo "[lighthouse-ci] Starting production server on port $PORT"
  NEXT_DIST_DIR="$DIST_DIR" npm run start -- --port "$PORT" &
  DEV_PID=$!
fi

# --- Wait for server to be reachable (pure bash, macOS-safe) ----------------
echo "[lighthouse-ci] Waiting for http://localhost:$PORT ..."
WAIT_SECS=120
elapsed=0
until curl -sf "http://localhost:$PORT" > /dev/null; do
  if (( elapsed >= WAIT_SECS )); then
    echo "[lighthouse-ci] ERROR: dev server did not become reachable on port $PORT within ${WAIT_SECS}s" >&2
    exit 1
  fi
  sleep 3
  elapsed=$((elapsed + 3))
done

echo "[lighthouse-ci] Server up. Running Lighthouse CI..."

# --- Run Lighthouse CI -------------------------------------------------------
# Optional prewarm to stabilize data/cache before measurements.
if [[ "${LHCI_PREWARM:-1}" == "1" ]]; then
  TENANT="${LHCI_TENANT:-colombiatours}"
  PREVIEW_TOKEN="${LHCI_PREVIEW_TOKEN:-${SITE_PREVIEW_TOKEN:-${REVALIDATE_SECRET:-}}}"
  PREVIEW_COOKIE=()
  if [[ -n "$PREVIEW_TOKEN" ]]; then
    PREVIEW_COOKIE=(--cookie "__bukeer_site_preview=${PREVIEW_TOKEN}")
  fi
  echo "[lighthouse-ci] Prewarming audited URLs for tenant '$TENANT'..."
  prewarm_urls=(
    "http://localhost:${PORT}/site/${TENANT}/actividades/4x1-adventure"
    "http://localhost:${PORT}/site/${TENANT}/hoteles/aloft-bogota-airport"
    "http://localhost:${PORT}/site/${TENANT}/paquetes/bogota-esencial-cultura-y-sal-4-dias"
    "http://localhost:${PORT}/site/${TENANT}/paquetes/colombia-en-familia-15-dias-aventura-y-confort"
    "http://localhost:${PORT}/site/${TENANT}/blog/viajar-por-colombia-en-15-dias"
    "http://localhost:${PORT}/site/${TENANT}/blog/guia-completa-para-viajar-a-colombia"
  )
  for prewarm_url in "${prewarm_urls[@]}"; do
    curl -sf "${PREVIEW_COOKIE[@]}" "$prewarm_url" > /dev/null || true
  done
fi

# LHCI_PORT is consumed by lighthouserc.js to build the URL list.
LHCI_PORT="$PORT" npx --no-install lhci autorun --config=./lighthouserc.js || {
  status=$?
  echo "[lighthouse-ci] lhci autorun exited with status $status" >&2
  exit "$status"
}

echo "[lighthouse-ci] Done. Reports in .lighthouseci/"
