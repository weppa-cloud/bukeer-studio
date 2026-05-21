-- CRM Audience Projection: Supabase SSOT -> Google Customer Match / Meta Custom Audiences
-- Full gated: local materialization, dry-run/validate/apply/reconcile queueing, no campaign attachment.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.crm_audience_definitions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  rule_type text not null default 'built_in',
  rule_config jsonb not null default '{}'::jsonb,
  window_days integer,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, code)
);

create table if not exists public.crm_audience_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  audience_id uuid not null references public.crm_audience_definitions(id) on delete cascade,
  contact_id uuid,
  source_entity_type text not null,
  source_entity_id text not null,
  source_reason text,
  entered_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  last_evaluated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audience_id, source_entity_type, source_entity_id)
);

create table if not exists public.crm_audience_member_identities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  audience_id uuid not null references public.crm_audience_definitions(id) on delete cascade,
  membership_id uuid not null references public.crm_audience_memberships(id) on delete cascade,
  contact_id uuid,
  source_entity_type text not null,
  source_entity_id text not null,
  email_sha256 text,
  phone_sha256 text,
  external_id_sha256 text,
  consent_status text not null default 'policy_default_granted' check (consent_status in ('policy_default_granted', 'explicit_granted', 'suppressed', 'unknown')),
  consent_source text not null default 'colombiatours_policy_default_v1',
  consent_at timestamptz not null default now(),
  privacy_policy_version text not null default 'colombiatours_policy_default_v1',
  identity_coverage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audience_id, membership_id),
  check (email_sha256 is not null or phone_sha256 is not null or external_id_sha256 is not null)
);

create table if not exists public.crm_audience_destination_bindings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  audience_id uuid not null references public.crm_audience_definitions(id) on delete cascade,
  destination text not null check (destination in ('google_ads_customer_match', 'meta_custom_audiences')),
  platform_account_id text,
  platform_audience_id text,
  platform_audience_name text not null,
  sync_mode text not null default 'manual' check (sync_mode in ('manual', 'dry_run', 'validate', 'apply', 'reconcile')),
  status text not null default 'draft' check (status in ('draft', 'ready', 'active', 'paused', 'error')),
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, audience_id, destination)
);

create table if not exists public.crm_audience_sync_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  audience_id uuid references public.crm_audience_definitions(id) on delete set null,
  destination text check (destination in ('google_ads_customer_match', 'meta_custom_audiences')),
  mode text not null check (mode in ('dry_run', 'validate', 'apply', 'reconcile')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'skipped')),
  dry_run boolean not null default true,
  adds integer not null default 0,
  removes integer not null default 0,
  skips integer not null default 0,
  errors integer not null default 0,
  actor_user_id uuid,
  approval_token_hash text,
  started_at timestamptz,
  finished_at timestamptz,
  request_summary jsonb not null default '{}'::jsonb,
  response_summary jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_audience_sync_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.crm_audience_sync_runs(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  audience_id uuid references public.crm_audience_definitions(id) on delete set null,
  membership_id uuid references public.crm_audience_memberships(id) on delete set null,
  operation text not null check (operation in ('add', 'remove', 'skip', 'validate', 'reconcile')),
  status text not null default 'queued' check (status in ('queued', 'completed', 'failed', 'skipped')),
  reason text,
  provider_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_audience_suppressions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  audience_id uuid references public.crm_audience_definitions(id) on delete cascade,
  contact_id uuid,
  email_sha256 text,
  phone_sha256 text,
  source text not null default 'manual',
  reason text,
  active boolean not null default true,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contact_id is not null or email_sha256 is not null or phone_sha256 is not null)
);

create index if not exists crm_audience_definitions_account_status_idx
  on public.crm_audience_definitions(account_id, status);
create index if not exists crm_audience_memberships_account_audience_active_idx
  on public.crm_audience_memberships(account_id, audience_id, is_active);
create index if not exists crm_audience_memberships_contact_idx
  on public.crm_audience_memberships(account_id, contact_id) where contact_id is not null;
create index if not exists crm_audience_member_identities_hash_idx
  on public.crm_audience_member_identities(account_id, audience_id, email_sha256, phone_sha256);
create index if not exists crm_audience_destination_bindings_account_destination_idx
  on public.crm_audience_destination_bindings(account_id, destination, status);
