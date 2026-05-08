-- EPIC #198 Wave 2
-- Close Phase 1 (#199) + Phase 2 (#202):
-- - transcreate schema_version 2.1 support
-- - canary flag per website + locale
-- - full body overlay persistence in SEO layer

-- ---------------------------------------------------------------------------
-- 1) Allow schema_version 2.0 and 2.1
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'seo_transcreation_jobs_schema_version_check'
      and conrelid = 'public.seo_transcreation_jobs'::regclass
  ) then
    alter table public.seo_transcreation_jobs
      drop constraint seo_transcreation_jobs_schema_version_check;
  end if;

  alter table public.seo_transcreation_jobs
    add constraint seo_transcreation_jobs_schema_version_check
    check (schema_version is null or schema_version in ('2.0', '2.1'));
end $$;

-- ---------------------------------------------------------------------------
-- 2) Body overlay persistence layer (no truth-table writes)
-- ---------------------------------------------------------------------------

alter table if exists public.seo_localized_variants
  add column if not exists body_overlay_v2 jsonb;

comment on column public.seo_localized_variants.body_overlay_v2 is
  'Full transcreate body overlay payload by locale. SEO-owned projection, never a truth table.';

-- ---------------------------------------------------------------------------
-- 3) Canary feature flag for transcreate v2 full contract
-- ---------------------------------------------------------------------------

create table if not exists public.seo_transcreate_feature_flags (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  enabled boolean not null default false,
  canary_locales text[] not null default '{}'::text[],
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique (website_id)
);

comment on table public.seo_transcreate_feature_flags is
  'Canary toggle for full transcreate v2 contract (schema_version 2.1) by website + locale.';

create index if not exists seo_transcreate_feature_flags_enabled_idx
  on public.seo_transcreate_feature_flags(enabled)
  where enabled = true;

create index if not exists seo_transcreate_feature_flags_locales_gin
  on public.seo_transcreate_feature_flags
  using gin (canary_locales);

alter table public.seo_transcreate_feature_flags enable row level security;

create policy seo_transcreate_feature_flags_read
  on public.seo_transcreate_feature_flags
  for select
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.websites w on w.account_id = ur.account_id
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and w.id = seo_transcreate_feature_flags.website_id
    )
  );

create policy seo_transcreate_feature_flags_write_super_admin
  on public.seo_transcreate_feature_flags
  for all
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and r.role_name = 'super_admin'
    )
  )
  with check (
    exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and r.role_name = 'super_admin'
    )
  );

create or replace function public.resolve_transcreate_v2_flag(
  p_website_id uuid,
  p_target_locale text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flag record;
  v_locales text[];
  v_enabled boolean := false;
begin
  select enabled, canary_locales
    into v_flag
    from public.seo_transcreate_feature_flags
   where website_id = p_website_id
   limit 1;

  if not found then
    return jsonb_build_object(
      'enabled', false,
      'locales', '[]'::jsonb,
      'scope', 'default'
    );
  end if;

  v_locales := coalesce(v_flag.canary_locales, '{}'::text[]);

  if v_flag.enabled then
    if coalesce(array_length(v_locales, 1), 0) = 0 then
      v_enabled := true;
    else
      v_enabled := p_target_locale = any(v_locales);
    end if;
  end if;

  return jsonb_build_object(
    'enabled', v_enabled,
    'locales', to_jsonb(v_locales),
    'scope', 'website'
  );
end;
$$;

grant execute on function public.resolve_transcreate_v2_flag(uuid, text)
  to authenticated, service_role;
