-- ============================================================================
-- Growth funnel_events — durable AARRR event log (#310 / SPEC #337)
-- ============================================================================
-- Purpose:
--   Persists all funnel events emitted by browser pixel + server (WAFlow,
--   Chatwoot, booking) so we can reconstruct AARRR per
--   (account_id, website_id, locale, market). The same event_id MUST be sent
--   from browser and server for dedupe (ADR-018) — uniqueness is enforced at
--   the PRIMARY KEY level.
--
-- Idempotency (ADR-018):
--   event_id = lowercase(sha256(reference_code:event_name:occurred_at_s))
--   Repeat inserts of the same event_id are rejected at the DB level. Writers
--   use ON CONFLICT DO NOTHING.
--
-- Privacy (docs/ops/growth-attribution-governance.md):
--   - No PII (email/phone/name) in `payload` or `attribution`. Application
--     code MUST redact before insert. RLS keeps rows tenant-scoped.
--   - `attribution` is allowed to carry UTM keys + click identifiers (gclid,
--     fbclid, etc) under the same governance rules.
--
-- Safety:
--   - Additive, forward-only.
--   - RLS service-role write; account-scoped read for future dashboards.
-- ============================================================================

create table if not exists public.funnel_events (
  event_id text primary key,
  event_name text not null,
  stage text not null,
  channel text not null default 'unknown',
  reference_code text not null,
  account_id uuid not null,
  website_id uuid not null,
  locale text not null,
  market text not null,
  occurred_at timestamptz not null,
  attribution jsonb,
  payload jsonb not null default '{}'::jsonb,
  provider_status jsonb not null default '[]'::jsonb,
  source_url text,
  page_path text,
  created_at timestamptz not null default now(),
  constraint funnel_events_event_id_format_chk
    check (event_id ~ '^[0-9a-f]{64}$'),
  constraint funnel_events_event_name_chk
    check (event_name in (
      'waflow_open',
      'waflow_step_next',
      'waflow_submit',
      'whatsapp_cta_click',
      'qualified_lead',
      'quote_sent',
      'booking_confirmed',
      'review_submitted',
      'referral_lead'
    )),
  constraint funnel_events_stage_chk
    check (stage in (
      'acquisition',
      'activation',
      'qualified_lead',
      'quote_sent',
      'booking',
      'review_referral'
    )),
  constraint funnel_events_channel_chk
    check (channel in (
      'seo',
      'google_ads',
      'meta',
      'tiktok',
      'whatsapp',
      'waflow',
      'chatwoot',
      'direct',
      'referral',
      'email',
      'unknown'
    )),
  constraint funnel_events_locale_chk
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint funnel_events_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint funnel_events_reference_code_len_chk
    check (char_length(reference_code) between 8 and 64)
);

create index if not exists funnel_events_tenant_time_idx
  on public.funnel_events(account_id, website_id, occurred_at desc);

create index if not exists funnel_events_reference_event_idx
  on public.funnel_events(reference_code, event_name);

create index if not exists funnel_events_stage_time_idx
  on public.funnel_events(stage, occurred_at desc);

create index if not exists funnel_events_channel_time_idx
  on public.funnel_events(channel, occurred_at desc);

create index if not exists funnel_events_attribution_gin_idx
  on public.funnel_events using gin(attribution);

alter table public.funnel_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'funnel_events'
      and policyname = 'funnel_events_service_all'
  ) then
    create policy funnel_events_service_all
      on public.funnel_events
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

-- Account-scoped read for authenticated users. `accounts.id` is the
-- auth user id by convention in this project (see destination_seo_overrides
-- and other growth-adjacent tables).
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'funnel_events'
      and policyname = 'funnel_events_account_read'
  ) then
    create policy funnel_events_account_read
      on public.funnel_events
      for select
      to authenticated
      using (account_id = auth.uid());
  end if;
end$$;

comment on table public.funnel_events is
  'AARRR funnel event ledger. Idempotent by event_id (ADR-018). Tenant-scoped via account_id+website_id (ADR-009).';
comment on column public.funnel_events.event_id is
  'sha256(reference_code:event_name:occurred_at_s) — shared between browser pixel and server CAPI for dedupe.';
comment on column public.funnel_events.attribution is
  'GrowthAttribution snapshot at emit-time (UTM + click ids + channel + session_key). No PII.';
comment on column public.funnel_events.payload is
  'Event-specific custom data. Caller MUST redact PII per docs/ops/growth-attribution-governance.md.';
comment on column public.funnel_events.provider_status is
  'Array<FunnelEventProviderRecord> tracking pixel/CAPI/Events-API send status per event.';
