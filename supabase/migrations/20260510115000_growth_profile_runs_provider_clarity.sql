-- ============================================================================
-- Growth OS Provider Intelligence — allow Clarity provider profile runs
-- ============================================================================

alter table public.growth_profile_runs
  drop constraint if exists growth_profile_runs_provider_chk;

alter table public.growth_profile_runs
  add constraint growth_profile_runs_provider_chk
    check (
      provider in (
        'gsc',
        'ga4',
        'dataforseo',
        'clarity',
        'meta_ads',
        'google_ads',
        'tracking',
        'manual',
        'artifact'
      )
    );
