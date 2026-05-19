# SPEC — Growth Agent Flow + ContextPacket Contract ColombiaTours pt-BR

Date: 2026-05-19
Status: implemented / watch mode

## Goal
Close the active Growth OS goal by proving that Kanban workers/agents can consume centralized Supabase-governed data through explicit ContextPackets instead of duplicating provider logic or calling providers directly.

## Scope
- SEO/content worker simulation for ColombiaTours `/tour-colombia-10-dias` `pt-BR/BR`.
- Formal worker ContextPacket contract v1.
- GSC write-gate expansion to 3 additional entities.
- Read-only provider policy control plane surface in Bukeer Studio Data Health.
- DataForSEO read-only adapter contract, no provider calls, no DB writes.

## Non-goals
- No publish.
- No mass transcreation.
- No DataForSEO live calls.
- No fallback to `es-CO/CO`.
- No secrets exposure.

## Acceptance
- Worker blocks if source refs/freshness/locale/market/policies are missing.
- Worker emits only citable claims with `source_ref`.
- Reviewer blocks uncited claims.
- GSC slice2 stores normalized facts + source refs for 3 entities.
- UI shows policies/rate/consent/read-only control plane.
