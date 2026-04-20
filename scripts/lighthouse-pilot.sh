#!/usr/bin/env bash
# lighthouse-pilot.sh — EPIC #214 W6 #220 — Run Lighthouse CI against pilot
# seed URLs (package / activity / hotel / blog).
#
# - Claims a session pool slot (s1..s4) via scripts/session-acquire.sh.
# - Starts a production server (or dev via LHCI_SERVER_MODE=dev) on the
#   claimed PORT.
# - Waits for server reachability, seeds pilot fixtures via the Playwright
#   setup (reuses `e2e/setup/pilot-seed.ts`), then runs `npx lhci autorun`
#   against the pilot URL list from lighthouserc.pilot.js.
# - Releases slot + kills server on exit/error/CTRL+C.
#
# Thresholds match lighthouserc.js:
#   performance >= 0.90 (warn)
#   accessibility >= 0.95 (error)
#   seo >= 0.95 (error)
#   best-practices >= 0.90 (warn)
#
# Reports: artifacts/qa/pilot/<date>/w6-220/lighthouse/*.{html,json}
#
# Usage:
#   bash scripts/lighthouse-pilot.sh
#   LHCI_SERVER_MODE=dev bash scripts/lighthouse-pilot.sh

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

echo "[lighthouse-pilot] Claimed slot $SESSION_NAME on port $PORT"

# --- Output dir --------------------------------------------------------------
DATE=$(date -u +%F)
OUTPUT_DIR="artifacts/qa/pilot/${DATE}/w6-220/lighthouse"
mkdir -p "$OUTPUT_DIR"
echo "[lighthouse-pilot] Output dir: $OUTPUT_DIR"

# --- Start server ------------------------------------------------------------
SERVER_MODE="${LHCI_SERVER_MODE:-prod}"
DIST_DIR="${LHCI_DIST_DIR:-.next-${SESSION_NAME}}"

if [[ "$SERVER_MODE" == "dev" ]]; then
  echo "[lighthouse-pilot] Starting dev server (NEXT_DIST_DIR=$DIST_DIR)"
  NEXT_DIST_DIR="$DIST_DIR" PORT="$PORT" npm run dev:session &
  DEV_PID=$!
else
  if [[ "${LHCI_FORCE_BUILD:-0}" == "1" || ! -d "$DIST_DIR" ]]; then
    echo "[lighthouse-pilot] Building production bundle (NEXT_DIST_DIR=$DIST_DIR)"
    NEXT_DIST_DIR="$DIST_DIR" npm run build
  else
    echo "[lighthouse-pilot] Using existing production bundle at $DIST_DIR"
  fi
  echo "[lighthouse-pilot] Starting production server on port $PORT"
  NEXT_DIST_DIR="$DIST_DIR" npm run start -- --port "$PORT" &
  DEV_PID=$!
fi

# --- Wait for server ---------------------------------------------------------
echo "[lighthouse-pilot] Waiting for http://localhost:$PORT ..."
WAIT_SECS=120
elapsed=0
until curl -sf "http://localhost:$PORT" > /dev/null; do
  if (( elapsed >= WAIT_SECS )); then
    echo "[lighthouse-pilot] ERROR: server unreachable on port $PORT after ${WAIT_SECS}s" >&2
    exit 1
  fi
  sleep 3
  elapsed=$((elapsed + 3))
done

# --- Seed pilot fixtures -----------------------------------------------------
echo "[lighthouse-pilot] Seeding pilot fixtures (baseline + translation-ready)..."
npx tsx -e "
  import { seedPilot } from './e2e/setup/pilot-seed';
  (async () => {
    const baseline = await seedPilot('baseline');
    const translated = await seedPilot('translation-ready');
    console.log('[lighthouse-pilot] baseline:', {
      pkg: baseline.packages[0]?.slug,
      act: baseline.activities[0]?.slug,
    });
    console.log('[lighthouse-pilot] translation-ready:', {
      blog: translated.blogPosts[0]?.slug,
    });
  })().catch((err) => { console.error(err); process.exit(1); });
" || echo "[lighthouse-pilot] WARN: seed script failed, continuing with existing fixtures"

# --- Prewarm -----------------------------------------------------------------
TENANT="${LHCI_TENANT:-colombiatours}"
echo "[lighthouse-pilot] Prewarming pilot URLs..."
prewarm_urls=(
  "http://localhost:${PORT}/site/${TENANT}/paquetes/pilot-colombiatours-pkg-baseline"
  "http://localhost:${PORT}/site/${TENANT}/actividades/pilot-colombiatours-act-baseline"
  "http://localhost:${PORT}/site/${TENANT}/hoteles/aloft-bogota-airport"
  "http://localhost:${PORT}/site/${TENANT}/blog/pilot-colombiatours-blog-translation-ready"
)
for url in "${prewarm_urls[@]}"; do
  curl -sf "$url" > /dev/null || echo "[lighthouse-pilot] WARN: prewarm $url non-200"
done

# --- Run Lighthouse CI -------------------------------------------------------
echo "[lighthouse-pilot] Running Lighthouse CI via lighthouserc.pilot.js"
LHCI_PORT="$PORT" LHCI_TENANT="$TENANT" LHCI_OUTPUT_DIR="$OUTPUT_DIR" \
  npx --no-install lhci autorun --config=./lighthouserc.pilot.js || {
  status=$?
  echo "[lighthouse-pilot] lhci autorun exit=$status" >&2
  exit "$status"
}

echo "[lighthouse-pilot] Done. Reports in $OUTPUT_DIR and .lighthouseci/"