create index if not exists crm_audience_sync_runs_account_created_idx
  on public.crm_audience_sync_runs(account_id, created_at desc);
create index if not exists crm_audience_sync_events_run_idx
  on public.crm_audience_sync_events(run_id, created_at desc);
create index if not exists crm_audience_suppressions_lookup_idx
  on public.crm_audience_suppressions(account_id, audience_id, active, contact_id, email_sha256, phone_sha256);

create or replace function public.touch_crm_audience_projection_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_crm_audience_definitions_updated_at on public.crm_audience_definitions;
create trigger touch_crm_audience_definitions_updated_at
  before update on public.crm_audience_definitions
  for each row execute function public.touch_crm_audience_projection_updated_at();

drop trigger if exists touch_crm_audience_memberships_updated_at on public.crm_audience_memberships;
create trigger touch_crm_audience_memberships_updated_at
  before update on public.crm_audience_memberships
  for each row execute function public.touch_crm_audience_projection_updated_at();

drop trigger if exists touch_crm_audience_member_identities_updated_at on public.crm_audience_member_identities;
create trigger touch_crm_audience_member_identities_updated_at
  before update on public.crm_audience_member_identities
  for each row execute function public.touch_crm_audience_projection_updated_at();

drop trigger if exists touch_crm_audience_destination_bindings_updated_at on public.crm_audience_destination_bindings;
create trigger touch_crm_audience_destination_bindings_updated_at
  before update on public.crm_audience_destination_bindings
  for each row execute function public.touch_crm_audience_projection_updated_at();

drop trigger if exists touch_crm_audience_sync_runs_updated_at on public.crm_audience_sync_runs;
create trigger touch_crm_audience_sync_runs_updated_at
  before update on public.crm_audience_sync_runs
  for each row execute function public.touch_crm_audience_projection_updated_at();

drop trigger if exists touch_crm_audience_suppressions_updated_at on public.crm_audience_suppressions;
create trigger touch_crm_audience_suppressions_updated_at
  before update on public.crm_audience_suppressions
  for each row execute function public.touch_crm_audience_projection_updated_at();

alter table public.crm_audience_definitions enable row level security;
alter table public.crm_audience_memberships enable row level security;
alter table public.crm_audience_member_identities enable row level security;
alter table public.crm_audience_destination_bindings enable row level security;
alter table public.crm_audience_sync_runs enable row level security;
alter table public.crm_audience_sync_events enable row level security;
alter table public.crm_audience_suppressions enable row level security;

create policy crm_audience_definitions_service_all on public.crm_audience_definitions
  for all to service_role using (true) with check (true);
create policy crm_audience_memberships_service_all on public.crm_audience_memberships
  for all to service_role using (true) with check (true);
create policy crm_audience_member_identities_service_all on public.crm_audience_member_identities
  for all to service_role using (true) with check (true);
create policy crm_audience_destination_bindings_service_all on public.crm_audience_destination_bindings
  for all to service_role using (true) with check (true);
create policy crm_audience_sync_runs_service_all on public.crm_audience_sync_runs
  for all to service_role using (true) with check (true);
create policy crm_audience_sync_events_service_all on public.crm_audience_sync_events
  for all to service_role using (true) with check (true);
create policy crm_audience_suppressions_service_all on public.crm_audience_suppressions
  for all to service_role using (true) with check (true);

-- Tenant read policies exclude raw identity hashes, sync event detail, and suppressions.
do $$
begin
  create policy crm_audience_definitions_tenant_read on public.crm_audience_definitions
    for select to authenticated
    using (exists (
      select 1 from public.account_users au
      where au.account_id = crm_audience_definitions.account_id
        and au.user_id = auth.uid()
    ));

  create policy crm_audience_memberships_tenant_read on public.crm_audience_memberships
    for select to authenticated
    using (exists (
      select 1 from public.account_users au
      where au.account_id = crm_audience_memberships.account_id
        and au.user_id = auth.uid()
    ));

  create policy crm_audience_destination_bindings_tenant_read on public.crm_audience_destination_bindings
    for select to authenticated
    using (exists (
      select 1 from public.account_users au
      where au.account_id = crm_audience_destination_bindings.account_id
        and au.user_id = auth.uid()
    ));

  create policy crm_audience_sync_runs_tenant_read on public.crm_audience_sync_runs
    for select to authenticated
    using (exists (
      select 1 from public.account_users au
      where au.account_id = crm_audience_sync_runs.account_id
        and au.user_id = auth.uid()
    ));
