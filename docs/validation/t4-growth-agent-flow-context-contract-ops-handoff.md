# T4 — Ops Handoff

## Current state
The active Growth OS goal is closed to watch-mode readiness:
- Workers have a ContextPacket contract.
- Agent simulation produces citable recommendations and reviewer validation.
- GSC has 4 total governed real source-truth chains: original canary + 3 new entities.
- Provider policies are visible in Bukeer Studio Data Health.
- DataForSEO is contract-ready but still read-only/cached.

## Operational limits
- No publish.
- No mass transcreation.
- No direct provider calls from workers.
- DataForSEO live calls remain blocked until policy/cost/rate UI is reviewed.

## Rollback
If needed, delete by idempotency keys:
- `growth-gsc-write-gate-slice2-3entities-%`
- `growth-gsc-fact-slice2-%`
- context log worker_run_id `growth-gsc-write-gate-slice2-3entities`

Then remove appended fact IDs from `growth_profiles.source_signal_fact_ids`.
