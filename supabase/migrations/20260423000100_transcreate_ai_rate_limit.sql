-- Track AI-origin draft generation for transcreate limits and analytics.
alter table if exists public.seo_transcreation_jobs
  add column if not exists ai_generated boolean not null default false,
  add column if not exists ai_model text;

create index if not exists idx_seo_transcreation_jobs_ai_limit
  on public.seo_transcreation_jobs(website_id, target_locale, ai_generated, created_at desc);
