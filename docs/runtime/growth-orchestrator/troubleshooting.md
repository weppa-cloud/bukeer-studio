# Troubleshooting

## `claimed:0`

The daemon is healthy but no source rows are eligible for the claim RPC.
Seed or approve eligible rows for each lane before expecting artifacts.

## `codex exec` returns `401 Unauthorized`

The mounted Codex session is stale, or the deployed image is running an older
Codex CLI. The validated runtime path is Codex CLI `0.128.0` with ChatGPT auth.
Reauthorize the mounted session:

```bash
cd /opt/growth-os
docker compose run --rm --entrypoint sh growth-orchestrator -lc 'codex login --device-auth'
docker compose run --rm --entrypoint sh growth-orchestrator -lc 'codex login status'
```

## `model is not supported when using Codex with a ChatGPT account`

Do not force a registry model when running through the ChatGPT subscription.
Leave `GROWTH_CODEX_MODEL` unset so Codex CLI can choose its compatible default.

The Growth OS registry model remains metadata for lane intent; it is not passed
to `codex exec` unless `GROWTH_CODEX_MODEL` is explicitly configured.

## `bwrap: No permissions to create a new namespace`

The VPS does not allow Codex's internal Bubblewrap sandbox. The runtime uses the
Docker container as the external sandbox:

```bash
GROWTH_CODEX_SANDBOX_MODE=bypass
```

## `Not inside a trusted directory`

The runtime deploys git archives without `.git`. The executor passes
`--skip-git-repo-check`; if this reappears, verify the deployed executor is the
latest release.

## Config smoke fails

Check:

- `/opt/growth-os/secrets/growth-orchestrator.env`
- `growth_agent_definitions`
- `growth_agent_context_packs`
- workflow files under `docs/growth-orchestrator/workflows`
