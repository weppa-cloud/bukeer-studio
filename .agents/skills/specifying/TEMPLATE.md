# Spec: [Feature Name]

## GitHub Tracking
- **Epic Issue**: TBD (fill after Phase 6)
- **Child Issues**: TBD (fill after Phase 7)
- **Milestone**: [e.g. Q2-2026]
- **Area**: [studio | editor | theme-sdk | contract | seo]

## Status
- **Author**: [name]
- **Date**: [YYYY-MM-DD]
- **Status**: Draft | Reviewed | Implementing | Implemented
- **ADRs referenced**: [ADR-NNN, ADR-NNN]
- **Cross-repo impact**: [none | bukeer-flutter reads/writes tables X, Y]

## Summary
<1-2 sentences describing the feature>

## Motivation
[Why needed — user pain point / business constraint / compliance]

## User Flows

### Flow 1: Happy path
1. User navigates to...
2. User clicks...
3. System shows...

### Flow 2: Edge case
1. ...

## Acceptance Criteria
- [ ] AC1: [testable assertion]
- [ ] AC2: [testable assertion]
- [ ] AC3: [testable assertion]

## Data Model Changes

| Table | Column | Type | Notes |
|-------|--------|------|-------|
|       |        |      |       |

Migration path: [forward-only | requires backfill | none]

## API / Contract Changes

| Endpoint/RPC/Schema | Method | Payload | Notes |
|---------------------|--------|---------|-------|
| ... | ... | ... | ... |

## Media / Images Impact

- [ ] No toca imágenes/media.
- [ ] Usa assets existentes registrados en `media_assets`.
- [ ] Sube/importa/genera nuevas imágenes y registra en `media_assets`.
- [ ] Mantiene campo legacy por compatibilidad.
- [ ] Define `account_id`, `website_id` si aplica, `entity_type`, `entity_id`, `usage_context`.
- [ ] Incluye validación de broken/external/missing-alt/non-WebP.

If this feature uploads, imports, generates, selects, or references an image,
reference [[ADR-028]] and document the write path to
`public.register_media_asset_reference(...)` or an explicit backfill path.

## Permissions (RBAC)

| Role | View | Create | Edit | Delete |
|------|------|--------|------|--------|
| super_admin | yes | yes | yes | yes |
| owner | yes | yes | yes | yes |
| admin | yes | yes | yes | no |
| agent | yes | no | no | no |

## Affected Files / Packages

| Path | Change | Description |
|------|--------|-------------|
| ... | Create/Modify | ... |

## Edge Cases & Error Handling
1. [case] → [expected behavior]

## Out of Scope
- [explicitly excluded]

## Dependencies
- ADRs: [ADR-NNN]
- Other specs: [SPEC_<name>.md]
- External: [migrations, third-party]

## Rollout
- Feature flag: [name | none]
- Revalidation: [required paths / none]
- Runbook: [docs/ops/<name>-runbook.md | none]
