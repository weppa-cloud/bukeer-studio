-- ============================================================================
-- GA4 Measurement Protocol delivery log — #419 / #491
-- ============================================================================
-- Purpose:
--   Stores server-side GA4 Measurement Protocol delivery attempts from the
--   funnel_events dispatcher. This makes GA4 observable like Meta CAPI and
--   Google Ads offline uploads, and prevents silent loss when tenant GA4
--   configuration is incomplete.
--
-- Safety:
--   - Additive, forward-only migration.
--   - No raw API secrets.
--   - Request payloads are event payloads sent to GA4 MP, not provider secrets.
-- ============================================================================

create table if not exists public.ga4_measurement_protocol_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'ga4',
  account_id uuid references public.accounts(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  funnel_event_id text not null,
  event_name text not null,
  measurement_id text,
  property_id text,
  status text not null default 'pending',
  retry_count integer not null default 0,
  request_payload jsonb not null default '{}'::jsonb,
  provider_response jsonb,
  error text,
  trace jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ga4_mp_events_provider_check
    check (provider = 'ga4'),
  constraint ga4_mp_events_status_check
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  constraint ga4_mp_events_retry_count_check
    check (retry_count >= 0),
  constraint ga4_mp_events_unique
    unique (funnel_event_id, event_name)
);

create index if not exists ga4_mp_events_account_created_idx
  on public.ga4_measurement_protocol_events(account_id, created_at desc)
  where account_id is not null;

create index if not exists ga4_mp_events_website_created_idx
  on public.ga4_measurement_protocol_events(website_id, created_at desc)
  where website_id is not null;

create index if not exists ga4_mp_events_status_idx
  on public.ga4_measurement_protocol_events(status, created_at desc)
  where status <> 'sent';

create index if not exists ga4_mp_events_trace_gin_idx
  on public.ga4_measurement_protocol_events using gin(trace);

alter table public.ga4_measurement_protocol_events enable row level security;

drop policy if exists ga4_mp_events_service_all on public.ga4_measurement_protocol_events;
create policy ga4_mp_events_service_all
  on public.ga4_measurement_protocol_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists ga4_mp_events_tenant_read on public.ga4_measurement_protocol_events;
create policy ga4_mp_events_tenant_read
  on public.ga4_measurement_protocol_events
  for select
  using (
    account_id is not null
    and exists (
      select 1
      from public.user_roles ur
      where ur.account_id = public.ga4_measurement_protocol_events.account_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create or replace function public.touch_ga4_measurement_protocol_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ga4_mp_events_updated_at
  on public.ga4_measurement_protocol_events;
create trigger trg_ga4_mp_events_updated_at
before update on public.ga4_measurement_protocol_events
for each row execute function public.touch_ga4_measurement_protocol_events_updated_at();

comment on table public.ga4_measurement_protocol_events is
  'Server-side GA4 Measurement Protocol delivery attempts and idempotency ledger. F6 / #491.';
comment on column public.ga4_measurement_protocol_events.measurement_id is
  'GA4 web stream measurement id, e.g. G-XXXXXXXXXX. The API secret is not stored here.';
comment on column public.ga4_measurement_protocol_events.funnel_event_id is
  'Canonical funnel_events.event_id used for idempotency and traceability.';
comment on column public.ga4_measurement_protocol_events.request_payload is
  'GA4 Measurement Protocol payload without api_secret.';
