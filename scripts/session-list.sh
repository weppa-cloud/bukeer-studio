#!/usr/bin/env bash
# session-list.sh — Show status of all E2E session slots

set -euo pipefail

LOCK_BASE=".sessions/locks"
SLOT_NAMES=(s1   s2   s3   s4  )
SLOT_PORTS=(3001 3002 3003 3004)

echo "Slot  Port  Status"
echo "----  ----  ------"

for i in "${!SLOT_NAMES[@]}"; do
  name="${SLOT_NAMES[$i]}"
  port="${SLOT_PORTS[$i]}"
  lock_dir="$LOCK_BASE/$name"

  if [[ ! -d "$lock_dir" ]]; then
    echo "$name   $port  FREE"
    continue
  fi

  pid_file="$lock_dir/pid"
  if [[ -f "$pid_file" ]]; then
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "$name   $port  BUSY   (PID $pid)"
    else
      echo "$name   $port  STALE  (PID $pid dead — run: rm -rf $lock_dir)"
    fi
  else
    echo "$name   $port  BUSY   (no PID file)"
  fi
done
