# SPEC — Growth Governed Provider Runner ColombiaTours pt-BR v1

Sprint: `growth-governed-provider-runner-colombiatours-ptbr-v1`
Tenant: ColombiaTours
Target: `pt-BR/BR`

## Goal

Move from manual/operator seeding toward a governed provider-runner contract. This first implementation is intentionally dry-run/read-only: it validates policies, locale/market, rate limits and evidence shape, then produces normalized candidates for a later write gate.

## Contract

`lib/growth/agentic/governed-provider-runner.ts` exposes:

- `buildGovernedProviderRunnerDryRun(input)`
- `summarizeGovernedProviderRunner(report)`

The runner returns candidates for:

- `growth_signal_facts`
- `growth_source_refs`

But it never performs:

- provider calls
- database writes
- publish

## Hard gates

- Policy must match provider/profile/locale/market.
- Policy must be enabled, consented, and `store_normalized`.
- Target must be exact `pt-BR/BR`; no implicit fallback.
- Evidence rows must exist and stay within `rate_limit_daily`.
- Write gate remains separate.
