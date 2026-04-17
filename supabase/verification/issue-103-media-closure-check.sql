-- issue-103-media-closure-check.sql
-- Purpose: formal verification bundle for #103 closure after #176/#177/#179 rollout.
-- Scope: schema, indexes, RLS, storage policies/buckets, batch job outcomes, upload outcomes.

-- -----------------------------------------------------------------------------
-- 0) Context
-- -----------------------------------------------------------------------------
-- Set this before running:
--   \set website_id '894545b7-73ca-4dae-b76a-da5b6a3f8441'
--   \set job_id '2bfff566-ea18-4d82-9bf8-9ef652e2a991'
--   \set upload_asset_id '96e4a08c-2e19-492f-bedf-0f06d744622c'

-- -----------------------------------------------------------------------------
-- 1) Migration registry
-- -----------------------------------------------------------------------------
select version, name
from supabase_migrations.schema_migrations
where name in (
  'media_assets_foundation_v2',
  'media_alt_jobs',
  'site_media_storage_hardening_manual'
)
order by version;

-- -----------------------------------------------------------------------------
-- 2) Tables and expected columns
-- -----------------------------------------------------------------------------
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('media_assets', 'media_alt_jobs')
order by table_name;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'website_blog_posts'
  and column_name = 'featured_alt';

-- -----------------------------------------------------------------------------
-- 3) Index and uniqueness checks
-- -----------------------------------------------------------------------------
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'media_assets'
order by indexname;

-- Expected:
--   media_assets_path_idx -> UNIQUE (storage_bucket, storage_path)
--   media_assets_entity_idx -> (entity_type, entity_id)
--   media_assets_website_idx -> (website_id)
--   media_assets_broken_idx -> partial on http_status != 200

-- -----------------------------------------------------------------------------
-- 4) RLS checks (public tables + storage.objects)
-- -----------------------------------------------------------------------------
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relname in ('media_assets', 'media_alt_jobs'))
   or (n.nspname = 'storage' and c.relname = 'objects')
order by schema_name, table_name;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('media_assets', 'media_alt_jobs'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- -----------------------------------------------------------------------------
-- 5) Bucket hardening checks
-- -----------------------------------------------------------------------------
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('images', 'site-media', 'imagenes')
order by id;

-- site-media expected:
--   public = true
--   file_size_limit = 5242880
--   allowed_mime_types = {image/jpeg,image/png,image/webp,image/gif}

-- -----------------------------------------------------------------------------
-- 6) Detect residual anonymous write vectors in storage policies
-- -----------------------------------------------------------------------------
with candidate as (
  select
    policyname,
    cmd,
    roles,
    coalesce(qual, '') as qual,
    coalesce(with_check, '') as with_check
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and cmd in ('INSERT', 'UPDATE', 'DELETE')
)
select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from candidate
where (
    qual ilike '%bucket_id = ''images''%'
 or qual ilike '%bucket_id = ''site-media''%'
 or qual ilike '%bucket_id = ''imagenes''%'
 or with_check ilike '%bucket_id = ''images''%'
 or with_check ilike '%bucket_id = ''site-media''%'
 or with_check ilike '%bucket_id = ''imagenes''%'
)
and (
  roles::text like '%public%'
  and qual not ilike '%auth.role() = ''service_role''%'
  and with_check not ilike '%auth.role() = ''service_role''%'
);

-- Expected: 0 rows for images and site-media.
-- If rows appear for imagenes, run the remediation SQL companion.

-- -----------------------------------------------------------------------------
-- 7) Batch-alt job summary
-- -----------------------------------------------------------------------------
select
  id,
  website_id,
  status,
  dry_run,
  total,
  processed,
  failed,
  broken_urls,
  errors,
  started_at,
  completed_at,
  updated_at
from public.media_alt_jobs
where id = :'job_id';

-- -----------------------------------------------------------------------------
-- 8) Evidence matrix (URL/status/alt) for the batch window
-- -----------------------------------------------------------------------------
with job as (
  select id, website_id, started_at, completed_at
  from public.media_alt_jobs
  where id = :'job_id'
),
assets as (
  select
    ma.id,
    ma.entity_type,
    ma.entity_id,
    ma.public_url,
    ma.http_status,
    coalesce(ma.alt->>'es', ma.alt->>'en', ma.alt->>'pt', '') as alt_primary,
    ma.storage_bucket,
    ma.storage_path,
    ma.updated_at
  from public.media_assets ma
  join job j on j.website_id = ma.website_id
  where ma.updated_at >= j.started_at - interval '5 seconds'
    and ma.updated_at <= coalesce(j.completed_at, now()) + interval '30 seconds'
)
select
  a.id as media_asset_id,
  a.entity_type,
  a.entity_id,
  coalesce(bp.title, pk.name, ac.name, 'n/a') as entity_name,
  a.public_url,
  a.http_status,
  (a.http_status is distinct from 200) as is_broken,
  a.alt_primary as alt_es,
  a.storage_bucket,
  a.storage_path,
  a.updated_at
from assets a
left join public.website_blog_posts bp on a.entity_type = 'blog_post' and bp.id::text = a.entity_id
left join public.package_kits pk on a.entity_type = 'package' and pk.id::text = a.entity_id
left join public.activities ac on a.entity_type = 'activity' and ac.id::text = a.entity_id
order by a.updated_at asc;

-- -----------------------------------------------------------------------------
-- 9) featured_alt compatibility backfill coverage (blog posts in batch)
-- -----------------------------------------------------------------------------
with job_assets as (
  select entity_id, http_status
  from public.media_assets ma
  join public.media_alt_jobs j on j.website_id = ma.website_id
  where j.id = :'job_id'
    and ma.updated_at >= j.started_at - interval '5 seconds'
    and ma.updated_at <= coalesce(j.completed_at, now()) + interval '30 seconds'
    and ma.entity_type = 'blog_post'
)
select
  count(*) as posts_in_batch,
  count(*) filter (where coalesce(bp.featured_alt, '') <> '') as featured_alt_populated,
  count(*) filter (where coalesce(bp.featured_alt, '') = '') as featured_alt_missing,
  count(*) filter (where ja.http_status = 200 and coalesce(bp.featured_alt, '') <> '') as ok_with_featured_alt
from job_assets ja
join public.website_blog_posts bp on bp.id::text = ja.entity_id
where bp.website_id = :'website_id';

-- -----------------------------------------------------------------------------
-- 10) Upload evidence row
-- -----------------------------------------------------------------------------
select
  id,
  account_id,
  website_id,
  storage_bucket,
  storage_path,
  public_url,
  entity_type,
  entity_id,
  usage_context,
  http_status,
  file_size_bytes,
  width_px,
  height_px,
  format,
  alt,
  title,
  caption,
  ai_generated,
  created_at,
  updated_at
from public.media_assets
where id = :'upload_asset_id';

