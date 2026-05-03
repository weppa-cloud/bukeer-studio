# Codex Executor

The Codex executor is implemented in:

```text
runtime/growth-orchestrator/src/codex-executor.mjs
```

It calls:

```bash
codex exec --json --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check \
  --cd /app \
  --output-schema <schema> \
  --output-last-message <file> -
```

The executor always writes a structured envelope, even when Codex fails. Failed
or incomplete executions remain `review_required`.

## Auth mode

The VPS runtime uses the Codex CLI authenticated with the ChatGPT subscription,
not an API key transport. The session is persisted through:

```text
/opt/growth-os/codex -> /root/.codex
```

Current validated behavior:

- `codex login status` must report `Logged in using ChatGPT`.
- Codex CLI `0.128.0` works with the mounted ChatGPT session.
- Leave `GROWTH_CODEX_MODEL` empty by default. Codex CLI then selects the
  subscription-compatible default model.
- Do not pass registry models such as `gpt-5-codex` or `codex-mini-latest`
  unless the account explicitly supports them for ChatGPT auth.

Reauthorize the mounted Codex session when needed:

```bash
ssh -t -i ~/Documents/Proyectos/ssh/id_rsa1 bukeer@87.99.153.174
cd /opt/growth-os
docker compose run --rm --entrypoint sh growth-orchestrator -lc 'codex login --device-auth'
```

## Sandbox mode

The runtime container is the external sandbox. Codex's internal Bubblewrap
sandbox fails on the VPS because unprivileged user namespaces are disabled:

```text
bwrap: No permissions to create a new namespace
```

For that environment, `GROWTH_CODEX_SANDBOX_MODE=bypass` maps to:

```bash
--dangerously-bypass-approvals-and-sandbox
```

This does not enable business mutation. Growth OS still forces human review and
blocks publish, transcreation merge, paid mutation and experiment activation.

```

```
