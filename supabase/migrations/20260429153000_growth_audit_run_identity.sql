-- ============================================================================
-- Growth audit run identity — EPIC #310 / SPEC #337
-- ============================================================================
-- Purpose:
--   Makes technical findings comparable across provider runs. Studio can
--   originate the contract, but shared DB migrations must be mirrored/applied
--   from bukeer-flutter per migration governance.
-- ============================================================================

alter table if exists public.seo_audit_findings
  add column if not exists crawl_task_id text;

alter table if exists public.seo_audit_findings
  add column if not exists finding_fingerprint text;

update public.seo_audit_findings
set
  crawl_task_id = coalesce(crawl_task_id, evidence->>'crawl_task_id'),
  finding_fingerprint = coalesce(finding_fingerprint, evidence->>'finding_fingerprint')
where evidence ? 'crawl_task_id'
   or evidence ? 'finding_fingerprint';

create index if not exists idx_seo_audit_findings_crawl_task
  on public.seo_audit_findings(website_id, crawl_task_id);

create index if not exists idx_seo_audit_findings_fingerprint
  on public.seo_audit_findings(website_id, finding_fingerprint);

comment on column public.seo_audit_findings.crawl_task_id is
  'Provider run id for comparable Growth OS audits, e.g. DataForSEO OnPage task id.';

comment on column public.seo_audit_findings.finding_fingerprint is
  'Stable key for comparing findings across runs: normalized_url + finding_type + source.';
