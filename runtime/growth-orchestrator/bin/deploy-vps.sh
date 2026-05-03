#!/usr/bin/env bash
set -euo pipefail

SHA="${1:-HEAD}"
REMOTE="${GROWTH_RUNTIME_SSH_TARGET:-bukeer@87.99.153.174}"
SSH_KEY="${GROWTH_RUNTIME_SSH_KEY:-$HOME/Documents/Proyectos/ssh/id_rsa1}"
ROOT="${GROWTH_RUNTIME_ROOT:-/opt/growth-os}"
BRANCH="${GROWTH_RUNTIME_BRANCH:-origin/dev}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "SSH key not found: $SSH_KEY" >&2
  exit 1
fi

git fetch --quiet origin dev
RESOLVED_SHA="$(git rev-parse "$SHA")"
SHORT_SHA="$(git rev-parse --short "$RESOLVED_SHA")"

if ! git merge-base --is-ancestor "$RESOLVED_SHA" "$BRANCH"; then
  echo "Ref $RESOLVED_SHA is not reachable from $BRANCH" >&2
  exit 1
fi

echo "Deploying Growth runtime $SHORT_SHA to $REMOTE:$ROOT"

git archive --format=tar "$RESOLVED_SHA" | ssh -i "$SSH_KEY" -o BatchMode=yes "$REMOTE" "
set -euo pipefail
ROOT='$ROOT'
SHA='$RESOLVED_SHA'
SHORT_SHA='$SHORT_SHA'
RELEASE=\"\$ROOT/releases/\$SHA\"

mkdir -p \"\$ROOT/releases\" \"\$ROOT/workspaces\" \"\$ROOT/artifacts\" \"\$ROOT/logs\"
rm -rf \"\$RELEASE.tmp\"
mkdir -p \"\$RELEASE.tmp\"
tar -xf - -C \"\$RELEASE.tmp\"
mv \"\$RELEASE.tmp\" \"\$RELEASE\"
ln -sfn \"\$RELEASE\" \"\$ROOT/current\"
cp \"\$ROOT/current/docker-compose.growth-orchestrator.yml\" \"\$ROOT/docker-compose.yml\"

echo \"release=\$RELEASE\"
echo \"current=\$(readlink -f \"\$ROOT/current\")\"
"

ssh -i "$SSH_KEY" -o BatchMode=yes "$REMOTE" "
set -euo pipefail
cd '$ROOT'
docker compose up -d --build growth-orchestrator
docker exec growth-orchestrator node --check runtime/growth-orchestrator/src/codex-executor.mjs
docker exec growth-orchestrator node --check runtime/growth-orchestrator/src/orchestrator.mjs
docker exec growth-orchestrator node --check runtime/growth-orchestrator/bin/run.mjs
docker exec growth-orchestrator node --check scripts/growth/run-codex-agent-task.mjs
docker exec growth-orchestrator node --check scripts/growth/run-growth-symphony-orchestrator.mjs
docker exec growth-orchestrator codex login status
docker exec growth-orchestrator node scripts/growth/run-growth-symphony-orchestrator.mjs --configSmoke
docker compose ps
"

echo "Growth runtime deploy complete: $SHORT_SHA"
