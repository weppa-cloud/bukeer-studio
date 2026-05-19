# Learning — Growth Factory batch 001 ContextPacket operation

Date: 2026-05-19
Batch: `growth-factory-colombiatours-ptbr-batch-001`

## What changed

The Growth OS now has a first concrete Factory batch pattern:

1. Select entities with governed GSC + operator source-truth refs.
2. Build prepare-only ContextPacket artifacts.
3. Run the SEO/content simulation contract.
4. Persist reviewable work items and change sets.
5. Log ContextPacket verdicts as `PASS_WITH_WATCH`.

## Durable lessons

- First production batch should prefer entities with both GSC and manual/operator source refs. Manual-only entities remain blocked for `missing_required_source_ref:gsc` until the provider chain exists.
- `growth_agent_runs.market` still lacks `BR` in its check constraint. For now, use `market='OTHER'` in the run ledger while preserving exact `target_market='BR'` in evidence and using `market='BR'` in ContextPacket/change-set tables that support it.
- `growth_agent_change_sets.run_id` has an FK to `growth_agent_runs.run_id`; create/select the agent run before inserting change sets.
- Factory output should be `review_needed`/`needs_review`, not `published_applied` or `approved`, until curator approval exists.
- The batch is production data but still `prepare_only`: no publish, no provider calls, no mass transcreation.

## Verification

- Focused tests PASS: `growth-factory-runner|growth-agent-flow-simulation|worker-contextpacket-contract`.
- Supabase row counts PASS: 4 work items, 4 runs, 4 change sets, 4 context logs.
