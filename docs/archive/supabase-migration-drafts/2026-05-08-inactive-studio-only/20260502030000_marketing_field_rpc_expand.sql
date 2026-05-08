-- ============================================================================
-- W2 #216 — Option A expansion of update_package_kit_marketing_field RPC.
-- Adds `video_url`, `video_caption`, `description_ai_generated`,
-- `highlights_ai_generated` to the column allowlist so that the two legacy
-- raw-UPDATE actions (`saveVideoUrl`, `toggleAiFlag` in
-- `app/dashboard/[websiteId]/products/[slug]/content/actions.ts`) route through
-- the single-tx RPC that sets `app.edit_surface='studio'` — making the
-- `package_kits_audit_log` trigger stamp `surface='studio'` and
-- `last_edited_by_surface='studio'` on the row.
--
-- Signature preserved (uuid, uuid, text, jsonb, text). Callers that previously
-- passed a column name in the Option-0 allowlist remain unaffected.
--
-- Related: ADR-025 (Studio / Flutter field ownership), #190, #165, #216 AC-W2-6.
-- ============================================================================

create or replace function public.update_package_kit_marketing_field(
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
  -- Validate column name against allowlist to prevent SQL injection via p_column.
  -- W2 #216 extension: add video_url, video_caption, description_ai_generated,
  -- highlights_ai_generated to let saveVideoUrl + toggleAiFlag route through here.
  if p_column not in (
    'description', 'program_highlights', 'program_inclusions',
    'program_exclusions', 'program_notes', 'program_meeting_info',
    'program_gallery', 'cover_image_url',
    -- W2 #216 additions (Option A):
    'video_url', 'video_caption',
    'description_ai_generated', 'highlights_ai_generated'
  ) then
    raise exception 'INVALID_COLUMN: %', p_column;
  end if;

  if p_ai_flag_column is not null
     and p_ai_flag_column not in ('description_ai_generated', 'highlights_ai_generated') then
    raise exception 'INVALID_AI_FLAG_COLUMN: %', p_ai_flag_column;
  end if;

  -- Transaction-scoped surface marker — trigger reads this.
  perform set_config('app.edit_surface', 'studio', true);

  -- Dynamic UPDATE constrained by column allowlist above. The three shape
  -- families are: (a) text columns (description/notes/meeting_info/cover +
  -- video_url/caption), (b) jsonb columns (highlights/inclusions/exclusions/
  -- gallery), (c) boolean columns (ai_generated flags).
  if p_column in ('description', 'program_notes', 'program_meeting_info',
                  'cover_image_url', 'video_url', 'video_caption') then
    if p_ai_flag_column is not null then
      v_sql := format(
        'update public.package_kits set %I = ($1)::text, %I = false, last_edited_by_surface = ''studio'', updated_at = now() where id = $2 and account_id = $3 returning slug',
        p_column, p_ai_flag_column
      );
    else
      v_sql := format(
        'update public.package_kits set %I = ($1)::text, last_edited_by_surface = ''studio'', updated_at = now() where id = $2 and account_id = $3 returning slug',
        p_column
      );
    end if;

    execute v_sql
      into v_slug
      using p_value #>> '{}', p_product_id, p_account_id;
  elsif p_column in ('description_ai_generated', 'highlights_ai_generated') then
    -- Boolean AI flag toggle — value is jsonb true/false; coerce safely.
    v_sql := format(
      'update public.package_kits set %I = ($1)::boolean, last_edited_by_surface = ''studio'', updated_at = now() where id = $2 and account_id = $3 returning slug',
      p_column
    );
    execute v_sql
      into v_slug
      using (p_value #>> '{}')::boolean, p_product_id, p_account_id;
  else
    -- jsonb columns: highlights / inclusions / exclusions / gallery.
    if p_ai_flag_column is not null then
      v_sql := format(
        'update public.package_kits set %I = $1, %I = false, last_edited_by_surface = ''studio'', updated_at = now() where id = $2 and account_id = $3 returning slug',
        p_column, p_ai_flag_column
      );
    else
      v_sql := format(
        'update public.package_kits set %I = $1, last_edited_by_surface = ''studio'', updated_at = now() where id = $2 and account_id = $3 returning slug',
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

grant execute on function public.update_package_kit_marketing_field(uuid, uuid, text, jsonb, text) to authenticated, service_role;

-- Rollback: restore the pre-W2 allowlist by reverting to migration
-- 20260426000300_marketing_field_update_rpc.sql (same signature, narrower
-- allowlist). Downgrade command:
--   create or replace function public.update_package_kit_marketing_field(...)
--     -- body with only the 8 original columns in the allowlist.
