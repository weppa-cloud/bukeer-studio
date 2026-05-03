# Growth Orchestrator Runtime

This folder documents how the Growth OS runtime is operated.

Start here:

- [architecture](./architecture.md) — execution model and code layout.
- [deployment](./deployment.md) — VPS releases by SHA and rollback.
- [operations](./operations.md) — smoke checks, logs and health.
- [codex-executor](./codex-executor.md) — Codex auth, structured artifacts and known failure modes.
- [data-contract](./data-contract.md) — Supabase tables and artifact shape.
- [toolsets](./toolsets.md) — lane tool permissions and always-gated actions.
- [memory](./memory.md) — approved memory and skill candidate lifecycle.
- [safety-and-governance](./safety-and-governance.md) — blocked action classes and review gates.
- [troubleshooting](./troubleshooting.md) — common failures.

The implementation SPECs remain in `docs/specs/`; this folder is for runtime
operation and maintenance.
