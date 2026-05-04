#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
NEXT_DIST_DIR="${NEXT_DIST_DIR:-.next}"
NODE_BIN="$(command -v node)"

if [[ -z "$NODE_BIN" ]]; then
  echo "Error: node no encontrado en PATH"
  exit 1
fi

echo "Usando Node: $("$NODE_BIN" -v)"
echo "Iniciando Next dev en puerto: $PORT"
echo "Dist dir aislado: $NEXT_DIST_DIR"

if [[ "${NEXT_DEV_TURBO:-true}" == "false" ]]; then
  exec "$NODE_BIN" ./node_modules/next/dist/bin/next dev -p "$PORT"
fi

exec "$NODE_BIN" ./node_modules/next/dist/bin/next dev --turbo -p "$PORT"
