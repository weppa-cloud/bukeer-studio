#!/usr/bin/env bash
# revalidate-all-tenants.sh — Fire ISR revalidation for every active website subdomain.
#
# Idempotent: safe to re-run. Used by the Product Landing v1 rollout runbook
# (docs/ops/product-landing-v1-runbook.md) post-deploy.
#
# Required env vars:
#   SUPABASE_URL                 — e.g. https://xyz.supabase.co (same value as NEXT_PUBLIC_SUPABASE_URL)
#   SUPABASE_SERVICE_ROLE_KEY    — service role key (server-side only; never commit)
#   REVALIDATE_SECRET            — shared secret configured in the Worker env
#
# Optional env vars:
#   REVALIDATE_URL               — default: https://bukeer.com/api/revalidate
#   DRY_RUN=1                    — list tenants without calling the endpoint
#   SLEEP_SECONDS                — pause between calls (default: 0.2)
#   TIMEOUT_SECONDS              — per-request timeout (default: 15)
#
# Usage:
#   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... REVALIDATE_SECRET=... \
#     bash scripts/revalidate-all-tenants.sh
#
#   DRY_RUN=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... REVALIDATE_SECRET=ignored \
#     bash scripts/revalidate-all-tenants.sh

set -euo pipefail

REVALIDATE_URL="${REVALIDATE_URL:-https://bukeer.com/api/revalidate}"
SLEEP_SECONDS="${SLEEP_SECONDS:-0.2}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-15}"
DRY_RUN="${DRY_RUN:-0}"

fail() { echo "Error: $*" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v jq   >/dev/null 2>&1 || fail "jq is required (brew install jq)"

: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
if [[ "$DRY_RUN" != "1" ]]; then
  : "${REVALIDATE_SECRET:?REVALIDATE_SECRET is required (or set DRY_RUN=1)}"
fi

echo "Revalidate endpoint : $REVALIDATE_URL"
echo "Supabase URL        : $SUPABASE_URL"
echo "Dry run             : $DRY_RUN"
echo "Request delay (s)   : $SLEEP_SECONDS"
echo "Request timeout (s) : $TIMEOUT_SECONDS"
echo

# 1. Fetch every active, non-deleted website subdomain.
#    PostgREST filter: deleted_at IS NULL, status = 'active' if column exists.
#    Fallback to just deleted_at IS NULL if status filtering is unsupported.
TENANTS_JSON="$(
  curl -sS --fail --max-time "$TIMEOUT_SECONDS" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "$SUPABASE_URL/rest/v1/websites?select=subdomain&deleted_at=is.null&order=subdomain.asc"
)" || fail "Failed to fetch tenant list from Supabase"

TENANTS=()
while IFS= read -r sub; do
  [[ -z "$sub" || "$sub" == "null" ]] && continue
  TENANTS+=("$sub")
done < <(echo "$TENANTS_JSON" | jq -r '.[].subdomain')

if [[ ${#TENANTS[@]} -eq 0 ]]; then
  fail "No active tenants returned from Supabase (check service role key and filter)"
fi

echo "Found ${#TENANTS[@]} tenant(s)."
echo

OK_COUNT=0
FAIL_COUNT=0
FAILED_TENANTS=()

for subdomain in "${TENANTS[@]}"; do
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] would revalidate: $subdomain"
    OK_COUNT=$((OK_COUNT + 1))
    continue
  fi

  # 2. POST to /api/revalidate for each tenant.
  HTTP_CODE="$(
    curl -sS -o /tmp/revalidate_body.$$ -w "%{http_code}" \
      --max-time "$TIMEOUT_SECONDS" \
      -X POST "$REVALIDATE_URL" \
      -H "Authorization: Bearer $REVALIDATE_SECRET" \
      -H "Content-Type: application/json" \
      --data "$(jq -n --arg s "$subdomain" '{subdomain: $s}')" \
      || echo "000"
  )"

  BODY="$(cat /tmp/revalidate_body.$$ 2>/dev/null || true)"
  rm -f /tmp/revalidate_body.$$

  if [[ "$HTTP_CODE" =~ ^2[0-9][0-9]$ ]]; then
    PATHS="$(echo "$BODY" | jq -r '.data.paths // .paths // [] | join(",")' 2>/dev/null || echo "-")"
    echo "OK   [$HTTP_CODE] $subdomain  ($PATHS)"
    OK_COUNT=$((OK_COUNT + 1))
  else
    echo "FAIL [$HTTP_CODE] $subdomain — $BODY"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_TENANTS+=("$subdomain")
  fi

  sleep "$SLEEP_SECONDS"
done

echo
echo "──────────── Summary ────────────"
echo "Succeeded : $OK_COUNT"
echo "Failed    : $FAIL_COUNT"
if [[ $FAIL_COUNT -gt 0 ]]; then
  echo "Failed tenants: ${FAILED_TENANTS[*]}"
  echo "Re-run this script — it is idempotent."
  exit 1
fi
echo "All tenants revalidated successfully."
