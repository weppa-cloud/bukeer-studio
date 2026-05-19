# T3 — GSC Read-only Adapter Validation

Sprint: `growth-provider-adapter-gsc-readonly-colombiatours-ptbr`
Status: `PASS_VALIDATED_WITH_POLICY_GAP`

## Test results

- Test suites: `5 passed / 5 total`
- Tests: `34 passed / 34 total`
- Typecheck: `PASS`
- AI sync: `PASS`

## Real GSC read-only canary

Query: `https://colombiatours.travel/`, dimensions `page,query`, date range `2026-04-18 → 2026-05-17`, page contains `/tour-colombia-10-dias`.

Observed rows included queries such as:

- `ruta colombia 10 dias` — impressions `3`, position `81.67`
- `viaje colombia 10 dias` — impressions `3`, position `79.33`
- `tour bogota medellin y cartagena` — impressions `1`, position `19`

## Interpretation

GSC source access works read-only. The adapter can normalize rows into governed evidence. The next DB action should be a GSC provider policy write gate, not automatic fact insertion.
