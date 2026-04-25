-- media-inventory-check.sql
-- Purpose: operational verification for Media Asset Inventory v1.
--
-- Optional psql variables:
--   \set account_id '00000000-0000-0000-0000-000000000000'
--
-- If account_id is not set, replace :'account_id' usages with null.

-- -----------------------------------------------------------------------------
-- 1) Migration objects
-- -----------------------------------------------------------------------------
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'media_asset_storage_location',
    'media_asset_jsonb_urls',
    'register_media_asset_reference',
    'backfill_media_assets_from_legacy_references'
  )
order by p.proname;

select table_schema, table_name
from information_schema.views
where table_schema = 'public'
  and table_name = 'media_asset_inventory_report';

-- -----------------------------------------------------------------------------
-- 2) media_assets shape and uniqueness
-- -----------------------------------------------------------------------------
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.media_assets'::regclass
  and conname = 'media_assets_entity_type_check';

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'media_assets'
  and indexname = 'media_assets_path_idx';

-- Expected: unique index on (storage_bucket, storage_path).

-- -----------------------------------------------------------------------------
-- 3) Bucket inventory
-- -----------------------------------------------------------------------------
select
  b.id,
  b.public,
  b.file_size_limit,
  b.allowed_mime_types,
  count(o.id)::bigint as object_count
from storage.buckets b
left join storage.objects o on o.bucket_id = b.id
where b.id in ('images', 'site-media', 'review-images', 'review-avatars', 'public', 'imagenes')
group by b.id, b.public, b.file_size_limit, b.allowed_mime_types
order by b.id;

-- -----------------------------------------------------------------------------
-- 4) Dry run inventory discovery
-- -----------------------------------------------------------------------------
select *
from public.backfill_media_assets_from_legacy_references(
  p_account_id := null,
  p_limit := 10000,
  p_dry_run := true
);

-- Account-scoped example:
-- select *
-- from public.backfill_media_assets_from_legacy_references(
--   p_account_id := :'account_id'::uuid,
--   p_limit := 10000,
--   p_dry_run := true
-- );

-- Pass criteria:
-- - candidate_references > 0 on populated environments.
-- - registered_or_updated = 0 when dry_run=true.
-- - candidate_already_registered increases after an apply run.

-- -----------------------------------------------------------------------------
-- 5) Current registry characterization
-- -----------------------------------------------------------------------------
select *
from public.media_asset_inventory_report
order by broken_assets desc, missing_alt_assets desc, total_assets desc;

select
  storage_bucket,
  count(*)::bigint as total_assets
from public.media_assets
group by storage_bucket
order by total_assets desc, storage_bucket;

select count(*)::bigint as external_assets
from public.media_assets
where storage_bucket = 'external';

select count(*)::bigint as assets_without_entity_type
from public.media_assets
where entity_type is null;

select count(*)::bigint as assets_without_owner
from public.media_assets
where entity_type is null or entity_id is null;

select count(*)::bigint as assets_missing_alt
from public.media_assets
where coalesce(alt, '{}'::jsonb) = '{}'::jsonb;

select count(*)::bigint as broken_assets
from public.media_assets
where http_status is not null
  and http_status <> 200;

-- -----------------------------------------------------------------------------
-- 6) Legacy references not registered
-- -----------------------------------------------------------------------------
create temp table if not exists _media_inventory_check_before (
  metric text,
  total bigint
) on commit drop;

truncate table _media_inventory_check_before;

insert into _media_inventory_check_before
select *
from public.backfill_media_assets_from_legacy_references(
  p_account_id := null,
  p_limit := 10000,
  p_dry_run := true
);

select
  max(total) filter (where metric = 'candidate_unique_locations') as candidate_unique_locations,
  max(total) filter (where metric = 'candidate_already_registered') as candidate_already_registered,
  greatest(
    coalesce(max(total) filter (where metric = 'candidate_unique_locations'), 0)
    - coalesce(max(total) filter (where metric = 'candidate_already_registered'), 0),
    0
  ) as legacy_locations_not_registered
from _media_inventory_check_before;

-- -----------------------------------------------------------------------------
-- 7) Registered assets with weak ownership / likely orphan signals
-- -----------------------------------------------------------------------------
select
  id,
  storage_bucket,
  storage_path,
  public_url,
  entity_type,
  entity_id,
  usage_context,
  updated_at
from public.media_assets
where entity_type is null
   or entity_id is null
order by updated_at desc
limit 100;

-- "Registered but not referenced" is intentionally conservative in v1:
-- assets without an entity owner are the actionable orphan bucket. A stricter
-- reverse-reference join should be added only after Flutter starts registering
-- all new uploads with entity metadata.

-- -----------------------------------------------------------------------------
-- 8) Duplicates, heavy assets and non-optimal formats
-- -----------------------------------------------------------------------------
select
  public_url,
  count(*)::bigint as rows_for_url,
  array_agg(id order by updated_at desc) as media_asset_ids
from public.media_assets
group by public_url
having count(*) > 1
order by rows_for_url desc
limit 100;

select
  id,
  storage_bucket,
  storage_path,
  public_url,
  file_size_bytes,
  width_px,
  height_px,
  format,
  entity_type,
  entity_id
from public.media_assets
where file_size_bytes is not null
  and file_size_bytes > 1048576
order by file_size_bytes desc
limit 100;

select
  id,
  storage_bucket,
  storage_path,
  public_url,
  format,
  entity_type,
  entity_id
from public.media_assets
where format is not null
  and format <> 'webp'
order by updated_at desc
limit 100;

-- -----------------------------------------------------------------------------
-- 9) Idempotency probe
-- -----------------------------------------------------------------------------
-- Optional apply. Run only after reviewing dry-run output:
--
-- begin;
-- select count(*) as before_count from public.media_assets;
-- select * from public.backfill_media_assets_from_legacy_references(null, 10000, false);
-- select * from public.backfill_media_assets_from_legacy_references(null, 10000, false);
-- select count(*) as after_count from public.media_assets;
-- rollback;
--
-- Pass criteria:
-- - Second apply should not create duplicate (storage_bucket, storage_path) rows.
-- - Count growth must be <= candidate_unique_locations from the dry-run.
