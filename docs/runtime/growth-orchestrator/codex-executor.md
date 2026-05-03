# Codex Executor

The Codex executor is implemented in:

```text
runtime/growth-orchestrator/src/codex-executor.mjs
```

It calls:

```bash
codex exec --json --sandbox read-only --skip-git-repo-check \
  --cd /app \
  --output-schema <schema> \
  --output-last-message <file> -
```

The executor always writes a structured envelope, even when Codex fails. Failed
or incomplete executions remain `review_required`.

Known current blocker:

```text
codex login status -> Logged in using ChatGPT
codex exec -> 401 Unauthorized
```

Fix by reauthorizing the mounted Codex session:

```bash
ssh -t -i ~/Documents/Proyectos/ssh/id_rsa1 bukeer@87.99.153.174
docker exec -it growth-orchestrator codex login --device-auth
```
