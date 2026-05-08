# Operations

Check runtime status:

```bash
ssh -t -i ~/Documents/Proyectos/ssh/id_rsa1 bukeer@87.99.153.174
cd /opt/growth-os
docker compose ps
docker logs --tail 120 growth-orchestrator
```

Production cycle smoke:

```bash
docker exec growth-orchestrator \
  npm run growth:production-cycle -- --once --dry-run --scheduled
```

Run one live-gated cycle manually:

```bash
docker exec growth-orchestrator \
  npm run growth:production-cycle -- --once --scheduled --max-claims-per-lane=1
```

The daemon command runs the same entrypoint every 30 minutes by default:

```bash
tsx scripts/growth/run-growth-production-cycle.ts \
  --scheduled \
  --interval-ms=1800000 \
  --max-claims-per-lane=1
```

Required environment:

```bash
GROWTH_ACCOUNT_ID=<account uuid>
GROWTH_WEBSITE_ID=<website uuid>
GROWTH_LOCALE=es-CO
GROWTH_MARKET=CO
GROWTH_ENVIRONMENT=production
NEXT_PUBLIC_SUPABASE_URL=<url>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Audit the latest cycle:

```sql
select id, status, trigger_source, dry_run, summary, started_at, finished_at
from growth_runtime_cycles
where website_id = '<website uuid>'
order by started_at desc
limit 5;
```

Codex auth status:

```bash
docker compose run --rm --entrypoint sh growth-orchestrator -lc 'codex login status'
```

Codex subscription smoke:

```bash
docker compose run --rm --entrypoint sh growth-orchestrator -lc \
  "printf 'Return {\"ok\":true} as JSON.' | codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check -"
```

Expected daemon idle state when no eligible rows exist:

```text
no eligible row
orchestrator tick completed claimed=0
```

That is healthy polling, not a failed runtime.

Kill switch and lane pause:

```sql
update growth_autonomy_policies
set kill_switch_enabled = true,
    paused_reason = 'manual production pause',
    updated_at = now()
where website_id = '<website uuid>';
```

Resume only one lane/action after inspection:

```sql
update growth_autonomy_policies
set kill_switch_enabled = false,
    paused_reason = null,
    dry_run_only = false,
    daily_cap = least(daily_cap, 1),
    weekly_cap = least(weekly_cap, 3),
    updated_at = now()
where website_id = '<website uuid>'
  and lane = 'content_creator'
  and action_class = 'content_publish';
```

Rollback a bad release:

```bash
cd /opt/growth-os
ln -sfn /opt/growth-os/releases/<previous_sha> current
cp current/docker-compose.growth-orchestrator.yml docker-compose.yml
docker compose up -d --build growth-orchestrator
```
