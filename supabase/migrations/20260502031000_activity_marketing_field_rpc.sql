-- ============================================================================
-- W2 #216 v2 — Activities marketing parity (DDL + RPC).
--
-- AC-W2-9, AC-W2-13: brings `activities` to column parity with `package_kits`
-- for Studio marketing editors (description + program_* + gallery + video +
-- AI-flag + social). Legacy typo'd columns (`inclutions`, `exclutions`,
-- `recomendations`, `instructions`) are PRESERVED additively so Flutter can
-- continue reading them while Studio writes to the new parity columns.
-- Public renderer falls back to legacy columns when new columns are NULL (see
-- ADR-025 bridge semantics + audit doc).
--
-- Must run AFTER 20260502030000 (package_kits RPC expansion) so the ordering
-- keeps Studio’s two RPCs side-by-side at DB level.
--
-- Related: ADR-025 (Studio / Flutter field ownership), #204 (activities parity
-- follow-up absorbed by this v2 scope), #190, #216.
-- ============================================================================

-- ─── 1. DDL: additive parity columns on activities ─────────────────────────

alter table public.activities
  add column if not exists program_highlights jsonb not null default '[]'::jsonb,
  add column if not exists program_inclusions jsonb not null default '[]'::jsonb,
  add column if not exists program_exclusions jsonb not null default '[]'::jsonb,
  add column if not exists program_notes text,
  add column if not exists program_meeting_info text,
  add column if not exists program_gallery jsonb not null default '[]'::jsonb,
  add column if not exists video_url text,
  add column if not exists video_caption text,
  add column if not exists description_ai_generated boolean not null default false,
  add column if not exists highlights_ai_generated boolean not null default false,
  add column if not exists cover_image_url text,
  add column if not exists last_ai_hash text;

-- URL shape check on video_url mirrors package_kits_video_url_shape.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activities_video_url_shape' and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_video_url_shape
      check (video_url is null or video_url ~* '^https?://');
  end if;
end $$;

comment on column public.activities.program_highlights is
  'W2 #216 parity — Studio marketing editor writes here. Legacy jsonb, mirrors package_kits.';
comment on column public.activities.program_inclusions is
  'W2 #216 parity — Studio writes here. Legacy Flutter column `inclutions` (typo) stays for back-compat.';
comment on column public.activities.program_exclusions is
  'W2 #216 parity — Studio writes here. Legacy Flutter column `exclutions` (typo) stays for back-compat.';
comment on column public.activities.program_notes is
  'W2 #216 parity — Studio writes here. Legacy Flutter column `recomendations` (typo) stays for back-compat.';
comment on column public.activities.program_meeting_info is
  'W2 #216 parity — Studio writes here. Legacy Flutter column `instructions` stays for back-compat.';
comment on column public.activities.program_gallery is
  'W2 #216 parity — Studio writes here. Jsonb array of `{url, alt?, caption?}`.';
comment on column public.activities.cover_image_url is
  'W2 #216 parity — Studio writes here. Legacy column `main_image` stays for Flutter back-compat.';

-- ─── 2. RPC: update_activity_marketing_field ──────────────────────────────
-- Parallel to update_package_kit_marketing_field. Sets app.edit_surface='studio'
-- in the same tx so fn_audit_activities() (migration 20260430000200) stamps
-- surface='studio' and `last_edited_by_surface='studio'` on the row.

