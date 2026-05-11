-- ============================================================================
-- SEO integrations — allow Microsoft Clarity provider
-- ============================================================================
-- Purpose:
--   Extend the Growth provider integration ledger so ColombiaTours can store
--   the Microsoft Clarity aggregate export connector in seo_integrations.
--
-- Safety:
--   - Additive/idempotent constraint replacement.
--   - Does not insert credentials.
--   - Clarity usage remains aggregate-only through lib/growth/clarity-client.ts.
-- ============================================================================

alter table public.seo_integrations
  drop constraint if exists seo_integrations_provider_chk;

alter table public.seo_integrations
  add constraint seo_integrations_provider_chk
  check (provider in ('gsc', 'ga4', 'dataforseo', 'clarity'));

comment on constraint seo_integrations_provider_chk on public.seo_integrations is
  'Allowed SEO/Growth provider integrations, including Microsoft Clarity aggregate export.';
