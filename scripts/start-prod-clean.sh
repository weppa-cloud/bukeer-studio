#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"
KILL_ALL_NEXT="${KILL_ALL_NEXT:-1}"

if [[ -z "$NODE_BIN" || -z "$NPM_BIN" ]]; then
  echo "Error: node o npm no encontrados en PATH"
  exit 1
fi

echo "Usando Node: $("$NODE_BIN" -v)"
echo "Usando npm: $("$NPM_BIN" -v)"
echo "Puerto objetivo: $PORT"

if [[ "$KILL_ALL_NEXT" == "1" ]]; then
  NEXT_PIDS="$(pgrep -f "next-server|next dev|next/dist/bin/next" || true)"
  if [[ -n "$NEXT_PIDS" ]]; then
    echo "Cerrando procesos Next activos: $NEXT_PIDS"
    kill -TERM $NEXT_PIDS || true
    sleep 1

    STILL_NEXT="$(pgrep -f "next-server|next dev|next/dist/bin/next" || true)"
    if [[ -n "$STILL_NEXT" ]]; then
      echo "Forzando cierre de Next: $STILL_NEXT"
      kill -KILL $STILL_NEXT || true
    fi
  fi
fi

PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)"
if [[ -n "$PIDS" ]]; then
  echo "Cerrando procesos en puerto $PORT: $PIDS"
  kill -TERM $PIDS || true
  sleep 1

  STILL_UP="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)"
  if [[ -n "$STILL_UP" ]]; then
    echo "Forzando cierre en puerto $PORT: $STILL_UP"
    kill -KILL $STILL_UP || true
  fi
fi

echo "Limpiando build cache..."
"$NPM_BIN" run clean || true
rm -rf .next .open-next playwright-report test-results 2>/dev/null || true

echo "Compilando (modo producción)..."
"$NPM_BIN" run build

echo "Iniciando servidor de producción en :$PORT"
exec "$NPM_BIN" run start -- -p "$PORT"
