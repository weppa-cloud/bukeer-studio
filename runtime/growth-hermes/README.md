# Growth Hermes Sidecar

Epic #482 sidecar skeleton for running Hermes as a Growth OS companion runtime.

The sidecar is intentionally outside the Growth OS mutation boundary. It reads a
tenant-scoped JSON task request, prepares/delegates lane work for content,
technical remediation and transcreation, and emits JSON artifacts. Growth OS must
still validate artifacts and execute public mutations through its live-gated
executor.

## Modes

- `deterministic`: local smoke mode, no Hermes dependency, stable artifact
  shapes for tests and certification dry-runs.
- `hermes`: invokes a Hermes CLI binary and stores prompt files under
  `.runtime/growth-hermes/`.
- `auto`: uses `hermes` when `HERMES_BIN` exists on `PATH`, otherwise falls back
  to `deterministic`.

## Run

```bash
node runtime/growth-hermes/bin/run.mjs \
  --mode deterministic \
  --request runtime/growth-hermes/fixtures/task-request.json \
  --output .runtime/growth-hermes/local-smoke-output.json
```

Hermes CLI mode:

```bash
HERMES_BIN=hermes \
HERMES_PROFILE=growth-os-colombiatours \
node runtime/growth-hermes/bin/run.mjs \
  --mode hermes \
  --request runtime/growth-hermes/fixtures/task-request.json
```

If your Hermes CLI uses a different invocation shape, set:

```bash
HERMES_ARGS_TEMPLATE="--profile {profile} --prompt-file {promptFile} --json"
```

Available placeholders: `{profile}`, `{promptFile}`, `{lane}`, `{accountId}`,
`{websiteId}`.

## Required request fields

- `account_id`
- `website_id`
- `user_id`
- `lanes`: one or more of `content`, `technical`, `transcreation`

Optional fields include `request_id`, `agent_instance_id`, `objective`,
`locale`, `context` and `budget_by_lane`.

## Output contract

The runner writes JSON to stdout and optionally to `--output`.

Important fields:

- `run_id`
- `mode`
- `task_sessions[]`
- `artifacts[]`
- `hermes_runs[]`
- `evidence_fingerprint`
- `summary.mutation_performed=false`

Artifacts use Growth OS-compatible types:

- `content_article`
- `safe_apply_patch`
- `transcreation_payload`
