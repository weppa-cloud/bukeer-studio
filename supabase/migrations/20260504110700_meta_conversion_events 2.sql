-- ============================================================================
-- Meta Conversions API — idempotent event log (#324)
-- ============================================================================
-- Purpose:
--   Stores server-side Meta CAPI attempts for WAFlow, Chatwoot lifecycle, and
--   booking/payment purchase events. The unique key prevents duplicate sends
--   across retries and browser/server dedupe flows.
--
-- Safety:
--   - Additive, forward-only migration.
--   - RLS service-role only for v1; no public/account dashboard read surface.
--   - Provider responses are expected to be redacted by application code before
--     persistence.
-- ============================================================================

create table if not exists public.meta_conversion_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'meta',
  account_id uuid references public.accounts(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  waflow_lead_id uuid references public.waflow_leads(id) on delete set null,
  chatwoot_conversation_id text,
  booking_id uuid,
  event_name text not null,
  event_id text not null,
  action_source text not null,
  event_time timestamptz not null default now(),
  event_source_url text,
  status text not null default 'pending',
  retry_count integer not null default 0,
  request_payload jsonb not null default '{}'::jsonb,
  provider_response jsonb,
  error text,
  trace jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meta_conversion_events_provider_check
    check (provider = 'meta'),
  constraint meta_conversion_events_status_check
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  constraint meta_conversion_events_retry_count_check
    check (retry_count >= 0),
  constraint meta_conversion_events_event_unique
    unique (provider, event_name, event_id)
);

create index if not exists meta_conversion_events_account_created_idx
  on public.meta_conversion_events(account_id, created_at desc)
  where account_id is not null;

create index if not exists meta_conversion_events_website_created_idx
  on public.meta_conversion_events(website_id, created_at desc)
  where website_id is not null;

create index if not exists meta_conversion_events_status_idx
  on public.meta_conversion_events(status, created_at desc)
  where status <> 'sent';

create index if not exists meta_conversion_events_trace_gin_idx
  on public.meta_conversion_events using gin(trace);

alter table public.meta_conversion_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'meta_conversion_events'
      and policyname = 'meta_conversion_events_service_all'
  ) then
    create policy meta_conversion_events_service_all
      on public.meta_conversion_events
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

create or replace function public.touch_meta_conversion_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_meta_conversion_events_updated_at
  on public.meta_conversion_events;
create trigger trg_meta_conversion_events_updated_at
before update on public.meta_conversion_events
for each row execute function public.touch_meta_conversion_events_updated_at();

comment on table public.meta_conversion_events is
  'Server-side Meta Conversions API attempts and idempotency ledger.';
comment on column public.meta_conversion_events.event_id is
  'Stable Meta dedupe key, e.g. HOME-2504-ABCD:lead or HOME-2504-ABCD:purchase:<booking_id>.';
comment on column public.meta_conversion_events.request_payload is
  'CAPI request body after hashing user_data. Service-role only.';
comment on column public.meta_conversion_events.provider_response is
  'Redacted Meta Graph API response body.';
