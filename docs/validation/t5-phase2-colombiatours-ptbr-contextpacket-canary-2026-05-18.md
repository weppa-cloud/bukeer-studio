# T5 CANARY DRY-RUN — ColombiaTours `es-CO -> pt-BR / BR` ContextPacket Gate

Date: 2026-05-18
Pipeline: `growth-control-plane-phase2-source-refs-safe-qa`
Task: `t_165a9ce9`
Tenant beta: ColombiaTours
Website ID: `894545b7-73ca-4dae-b76a-da5b6a3f8441`

## Verdict

`PASS_BLOCKED_EXPECTED`

The canary remains blocked by design. This is the correct safe outcome.

## Inputs

- Source locale: `es-CO`
- Target locale: `pt-BR`
- Market: `BR`
- Mode: dry-run/no publish
- Evidence: T4 Phase2 data audit

## Gate evaluation

### Locale/market

- `pt-BR / BR` is an exact target locale/market pair.
- No implicit fallback was used.

Status: `exact`

### Source refs

T4 found:

- `pt-BR / BR` profiles: 6
- profiles without source refs: 6
- total pt-BR profile fact refs: 0
- `pt-BR` signal facts: 0
- `BR` market facts: 0
- run refs with `growth_signal_facts:*`: 0
- run refs with uuid-like fact refs: 0

Status: `no_verified_fact_refs`

### Freshness

Because there are no verified `pt-BR / BR` fact refs, freshness cannot be established.

Status: `unknown`

### Policy/permission

No autonomous policy can pass without source refs/freshness evidence.

Status: `blocked`

## Resolver classification

Phase2 resolver would classify existing run-level provider/cache refs as:

- `UNRESOLVED_PROVIDER_CACHE_REF`, or
- `VERIFIED_EXTERNAL_REF` only if external cache metadata is proven later.

Neither result is enough for autonomous ContextPacket execution. The only autonomous status is `VERIFIED_FACT_REF` with fresh/policy/locale-market gates passing.

## Validation evidence

Focused resolver tests pass:

```bash
npm run test -- --testPathPattern="source-ref-resolver" --no-coverage --runInBand
```

Result:

```text
7 passed, 0 failed
```

## Decision

Do not publish. Do not mass transcreate. Do not apply backfill.

The next valid step is not execution; it is resolving the data need:

1. normalize provider/cache evidence into `growth_signal_facts`, or
2. run an approved provider-runner lane that writes normalized facts, or
3. perform a human-reviewed backfill with verified fact mapping.

Until then, ColombiaTours `pt-BR / BR` remains blocked for autonomous transcreation.
