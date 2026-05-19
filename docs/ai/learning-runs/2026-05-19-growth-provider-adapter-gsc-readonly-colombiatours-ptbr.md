# Learning Run — GSC Read-only Adapter ColombiaTours pt-BR

Pipeline: `growth-provider-adapter-gsc-readonly-colombiatours-ptbr`
Outcome: `PASS_ADAPTER_READY_POLICY_GAP`

## What changed

Added a pure GSC adapter that converts Search Analytics page/query rows into governed evidence rows for the provider-runner.

## Lessons

1. Keep provider adapters pure and separately testable; fetching provider data and writing facts are separate gates.
2. Legacy `/l/<slug>-colombiatours/` URLs must normalize back to canonical `/<slug>` before source-truth linking.
3. Real GSC access is available for ColombiaTours, but production policy is still manual/operator only.
4. The next safe write is policy-first, not facts-first.

## Validation

- 34/34 focused tests passed.
- Typecheck passed.
- AI sync passed.
- GSC read-only canary returned real query/page rows.
