# T3 — Validation

## Automated checks
```bash
npm run test -- --testPathPattern="growth-agent-flow-simulation|dataforseo-readonly-adapter|gsc-readonly-adapter|governed-provider-runner|source-ref-resolver" --no-coverage --runInBand
NODE_OPTIONS="--max-old-space-size=4096" npm run typecheck
npm run ai:check
```

## Results
- Jest: 5 suites PASS / 24 tests PASS.
- Typecheck: PASS.
- AI sync: PASS.

## Supabase verification
- GSC slice2 facts: 3.
- GSC slice2 refs: 3.
- Refs valid: true.
- Locale/market: `pt-BR/BR` exact.
- Freshness: source refs `fresh`.

## Verdict
`PASS_WITH_WATCH_GOAL_CLOSED`
