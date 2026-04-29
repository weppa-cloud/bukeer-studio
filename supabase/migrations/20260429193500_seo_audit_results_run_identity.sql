-- Migration: seo_audit_results comparable run identity
-- Purpose: allow multiple DataForSEO OnPage crawls for the same URL/date by
-- including crawl_task_id in the uniqueness contract.
--
-- Shared DB change. Mirror in bukeer_flutter before applying to Supabase.

alter table if exists public.seo_audit_results
  add column if not exists crawl_task_id text;

alter table if exists public.seo_audit_results
  add column if not exists source text not null default 'unknown';

update public.seo_audit_results
set source = coalesce(nullif(source, ''), 'unknown')
where source is null or source = '';

alter table if exists public.seo_audit_results
  drop constraint if exists seo_audit_results_website_id_page_url_audit_date_key;

create unique index if not exists seo_audit_results_run_identity_uniq
  on public.seo_audit_results (
    website_id,
    page_url,
    audit_date,
    coalesce(crawl_task_id, 'legacy'),
    source
  );

create unique index if not exists seo_audit_results_run_identity_columns_uniq
  on public.seo_audit_results (
    website_id,
    page_url,
    audit_date,
    crawl_task_id,
    source
  );

create index if not exists idx_seo_audit_results_crawl_task
  on public.seo_audit_results(website_id, crawl_task_id);

comment on column public.seo_audit_results.crawl_task_id is
  'Provider task/run id for comparable crawl results. Included in run identity for same-day comparisons.';

comment on column public.seo_audit_results.source is
  'Provider/source that produced the audit result, e.g. dataforseo:on_page or pagespeed.';
