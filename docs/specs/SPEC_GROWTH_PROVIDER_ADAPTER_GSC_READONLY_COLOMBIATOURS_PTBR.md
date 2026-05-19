# SPEC — GSC Read-only Provider Adapter ColombiaTours pt-BR

Sprint: `growth-provider-adapter-gsc-readonly-colombiatours-ptbr`
Tenant: ColombiaTours
Target: `pt-BR/BR`
Provider: Google Search Console

## Goal

Add a read-only GSC adapter behind the governed provider-runner contract. The adapter converts GSC Search Analytics page/query rows into entity-level evidence rows, then passes them to `buildGovernedProviderRunnerDryRun`.

## Scope

- Input: GSC Search Analytics rows with dimensions `page,query`.
- Output: governed provider evidence + runner candidates.
- Canonical entity path normalization: `/l/<slug>-colombiatours/` → `/<slug>`.
- Target remains exact `pt-BR/BR`.

## Non-goals

- No DB writes.
- No provider scheduling.
- No publish.
- No mass transcreation.
- No direct provider access from workers.

## Files

- `lib/growth/agentic/gsc-readonly-adapter.ts`
- `__tests__/lib/growth/agentic/gsc-readonly-adapter.test.ts`
