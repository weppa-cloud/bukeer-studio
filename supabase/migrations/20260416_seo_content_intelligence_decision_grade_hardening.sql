-- EPIC #86 hardening: decision-grade trust enforcement

alter table if exists public.seo_render_snapshots
  add column if not exists decision_grade_ready boolean not null default false;

alter table if exists public.seo_audit_findings
  add column if not exists decision_grade_ready boolean not null default false;

alter table if exists public.seo_keyword_research_runs
  add column if not exists decision_grade_ready boolean not null default false;

alter table if exists public.seo_keyword_candidates
  add column if not exists decision_grade_ready boolean not null default false;

alter table if exists public.seo_page_metrics_daily
  add column if not exists decision_grade_ready boolean not null default false;

alter table if exists public.seo_cluster_metrics_daily
  add column if not exists decision_grade_ready boolean not null default false;

update public.seo_render_snapshots
set decision_grade_ready = true
where confidence = 'live' and decision_grade_ready = false;

update public.seo_audit_findings
set decision_grade_ready = true
where confidence = 'live' and decision_grade_ready = false;

update public.seo_keyword_research_runs
set decision_grade_ready = true
where confidence = 'live' and decision_grade_ready = false;

update public.seo_keyword_candidates
set decision_grade_ready = true
where confidence = 'live' and decision_grade_ready = false;

update public.seo_page_metrics_daily
set decision_grade_ready = true
where confidence = 'live' and decision_grade_ready = false;

update public.seo_cluster_metrics_daily
set decision_grade_ready = true
where confidence = 'live' and decision_grade_ready = false;

alter table if exists public.seo_render_snapshots
  drop constraint if exists seo_render_snapshots_decision_grade_live_check;
alter table if exists public.seo_render_snapshots
  add constraint seo_render_snapshots_decision_grade_live_check
  check (decision_grade_ready = false or confidence = 'live');

alter table if exists public.seo_audit_findings
  drop constraint if exists seo_audit_findings_decision_grade_live_check;
alter table if exists public.seo_audit_findings
  add constraint seo_audit_findings_decision_grade_live_check
  check (decision_grade_ready = false or confidence = 'live');

alter table if exists public.seo_keyword_research_runs
  drop constraint if exists seo_keyword_research_runs_decision_grade_live_check;
alter table if exists public.seo_keyword_research_runs
  add constraint seo_keyword_research_runs_decision_grade_live_check
  check (decision_grade_ready = false or confidence = 'live');

alter table if exists public.seo_keyword_candidates
  drop constraint if exists seo_keyword_candidates_decision_grade_live_check;
alter table if exists public.seo_keyword_candidates
  add constraint seo_keyword_candidates_decision_grade_live_check
  check (decision_grade_ready = false or confidence = 'live');

alter table if exists public.seo_page_metrics_daily
  drop constraint if exists seo_page_metrics_daily_decision_grade_live_check;
alter table if exists public.seo_page_metrics_daily
  add constraint seo_page_metrics_daily_decision_grade_live_check
  check (decision_grade_ready = false or confidence = 'live');

alter table if exists public.seo_cluster_metrics_daily
  drop constraint if exists seo_cluster_metrics_daily_decision_grade_live_check;
alter table if exists public.seo_cluster_metrics_daily
  add constraint seo_cluster_metrics_daily_decision_grade_live_check
  check (decision_grade_ready = false or confidence = 'live');

create index if not exists idx_seo_render_snapshots_decision_grade
  on public.seo_render_snapshots(website_id, locale, decision_grade_ready, fetched_at desc);

create index if not exists idx_seo_audit_findings_decision_grade
  on public.seo_audit_findings(website_id, locale, decision_grade_ready, fetched_at desc);

create index if not exists idx_seo_keyword_research_runs_decision_grade
  on public.seo_keyword_research_runs(website_id, locale, decision_grade_ready, fetched_at desc);

create index if not exists idx_seo_keyword_candidates_decision_grade
  on public.seo_keyword_candidates(website_id, locale, content_type, decision_grade_ready, fetched_at desc);

create index if not exists idx_seo_page_metrics_daily_decision_grade
  on public.seo_page_metrics_daily(website_id, locale, page_type, decision_grade_ready, metric_date desc);

create index if not exists idx_seo_cluster_metrics_daily_decision_grade
  on public.seo_cluster_metrics_daily(website_id, locale, decision_grade_ready, metric_date desc);
