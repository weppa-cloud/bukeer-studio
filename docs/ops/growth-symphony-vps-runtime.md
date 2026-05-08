# Growth OS Symphony VPS Runtime Runbook

Related SPEC: [SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR](../specs/SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md)  
Related EPIC: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)
Runtime docs: [docs/runtime/growth-orchestrator](../runtime/growth-orchestrator/README.md)

## Runtime Decision

The initial Growth OS orchestrator runtime will run on a VPS using Docker
Compose. Supabase remains the operational control plane. GitHub remains the
implementation control plane.

Provided VPS access:

```text
ssh -t -i ~/Documents/Proyectos/ssh/id_rsa1 bukeer@87.99.153.174
```

Validated host: `growth-os-vps-prod` (`87.99.153.174`).

## Target Layout

```text
/opt/growth-os/
├── releases/{git_sha}
├── current -> releases/{git_sha}
├── workspaces/{account_id}/{website_id}/{run_id}
├── artifacts/{account_id}/{website_id}/{run_id}
├── logs
├── codex
├── secrets/growth-orchestrator.env
└── docker-compose.yml
```

`/opt/growth-os/current` is the only application path Docker Compose builds
from. Releases are immutable git archives keyed by commit SHA. Rollback is a
symlink move plus `docker compose up -d --build`.

## Dockerfile Contract

```dockerfile
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y \
  git bash curl jq ca-certificates openssh-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
RUN npm ci --omit=dev \
  && npm install -g @openai/codex@latest tsx

COPY . .

ENV NODE_ENV=production

CMD ["tsx", "scripts/growth/run-growth-production-cycle.ts", "--scheduled", "--interval-ms=1800000", "--max-claims-per-lane=1"]
```

## Compose Contract

```yaml
services:
  growth-orchestrator:
    build:
      context: /opt/growth-os/current
      dockerfile: Dockerfile.growth-orchestrator
    container_name: growth-orchestrator
    restart: unless-stopped
    env_file:
      - /opt/growth-os/secrets/growth-orchestrator.env
    volumes:
      - /opt/growth-os/workspaces:/workspaces
      - /opt/growth-os/artifacts:/artifacts
      - /opt/growth-os/logs:/logs
      - /opt/growth-os/codex:/root/.codex
    working_dir: /app
    command: >
      tsx scripts/growth/run-growth-production-cycle.ts --scheduled --interval-ms=1800000 --max-claims-per-lane=1
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
```

## Required Secrets

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_AUTH_TOKEN=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=anthropic/claude-sonnet-4-5
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
GITHUB_TOKEN=
GROWTH_ACCOUNT_ID=
GROWTH_WEBSITE_ID=
GROWTH_LOCALE=es-CO
GROWTH_MARKET=CO
GROWTH_ENVIRONMENT=production
GROWTH_ORCHESTRATOR_AGREEMENT_THRESHOLD=0.90
```

## Deployment Checklist

1. Validate the VPS host and SSH key.
2. Install Docker, Compose plugin, UFW and fail2ban.
3. Create `/opt/growth-os` folder tree.
4. Create env file with `chmod 600`.
5. Deploy an immutable git archive by commit SHA:

   ```bash
   scripts/growth/deploy-runtime-vps.sh <sha>
   ```

6. Verify logs and Supabase run/event writes.
7. Confirm `growth_autonomy_policies` has explicit lane/action policies, caps
   and kill switch state before enabling `dry_run_only=false`.

The deployment script:

- validates that `<sha>` is reachable from `origin/dev`;
- creates `/opt/growth-os/releases/<sha>`;
- updates `/opt/growth-os/current`;
- copies the repo compose file to `/opt/growth-os/docker-compose.yml`;
- rebuilds/restarts `growth-orchestrator`;
- runs Node syntax checks, `codex login status` and `--configSmoke`.

Canonical live-gated cycle entrypoint is now
`scripts/growth/run-growth-production-cycle.ts`. The legacy Symphony runtime in
`runtime/growth-orchestrator` remains the compatibility execution plane for
Codex-style task runs and historical runbooks.

Rollback:

```bash
ssh -t -i ~/Documents/Proyectos/ssh/id_rsa1 bukeer@87.99.153.174
cd /opt/growth-os
ln -sfn /opt/growth-os/releases/<previous_sha> current
cp current/docker-compose.growth-orchestrator.yml docker-compose.yml
docker compose up -d --build growth-orchestrator
```

## Safety Defaults

- No public port is required for the daemon.
- SSH is key-only.
- Artifacts are tenant/run namespaced.
- No raw provider payloads in GitHub comments.
- Agreement below `0.90` blocks any automation beyond review/handoff.
- The daemon claims at most one item per lane per cycle by default.
- Paid, pricing, availability, reservations, payments, CRM mass mutation and
  outreach are blocked even if a policy is misconfigured.
