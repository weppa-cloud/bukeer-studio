#!/usr/bin/env bash
# session-acquire.sh — Claim first available E2E session slot (atomic via mkdir lock)
#
# Usage (claim only, print env vars):
#   eval "$(bash scripts/session-acquire.sh)"
#
# Usage (claim + run + auto-release):
#   bash scripts/session-acquire.sh --run [playwright args...]
#
# Slots pool: s1:3001  s2:3002  s3:3003  s4:3004
# Lock dir:   .sessions/locks/<slot>   (mkdir = atomic on POSIX)
# Stale lock: auto-cleared if PID in lock is dead

set -euo pipefail

LOCK_BASE=".sessions/locks"
mkdir -p "$LOCK_BASE"

# ---- slot definitions -------------------------------------------------------
SLOT_NAMES=(s1   s2   s3   s4  )
SLOT_PORTS=(3001 3002 3003 3004)
SLOT_COUNT=${#SLOT_NAMES[@]}

# ---- acquire ----------------------------------------------------------------
acquire() {
  for i in "${!SLOT_NAMES[@]}"; do
    local name="${SLOT_NAMES[$i]}"
    local port="${SLOT_PORTS[$i]}"
    local lock_dir="$LOCK_BASE/$name"

    # Check stale lock: if lock exists but PID is dead, remove it
    if [[ -d "$lock_dir" ]]; then
      local pid_file="$lock_dir/pid"
      if [[ -f "$pid_file" ]]; then
        local locked_pid
        locked_pid="$(cat "$pid_file")"
        if ! kill -0 "$locked_pid" 2>/dev/null; then
          echo "[session-acquire] Stale lock on $name (PID $locked_pid dead) — clearing" >&2
          rm -rf "$lock_dir"
        fi
      fi
    fi

    # Atomic claim via mkdir
    if mkdir "$lock_dir" 2>/dev/null; then
      echo "$$" > "$lock_dir/pid"
      echo "$name $port"
      return 0
    fi
  done

  echo "[session-acquire] ERROR: All $SLOT_COUNT slots busy (s1–s${SLOT_COUNT}, ports 3001–${SLOT_PORTS[$((SLOT_COUNT-1))]})" >&2
  echo "[session-acquire] List active sessions:" >&2
  for name in "${SLOT_NAMES[@]}"; do
    local lock_dir="$LOCK_BASE/$name"
    if [[ -d "$lock_dir" ]] && [[ -f "$lock_dir/pid" ]]; then
      echo "  $name → PID $(cat "$lock_dir/pid")" >&2
    fi
  done
  return 1
}

# ---- release ----------------------------------------------------------------
release() {
  local name="$1"
  rm -rf "$LOCK_BASE/$name"
  echo "[session-acquire] Released slot $name" >&2
}

# ---- main -------------------------------------------------------------------
RUN_MODE=false
EXTRA_ARGS=()

for arg in "$@"; do
  if [[ "$arg" == "--run" ]]; then
    RUN_MODE=true
  else
    EXTRA_ARGS+=("$arg")
  fi
done

read -r SESS_NAME SESS_PORT < <(acquire)

if $RUN_MODE; then
  echo "[session-acquire] Claimed slot $SESS_NAME on port $SESS_PORT (PID $$)" >&2

  # Release on exit (normal, error, or CTRL+C)
  trap "release $SESS_NAME" EXIT INT TERM

  export SESSION_NAME="$SESS_NAME"
  export PORT="$SESS_PORT"

  bash scripts/run-e2e-session.sh "${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}"
else
  # Print env exports for eval usage
  echo "export SESSION_NAME=$SESS_NAME"
  echo "export PORT=$SESS_PORT"
  echo "export _ACQUIRED_SESSION=$SESS_NAME"  # used by release-session.sh
fi
