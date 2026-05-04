-- ============================================================================
-- google_ads_offline_uploads — idempotent log of Google Ads conversion uploads
-- F2 / EPIC #419 — SPEC §AC2.3
-- ============================================================================
-- Purpose:
--   Stores server-side Google Ads Conversions Upload API attempts. The unique
--   constraint on (funnel_event_id, conversion_action_id) prevents duplicate
--   uploads across retries — Google Ads itself dedupes by gclid+action+time
--   but logging dedupe avoids hammering the API on retries.
--
--   Mirrors the shape of public.meta_conversion_events (#324) so dashboards
--   can union the two tables for cross-platform conversion-pipeline views.
--
-- Safety:
--   - Additive, forward-only migration. No data backfill.
--   - RLS service-role only for v1; tenant-scoped read added when monitoring
--     dashboards land (Phase 4).
--   - Provider responses are expected to be redacted by application code
--     (lib/google-ads/offline-upload.ts → redactGoogleAdsProviderResponse).
-- ============================================================================

create table if not exists public.google_ads_offline_uploads (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'google_ads',
  account_id uuid references public.accounts(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  -- funnel_event_id is the canonical event_id (sha256 hex) from
  -- public.funnel_events. Foreign key intentionally OMITTED so the dispatcher
  -- can write the log even if funnel_events insert is contended/concurrent
  -- (we tolerate orphan rows over blocking the pipeline). The FK can be
  -- added later as a follow-up once F1 has stabilized.
  funnel_event_id text,
  booking_id uuid,
  conversion_action_id text not null,
  gclid text,
  gbraid text,
  wbraid text,
  conversion_value numeric,
  currency_code text,
  conversion_date_time timestamptz not null,
  status text not null default 'pending',
  retry_count integer not null default 0,
  request_payload jsonb not null default '{}'::jsonb,
  provider_response jsonb,
  error text,
  trace jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_ads_offline_uploads_provider_check
    check (provider = 'google_ads'),
  constraint google_ads_offline_uploads_status_check
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  constraint google_ads_offline_uploads_retry_count_check
    check (retry_count >= 0),
  -- At least one click identifier when the row is real. Skipped rows
  -- (no_click_id) are still logged for observability so the constraint is
  -- relaxed when status='skipped'.
  constraint google_ads_offline_uploads_click_id_present
    check (
      status = 'skipped'
      or (gclid is not null or gbraid is not null or wbraid is not null)
    ),
  -- Idempotency: one row per (funnel event × conversion action). Allows
  -- retries to reuse the row via UPDATE rather than insert duplicates.
  constraint google_ads_offline_uploads_event_action_unique
    unique (funnel_event_id, conversion_action_id)
);

create index if not exists google_ads_offline_uploads_account_created_idx
  on public.google_ads_offline_uploads(account_id, created_at desc)
  where account_id is not null;

create index if not exists google_ads_offline_uploads_website_created_idx
  on public.google_ads_offline_uploads(website_id, created_at desc)
  where website_id is not null;

create index if not exists google_ads_offline_uploads_status_idx
  on public.google_ads_offline_uploads(status, created_at desc)
  where status <> 'sent';

create index if not exists google_ads_offline_uploads_gclid_idx
  on public.google_ads_offline_uploads(gclid)
  where gclid is not null;

create index if not exists google_ads_offline_uploads_trace_gin_idx
  on public.google_ads_offline_uploads using gin(trace);

alter table public.google_ads_offline_uploads enable row level security;

-- Service-role only for writes + reads (v1). Tenant-scoped read policy will
-- be added when admin dashboards consume this surface (Phase 4 / SPEC AC4.x).
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'google_ads_offline_uploads'
      and policyname = 'google_ads_offline_uploads_service_all'
  ) then
    create policy google_ads_offline_uploads_service_all
      on public.google_ads_offline_uploads
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

-- Tenant-scoped SELECT for authenticated users on rows belonging to their
-- account. Mirrors the future read surface used by funnel monitoring
-- dashboards. Safe to add now: no PII, no destructive operations exposed.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'google_ads_offline_uploads'
      and policyname = 'google_ads_offline_uploads_tenant_read'
  ) then
    create policy google_ads_offline_uploads_tenant_read
      on public.google_ads_offline_uploads
      for select
      using (
        account_id is not null
        and exists (
          select 1
          from public.account_users au
          where au.account_id = public.google_ads_offline_uploads.account_id
            and au.user_id = auth.uid()
        )
      );
  end if;
exception
  when undefined_table then
    -- account_users table not present in this branch; skip the tenant
    -- read policy — service_role still works.
    null;
end$$;

create or replace function public.touch_google_ads_offline_uploads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_google_ads_offline_uploads_updated_at
  on public.google_ads_offline_uploads;
create trigger trg_google_ads_offline_uploads_updated_at
before update on public.google_ads_offline_uploads
for each row execute function public.touch_google_ads_offline_uploads_updated_at();

comment on table public.google_ads_offline_uploads is
  'Server-side Google Ads Conversions Upload API attempts and idempotency ledger. F2 / EPIC #419.';
comment on column public.google_ads_offline_uploads.funnel_event_id is
  'sha256 hex event_id from public.funnel_events. FK intentionally omitted (see migration header).';
comment on column public.google_ads_offline_uploads.conversion_action_id is
  'Numeric/string id of the conversion_action created in the Google Ads UI (per SPEC AC2.2). The dispatcher reads this from event_destination_mapping.tenant_overrides keyed by account_id.';
comment on column public.google_ads_offline_uploads.request_payload is
  'Conversions Upload API request body after hashing user_identifiers. Service-role only.';
comment on column public.google_ads_offline_uploads.provider_response is
  'Redacted Google Ads API response body.';
