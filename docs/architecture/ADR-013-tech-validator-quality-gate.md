# ADR-013 — Automated Tech Validator Quality Gate

**Status:** Accepted  
**Date:** 2026-04-15  
**Principles:** P2 (Validate at Boundaries), P4 (Edge-First Delivery), P10 (Minimal Client Bundle)

## Context

`tech-validator` existed as a manual review workflow (PLAN/TASK/CODE), but enforcement was inconsistent:

1. Different developers ran different subsets of checks (`tsc`, `lint`, `build`).
2. ADR-critical checks ([[ADR-003]], [[ADR-007]], [[ADR-011]], [[ADR-012]]) depended on human memory.
3. Final EPIC closure often surfaced late regressions because validation was not normalized.

This created avoidable risk in a Cloudflare Workers + Next.js 15 stack where boundary validation, edge compatibility, cache strategy, and API envelopes are mandatory architectural contracts.

## Decision

Adopt an automated CODE-mode gate script:

- Script: `scripts/ai/validate-tech-validator.mjs`
- Command: `npm run tech-validator:code`
- Fast command: `npm run tech-validator:code:quick`
- Report artifact: `reports/tech-validator/latest.json`

### Mandatory checks in full mode

1. **Skill integrity**
   - `tech-validator` docs must include required mode files and ADR references.
2. **ADR policy scans**
   - **[[ADR-003]]**: body-parsing API routes validate payloads at boundary (Zod parse/safeParse).
   - **[[ADR-012]]**: non-streaming API routes use standard success/error envelope.
   - **[[ADR-007]]**: node-only APIs are blocked in edge-compatible source files.
   - **[[ADR-011]]**: changed `app/site` and `app/domain` views define cache strategy (`revalidate` / `dynamic` / `fetchCache` / `runtime`).
3. **Quality gates**
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run build`

### Quick mode

`--quick` skips lint/build for fast feedback but still runs structural checks, ADR scans, and typecheck.

## Consequences

### Positive

- Standardized quality gate before merge/EPIC closure.
- Earlier detection of architectural regressions.
- Machine-readable evidence (`reports/tech-validator/latest.json`) for QA and audits.
- Reduced dependence on reviewer memory for ADR enforcement.

### Negative

- Longer feedback loop in full mode due to `lint` + `build`.
- Initial false positives are possible in broad policy scans.

### Mitigations

- Use `tech-validator:code:quick` during inner loop development.
- Keep edge exceptions explicit and minimal through allowlist in script.
- Continue iterative migration for legacy routes while enforcing changed-file policy.

## Alternatives Considered

1. **Manual checklist only:** rejected; repeated misses in EPIC closures.
2. **CI-only enforcement:** rejected; feedback arrives too late without local gate.
3. **Only `tsc` gate:** rejected; does not cover ADR-specific architecture constraints.
