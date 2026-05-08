-- Pilot data cleanup: orphan pkg overlays + rare locale rows.
--
-- Context: audit 2026-04-20 on pilot website `894545b7-…` revealed:
--  - 14 orphan `website_product_pages` rows with `product_type='package'`
--    pointing to `product_id` values not in `package_kits` (deleted kits).
--  - 1 `website_product_pages` row with rare locale matching `^en-v\d`
--    (test artifact `en-v21-7569`).
--  - 4 `seo_transcreation_jobs` rows with target_locale matching `^en-v\d`.
--
-- These pollute downstream rendering + transcreate pipelines. Cleanup is:
--  - Idempotent (safe to rerun; snapshot rows guarded by NOT EXISTS).
--  - Reversible via `pilot_data_cleanup_snapshots.snapshot` JSONB
--    (JSONB per-operation; restore with INSERT from jsonb_to_recordset).
--  - Scoped strictly to pilot website_id + account_id.
--
-- Related: EPIC #262 child-1 (#263). Parent docs:
-- `docs/ops/pilot-runbook-colombiatours.md`.

create table if not exists pilot_data_cleanup_snapshots (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  operation text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

-- Snapshot + delete orphan package overlays
with orphans as (
  select p.*
  from website_product_pages p
  where p.website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
    and p.product_type = 'package'
    and p.product_id not in (
      select id from package_kits
      where account_id = '9fc24733-b127-4184-aa22-12f03b98927a'
    )
)
insert into pilot_data_cleanup_snapshots (table_name, operation, snapshot)
select 'website_product_pages', 'orphan_delete', jsonb_agg(row_to_json(orphans.*))
from orphans
having count(*) > 0
  and not exists (
    select 1 from pilot_data_cleanup_snapshots s
    where s.table_name = 'website_product_pages' and s.operation = 'orphan_delete'
  );

delete from website_product_pages
where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  and product_type = 'package'
  and product_id not in (
    select id from package_kits
    where account_id = '9fc24733-b127-4184-aa22-12f03b98927a'
  );

-- Snapshot + delete rare locale rows in website_product_pages
with rare_pages as (
  select p.*
  from website_product_pages p
  where p.website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
    and p.locale ~ '^en-v\d'
)
insert into pilot_data_cleanup_snapshots (table_name, operation, snapshot)
select 'website_product_pages', 'rare_locale_prune', jsonb_agg(row_to_json(rare_pages.*))
from rare_pages
having count(*) > 0
  and not exists (
    select 1 from pilot_data_cleanup_snapshots s
    where s.table_name = 'website_product_pages' and s.operation = 'rare_locale_prune'
  );

delete from website_product_pages
where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  and locale ~ '^en-v\d';

-- Snapshot + delete rare locale rows in seo_transcreation_jobs
with rare_jobs as (
  select j.*
  from seo_transcreation_jobs j
  where j.website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
    and j.target_locale ~ '^en-v\d'
)
insert into pilot_data_cleanup_snapshots (table_name, operation, snapshot)
select 'seo_transcreation_jobs', 'rare_locale_prune', jsonb_agg(row_to_json(rare_jobs.*))
from rare_jobs
having count(*) > 0
  and not exists (
    select 1 from pilot_data_cleanup_snapshots s
    where s.table_name = 'seo_transcreation_jobs' and s.operation = 'rare_locale_prune'
  );

delete from seo_transcreation_jobs
where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  and target_locale ~ '^en-v\d';
