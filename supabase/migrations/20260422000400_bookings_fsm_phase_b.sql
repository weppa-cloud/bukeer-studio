-- Bookings FSM + webhook idempotency foundation (#169 Phase B)
-- Depends on: 20260422000000_leads_booking_phase_a.sql (product_availability)
-- ADR-018 (webhook idempotency)

-- (a) webhook_events — shared idempotency ledger (ADR-018)
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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'webhook_events' and policyname = 'webhook_events_service_all'
  ) then
    create policy webhook_events_service_all on public.webhook_events
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

-- (b) bookings — FSM table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  tenant_id uuid not null references public.accounts(id) on delete restrict,
  user_email text not null,
  user_phone text,
  pax integer not null,
  option_id uuid,
  date date not null,
  status text not null default 'pending',
  deposit_amount numeric(12,2) not null default 0,
  deposit_currency text not null default 'COP',
  total_amount numeric(12,2) not null default 0,
  wompi_payment_id text,
  idempotency_key text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  constraint bookings_status_check
    check (status in ('pending', 'holding', 'confirmed', 'expired', 'cancelled')),
  constraint bookings_pax_check check (pax > 0),
  constraint bookings_idempotency_unique unique (idempotency_key)
);

create index if not exists bookings_status_expires_idx
  on public.bookings(status, expires_at)
  where status in ('pending', 'holding');

create index if not exists bookings_tenant_created_idx
  on public.bookings(tenant_id, created_at desc);

create index if not exists bookings_product_date_idx
  on public.bookings(product_id, date);

alter table public.bookings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bookings' and policyname = 'bookings_service_all'
  ) then
    create policy bookings_service_all on public.bookings
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bookings' and policyname = 'bookings_tenant_select'
  ) then
    create policy bookings_tenant_select on public.bookings
      for select
      using (tenant_id = (auth.jwt() ->> 'account_id')::uuid);
  end if;
end$$;

-- (c) booking_events — audit trail
create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null,
  previous_status text,
  new_status text,
  source text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint booking_events_source_check
    check (source in ('api', 'webhook', 'cron', 'admin'))
);

create index if not exists booking_events_booking_idx
  on public.booking_events(booking_id, created_at desc);

alter table public.booking_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'booking_events' and policyname = 'booking_events_service_all'
  ) then
    create policy booking_events_service_all on public.booking_events
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

-- (d) create_booking_hold RPC — atomic capacity enforcement
create or replace function public.create_booking_hold(
  p_product_id uuid,
  p_tenant_id uuid,
  p_date date,
  p_pax integer,
  p_user_email text,
  p_user_phone text,
  p_option_id uuid,
  p_deposit_amount numeric,
  p_deposit_currency text,
  p_total_amount numeric,
  p_idempotency_key text,
  p_hold_minutes integer default 30
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_availability public.product_availability;
  v_booking public.bookings;
  v_existing_count integer;
begin
  if p_pax <= 0 then
    raise exception 'pax must be positive' using errcode = '22023';
  end if;

  -- Idempotency check
  select * into v_booking from public.bookings where idempotency_key = p_idempotency_key;
  if found then
    return v_booking;
  end if;

  -- Atomic capacity lock
  select * into v_availability
  from public.product_availability
  where product_id = p_product_id and date = p_date
  for update;

  if not found then
    raise exception 'no availability row for product_id=% date=%', p_product_id, p_date
      using errcode = 'P0002';
  end if;

  -- Include existing holds + confirmations
  select coalesce(sum(pax), 0) into v_existing_count
  from public.bookings
  where product_id = p_product_id
    and date = p_date
    and status in ('pending', 'holding', 'confirmed');

  if v_existing_count + p_pax > v_availability.capacity then
    raise exception 'capacity exceeded: requested=% existing=% capacity=%',
      p_pax, v_existing_count, v_availability.capacity
      using errcode = 'P0003';
  end if;

  insert into public.bookings (
    product_id, tenant_id, user_email, user_phone, pax, option_id, date,
    status, deposit_amount, deposit_currency, total_amount,
    idempotency_key, expires_at
  )
  values (
    p_product_id, p_tenant_id, p_user_email, p_user_phone, p_pax, p_option_id, p_date,
    'pending', p_deposit_amount, p_deposit_currency, p_total_amount,
    p_idempotency_key, now() + (p_hold_minutes || ' minutes')::interval
  )
  returning * into v_booking;

  insert into public.booking_events (booking_id, event_type, new_status, source, payload)
  values (v_booking.id, 'created', 'pending', 'api',
          jsonb_build_object('pax', p_pax, 'hold_minutes', p_hold_minutes));

  -- Update reserved counter
  update public.product_availability
  set reserved = reserved + p_pax,
      version = version + 1,
      updated_at = now()
  where product_id = p_product_id and date = p_date;

  return v_booking;
end;
$$;

grant execute on function public.create_booking_hold(
  uuid, uuid, date, integer, text, text, uuid, numeric, text, numeric, text, integer
) to service_role;

-- (e) expire_stale_bookings — invoked by cron
create or replace function public.expire_stale_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired integer := 0;
  rec record;
begin
  for rec in
    select id, product_id, date, pax
    from public.bookings
    where status in ('pending', 'holding')
      and expires_at < now()
    for update skip locked
  loop
    update public.bookings
    set status = 'expired', updated_at = now()
    where id = rec.id;

    update public.product_availability
    set reserved = greatest(0, reserved - rec.pax),
        version = version + 1,
        updated_at = now()
    where product_id = rec.product_id and date = rec.date;

    insert into public.booking_events (booking_id, event_type, previous_status, new_status, source, payload)
    values (rec.id, 'expired', 'pending', 'expired', 'cron', '{}'::jsonb);

    v_expired := v_expired + 1;
  end loop;

  return v_expired;
end;
$$;

grant execute on function public.expire_stale_bookings() to service_role;

comment on table public.bookings is
  'Booking FSM — pending/holding/confirmed/expired/cancelled. See ADR-018 + #169.';

comment on function public.create_booking_hold(
  uuid, uuid, date, integer, text, text, uuid, numeric, text, numeric, text, integer
) is
  'Atomic capacity lock + booking creation. Uses SELECT FOR UPDATE on product_availability to prevent overbook.';
