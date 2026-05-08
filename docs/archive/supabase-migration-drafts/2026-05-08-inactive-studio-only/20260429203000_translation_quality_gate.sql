-- ============================================================================
-- Translation quality gate for Growth OS (#310 / #314-#321)
-- ============================================================================
-- Purpose:
--   Adds a durable, comparable quality-check ledger for translated/localized
--   content. Existing seo_translation_qa_findings remains the detailed finding
--   table; this table stores one summarized gate result per review/check run.
--
-- Flow:
--   seo_transcreation_jobs -> seo_translation_quality_checks
--     -> seo_localized_variants -> growth_inventory -> Growth Council
--
-- Governance:
--   Shared Supabase schema. Flutter remains SSOT for migration application.
--   This migration is mirrored in bukeer_flutter/supabase/migrations.
-- ============================================================================

create table if not exists public.seo_translation_quality_checks (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  job_id uuid references public.seo_transcreation_jobs(id) on delete set null,
  localized_variant_id uuid references public.seo_localized_variants(id) on delete set null,

  page_type text not null,
  page_id uuid not null,
  source_locale text not null,
  target_locale text not null,
  country text not null,
  language text not null,

  overall_score numeric(5,2) not null default 0
    check (overall_score >= 0 and overall_score <= 100),
  fluency_score numeric(5,2) not null default 0
    check (fluency_score >= 0 and fluency_score <= 100),
  accuracy_score numeric(5,2) not null default 0
    check (accuracy_score >= 0 and accuracy_score <= 100),
  brand_glossary_score numeric(5,2) not null default 0
    check (brand_glossary_score >= 0 and brand_glossary_score <= 100),
  seo_preservation_score numeric(5,2) not null default 0
    check (seo_preservation_score >= 0 and seo_preservation_score <= 100),
  locale_adaptation_score numeric(5,2) not null default 0
    check (locale_adaptation_score >= 0 and locale_adaptation_score <= 100),

  grade text not null default 'F'
    check (grade in ('A', 'B', 'C', 'D', 'F')),
  status text not null default 'blocked'
    check (status in ('pass', 'watch', 'blocked')),

  risk_flags jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  notes text,

  source text not null default 'translation_quality_gate_v1',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_translation_quality_lookup
  on public.seo_translation_quality_checks(
    website_id,
    target_locale,
    page_type,
    status,
    overall_score desc,
    checked_at desc
  );

create index if not exists idx_translation_quality_job
  on public.seo_translation_quality_checks(website_id, job_id, checked_at desc)
  where job_id is not null;

create index if not exists idx_translation_quality_page
  on public.seo_translation_quality_checks(website_id, page_type, page_id, target_locale, checked_at desc);

alter table public.seo_translation_quality_checks enable row level security;

drop policy if exists seo_translation_quality_checks_service_all
  on public.seo_translation_quality_checks;
create policy seo_translation_quality_checks_service_all
  on public.seo_translation_quality_checks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists seo_translation_quality_checks_account_read
  on public.seo_translation_quality_checks;
create policy seo_translation_quality_checks_account_read
  on public.seo_translation_quality_checks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_translation_quality_checks.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

drop policy if exists seo_translation_quality_checks_account_manage
  on public.seo_translation_quality_checks;
create policy seo_translation_quality_checks_account_manage
  on public.seo_translation_quality_checks
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_translation_quality_checks.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_translation_quality_checks.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

comment on table public.seo_translation_quality_checks is
  'Comparable translation/localization quality gate for Growth OS. Summaries feed growth_inventory content_status; detailed issues stay in seo_translation_qa_findings.';

comment on column public.seo_translation_quality_checks.status is
  'pass/watch/blocked gate used by Growth Council before scaling localized content.';

comment on column public.seo_translation_quality_checks.risk_flags is
  'Structured risks such as mistranslation, glossary_miss, seo_loss, locale_mismatch, legal_claim, hallucination.';
