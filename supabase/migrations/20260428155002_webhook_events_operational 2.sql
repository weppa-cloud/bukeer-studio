-- Minimal operational table required by Chatwoot webhook idempotency.
--
-- Extracted from existing migration:
-- - 20260422000400_bookings_fsm_phase_b.sql
--
-- Kept narrow so Epic #310 tracking smoke can run without applying unrelated
-- booking tables in production.

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  signature text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending',
  error text,
  payload jsonb not null,
  constraint webhook_events_provider_event_unique unique (provider, event_id),
  constraint webhook_events_status_check
    check (status in ('pending', 'processed', 'failed'))
);

create index if not exists webhook_events_provider_idx
  on public.webhook_events(provider, received_at desc);

create index if not exists webhook_events_pending_idx
  on public.webhook_events(status)
  where status <> 'processed';

alter table public.webhook_events enable row level security;

drop policy if exists webhook_events_service_all on public.webhook_events;
create policy webhook_events_service_all
  on public.webhook_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
