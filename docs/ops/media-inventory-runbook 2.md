# Media Inventory Runbook

Last updated: 2026-04-25

## Purpose

Use this runbook to inventory and characterize Bukeer media references across
Supabase Storage and legacy business tables. The canonical registry is
`public.media_assets` per [[ADR-028]].

This process is additive. It does not change public rendering, delete Storage
objects, or rewrite legacy URL fields.

## When to Run

- Before pilot/cutover audits.
- After bulk content imports or WordPress media recovery.
- After large Flutter catalog image uploads.
- Before cleaning Storage buckets.
- When SEO/image QA reports broken, external, missing-alt, or oversized media.

## Preflight

Production-only note:

- If no staging database exists, run the migration first but keep backfill in
  `p_dry_run := true` until candidate counts are reviewed.
- Capture `count(*)` from `public.media_assets` before apply.
- Apply globally only when `candidate_unique_locations <= p_limit`; otherwise
  run account-scoped batches.
- Capture post-apply dry-run and duplicate key counts as evidence.

1. Confirm migrations are applied:

```sql
select proname
from pg_proc
where proname in (
  'media_asset_storage_location',
  'register_media_asset_reference',
  'backfill_media_assets_from_legacy_references'
);
```

2. Confirm registry uniqueness:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'media_assets'
  and indexname = 'media_assets_path_idx';
```

3. Review bucket inventory:

```sql
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('images', 'site-media', 'review-images', 'review-avatars', 'public', 'imagenes')
order by id;
```

## Dry Run

Run globally:

```sql
select *
from public.backfill_media_assets_from_legacy_references(
  p_account_id := null,
  p_limit := 10000,
  p_dry_run := true
);
```

Run for one account:

```sql
select *
from public.backfill_media_assets_from_legacy_references(
  p_account_id := '<account-id>'::uuid,
  p_limit := 10000,
  p_dry_run := true
);
```

Interpretation:

- `candidate_references`: raw URL references found in legacy fields.
- `candidate_unique_locations`: distinct normalized `(bucket, path)` candidates.
- `candidate_already_registered`: candidates already present in `media_assets`.
- `registered_or_updated`: always `0` in dry run.

## Apply Backfill

Run only after reviewing dry-run output:

```sql
select *
from public.backfill_media_assets_from_legacy_references(
  p_account_id := '<account-id>'::uuid,
  p_limit := 10000,
  p_dry_run := false
);
```

For global backfill:

```sql
select *
from public.backfill_media_assets_from_legacy_references(
  p_account_id := null,
  p_limit := 10000,
  p_dry_run := false
);
```

The apply step is idempotent. Re-running it should not create duplicates because
`media_assets` is keyed by `(storage_bucket, storage_path)`.

## Validation

Run:

```sql
\i supabase/verification/media-inventory-check.sql
```

Core pass criteria:

- Dry run does not change row counts.
- Apply can be run twice without duplicate storage keys.
- `media_asset_inventory_report` returns grouped inventory rows.
- `legacy_locations_not_registered` decreases after apply.
- Broken/missing-alt/unowned counts are visible for follow-up work.

## Report Queries

Inventory by category:

```sql
select *
from public.media_asset_inventory_report
order by broken_assets desc, missing_alt_assets desc, total_assets desc;
```

External media:

```sql
select id, public_url, entity_type, entity_id, usage_context
from public.media_assets
where storage_bucket = 'external'
order by updated_at desc;
```

Missing alt:

```sql
select id, public_url, entity_type, entity_id, usage_context
from public.media_assets
where coalesce(alt, '{}'::jsonb) = '{}'::jsonb
order by updated_at desc;
```

Broken assets:

```sql
select id, public_url, http_status, entity_type, entity_id
from public.media_assets
where http_status is not null
  and http_status <> 200
order by updated_at desc;
```

Unowned assets:

```sql
select id, storage_bucket, storage_path, public_url
from public.media_assets
where entity_type is null
   or entity_id is null
order by updated_at desc;
```

Heavy assets:

```sql
select id, public_url, file_size_bytes, width_px, height_px, format
from public.media_assets
where file_size_bytes is not null
  and file_size_bytes > 1048576
order by file_size_bytes desc;
```

## Remediation Guide

Broken:

- Confirm whether the source URL should still be used.
- Replace legacy field with a valid Supabase Storage URL.
- Re-run backfill and media health checks.

External:

- Decide whether the image should be copied into `site-media`.
- Prioritize LCP/hero/OG images and third-party URLs with unstable hotlinking.

Missing alt:

- Use existing batch-alt flow where supported.
- For manual curation, populate localized `alt/title/caption` in `media_assets`
  and any legacy field such as `website_blog_posts.featured_alt`.

Duplicated:

- Duplicates by URL are not automatically wrong.
- Treat duplicates as cleanup candidates only when multiple rows point to the
  same file with conflicting entity metadata.

Unowned:

- Link to an entity if the owner is known.
- Keep unowned rows when the asset is brand/global/shared.
- Do not delete Storage objects from this report alone.

Heavy or non-WebP:

- Prefer re-upload through Studio `/api/media/upload` for WebP conversion.
- For LCP-critical assets, use pre-optimized `site-media` files and document any
  direct-serving exception.

## Flutter Follow-Up

Flutter remains compatible because v1 does not change its write path. Create a
separate Flutter issue so new uploads register in `media_assets` after upload
success while continuing to write existing public URL fields.

Minimum Flutter requirements:

- Register upload URL with account, entity and usage context when known.
- Preserve `main_image`, `cover_image_url`, gallery and profile URL fields.
- Do not block upload UX if registry sync fails.
- Log failures for retry/ops visibility.
