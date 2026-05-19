# T8 — Growth Factory batch 001 ColombiaTours pt-BR/BR

Date: 2026-05-19
Batch id: `growth-factory-colombiatours-ptbr-batch-001`
Mode: `prepare_only`
Verdict: `PASS_WITH_WATCH_BATCH_001`

## Scope

Delivered the first controlled Growth Factory batch for ColombiaTours `pt-BR/BR` using governed ContextPackets and existing GSC + operator source-truth chains.

## Selected entities

1. `/los-mejores-paquetes-de-viajes-a-colombia`
   - opportunity_score: `132.19`
   - GSC impressions: `62`
   - weighted_position: `19.080645161290324`

2. `/tour-colombia-15-dias`
   - opportunity_score: `77.61`
   - GSC impressions: `14`
   - weighted_position: `37.857142857142854`

3. `/tour-colombia-10-dias`
   - opportunity_score: `65.79`
   - GSC impressions: `17`
   - weighted_position: `76.94117647058823`

4. `/cartagena-4-dias`
   - opportunity_score: `51.50`
   - GSC impressions: `3`
   - weighted_position: `70.66666666666667`

## Persisted artifacts

Supabase production artifacts created idempotently:

- `growth_work_items`: 4 rows, status `review_needed`
- `growth_agent_runs`: 4 rows, status `review_required`
- `growth_agent_change_sets`: 4 rows, status `needs_review`
- `growth_context_packet_log`: 4 rows, verdict `PASS_WITH_WATCH`

Change sets:

- `/los-mejores-paquetes-de-viajes-a-colombia`: `de22bc8c-8b18-4bf6-a79f-0b6427b5159e`
- `/tour-colombia-15-dias`: `76db569d-1c47-4f0a-8873-e0af7daeb11a`
- `/tour-colombia-10-dias`: `66c30854-4dcf-4490-a47a-d3c912025ba6`
- `/cartagena-4-dias`: `f99b5d8b-47ce-4c2e-bfc5-8698f7fb398d`

## Guardrails

- No publish.
- No mass transcreation.
- No provider API calls from workers.
- No DataForSEO live/cost.
- Exact `pt-BR/BR` ContextPackets.
- Every review artifact has GSC + manual/operator source refs.
- Human curator review required before any downstream publishable task.

## Validation

Focused tests:

```bash
npm run test -- --testPathPattern="growth-factory-runner|growth-agent-flow-simulation|worker-contextpacket-contract" --no-coverage --runInBand
```

Result: PASS, 2 suites / 6 tests.

Supabase validation:

```text
work_items: 4
agent_runs: 4
change_sets: 4
context_logs: 4
workitems_review_ready: true
changesets_need_review: true
contexts_pass_watch: true
```

## Notes

`growth_agent_runs.market` currently does not allow `BR`; the runner stores `locale='pt-BR'`, `market='OTHER'` on the ledger row and preserves `target_market='BR'` in evidence. Downstream ContextPacket/change-set rows use the exact `market='BR'` where the schema allows it.
