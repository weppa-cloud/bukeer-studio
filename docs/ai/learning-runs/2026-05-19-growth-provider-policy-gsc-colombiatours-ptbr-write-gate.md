# Learning Run — GSC Policy Write Gate ColombiaTours pt-BR

Pipeline: `growth-provider-policy-gsc-colombiatours-ptbr-write-gate`
Date: 2026-05-19
Outcome: `PASS_WITH_WATCH_GSC_ONE_ENTITY`
Commit: pending at write time

## What changed

The previous GSC adapter policy gap was closed by creating an explicit `gsc/search_console_page_query` policy and writing one first-party GSC fact/source_ref chain for `/tour-colombia-10-dias` in `pt-BR/BR`.

## Reusable lessons

1. Policy-first matters: do not write provider-derived facts under the manual/operator policy.
2. For Supabase DML gates, avoid relying on sibling data-modifying CTE visibility. Use explicit idempotent stages and reselect persisted rows.
3. GSC rows may include legacy `/l/<slug>-colombiatours/` URLs and canonical URLs in the same sample. Adapter normalization to `/<slug>` is required before fact grouping.
4. A `PASS_WITH_WATCH` ContextPacket log is the correct status for one-entity provider canaries.

## Materialized artifacts

- SPEC: `docs/specs/SPEC_GROWTH_PROVIDER_POLICY_GSC_COLOMBIATOURS_PTBR_WRITE_GATE.md`
- Validation docs: `docs/validation/t1..t4-gsc-policy-write-gate-*`
- Fact store entry to be created after commit.
- Skill patch candidate: add DML CTE visibility pitfall to `bukeer-development-pipeline` if not already present.
