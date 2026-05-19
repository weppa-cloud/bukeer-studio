# T1 — GSC Policy Write Gate Plan

Sprint: `growth-provider-policy-gsc-colombiatours-ptbr-write-gate`

## Preflight evidence

- Git clean at start: HEAD `0316e26a`, branch `feat/growth-source-truth-colombiatours-ptbr`.
- GSC Search Analytics returned real rows for `https://colombiatours.travel/` and `/tour-colombia-10-dias`.
- Existing GSC policy count before this sprint was 0.
- Existing manual/operator policy count was 1.
- Target profile exists: `0b4d0d4c-d293-4214-9bec-cb8113689284`.

## GSC raw sample

Window: `2026-04-18` → `2026-05-17`
Dimensions: `page, query`
Rows sampled: 10

Normalized entity: `/tour-colombia-10-dias`

Aggregate from sample:

- clicks: 0
- impressions: 17
- query_count: 10
- weighted_position: 76.94117647058823
- top queries: `ruta colombia 10 dias`, `viaje colombia 10 dias`, `que ver en colombia en 10 dias`, `colombia 10 dias`, `colombia en 10 dias`

## Plan

1. Insert/update explicit GSC policy.
2. Insert profile run ledger.
3. Insert one normalized GSC fact.
4. Insert fact-level source_ref.
5. Link fact into page_product profile.
6. Insert ContextPacket log.
7. Validate with SQL + resolver canary.
