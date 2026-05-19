# SPEC — Growth Provider Normalization ColombiaTours pt-BR Write Gate Slice2

Sprint: `growth-provider-normalization-colombiatours-ptbr-write-gate-slice2`
Tenant: ColombiaTours
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Target: `pt-BR/BR`
Scope: five-entity controlled production write gate.

## Goal

Expand the previously proven one-entity source-truth chain to five additional ColombiaTours entities without enabling publish, mass transcreation, broad backfill, or provider calls.

## Entities

- `/bogota-cartagena-6-dias` — fact `7b592169-7fd7-434a-a51b-d5dafa94f77f` — source_ref `eeed26f2-b800-4764-a15a-3b6e2b22d730` — profile_run `b08baddd-9f23-4408-9a98-d5a4243f4164`
- `/tour-colombia-15-dias` — fact `6c01b696-5d4d-428f-b09e-8e3d97447b17` — source_ref `5b20632e-88e7-45f3-b39f-93acefa3b03b` — profile_run `776d119b-af46-493b-964b-a2c7147b4034`
- `/cartagena-4-dias` — fact `6b494e2c-ef83-455e-928e-b5d22c1ba1e3` — source_ref `b1e0fee3-e2d6-4111-9415-e601c7be9ca1` — profile_run `83032e80-d07e-4598-916c-18337b411b44`
- `/colombia-esencia-12-dias` — fact `21a1192d-436b-4824-b3c8-8f4a32bc2065` — source_ref `bc6a06cb-dae2-4d5e-a8a9-6677ab183fb9` — profile_run `88c54a19-c237-4db8-88c2-9d7fa4df1b0e`
- `/los-mejores-paquetes-de-viajes-a-colombia` — fact `a6c431de-f6f4-4591-bccb-be8faf2b5024` — source_ref `cf2a6188-4788-4ccc-990f-b18e7a642ee0` — profile_run `d392f150-f146-4a6e-8e6e-2de89169bd0e`

## Acceptance criteria

- Exactly five new `growth_signal_facts` exist for `pt-BR/BR`.
- Each fact has one fact-level `growth_source_refs` row with `freshness_status=fresh` and `valid_until > now()`.
- `page_product` profile `0b4d0d4c-d293-4214-9bec-cb8113689284` links all five new facts.
- ContextPacket log exists with verdict `PASS_WITH_WATCH`.
- Resolver dry-run returns `VERIFIED_FACT_REF` and `usable=true` for all five facts.

## Non-goals / guardrails

- No provider calls.
- No publish.
- No mass transcreation.
- No implicit `es-CO/CO` fallback.
- No secrets.
- No broad backfill.
