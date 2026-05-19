# Learning Run — Growth Provider Normalization ColombiaTours pt-BR Write Gate Slice2

Pipeline: `growth-provider-normalization-colombiatours-ptbr-write-gate-slice2`
Outcome: `PASS_WITH_WATCH_FIVE_ENTITY_BATCH`

## What changed

Expanded from one entity to five additional entities using the same governed source-truth contract:

- `/bogota-cartagena-6-dias` — fact `7b592169-7fd7-434a-a51b-d5dafa94f77f` — source_ref `eeed26f2-b800-4764-a15a-3b6e2b22d730` — profile_run `b08baddd-9f23-4408-9a98-d5a4243f4164`
- `/tour-colombia-15-dias` — fact `6c01b696-5d4d-428f-b09e-8e3d97447b17` — source_ref `5b20632e-88e7-45f3-b39f-93acefa3b03b` — profile_run `776d119b-af46-493b-964b-a2c7147b4034`
- `/cartagena-4-dias` — fact `6b494e2c-ef83-455e-928e-b5d22c1ba1e3` — source_ref `b1e0fee3-e2d6-4111-9415-e601c7be9ca1` — profile_run `83032e80-d07e-4598-916c-18337b411b44`
- `/colombia-esencia-12-dias` — fact `21a1192d-436b-4824-b3c8-8f4a32bc2065` — source_ref `bc6a06cb-dae2-4d5e-a8a9-6677ab183fb9` — profile_run `88c54a19-c237-4db8-88c2-9d7fa4df1b0e`
- `/los-mejores-paquetes-de-viajes-a-colombia` — fact `a6c431de-f6f4-4591-bccb-be8faf2b5024` — source_ref `cf2a6188-4788-4ccc-990f-b18e7a642ee0` — profile_run `d392f150-f146-4a6e-8e6e-2de89169bd0e`

## Validation

- Supabase facts: `5`
- Supabase source refs: `5`
- Profile links: `5/5` slice2, `6` total page_product facts.
- Resolver canary: `VERIFIED_FACT_REF` and `usable=true` for all five.
- Focused tests: 22/22 PASS.
- Typecheck: PASS.
- AI sync: PASS.

## Learning

1. Batch expansion works when each entity has an explicit fact-level ref and exact locale/market.
2. `ON CONFLICT` remains unsafe for deferrable unique constraints; use idempotent `where not exists`.
3. Operator evidence is useful to seed the contract, but the next architectural step should be governed provider-runner evidence to reduce manual seeding.

## Guardrails

No provider calls, no publish, no mass transcreation, no broad backfill, no secrets.
