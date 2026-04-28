-- Minimal operational table required by public WAFlow rate limiting.
--
-- Extracted from existing migration:
-- - 20260422000000_leads_booking_phase_a.sql
--
-- Kept narrow so Epic #310 tracking smoke can run without applying unrelated
-- booking tables in production.

create table if not exists public.public_rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_rate_limits_scope_key_window_unique unique (scope, key, window_start)
);

create index if not exists public_rate_limits_lookup_idx
  on public.public_rate_limits(scope, key, window_start desc);

alter table public.public_rate_limits enable row level security;

drop policy if exists public_rate_limits_all_service on public.public_rate_limits;
create policy public_rate_limits_all_service
  on public.public_rate_limits
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
