# Operations

Check runtime status:

```bash
ssh -t -i ~/Documents/Proyectos/ssh/id_rsa1 bukeer@87.99.153.174
cd /opt/growth-os
docker compose ps
docker logs --tail 120 growth-orchestrator
```

Smoke configuration:

```bash
docker exec growth-orchestrator \
  node scripts/growth/run-growth-symphony-orchestrator.mjs --configSmoke
```

Codex auth status:

```bash
docker exec growth-orchestrator codex login status
```

Expected daemon idle state when no eligible rows exist:

```text
no eligible row
orchestrator tick completed claimed=0
```

That is healthy polling, not a failed runtime.
