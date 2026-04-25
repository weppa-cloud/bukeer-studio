#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="bukeer-studio"
PROJECT_SLUG="${CIRCLECI_PROJECT_SLUG:-gh/weppa-cloud/${REPO_NAME}}"
ORG_SLUG="${CIRCLECI_ORG_SLUG:-gh/weppa-cloud}"
ENV_FILES=(".env.local" ".dev.vars")

required_vars=(
  CI_QUALITY_PROVIDER
  CI_DEPLOY_PROVIDER
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  REVALIDATE_SECRET
)

optional_vars=(
  E2E_WEBSITE_ID
)

if [ -z "${CIRCLE_TOKEN:-}" ]; then
  echo "CIRCLE_TOKEN is required. Create a CircleCI personal API token and export it before running this script." >&2
  exit 1
fi

load_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}

json_escape() {
  ruby -r json -e 'print JSON.generate(ARGV[0])' "$1"
}

circleci_request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  if [ -n "$body" ]; then
    curl -fsS --request "$method" \
      --url "https://circleci.com/api/v2/${path}" \
      --header "Circle-Token: ${CIRCLE_TOKEN}" \
      --header "Content-Type: application/json" \
      --data "$body"
  else
    curl -fsS --request "$method" \
      --url "https://circleci.com/api/v2/${path}" \
      --header "Circle-Token: ${CIRCLE_TOKEN}"
  fi
}

set_project_var() {
  local name="$1"
  local value="$2"
  local body
  body="{\"name\":$(json_escape "$name"),\"value\":$(json_escape "$value")}"

  circleci_request DELETE "project/${PROJECT_SLUG}/envvar/${name}" >/dev/null 2>&1 || true
  circleci_request POST "project/${PROJECT_SLUG}/envvar" "$body" >/dev/null
  echo "Set ${name}"
}

for file in "${ENV_FILES[@]}"; do
  load_env_file "$file"
done

export CI_QUALITY_PROVIDER="${CI_QUALITY_PROVIDER:-circleci}"
export CI_DEPLOY_PROVIDER="${CI_DEPLOY_PROVIDER:-circleci}"
export SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"

echo "Ensuring CircleCI project ${PROJECT_SLUG}"
circleci_request POST "organization/${ORG_SLUG}/project" "{\"name\":$(json_escape "$REPO_NAME")}" >/dev/null 2>&1 || true

missing=0
for name in "${required_vars[@]}"; do
  value="${!name:-}"
  if [ -z "$value" ]; then
    echo "Missing required variable: ${name}" >&2
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  echo "Load the missing variables into the shell and run again. Values are not printed by this script." >&2
  exit 1
fi

for name in "${required_vars[@]}"; do
  set_project_var "$name" "${!name}"
done

for name in "${optional_vars[@]}"; do
  value="${!name:-}"
  [ -n "$value" ] && set_project_var "$name" "$value"
done

echo "CircleCI bootstrap completed for ${PROJECT_SLUG}"
