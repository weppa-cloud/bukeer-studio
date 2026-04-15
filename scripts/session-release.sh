#!/usr/bin/env bash
# session-release.sh — Release a previously acquired session slot
#
# Usage:
#   bash scripts/session-release.sh s1
#   bash scripts/session-release.sh "$_ACQUIRED_SESSION"   # after eval acquire

set -euo pipefail

LOCK_BASE=".sessions/locks"
SLOT="$1"

if [[ -z "$SLOT" ]]; then
  echo "Usage: session-release.sh <slot-name>  (e.g. s1, s2)" >&2
  exit 1
fi

LOCK_DIR="$LOCK_BASE/$SLOT"

if [[ ! -d "$LOCK_DIR" ]]; then
  echo "[session-release] Slot $SLOT not locked — nothing to do" >&2
  exit 0
fi

rm -rf "$LOCK_DIR"
echo "[session-release] Slot $SLOT released"