exception
  when undefined_table then
    raise notice 'account_users table unavailable; tenant read policies skipped for crm_audience_projection';
  when duplicate_object then
    null;
end $$;

insert into public.service_channels (
  code,
  display_name,
  service_type,
  channel_type,
  api_base_url,
  api_sandbox_url,
  api_format,
  auth_method,
  rate_limit_per_minute,
  default_timeout_ms,
  max_timeout_ms,
  supports_search,
  supports_booking,
  supports_cancellation,
  supports_modifications,
  status,
  documentation_url,
  config
)
values
  (
    'google_ads_customer_match',
    'Google Ads Customer Match',
    'activities',
    'direct',
    'https://googleads.googleapis.com',
    null,
    'rest',
    'oauth2',
    600,
    10000,
    30000,
    false,
    false,
    false,
    false,
    'active',
    'https://developers.google.com/google-ads/api/docs/remarketing/audience-segments/customer-match',
    jsonb_build_object(
      'credential_contract', jsonb_build_object(
        'credentials_encrypted', jsonb_build_array(
          'developer_token',
          'client_id',
          'client_secret',
          'refresh_token'
        ),
        'config', jsonb_build_array(
          'customer_id',
          'login_customer_id',
          'api_version'
        )
      ),
      'secret_source', 'account_channel_contracts.credentials_encrypted',
      'fallback_policy', 'no production env fallback'
    )
  ),
  (
    'meta_custom_audiences',
    'Meta Custom Audiences',
    'activities',
    'direct',
    'https://graph.facebook.com',
    null,
    'rest',
    'bearer',
    600,
    10000,
    30000,
    false,
    false,
    false,
    false,
    'active',
    'https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences/',
    jsonb_build_object(
      'credential_contract', jsonb_build_object(
        'credentials_encrypted', jsonb_build_array(
          'access_token',
          'meta_access_token'
        ),
        'config', jsonb_build_array(
          'ad_account_id',
          'api_version'
        )
      ),
      'secret_source', 'account_channel_contracts.credentials_encrypted',
      'fallback_policy', 'no production env fallback'
    )
  )
on conflict (code) do update set
  display_name = excluded.display_name,
  service_type = excluded.service_type,
  channel_type = excluded.channel_type,
  api_base_url = excluded.api_base_url,
  api_format = excluded.api_format,
  auth_method = excluded.auth_method,
  rate_limit_per_minute = excluded.rate_limit_per_minute,
  default_timeout_ms = excluded.default_timeout_ms,
  max_timeout_ms = excluded.max_timeout_ms,
  supports_search = excluded.supports_search,
  supports_booking = excluded.supports_booking,
  supports_cancellation = excluded.supports_cancellation,
  supports_modifications = excluded.supports_modifications,
  status = excluded.status,
  documentation_url = excluded.documentation_url,
  config = coalesce(public.service_channels.config, '{}'::jsonb) || excluded.config,
  updated_at = now();

