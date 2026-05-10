-- ============================================================================
-- Growth OS Provider Intelligence — Clarity integration columns
-- ============================================================================
-- Purpose:
--   Allow the Clarity aggregate provider client to read tenant-scoped project
--   credentials from seo_integrations without failing on missing columns.
--
-- Safety:
--   - Additive and idempotent.
--   - Does not insert credentials or enable any mutation.
-- ============================================================================

alter table public.seo_integrations
  add column if not exists project_id text,
  add column if not exists api_token text;

comment on column public.seo_integrations.project_id is
  'Provider project identifier for integrations such as Microsoft Clarity.';
comment on column public.seo_integrations.api_token is
  'Server-side API token for read-only provider integrations such as Microsoft Clarity.';
