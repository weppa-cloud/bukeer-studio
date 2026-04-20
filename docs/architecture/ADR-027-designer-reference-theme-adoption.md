# ADR-027 — Designer Reference Theme Adoption for Pilot

- Status: **Accepted — 2026-04-20**
- Date: 2026-04-20
- Deciders: product design lead, Studio platform lead, release lead
- Related: #250, #259, #260, [[ADR-001]], [[ADR-003]], [[ADR-008]], [[ADR-009]], [[ADR-023]], [[ADR-025]]

## Context

EPIC #250 introduces a new designer reference visual system (`colombia-tours-caribe`) for the ColombiaTours pilot. The rollout must be:

1. Reversible in minutes.
2. Compatible with current SSR public rendering.
3. Implemented without adding a parallel feature-flag table.
4. Safe for shared Supabase multi-tenant operations.

Current baseline already has:

- Public SSR theme consumption from `websites.theme` in `app/site/[subdomain]/layout.tsx`.
- Feature controls in `account_feature_flags` with website/account/default resolution.
- Existing revalidation mechanisms (`/api/revalidate`, `scripts/revalidate-all-tenants.sh`).

## Decision

Adopt a **flag-gated, snapshot-backed rollout model** for the designer reference theme:

1. Extend `account_feature_flags` with `theme_designer_v1_enabled` (website-scoped override, account fallback).
2. Add `pilot_theme_snapshots` to persist pre-flip `websites.theme` with audit metadata (`created_at`, `git_sha`, actor, reason).
3. Use controlled SQL/RPC write paths:
   - `apply_designer_reference_theme(...)`: snapshot + apply theme + enable website flag.
   - `restore_pilot_theme_snapshot(...)`: restore previous theme + disable flag (default behavior).
4. Public SSR resolves the flag at runtime and selects effective theme accordingly:
   - flag ON → current `websites.theme`;
   - flag OFF → latest pilot snapshot fallback when present, else current `websites.theme`.
5. Rollback sequence is operationalized as:
   - disable flag,
   - restore snapshot,
   - trigger revalidation via existing endpoint/script.

## Consequences

### Positive

- Rollout is reversible without destructive DB operations.
- No orphan feature-flag infrastructure is introduced.
- Public SSR behavior is deterministic and tenant-scoped.
- Auditability improves through explicit snapshot records tied to git SHA.

### Trade-offs

- Adds one more feature gate to `account_feature_flags`.
- Requires operational discipline to run apply/restore through controlled functions.
- Snapshot fallback in SSR adds one extra read path for flagged-off websites.

## Alternatives considered

1. Direct overwrite of `websites.theme` without snapshot:
   - Rejected: rollback would be manual and error-prone.
2. New standalone `theme_feature_flags` table:
   - Rejected: duplicates existing infrastructure and increases drift risk.
3. Client-side-only theme switch:
   - Rejected: violates SSR-first rendering requirements and can cause flash/mismatch.

## Rollout/rollback references

- Ops runbook: [[pilot-theme-designer-v1-rollout]]
- Existing release controls: [[product-landing-v1-runbook]], [[pilot-runbook-colombiatours]]
- Existing Studio rollback philosophy: [[studio-editor-v2-rollback]]

## Notes

- This ADR intentionally does **not** repurpose ADR-026 references.
- ADR-026 references remain valid where they are already used in QA/Lighthouse decisions.
