-- ============================================================================
-- RFC #194 R7 A1 — Marketing field UPDATE RPC
-- Single-transaction helper ensuring trigger sees app.edit_surface='studio'.
-- Server action calls this instead of raw UPDATE — atomicity guaranteed.
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
  -- Validate column name against allowlist to prevent SQL injection via p_column
  if p_column not in (
    'description', 'program_highlights', 'program_inclusions',
    'program_exclusions', 'program_notes', 'program_meeting_info',
    'program_gallery', 'cover_image_url'
  ) then
    raise exception 'INVALID_COLUMN: %', p_column;
  end if;

  if p_ai_flag_column is not null
     and p_ai_flag_column not in ('description_ai_generated', 'highlights_ai_generated') then
    raise exception 'INVALID_AI_FLAG_COLUMN: %', p_ai_flag_column;
  end if;

  -- Transaction-scoped surface marker — trigger reads this
  perform set_config('app.edit_surface', 'studio', true);

  -- Dynamic UPDATE constrained by column allowlist above.
  -- description, notes, meeting_info are text (jsonb->>'value');
  -- others (highlights, inclusions, exclusions, gallery) are jsonb.
  if p_column in ('description', 'program_notes', 'program_meeting_info', 'cover_image_url') then
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
  else
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

-- Rollback: drop function if exists public.update_package_kit_marketing_field(uuid, uuid, text, jsonb, text);
