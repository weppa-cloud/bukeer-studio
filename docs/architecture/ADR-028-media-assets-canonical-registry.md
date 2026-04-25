# ADR-028 — Media Assets Canonical Registry

- Status: **Accepted — 2026-04-25**
- Date: 2026-04-25
- Deciders: Studio platform lead, Flutter lead, product/content operations
- Related: [[SPEC_MEDIA_ASSET_INVENTORY]], [[media-inventory-runbook]], [[ADR-003]], [[ADR-005]], [[ADR-009]], [[ADR-012]], [[ADR-025]], [[cross-repo-flutter]]

## Context

Bukeer stores images across multiple surfaces:

- Supabase Storage buckets such as `site-media`, `images`, `review-images`, `review-avatars`, `public`, and legacy `imagenes`.
- Legacy URL fields in business tables such as `main_image`, `social_image`, `cover_image_url`, `featured_image`, `program_gallery`, `images`, `websites.content`, and `website_sections.content`.
- Studio upload flows that already write to `media_assets` in some cases.
- Flutter upload flows that currently preserve compatibility by writing public URLs directly to catalog/profile fields.

This creates three operational gaps:

1. The team cannot reliably answer which media belongs to each account, website, entity and usage context.
2. Image quality work is hard to prioritize because broken, external, missing-alt, heavy, duplicated or orphaned assets are not consistently characterized.
3. New image-enabled features can accidentally introduce another URL-only field and bypass the asset registry.

## Decision

`public.media_assets` is the canonical registry for Bukeer media assets across Studio and Flutter.

Every feature that uploads, imports, generates, selects, or references an image must either:

1. Register the asset in `media_assets` at write time, or
2. Be explicitly covered by a documented backfill path in [[SPEC_MEDIA_ASSET_INVENTORY]] and [[media-inventory-runbook]].

The registry is scoped and characterized by:

- `account_id` when the media belongs to a tenant account.
- `website_id` when the media is website-specific.
- `entity_type` and `entity_id` when the media belongs to a product, page, section, review, brand, profile or gallery item.
- `usage_context` for render intent: `hero`, `gallery`, `featured`, `og`, `avatar`, `body`, or a future reviewed context.
- Normalized location fields: `storage_bucket`, `storage_path`, `public_url`, `host`, `is_external`, and Supabase Storage detection through shared normalization logic.
- Characterization metadata: localized `alt/title/caption`, `http_status`, `file_size_bytes`, dimensions, format, duplicate signals and ownership state when available.

The canonical identity remains:

```txt
(storage_bucket, storage_path)
```

Supabase Storage URLs normalize to their bucket/path. External URLs normalize to a stable synthetic path under `external/url/{md5(public_url)}` so they can be audited without copying the asset first.

## Scope Rules

### Studio

- Studio upload APIs must upsert `media_assets` after successful Storage upload.
- Studio content/page/product features must pass account, website, entity and usage context whenever the caller knows them.
- Studio public rendering continues reading legacy URL fields during v1. This ADR does not require renderers to switch to media IDs immediately.

### Flutter

- Flutter remains source-of-truth for catalog/profile fields defined in [[ADR-025]].
- Flutter must preserve current public URL fields for compatibility.
- New Flutter uploads should register the uploaded URL through the approved RPC/API path after upload success.
- Registry sync failure must not block the end-user upload path; it should be observable and retryable.

### Imports and AI-generated media

- Bulk imports, WordPress recovery, AI-generated images and vendor media imports must register assets during import when feasible.
- If write-time registration is not available, the import must document the legacy fields it populated so the media inventory backfill can discover them.

## Consequences

### Positive

- Each account can audit and manage its media assets independently.
- Broken, external, orphaned, missing-alt and oversized assets become reportable operational states.
- New image features have a clear integration contract instead of inventing ad hoc URL fields.
- Studio and Flutter can evolve without a coordinated breaking migration because legacy URL fields remain readable.

### Trade-offs

- Upload flows now need a second write path after Storage upload.
- Some legacy rows will remain partially characterized until backfill and health checks run.
- Assets shared across entities need careful metadata handling; the registry identity is the file location, not a single entity reference.
- `media_assets` becomes operationally important and must keep RLS/service-role permissions aligned with [[ADR-005]].

## Required Integration Contract

Any new image-enabled feature must document:

- Source: upload, import, AI generation, external URL, or selected existing asset.
- Owner: `account_id`, optional `website_id`, `entity_type`, `entity_id`.
- Usage: `usage_context`.
- Storage target: preferred bucket and path strategy.
- Write path: direct upload API, Supabase RPC, server-side service-role endpoint, or documented backfill.
- Compatibility field: any legacy/public URL field that still needs to be written.
- Remediation: how broken, external, missing-alt, duplicate or heavy assets are surfaced.

## Alternatives Considered

1. Keep URLs only in business tables.
   - Rejected: no account-level inventory, no consistent quality audit, and repeated schema drift.
2. Replace all legacy URL fields with media IDs immediately.
   - Rejected: too risky for Studio/Flutter shared deployment and public render compatibility.
3. Build a new Asset Library UI before registry enforcement.
   - Rejected for v1: UI is useful but cannot be reliable without a canonical inventory first.
4. Separate Studio and Flutter media registries.
   - Rejected: both apps share the Supabase project and public website rendering needs one operational view.

## Rollout

1. Ship [[SPEC_MEDIA_ASSET_INVENTORY]] migration and verification SQL.
2. Run dry-run inventory per account in staging.
3. Apply backfill in staging and validate idempotency.
4. Remediate high-priority assets: broken, external hero/OG, missing alt, heavy non-WebP.
5. Integrate Flutter upload registration in the follow-up issue tracked from the spec.
6. Only after registry quality stabilizes, consider Asset Library UI and optional media ID references in render contracts.
