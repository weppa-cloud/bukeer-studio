# Learning Run — Growth Production Batch 002

Date: 2026-05-19

## What changed

Batch 001 proved governed `prepare_only` ContextPackets for pt-BR. Batch 002 turns the pattern into a recovery-first production queue for ColombiaTours Spanish pages using GSC loss deltas.

## Design decision

Production is split into four bounded pieces:

1. `growth-production-queue-runner-v0` computes recovery candidates from GSC baseline/current windows.
2. Three constant worker lanes are declared: data, brief/refresh/transcreation, review.
3. Recovery work stays `prepare_only` and creates reviewable change sets.
4. `growth-publish-gate-v0` is a separate dry-run/blocked gate until 30–50 consistent change sets are proven.

## Pitfalls handled

- `growth_agent_runs.market` supports `CO` for this batch, unlike the prior pt-BR/BR workaround that required `OTHER`.
- Publish jobs have snapshot constraints requiring non-empty `before_snapshot`, `after_payload`, `rollback_payload`, and `baseline`.
- `content_update_draft` requires human review; keep `requires_human_review=true`.
- ContextPacket contract now supports locale/market overrides so `es-CO/CO` recovery can reuse the same validation path.

## Reusable rule

Recovery queue candidates must have at least two refs:

- GSC recovery delta;
- operator source-truth/write-gate.

If either is missing, the worker must block instead of drafting or publishing.
