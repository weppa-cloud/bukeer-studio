#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

set -a
[ -f "$ROOT_DIR/.env.local" ] && source "$ROOT_DIR/.env.local"
[ -f "$ROOT_DIR/.env.mcp" ] && source "$ROOT_DIR/.env.mcp"
set +a

export ACCESS_TOKEN="${ACCESS_TOKEN:-${META_ACCESS_TOKEN:-}}"
export AD_ACCOUNT_ID="${AD_ACCOUNT_ID:-${META_AD_ACCOUNT_ID:-}}"
export BUSINESS_ID="${BUSINESS_ID:-${META_BUSINESS_ID:-}}"

if [ -z "${ACCESS_TOKEN:-}" ]; then
  echo "Missing ACCESS_TOKEN or META_ACCESS_TOKEN in .env.local/.env.mcp" >&2
  exit 3
fi

exec meta "$@"
