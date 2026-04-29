-- Migration: seo_audit_results run identity upsert key
-- Purpose: provide a plain-column unique index usable by PostgREST/Supabase
-- upsert onConflict for comparable DataForSEO crawl runs.

create unique index if not exists seo_audit_results_run_identity_columns_uniq
  on public.seo_audit_results (
    website_id,
    page_url,
    audit_date,
    crawl_task_id,
    source
  );
