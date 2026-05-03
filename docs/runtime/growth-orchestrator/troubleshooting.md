# Troubleshooting

## `claimed:0`

The daemon is healthy but no source rows are eligible for the claim RPC.
Seed or approve eligible rows for each lane before expecting artifacts.

## `codex exec` returns `401 Unauthorized`

The mounted Codex session is stale even if `codex login status` says logged in.
Reauthorize:

```bash
docker exec -it growth-orchestrator codex login --device-auth
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
