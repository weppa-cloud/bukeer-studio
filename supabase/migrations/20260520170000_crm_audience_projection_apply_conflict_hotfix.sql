-- Hotfix for apply mode: avoid PL/pgSQL output-column ambiguity in ON CONFLICT targets.
-- The function returns an output column named audience_id, so conflict targets must use named constraints.

-- Hotfix for production safe-update settings: temp table updates must include WHERE.
-- Keeps CRM audience materialization compatible with projects that enforce WHERE clauses on UPDATE.

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
    on conflict on constraint crm_audience_memberships_audience_id_source_entity_type_sou_key do update set
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
    on conflict on constraint crm_audience_member_identities_audience_id_membership_id_key do update set
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


revoke all on function public.refresh_crm_audience_memberships(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.refresh_crm_audience_memberships(uuid, text, boolean) to service_role;

comment on function public.refresh_crm_audience_memberships(uuid, text, boolean) is 'Materializes or dry-runs CRM audience memberships from first-party data. service_role only. Safe-update compatible.';
