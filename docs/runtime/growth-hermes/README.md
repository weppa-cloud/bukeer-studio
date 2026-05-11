# Growth Hermes Sidecar Runtime

This folder documents the Epic #482 Hermes sidecar skeleton.

Implementation:

- `runtime/growth-hermes/bin/run.mjs`
- `runtime/growth-hermes/src/sidecar.mjs`
- `runtime/growth-hermes/skills/*.md`
- `runtime/growth-hermes/fixtures/task-request.json`

## Environment

Required in real VPS operation:

| Variable | Purpose |
| --- | --- |
| `HERMES_BIN` | Hermes CLI binary, default `hermes` |
| `HERMES_PROFILE` | Hermes profile, default `growth-os-colombiatours` |
| `GROWTH_HERMES_MODE` | `auto`, `deterministic` or `hermes` |
| `HERMES_ARGS_TEMPLATE` | Optional Hermes CLI argument template |
| `HERMES_TIMEOUT_MS` | Per-lane CLI timeout, default `180000` |
| `GROWTH_WORKSPACE_ROOT` | Workspace root for prompt/runtime files |

The sidecar should not receive Supabase service-role credentials directly. A
future bridge command may pass scoped context into the task request and accept
the emitted artifact JSON for materialization.

## Safety boundary

Hermes prepares artifacts only. Production changes still require Growth OS:

```text
artifact -> candidate -> work item -> executor -> snapshot -> apply -> smoke -> rollback/outcome
```

Sensitive actions remain forbidden:

- paid mutation;
- pricing;
- availability;
- reservations;
- payments;
- bulk CRM;
- outreach.

## Local smoke

```bash
node runtime/growth-hermes/bin/run.mjs \
  --mode deterministic \
  --request runtime/growth-hermes/fixtures/task-request.json \
  --output .runtime/growth-hermes/local-smoke-output.json
```
