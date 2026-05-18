# SPEC — Growth Provider Normalization ColombiaTours pt-BR Write Gate Slice1

Sprint: `growth-provider-normalization-colombiatours-ptbr-write-gate-slice1`
Tenant: ColombiaTours
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Entity: `/tour-colombia-10-dias`
Target: `pt-BR/BR`
Scope: one-entity production DML only; no provider calls, no publish, no mass transcreation.

## Objective

Move the previous dry-run slice from `PASS_BLOCKED_WITH_PRECISE_DATA_NEED` to a controlled one-entity source-truth chain.

## Approved write scope

Exactly one chain:

1. Enable a manual/operator provider policy for `pt-BR/BR`.
2. Insert/update one `growth_profile_runs` operator evidence row.
3. Insert/update one `growth_signal_facts` row for `/tour-colombia-10-dias`.
4. Insert/touch one `growth_source_refs` row pointing to that fact.
5. Attach the fact id to the `page_product` `growth_profiles.source_signal_fact_ids` row.
6. Insert one `growth_context_packet_log` canary row.

## Non-goals

- No provider call.
- No publication.
- No mass transcreation.
- No broad backfill.
- No secret/service-role inspection.

## Acceptance criteria

- Fact exists with exact `locale='pt-BR'` and `market='BR'`.
- Source ref is fact-level, fresh and valid.
- Page-product profile contains the fact id.
- Resolver returns `VERIFIED_FACT_REF`, `fresh`, `allowed`, `exact`, `usable=true`.
- ContextPacket log verdict is `PASS_WITH_WATCH`, not full mass-autonomy.