with colombiatours_account as (
  select w.account_id as id
  from public.websites w
  where w.subdomain = 'colombiatours'
    and w.account_id is not null
  order by w.updated_at desc nulls last
  limit 1
), seed as (
  select * from (values
    ('CT_confirmed_itinerary_buyers_all_24m', 'Confirmed itinerary buyers - all 24m', 'All confirmed itinerary buyers in the last 24 months.', 730, '{"policy_default_consent":true,"confirmation_statuses":["Confirmado"],"signals":["confirmed_at","confirmation_date","paid"]}'::jsonb),
    ('CT_confirmed_buyers_high_value', 'Confirmed buyers - high value', 'Confirmed itinerary buyers over the configured value threshold.', 730, '{"policy_default_consent":true,"amount_threshold_cop":12000000,"value_columns":["total_markup","total_amount"]}'::jsonb),
    ('CT_quote_sent_no_purchase_180d', 'Quote sent without purchase - 180d', 'Contacts or requests with quote sent and no confirmed itinerary in 180 days.', 180, '{"policy_default_consent":true,"signals":["crm_quote_sent","proposal_sent"]}'::jsonb),
    ('CT_waflow_submit_no_quote_90d', 'WAFlow submit without quote - 90d', 'WAFlow submit leads that have not progressed to quote sent.', 90, '{"policy_default_consent":true,"signals":["waflow_submit","waflow_leads.submitted_at"]}'::jsonb),
    ('CT_recent_buyers_180d', 'Recent buyers - 180d', 'Recent confirmed buyers for exclusion or upsell.', 180, '{"policy_default_consent":true,"confirmation_statuses":["Confirmado"],"use_case":"exclusion_or_upsell"}'::jsonb),
    ('CT_bad_fit_low_quality_leads', 'Bad fit / low quality leads', 'Conservative suppression audience built only from explicit bad-fit or low-quality signals.', 365, '{"policy_default_consent":true,"conservative":true,"explicit_signals":["disqualified","bad_fit","low_quality","spam","employment","visa_only","flight_only","hotel_only"]}'::jsonb)
  ) as v(code, name, description, window_days, rule_config)
)
insert into public.crm_audience_definitions (account_id, code, name, description, window_days, rule_config, status)
select colombiatours_account.id, seed.code, seed.name, seed.description, seed.window_days, seed.rule_config, 'active'
from colombiatours_account cross join seed
on conflict (account_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  window_days = excluded.window_days,
  rule_config = excluded.rule_config,
  status = excluded.status,
  updated_at = now();

create or replace function public.crm_audience_hash_identity(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null or btrim(value) = '' then null
    else encode(extensions.digest(lower(btrim(value)), 'sha256'), 'hex')
  end;
$$;

create or replace function public.crm_audience_hash_phone(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null or regexp_replace(value, '[^0-9+]', '', 'g') = '' then null
    else encode(extensions.digest(regexp_replace(value, '[^0-9+]', '', 'g'), 'sha256'), 'hex')
  end;
$$;

create or replace function public.refresh_crm_audience_memberships(
  p_account_id uuid,
  p_audience_code text default null,
  p_dry_run boolean default true
)
returns table (
  audience_code text,
  audience_id uuid,
  total_candidates integer,
  consent_qualified integer,
  email_hash_coverage integer,
  phone_hash_coverage integer,
  adds integer,
  removes integer,
  skips integer,
  dry_run boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_audience record;
  v_threshold numeric;
begin
  if auth.role() <> 'service_role' then
    raise exception 'refresh_crm_audience_memberships requires service_role';
  end if;

  create temp table if not exists tmp_crm_audience_candidates (
    audience_id uuid not null,
    audience_code text not null,
    account_id uuid not null,
    contact_id uuid,
    source_entity_type text not null,
    source_entity_id text not null,
    source_reason text,
    entered_at timestamptz not null,
    email text,
    phone text,
    email_sha256 text,
    phone_sha256 text,
    external_id_sha256 text,
    is_suppressed boolean not null default false,
    metadata jsonb not null default '{}'::jsonb
  ) on commit drop;
  truncate tmp_crm_audience_candidates;

  for v_audience in
    select *
    from public.crm_audience_definitions
    where account_id = p_account_id
      and status = 'active'
      and (p_audience_code is null or code = p_audience_code)
  loop
    if v_audience.code in ('CT_confirmed_itinerary_buyers_all_24m', 'CT_recent_buyers_180d') then
      insert into tmp_crm_audience_candidates (
        audience_id, audience_code, account_id, contact_id, source_entity_type, source_entity_id,
        source_reason, entered_at, email, phone, metadata
      )
      select
        v_audience.id,
        v_audience.code,
        i.account_id,
        null::uuid,
        'itinerary',
        i.id::text,
        case when v_audience.code = 'CT_recent_buyers_180d' then 'recent_confirmed_buyer' else 'confirmed_buyer' end,
        coalesce(i.confirmed_at, i.confirmation_date, i.updated_at, i.created_at, now()),
        coalesce(r.traveler_email, wl.payload->>'email'),
        coalesce(r.traveler_phone, wl.payload->>'phone'),
        jsonb_build_object('itinerary_id', i.id, 'request_id', i.request_id, 'status', i.status)
      from public.itineraries i
      left join public.requests r on r.id = i.request_id
      left join public.waflow_leads wl
        on wl.account_id = i.account_id
       and wl.reference_code = coalesce(
         nullif(i.custom_fields->>'growth_reference_code', ''),
         nullif(i.custom_fields->>'reference_code', ''),
         nullif(i.id_fm, ''),
         nullif(r.custom_fields->>'growth_reference_code', ''),
         nullif(r.custom_fields->>'reference_code', ''),
         nullif(r.short_id, '')
       )
      where i.account_id = p_account_id
        and (
          i.status = 'Confirmado'
          or i.confirmed_at is not null
          or i.confirmation_date is not null
        )
        and coalesce(i.confirmed_at, i.confirmation_date, i.updated_at, i.created_at, now()) >=
          now() - make_interval(days => coalesce(v_audience.window_days, 730));
    elsif v_audience.code = 'CT_confirmed_buyers_high_value' then
      v_threshold := coalesce((v_audience.rule_config->>'amount_threshold_cop')::numeric, 12000000);
      insert into tmp_crm_audience_candidates (
        audience_id, audience_code, account_id, contact_id, source_entity_type, source_entity_id,
        source_reason, entered_at, email, phone, metadata
      )
      select
        v_audience.id,
        v_audience.code,
        i.account_id,
        null::uuid,
        'itinerary',
        i.id::text,
        'confirmed_high_value_buyer',
        coalesce(i.confirmed_at, i.confirmation_date, i.updated_at, i.created_at, now()),
        coalesce(r.traveler_email, wl.payload->>'email'),
        coalesce(r.traveler_phone, wl.payload->>'phone'),
        jsonb_build_object('itinerary_id', i.id, 'request_id', i.request_id, 'total_markup', i.total_markup, 'total_amount', i.total_amount)
      from public.itineraries i
      left join public.requests r on r.id = i.request_id
      left join public.waflow_leads wl
        on wl.account_id = i.account_id
       and wl.reference_code = coalesce(
         nullif(i.custom_fields->>'growth_reference_code', ''),
         nullif(i.custom_fields->>'reference_code', ''),
         nullif(i.id_fm, ''),
         nullif(r.custom_fields->>'growth_reference_code', ''),
         nullif(r.custom_fields->>'reference_code', ''),
         nullif(r.short_id, '')
       )
      where i.account_id = p_account_id
        and (
          i.status = 'Confirmado'
          or i.confirmed_at is not null
          or i.confirmation_date is not null
        )
        and greatest(coalesce(i.total_markup, 0), coalesce(i.total_amount, 0)) >= v_threshold
        and coalesce(i.confirmed_at, i.confirmation_date, i.updated_at, i.created_at, now()) >=
          now() - make_interval(days => coalesce(v_audience.window_days, 730));
    elsif v_audience.code = 'CT_quote_sent_no_purchase_180d' then
      insert into tmp_crm_audience_candidates (
        audience_id, audience_code, account_id, contact_id, source_entity_type, source_entity_id,
        source_reason, entered_at, email, phone, metadata
      )
      select
        v_audience.id,
        v_audience.code,
        fe.account_id,
        fe.user_id,
        'funnel_event',
        fe.event_id,
        'quote_sent_no_confirmed_purchase',
        coalesce(fe.occurred_at, fe.created_at, now()),
        fe.user_email,
        fe.user_phone,
        jsonb_build_object('event_id', fe.event_id, 'reference_code', fe.reference_code, 'event_name', fe.event_name)
      from public.funnel_events fe
      where fe.account_id = p_account_id
        and fe.event_name in ('crm_quote_sent', 'quote_sent')
        and coalesce(fe.occurred_at, fe.created_at, now()) >= now() - make_interval(days => coalesce(v_audience.window_days, 180))
        and not exists (
          select 1 from public.funnel_events booked
          where booked.account_id = fe.account_id
            and booked.event_name in ('crm_booking_confirmed', 'booking_confirmed')
            and (
              booked.reference_code = fe.reference_code
              or (booked.user_id is not null and fe.user_id is not null and booked.user_id = fe.user_id)
            )
        );
    elsif v_audience.code = 'CT_waflow_submit_no_quote_90d' then
      insert into tmp_crm_audience_candidates (
        audience_id, audience_code, account_id, contact_id, source_entity_type, source_entity_id,
        source_reason, entered_at, email, phone, metadata
      )
      select
        v_audience.id,
        v_audience.code,
        wl.account_id,
        null::uuid,
        'waflow_lead',
        wl.id::text,
        'waflow_submit_no_quote',
        coalesce(wl.submitted_at, wl.created_at, now()),
        coalesce(wl.payload->>'email', wl.payload->>'traveler_email'),
        coalesce(wl.payload->>'phone', wl.payload->>'traveler_phone', wl.payload->>'whatsapp'),
        jsonb_build_object('waflow_lead_id', wl.id, 'reference_code', wl.reference_code, 'chatwoot_conversation_id', wl.chatwoot_conversation_id)
      from public.waflow_leads wl
      where wl.account_id = p_account_id
        and coalesce(wl.submitted_at, wl.created_at, now()) >= now() - make_interval(days => coalesce(v_audience.window_days, 90))
        and not exists (
          select 1 from public.funnel_events fe
          where fe.account_id = wl.account_id
            and fe.event_name in ('crm_quote_sent', 'quote_sent')
            and (
              (wl.reference_code is not null and fe.reference_code = wl.reference_code)
              or (wl.payload->>'email' is not null and lower(fe.user_email) = lower(wl.payload->>'email'))
              or (wl.payload->>'phone' is not null and regexp_replace(fe.user_phone, '[^0-9]', '', 'g') = regexp_replace(wl.payload->>'phone', '[^0-9]', '', 'g'))
            )
        );
    elsif v_audience.code = 'CT_bad_fit_low_quality_leads' then
      insert into tmp_crm_audience_candidates (
        audience_id, audience_code, account_id, contact_id, source_entity_type, source_entity_id,
        source_reason, entered_at, email, phone, metadata
      )
      select
        v_audience.id,
        v_audience.code,
        fe.account_id,
        fe.user_id,
        'funnel_event',
        fe.event_id,
        'explicit_bad_fit_or_low_quality',
        coalesce(fe.occurred_at, fe.created_at, now()),
        fe.user_email,
        fe.user_phone,
        jsonb_build_object('event_id', fe.event_id, 'reference_code', fe.reference_code, 'event_name', fe.event_name, 'payload', fe.payload)
      from public.funnel_events fe
      where fe.account_id = p_account_id
        and coalesce(fe.occurred_at, fe.created_at, now()) >= now() - make_interval(days => coalesce(v_audience.window_days, 365))
        and (
          lower(coalesce(fe.payload::text, '')) like any (array['%disqualified%', '%descalific%', '%bad fit%', '%low quality%', '%spam%', '%empleo%', '%visa%', '%vuelo%', '%hotel only%', '%hotel-only%'])
          or lower(coalesce(fe.stage, '')) in ('bad_fit', 'low_quality', 'disqualified')
        );
    end if;
  end loop;

  update tmp_crm_audience_candidates c
  set
    email_sha256 = public.crm_audience_hash_identity(c.email),
    phone_sha256 = public.crm_audience_hash_phone(c.phone),
    external_id_sha256 = public.crm_audience_hash_identity(coalesce(c.contact_id::text, c.source_entity_type || ':' || c.source_entity_id))
  where true;

  update tmp_crm_audience_candidates c
  set is_suppressed = true
  where exists (
    select 1 from public.crm_audience_suppressions s
    where s.account_id = c.account_id
      and s.active = true
      and (s.expires_at is null or s.expires_at > now())
      and (s.audience_id is null or s.audience_id = c.audience_id)
      and (
        (s.contact_id is not null and c.contact_id is not null and s.contact_id = c.contact_id)
        or (s.email_sha256 is not null and s.email_sha256 = c.email_sha256)
        or (s.phone_sha256 is not null and s.phone_sha256 = c.phone_sha256)
      )
  );

  if not p_dry_run then
    update public.crm_audience_memberships m
    set is_active = false,
        expires_at = coalesce(m.expires_at, now()),
        last_evaluated_at = now(),
        updated_at = now()
    where m.account_id = p_account_id
      and exists (
        select 1 from public.crm_audience_definitions d
        where d.id = m.audience_id
          and (p_audience_code is null or d.code = p_audience_code)
      )
      and m.is_active = true
      and not exists (
        select 1 from tmp_crm_audience_candidates c
        where c.audience_id = m.audience_id
          and c.source_entity_type = m.source_entity_type
          and c.source_entity_id = m.source_entity_id
          and c.is_suppressed = false
          and (c.email_sha256 is not null or c.phone_sha256 is not null or c.external_id_sha256 is not null)
      );

    insert into public.crm_audience_memberships (
      account_id, audience_id, contact_id, source_entity_type, source_entity_id,
      source_reason, entered_at, is_active, expires_at, last_evaluated_at, metadata
    )
    select
      c.account_id,
      c.audience_id,
      c.contact_id,
      c.source_entity_type,
      c.source_entity_id,
      c.source_reason,
      c.entered_at,
      true,
      null,
      now(),
      c.metadata
    from tmp_crm_audience_candidates c
    where c.is_suppressed = false
      and (c.email_sha256 is not null or c.phone_sha256 is not null or c.external_id_sha256 is not null)
    on conflict (audience_id, source_entity_type, source_entity_id) do update set
      contact_id = excluded.contact_id,
      source_reason = excluded.source_reason,
      entered_at = excluded.entered_at,
      is_active = true,
      expires_at = null,
      last_evaluated_at = now(),
      metadata = excluded.metadata,
      updated_at = now();

    insert into public.crm_audience_member_identities (
      account_id, audience_id, membership_id, contact_id, source_entity_type, source_entity_id,
      email_sha256, phone_sha256, external_id_sha256, consent_status, consent_source, consent_at,
      privacy_policy_version, identity_coverage
    )
    select
      c.account_id,
      c.audience_id,
      m.id,
      c.contact_id,
      c.source_entity_type,
      c.source_entity_id,
      c.email_sha256,
      c.phone_sha256,
      c.external_id_sha256,
      'policy_default_granted',
      'colombiatours_policy_default_v1',
      now(),
      'colombiatours_policy_default_v1',
      jsonb_build_object('email', c.email_sha256 is not null, 'phone', c.phone_sha256 is not null, 'external_id', c.external_id_sha256 is not null)
    from tmp_crm_audience_candidates c
    join public.crm_audience_memberships m
      on m.audience_id = c.audience_id
     and m.source_entity_type = c.source_entity_type
     and m.source_entity_id = c.source_entity_id
    where c.is_suppressed = false
      and (c.email_sha256 is not null or c.phone_sha256 is not null or c.external_id_sha256 is not null)
    on conflict (audience_id, membership_id) do update set
      contact_id = excluded.contact_id,
      source_entity_type = excluded.source_entity_type,
      source_entity_id = excluded.source_entity_id,
      email_sha256 = excluded.email_sha256,
      phone_sha256 = excluded.phone_sha256,
      external_id_sha256 = excluded.external_id_sha256,
      consent_status = excluded.consent_status,
      consent_source = excluded.consent_source,
      consent_at = excluded.consent_at,
      privacy_policy_version = excluded.privacy_policy_version,
      identity_coverage = excluded.identity_coverage,
      updated_at = now();
  end if;

  return query
  with selected_audiences as (
    select d.id, d.code
    from public.crm_audience_definitions d
    where d.account_id = p_account_id
      and d.status = 'active'
      and (p_audience_code is null or d.code = p_audience_code)
  ), candidate_counts as (
    select
      c.audience_id,
      count(*)::integer as total_candidates,
      count(*) filter (where c.is_suppressed = false and (c.email_sha256 is not null or c.phone_sha256 is not null or c.external_id_sha256 is not null))::integer as consent_qualified,
      count(*) filter (where c.email_sha256 is not null)::integer as email_hash_coverage,
      count(*) filter (where c.phone_sha256 is not null)::integer as phone_hash_coverage,
      count(*) filter (where c.is_suppressed = true or (c.email_sha256 is null and c.phone_sha256 is null and c.external_id_sha256 is null))::integer as skips
    from tmp_crm_audience_candidates c
    group by c.audience_id
  ), add_counts as (
    select c.audience_id, count(*)::integer as adds
    from tmp_crm_audience_candidates c
    where c.is_suppressed = false
      and (c.email_sha256 is not null or c.phone_sha256 is not null or c.external_id_sha256 is not null)
      and not exists (
        select 1 from public.crm_audience_memberships m
        where m.audience_id = c.audience_id
          and m.source_entity_type = c.source_entity_type
          and m.source_entity_id = c.source_entity_id
          and m.is_active = true
      )
    group by c.audience_id
  ), remove_counts as (
    select m.audience_id, count(*)::integer as removes
    from public.crm_audience_memberships m
    where m.account_id = p_account_id
      and m.is_active = true
      and exists (select 1 from selected_audiences sa where sa.id = m.audience_id)
      and not exists (
        select 1 from tmp_crm_audience_candidates c
        where c.audience_id = m.audience_id
          and c.source_entity_type = m.source_entity_type
          and c.source_entity_id = m.source_entity_id
          and c.is_suppressed = false
          and (c.email_sha256 is not null or c.phone_sha256 is not null or c.external_id_sha256 is not null)
      )
    group by m.audience_id
  )
  select
    sa.code,
    sa.id,
    coalesce(cc.total_candidates, 0),
    coalesce(cc.consent_qualified, 0),
    coalesce(cc.email_hash_coverage, 0),
    coalesce(cc.phone_hash_coverage, 0),
    coalesce(ac.adds, 0),
    coalesce(rc.removes, 0),
    coalesce(cc.skips, 0),
    p_dry_run
  from selected_audiences sa
  left join candidate_counts cc on cc.audience_id = sa.id
  left join add_counts ac on ac.audience_id = sa.id
  left join remove_counts rc on rc.audience_id = sa.id
  order by sa.code;
end;
$$;

create or replace function public.queue_crm_audience_sync(
  p_account_id uuid,
  p_audience_code text,
  p_destination text,
  p_mode text default 'dry_run',
  p_approval_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_audience_id uuid;
  v_run_id uuid;
  v_token_hash text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'queue_crm_audience_sync requires service_role';
  end if;

  if p_destination not in ('google_ads_customer_match', 'meta_custom_audiences') then
    raise exception 'unsupported CRM audience destination: %', p_destination;
  end if;

  if p_mode not in ('dry_run', 'validate', 'apply', 'reconcile') then
    raise exception 'unsupported CRM audience sync mode: %', p_mode;
  end if;

  if p_mode = 'apply' and (p_approval_token is null or length(p_approval_token) < 16) then
    raise exception 'CRM audience apply requires explicit approval_token';
  end if;

  select id into v_audience_id
  from public.crm_audience_definitions
  where account_id = p_account_id
    and code = p_audience_code
    and status = 'active';

  if v_audience_id is null then
    raise exception 'CRM audience definition not found for account %, code %', p_account_id, p_audience_code;
  end if;

  if p_approval_token is not null then
    v_token_hash := encode(extensions.digest(p_approval_token, 'sha256'), 'hex');
  end if;

  insert into public.crm_audience_sync_runs (
    account_id,
    audience_id,
    destination,
    mode,
    status,
    dry_run,
    approval_token_hash,
    request_summary
  )
  values (
    p_account_id,
    v_audience_id,
    p_destination,
    p_mode,
    'queued',
    p_mode <> 'apply',
    v_token_hash,
    jsonb_build_object('audience_code', p_audience_code, 'destination', p_destination, 'mode', p_mode)
  )
  returning id into v_run_id;

  return v_run_id;
end;
$$;

revoke all on function public.refresh_crm_audience_memberships(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.refresh_crm_audience_memberships(uuid, text, boolean) to service_role;

revoke all on function public.queue_crm_audience_sync(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.queue_crm_audience_sync(uuid, text, text, text, text) to service_role;

comment on table public.crm_audience_definitions is 'Tenant-scoped CRM audience definitions materialized from first-party Supabase data.';
comment on table public.crm_audience_member_identities is 'Service-role-only hashed identity store for Google Customer Match and Meta Customer List uploads. No raw PII.';
comment on function public.refresh_crm_audience_memberships(uuid, text, boolean) is 'Materializes or dry-runs CRM audience memberships from first-party data. service_role only.';
comment on function public.queue_crm_audience_sync(uuid, text, text, text, text) is 'Queues gated CRM audience sync runs. apply mode requires an explicit approval token. service_role only.';
