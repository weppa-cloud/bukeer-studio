# T3 CODE GATE — Phase 2 Source Ref Resolver / Safe QA Diff

Date: 2026-05-18
Pipeline: `growth-control-plane-phase2-source-refs-safe-qa`
Task: `t_72f7250c`
Commit under review: `f5583305`

## Verdict

`PASS_WITH_WATCH`

## Scope reviewed

- `lib/growth/agentic/source-ref-resolver.ts`
- `__tests__/lib/growth/agentic/source-ref-resolver.test.ts`
- `docs/validation/t2-phase2-source-ref-resolver-dry-run-2026-05-18.md`

## Security review

PASS.

No code path reads:

- `.env`,
- service-role keys,
- provider tokens,
- auth files,
- git remotes,
- temp secret files.

No code path calls providers or writes to Supabase. The resolver is a pure function with fixture-driven tests.

## Data governance review

PASS.

The resolver keeps provider/cache refs non-autonomous unless an explicit external match is supplied. Even then, `VERIFIED_EXTERNAL_REF` is not accepted by `canUseSourceRefForAutonomousContext()`.

Only `VERIFIED_FACT_REF` with fresh/policy/locale-market gates can pass autonomy.

## Locale/market review

PASS_WITH_WATCH.

The resolver supports:

```text
exact -> explicit_fallback -> blocked
```

Watch item: future production integration should require `explicit_fallback` to be backed by a persisted policy/ref, not only a boolean input.

## Validation commands

```bash
npm run test -- --testPathPattern="source-ref-resolver" --no-coverage --runInBand
NODE_OPTIONS="--max-old-space-size=4096" npm run typecheck
npm run ai:check
```

Results:

```text
source-ref-resolver tests: 7 passed
Typecheck: PASS
AI sync check: PASS
```

## Decision

T3 approves T4 DATA AUDIT DRY-RUN.

T4 must remain read-only and should use the resolver’s classification language:

- verified fact refs,
- verified external refs,
- unresolved provider/cache refs,
- invalid/stale refs.
