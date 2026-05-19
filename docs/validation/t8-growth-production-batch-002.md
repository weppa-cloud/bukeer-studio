# T8 Growth Production Queue — Batch 002 Recovery

Date: 2026-05-19
Verdict: `PASS_WITH_WATCH_BATCH_002`

## Scope

Implement production queue runner on top of `growth-factory-runner` and prepare ColombiaTours recovery-only batch 002.

## Batch

- `batch_id`: `growth-factory-colombiatours-esco-recovery-batch-002`
- `website_id`: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- `account_id`: `9fc24733-b127-4184-aa22-12f03b98927a`
- locale/market: `es-CO/CO`
- mode: `prepare_only`
- target count: 10 recovery pages

## Recovery source windows

- Baseline: GSC `2025-01-04` → `2025-03-31`
- Current: GSC `2026-02-18` → `2026-05-16`

## Top recovery pages

1. `/los-10-mejores-lugares-turisticos-de-colombia/`
2. `/l/plan-eje-cafetero-disfruta/`
3. `/cuanto-cuesta-viajar-a-colombia-desde-mexico/`
4. `/las-mejores-agencias-de-viaje-en-colombia/`
5. `/viaje-inolvidable-la-ruta-del-cafe-colombia/`
6. `/agencia-de-viajes-es-legal-en-colombia/`
7. `/pueblos-para-visitar-cerca-de-bucaramanga/`
8. `/devolucion-de-iva-a-turistas-extranjeros/`
9. `/viajar-a-colombia-desde-panama/`
10. `/que-hacer-en-colombia-en-10-dias/`

## Production lanes

- `growth-data-agent`: observe-only, max concurrent 1 — Kanban `t_3f729407`
- `growth-brief-agent`: prepare-only, max concurrent 2 — Kanban `t_4111cd1d`
- `growth-review-agent`: prepare-only, max concurrent 1 — Kanban `t_06a8b29f`

## Publish gate

Separate dry-run gate: `growth-publish-gate-v0`.

Publishing remains blocked until:

- 30–50 consistent change sets exist;
- human growth operator approval;
- diff preview present;
- rollback payload present;
- canonical/hreflang/schema/indexability smoke checks pass;
- post-publish monitoring baseline exists.

## Negative guarantees

- No automatic publish.
- No mass transcreation.
- No paid mutation.
- No provider calls from workers.
- Workers consume GSC/operator source refs only.

## Validation commands

```bash
npm run test -- --testPathPattern="growth-production-queue-runner|growth-factory-runner|growth-agent-flow-simulation|worker-contextpacket-contract" --no-coverage --runInBand
```

Result: PASS — 3 suites / 10 tests.

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run typecheck
npm run ai:check
```

Result: PASS.

## Supabase verification

Verified persisted counts for `growth-factory-colombiatours-esco-recovery-batch-002`:

- signal facts: 20
- source refs: 20
- work items: 10
- agent runs: 10
- change sets: 10
- context packet logs: 10
- blocked dry-run publication jobs: 10
