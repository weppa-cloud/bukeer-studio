# T2 IMPLEMENT — Phase 2 Source Ref Resolver Dry Run

Date: 2026-05-18
Pipeline: `growth-control-plane-phase2-source-refs-safe-qa`
Task: `t_d006117d`

## Verdict

`PASS_WITH_WATCH`

T2 implemented a dry-run source reference resolver and tests. No production writes, provider calls, secret access, publish, migration apply, or PR merge happened.

## Files changed

- `lib/growth/agentic/source-ref-resolver.ts`
- `__tests__/lib/growth/agentic/source-ref-resolver.test.ts`
- `docs/validation/t2-phase2-source-ref-resolver-dry-run-2026-05-18.md`

## Resolver behavior

The resolver classifies refs as:

- `VERIFIED_FACT_REF`
- `VERIFIED_EXTERNAL_REF`
- `UNRESOLVED_PROVIDER_CACHE_REF`
- `INVALID_OR_STALE_REF`

Autonomous ContextPacket use is allowed only when:

- status is `VERIFIED_FACT_REF`,
- freshness is `fresh`,
- policy is `allowed`,
- locale/market is `exact` or `explicit_fallback`.

Provider/cache refs are deliberately not upgraded into fact refs without explicit verified mapping.

## Test evidence

Command:

```bash
npm run test -- --testPathPattern="source-ref-resolver" --no-coverage --runInBand
```

Result:

```text
PASS __tests__/lib/growth/agentic/source-ref-resolver.test.ts
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

Additional checks:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run typecheck
npm run ai:check
```

Result:

```text
typecheck PASS
AI sync check passed.
```

## Safety notes

- No Supabase credentials were read.
- No `.env` values were sourced by tests.
- No provider calls were made.
- No production database writes were made.
- No migration was applied.
- No publish/transcreation was performed.

## Watch items for T3

T3 should review:

1. Whether `VERIFIED_EXTERNAL_REF` should remain non-autonomous until promoted to fact-level evidence.
2. Whether the resolver should be wired into `context-builder.ts` in a later phase or stay standalone until production data mapping is solved.
3. Whether `explicit_fallback` should require a persisted policy ref before autonomy.