create or replace function public.update_activity_marketing_field(
  p_product_id uuid,
  p_account_id uuid,
  p_column text,
  p_value jsonb,
  p_ai_flag_column text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_sql text;
  v_rowcount int;
begin
  -- Column allowlist mirrors the package_kits RPC plus typo'd legacy columns
  -- so Studio can optionally write to them for Flutter interop (off by default;
  -- only the parity columns are exposed to editors).
  if p_column not in (
    'description', 'program_highlights', 'program_inclusions',
    'program_exclusions', 'program_notes', 'program_meeting_info',
    'program_gallery', 'cover_image_url',
    'video_url', 'video_caption',
    'description_ai_generated', 'highlights_ai_generated',
    -- legacy typo'd columns exposed for optional Studio-side backfill
    -- during transition (Flutter still writes them). Not wired from editors.
    'inclutions', 'exclutions', 'recomendations', 'instructions',
    -- activities-native social field (predates cover_image_url parity column):
    'social_image'
  ) then
    raise exception 'INVALID_COLUMN: %', p_column;
  end if;

  if p_ai_flag_column is not null
     and p_ai_flag_column not in ('description_ai_generated', 'highlights_ai_generated') then
    raise exception 'INVALID_AI_FLAG_COLUMN: %', p_ai_flag_column;
  end if;

  -- Transaction-scoped surface marker — trigger reads this.
  perform set_config('app.edit_surface', 'studio', true);

  if p_column in (
    'description', 'program_notes', 'program_meeting_info',
    'cover_image_url', 'video_url', 'video_caption',
    'recomendations', 'instructions', 'social_image'
  ) then
    if p_ai_flag_column is not null then
      v_sql := format(
        'update public.activities set %I = ($1)::text, %I = false, last_edited_by_surface = ''studio'', updated_at = now() where id = $2 and account_id = $3 returning slug',
        p_column, p_ai_flag_column
      );
    else
      v_sql := format(
        'update public.activities set %I = ($1)::text, last_edited_by_surface = ''studio'', updated_at = now() where id = $2 and account_id = $3 returning slug',
        p_column
      );
    end if;

    execute v_sql
      into v_slug
      using p_value #>> '{}', p_product_id, p_account_id;
  elsif p_column in ('description_ai_generated', 'highlights_ai_generated') then
    v_sql := format(
      'update public.activities set %I = ($1)::boolean, last_edited_by_surface = ''studio'', updated_at = now() where id = $2 and account_id = $3 returning slug',
      p_column
    );
    execute v_sql
      into v_slug
      using (p_value #>> '{}')::boolean, p_product_id, p_account_id;
  elsif p_column in ('inclutions', 'exclutions') then
    -- Typo'd legacy columns are text on Flutter; Studio serializes jsonb arrays
    -- back into newline-delimited text when writing to them (interop-only
    -- path; editors do not use this — kept in allowlist for support tooling).
    v_sql := format(
      'update public.activities set %I = ($1)::text, last_edited_by_surface = ''studio'', updated_at = now() where id = $2 and account_id = $3 returning slug',
      p_column
    );
    execute v_sql
      into v_slug
      using p_value #>> '{}', p_product_id, p_account_id;
  else
    -- jsonb columns: program_highlights / program_inclusions / program_exclusions / program_gallery.
    if p_ai_flag_column is not null then
      v_sql := format(
        'update public.activities set %I = $1, %I = false, last_edited_by_surface = ''studio'', updated_at = now() where id = $2 and account_id = $3 returning slug',
        p_column, p_ai_flag_column
      );
    else
      v_sql := format(
        'update public.activities set %I = $1, last_edited_by_surface = ''studio'', updated_at = now() where id = $2 and account_id = $3 returning slug',
        p_column
      );
    end if;

    execute v_sql
      into v_slug
      using p_value, p_product_id, p_account_id;
  end if;

  get diagnostics v_rowcount = row_count;
  if v_rowcount = 0 then
    raise exception 'NOT_FOUND_OR_CROSS_TENANT: product_id=% account_id=%', p_product_id, p_account_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'slug', v_slug,
    'column', p_column,
    'ai_flag_reset', p_ai_flag_column is not null
  );
end;
$$;

grant execute on function public.update_activity_marketing_field(uuid, uuid, text, jsonb, text) to authenticated, service_role;

comment on function public.update_activity_marketing_field(uuid, uuid, text, jsonb, text) is
  'W2 #216 — Studio marketing field update for activities. Sets app.edit_surface=studio so audit trigger stamps surface. Column allowlist covers parity columns + legacy typo''d columns for interop. RLS: activities row must be accessible via account_id tenancy (enforced by caller + NOT_FOUND raise).';

-- Rollback:
--   drop function if exists public.update_activity_marketing_field(uuid, uuid, text, jsonb, text);
--   alter table public.activities drop constraint if exists activities_video_url_shape;
--   alter table public.activities
--     drop column if exists program_highlights,
--     drop column if exists program_inclusions,
--     drop column if exists program_exclusions,
--     drop column if exists program_notes,
--     drop column if exists program_meeting_info,
--     drop column if exists program_gallery,
--     drop column if exists video_url,
--     drop column if exists video_caption,
--     drop column if exists description_ai_generated,
--     drop column if exists highlights_ai_generated,
--     drop column if exists cover_image_url,
--     drop column if exists last_ai_hash;
--   -- Legacy typo'd columns (`inclutions`, `exclutions`, `recomendations`, `instructions`)
--   -- are NOT touched by this rollback.
