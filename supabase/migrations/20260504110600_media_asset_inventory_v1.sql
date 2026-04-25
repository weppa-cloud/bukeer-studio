-- Media Asset Inventory v1
-- Canonicalizes legacy media references into public.media_assets without
-- mutating legacy product/page/content fields.

-- Expand the media registry to cover the inventory surfaces that predate the
-- original blog/package/activity-only foundation.
alter table public.media_assets
  drop constraint if exists media_assets_entity_type_check;

alter table public.media_assets
  add constraint media_assets_entity_type_check
  check (
    entity_type is null or entity_type in (
      'blog_post',
      'page',
      'package',
      'activity',
      'hotel',
      'transfer',
      'destination',
      'website',
      'section',
      'brand',
      'review',
      'gallery_item'
    )
  );

create or replace function public.media_asset_table_has_column(
  p_table_name text,
  p_column_name text
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table_name
      and column_name = p_column_name
  );
$$;

create or replace function public.media_asset_storage_location(
  p_public_url text
)
returns table (
  storage_bucket text,
  storage_path text,
  public_url text,
  host text,
  is_external boolean,
  is_supabase_storage boolean
)
language plpgsql
immutable
set search_path = public
as $$
declare
  v_url text := btrim(coalesce(p_public_url, ''));
  v_marker text;
  v_suffix text;
  v_bucket text;
  v_path text;
begin
  if v_url = '' then
    return;
  end if;

  host := lower(substring(v_url from '^https?://([^/?#]+)'));
  public_url := v_url;

  if position('/storage/v1/object/public/' in v_url) > 0 then
    v_marker := '/storage/v1/object/public/';
  elsif position('/storage/v1/render/image/public/' in v_url) > 0 then
    v_marker := '/storage/v1/render/image/public/';
  else
    v_marker := null;
  end if;

  if v_marker is not null then
    v_suffix := split_part(v_url, v_marker, 2);
    v_suffix := split_part(v_suffix, '?', 1);
    v_suffix := split_part(v_suffix, '#', 1);
    v_bucket := split_part(v_suffix, '/', 1);
    v_path := substring(v_suffix from length(v_bucket) + 2);

    if coalesce(v_bucket, '') <> '' and coalesce(v_path, '') <> '' then
      storage_bucket := v_bucket;
      storage_path := v_path;
      is_external := false;
      is_supabase_storage := true;
      return next;
      return;
    end if;
  end if;

  storage_bucket := 'external';
  storage_path := 'url/' || md5(v_url);
  is_external := true;
  is_supabase_storage := false;
  return next;
end;
$$;

create or replace function public.media_asset_jsonb_urls(
  p_value jsonb
)
returns table (url text)
language sql
immutable
set search_path = public
as $$
  with recursive walk(value) as (
    select p_value
    where p_value is not null

    union all

    select child.value
    from walk w
    cross join lateral (
      select elem.value
      from jsonb_array_elements(
        case when jsonb_typeof(w.value) = 'array' then w.value else '[]'::jsonb end
      ) as elem(value)

      union all

      select kv.value
      from jsonb_each(
        case when jsonb_typeof(w.value) = 'object' then w.value else '{}'::jsonb end
      ) as kv(key, value)
    ) child
  )
  select distinct btrim(value #>> '{}') as url
  from walk
  where jsonb_typeof(value) = 'string'
    and btrim(value #>> '{}') ~* '^(https?://|/storage/v1/(object|render/image)/public/)'
    and btrim(value #>> '{}') !~* '^(mailto:|tel:|javascript:)'
    and (
      btrim(value #>> '{}') ~* '\.(avif|gif|jpe?g|jfif|png|webp|svg)(\?|#|$)'
      or btrim(value #>> '{}') ~* '/storage/v1/(object|render/image)/public/'
      or btrim(value #>> '{}') ~* '(images\.unsplash\.com|googleusercontent\.com|cloudinary\.com|supabase\.co)'
    );
$$;

create or replace function public.register_media_asset_reference(
  p_account_id uuid,
  p_public_url text,
  p_website_id uuid default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_usage_context text default null,
  p_alt jsonb default '{}'::jsonb,
  p_title jsonb default '{}'::jsonb,
  p_caption jsonb default '{}'::jsonb,
  p_http_status integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location record;
  v_asset_id uuid;
  v_format text;
  v_path_no_query text;
  v_allowed_entity_types constant text[] := array[
    'blog_post',
    'page',
    'package',
    'activity',
    'hotel',
    'transfer',
    'destination',
    'website',
    'section',
    'brand',
    'review',
    'gallery_item'
  ];
  v_allowed_usage_contexts constant text[] := array[
    'hero',
    'gallery',
    'featured',
    'og',
    'avatar',
    'body'
  ];
begin
  if p_account_id is null then
    raise exception 'account_id is required';
  end if;

  select *
  into v_location
  from public.media_asset_storage_location(p_public_url)
  limit 1;

  if v_location.storage_bucket is null then
    raise exception 'public_url is required';
  end if;

  if p_entity_type is not null and not (p_entity_type = any(v_allowed_entity_types)) then
    raise exception 'Unsupported media entity_type: %', p_entity_type;
  end if;

  if p_usage_context is not null and not (p_usage_context = any(v_allowed_usage_contexts)) then
    raise exception 'Unsupported media usage_context: %', p_usage_context;
  end if;

  v_path_no_query := lower(split_part(v_location.storage_path, '?', 1));
  v_format := case
    when v_path_no_query ~ '\.webp$' then 'webp'
    when v_path_no_query ~ '\.jpe?g$' then 'jpeg'
    when v_path_no_query ~ '\.jfif$' then 'jpg'
    when v_path_no_query ~ '\.png$' then 'png'
    when v_path_no_query ~ '\.gif$' then 'gif'
    else null
  end;

  insert into public.media_assets (
    account_id,
    website_id,
    storage_bucket,
    storage_path,
    public_url,
    alt,
    title,
    caption,
    entity_type,
    entity_id,
    usage_context,
    http_status,
    last_verified_at,
    format,
    created_at,
    updated_at
  )
  values (
    p_account_id,
    p_website_id,
    v_location.storage_bucket,
    v_location.storage_path,
    v_location.public_url,
    coalesce(p_alt, '{}'::jsonb),
    coalesce(p_title, '{}'::jsonb),
    coalesce(p_caption, '{}'::jsonb),
    p_entity_type,
    p_entity_id,
    p_usage_context,
    p_http_status,
    case when p_http_status is not null then now() else null end,
    v_format,
    now(),
    now()
  )
  on conflict (storage_bucket, storage_path) do update
    set
      account_id = excluded.account_id,
      website_id = coalesce(public.media_assets.website_id, excluded.website_id),
      public_url = excluded.public_url,
      alt = case
        when public.media_assets.alt = '{}'::jsonb then excluded.alt
        else public.media_assets.alt
      end,
      title = case
        when public.media_assets.title = '{}'::jsonb then excluded.title
        else public.media_assets.title
      end,
      caption = case
        when public.media_assets.caption = '{}'::jsonb then excluded.caption
        else public.media_assets.caption
      end,
      entity_type = coalesce(public.media_assets.entity_type, excluded.entity_type),
      entity_id = coalesce(public.media_assets.entity_id, excluded.entity_id),
      usage_context = coalesce(public.media_assets.usage_context, excluded.usage_context),
      http_status = coalesce(excluded.http_status, public.media_assets.http_status),
      last_verified_at = case
        when excluded.http_status is not null then now()
        else public.media_assets.last_verified_at
      end,
      format = coalesce(public.media_assets.format, excluded.format),
      updated_at = now()
  returning id into v_asset_id;

  return v_asset_id;
end;
$$;

create or replace function public.backfill_media_assets_from_legacy_references(
  p_account_id uuid default null,
  p_limit integer default 10000,
  p_dry_run boolean default true
)
returns table (metric text, total bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(coalesce(p_limit, 10000), 0);
  v_row record;
  v_registered bigint := 0;
begin
  create temp table if not exists _media_asset_candidates (
    account_id uuid not null,
    website_id uuid,
    public_url text not null,
    entity_type text,
    entity_id text,
    usage_context text,
    source_table text not null,
    source_field text not null
  ) on commit drop;

  truncate table _media_asset_candidates;

  if to_regclass('public.website_blog_posts') is not null
     and to_regclass('public.websites') is not null
     and public.media_asset_table_has_column('website_blog_posts', 'featured_image') then
    execute $sql$
      insert into _media_asset_candidates
        (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
      select w.account_id, bp.website_id, btrim(bp.featured_image), 'blog_post', bp.id::text, 'featured',
             'website_blog_posts', 'featured_image'
      from public.website_blog_posts bp
      join public.websites w on w.id = bp.website_id
      where w.account_id is not null
        and ($1 is null or w.account_id = $1)
        and coalesce(btrim(bp.featured_image), '') <> ''
    $sql$ using p_account_id;
  end if;

  if to_regclass('public.websites') is not null
     and public.media_asset_table_has_column('websites', 'content') then
    execute $sql$
      insert into _media_asset_candidates
        (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
      select w.account_id, w.id, u.url, 'website', w.id::text, 'body',
             'websites', 'content'
      from public.websites w
      cross join lateral public.media_asset_jsonb_urls(to_jsonb(w.content)) u
      where w.account_id is not null
        and ($1 is null or w.account_id = $1)
    $sql$ using p_account_id;
  end if;

  if to_regclass('public.website_sections') is not null
     and to_regclass('public.websites') is not null
     and public.media_asset_table_has_column('website_sections', 'content') then
    execute $sql$
      insert into _media_asset_candidates
        (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
      select w.account_id, ws.website_id, u.url, 'section', ws.id::text, 'body',
             'website_sections', 'content'
      from public.website_sections ws
      join public.websites w on w.id = ws.website_id
      cross join lateral public.media_asset_jsonb_urls(to_jsonb(ws.content)) u
      where w.account_id is not null
        and ($1 is null or w.account_id = $1)
    $sql$ using p_account_id;
  end if;

  if to_regclass('public.package_kits') is not null then
    if public.media_asset_table_has_column('package_kits', 'cover_image_url') then
      execute $sql$
        insert into _media_asset_candidates
          (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
        select pk.account_id, null::uuid, btrim(pk.cover_image_url), 'package', pk.id::text, 'featured',
               'package_kits', 'cover_image_url'
        from public.package_kits pk
        where pk.account_id is not null
          and ($1 is null or pk.account_id = $1)
          and coalesce(btrim(pk.cover_image_url), '') <> ''
      $sql$ using p_account_id;
    end if;

    if public.media_asset_table_has_column('package_kits', 'program_gallery') then
      execute $sql$
        insert into _media_asset_candidates
          (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
        select pk.account_id, null::uuid, u.url, 'package', pk.id::text, 'gallery',
               'package_kits', 'program_gallery'
        from public.package_kits pk
        cross join lateral public.media_asset_jsonb_urls(to_jsonb(pk.program_gallery)) u
        where pk.account_id is not null
          and ($1 is null or pk.account_id = $1)
      $sql$ using p_account_id;
    end if;
  end if;

  if to_regclass('public.activities') is not null then
    if public.media_asset_table_has_column('activities', 'main_image') then
      execute $sql$
        insert into _media_asset_candidates
          (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
        select a.account_id, null::uuid, btrim(a.main_image), 'activity', a.id::text, 'featured',
               'activities', 'main_image'
        from public.activities a
        where a.account_id is not null
          and ($1 is null or a.account_id = $1)
          and coalesce(btrim(a.main_image), '') <> ''
      $sql$ using p_account_id;
    end if;

    if public.media_asset_table_has_column('activities', 'social_image') then
      execute $sql$
        insert into _media_asset_candidates
          (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
        select a.account_id, null::uuid, btrim(a.social_image), 'activity', a.id::text, 'og',
               'activities', 'social_image'
        from public.activities a
        where a.account_id is not null
          and ($1 is null or a.account_id = $1)
          and coalesce(btrim(a.social_image), '') <> ''
      $sql$ using p_account_id;
    end if;

    if public.media_asset_table_has_column('activities', 'cover_image_url') then
      execute $sql$
        insert into _media_asset_candidates
          (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
        select a.account_id, null::uuid, btrim(a.cover_image_url), 'activity', a.id::text, 'featured',
               'activities', 'cover_image_url'
        from public.activities a
        where a.account_id is not null
          and ($1 is null or a.account_id = $1)
          and coalesce(btrim(a.cover_image_url), '') <> ''
      $sql$ using p_account_id;
    end if;

    if public.media_asset_table_has_column('activities', 'program_gallery') then
      execute $sql$
        insert into _media_asset_candidates
          (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
        select a.account_id, null::uuid, u.url, 'activity', a.id::text, 'gallery',
               'activities', 'program_gallery'
        from public.activities a
        cross join lateral public.media_asset_jsonb_urls(to_jsonb(a.program_gallery)) u
        where a.account_id is not null
          and ($1 is null or a.account_id = $1)
      $sql$ using p_account_id;
    end if;
  end if;

  if to_regclass('public.hotels') is not null and public.media_asset_table_has_column('hotels', 'main_image') then
    execute $sql$
      insert into _media_asset_candidates
        (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
      select h.account_id, null::uuid, btrim(h.main_image), 'hotel', h.id::text, 'featured',
             'hotels', 'main_image'
      from public.hotels h
      where h.account_id is not null
        and ($1 is null or h.account_id = $1)
        and coalesce(btrim(h.main_image), '') <> ''
    $sql$ using p_account_id;
  end if;

  if to_regclass('public.transfers') is not null and public.media_asset_table_has_column('transfers', 'main_image') then
    execute $sql$
      insert into _media_asset_candidates
        (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
      select t.account_id, null::uuid, btrim(t.main_image), 'transfer', t.id::text, 'featured',
             'transfers', 'main_image'
      from public.transfers t
      where t.account_id is not null
        and ($1 is null or t.account_id = $1)
        and coalesce(btrim(t.main_image), '') <> ''
    $sql$ using p_account_id;
  end if;

  if to_regclass('public.destinations') is not null
     and public.media_asset_table_has_column('destinations', 'account_id') then
    if public.media_asset_table_has_column('destinations', 'image') then
      execute $sql$
        insert into _media_asset_candidates
          (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
        select d.account_id, null::uuid, btrim(d.image), 'destination', d.id::text, 'featured',
               'destinations', 'image'
        from public.destinations d
        where d.account_id is not null
          and ($1 is null or d.account_id = $1)
          and coalesce(btrim(d.image), '') <> ''
      $sql$ using p_account_id;
    end if;

    if public.media_asset_table_has_column('destinations', 'images') then
      execute $sql$
        insert into _media_asset_candidates
          (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
        select d.account_id, null::uuid, u.url, 'destination', d.id::text, 'gallery',
               'destinations', 'images'
        from public.destinations d
        cross join lateral public.media_asset_jsonb_urls(to_jsonb(d.images)) u
        where d.account_id is not null
          and ($1 is null or d.account_id = $1)
      $sql$ using p_account_id;
    end if;
  end if;

  if to_regclass('public.images') is not null
     and public.media_asset_table_has_column('images', 'url')
     and public.media_asset_table_has_column('images', 'entity_id') then
    if public.media_asset_table_has_column('images', 'account_id') then
      execute $sql$
        insert into _media_asset_candidates
          (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
        select coalesce(i.account_id, pk.account_id, a.account_id, h.account_id, t.account_id),
               null::uuid,
               btrim(i.url),
               'gallery_item',
               i.entity_id::text,
               'gallery',
               'images',
               'url'
        from public.images i
        left join public.package_kits pk on pk.id::text = i.entity_id::text
        left join public.activities a on a.id::text = i.entity_id::text
        left join public.hotels h on h.id::text = i.entity_id::text
        left join public.transfers t on t.id::text = i.entity_id::text
        where coalesce(i.account_id, pk.account_id, a.account_id, h.account_id, t.account_id) is not null
          and ($1 is null or coalesce(i.account_id, pk.account_id, a.account_id, h.account_id, t.account_id) = $1)
          and coalesce(btrim(i.url), '') <> ''
      $sql$ using p_account_id;
    else
      execute $sql$
      insert into _media_asset_candidates
        (account_id, website_id, public_url, entity_type, entity_id, usage_context, source_table, source_field)
      select coalesce(pk.account_id, a.account_id, h.account_id, t.account_id),
             null::uuid,
             btrim(i.url),
             'gallery_item',
             i.entity_id::text,
             'gallery',
             'images',
             'url'
      from public.images i
      left join public.package_kits pk on pk.id::text = i.entity_id::text
      left join public.activities a on a.id::text = i.entity_id::text
      left join public.hotels h on h.id::text = i.entity_id::text
      left join public.transfers t on t.id::text = i.entity_id::text
      where coalesce(pk.account_id, a.account_id, h.account_id, t.account_id) is not null
        and ($1 is null or coalesce(pk.account_id, a.account_id, h.account_id, t.account_id) = $1)
        and coalesce(btrim(i.url), '') <> ''
      $sql$ using p_account_id;
    end if;
  end if;

  delete from _media_asset_candidates
  where coalesce(btrim(public_url), '') = '';

  return query
  select 'candidate_references', count(*)::bigint
  from _media_asset_candidates;

  return query
  select 'candidate_unique_locations', count(*)::bigint
  from (
    select distinct loc.storage_bucket, loc.storage_path
    from _media_asset_candidates c
    cross join lateral public.media_asset_storage_location(c.public_url) loc
  ) unique_locations;

  return query
  select 'candidate_already_registered', count(*)::bigint
  from (
    select distinct loc.storage_bucket, loc.storage_path
    from _media_asset_candidates c
    cross join lateral public.media_asset_storage_location(c.public_url) loc
    join public.media_assets ma
      on ma.storage_bucket = loc.storage_bucket
     and ma.storage_path = loc.storage_path
  ) registered_locations;

  if p_dry_run then
    return query select 'registered_or_updated', 0::bigint;
    return;
  end if;

  for v_row in
    select distinct on (loc.storage_bucket, loc.storage_path)
      c.account_id,
      c.website_id,
      c.public_url,
      c.entity_type,
      c.entity_id,
      c.usage_context
    from _media_asset_candidates c
    cross join lateral public.media_asset_storage_location(c.public_url) loc
    order by loc.storage_bucket, loc.storage_path, c.website_id nulls last, c.source_table
    limit v_limit
  loop
    perform public.register_media_asset_reference(
      p_account_id := v_row.account_id,
      p_public_url := v_row.public_url,
      p_website_id := v_row.website_id,
      p_entity_type := v_row.entity_type,
      p_entity_id := v_row.entity_id,
      p_usage_context := v_row.usage_context
    );
    v_registered := v_registered + 1;
  end loop;

  return query select 'registered_or_updated', v_registered;
end;
$$;

create or replace view public.media_asset_inventory_report
with (security_invoker = true)
as
with url_counts as (
  select public_url, count(*) as rows_for_url
  from public.media_assets
  group by public_url
),
classified as (
  select
    ma.*,
    loc.host,
    loc.is_external,
    loc.is_supabase_storage,
    uc.rows_for_url
  from public.media_assets ma
  cross join lateral public.media_asset_storage_location(ma.public_url) loc
  left join url_counts uc on uc.public_url = ma.public_url
)
select
  storage_bucket,
  coalesce(entity_type, 'unowned') as entity_type,
  coalesce(usage_context, 'unknown') as usage_context,
  count(*)::bigint as total_assets,
  count(*) filter (where is_external)::bigint as external_assets,
  count(*) filter (where is_supabase_storage)::bigint as supabase_assets,
  count(*) filter (where http_status is not null and http_status <> 200)::bigint as broken_assets,
  count(*) filter (where entity_type is null or entity_id is null)::bigint as unowned_assets,
  count(*) filter (where coalesce(alt, '{}'::jsonb) = '{}'::jsonb)::bigint as missing_alt_assets,
  count(*) filter (where rows_for_url > 1)::bigint as duplicate_url_assets,
  count(*) filter (where file_size_bytes is not null and file_size_bytes > 1048576)::bigint as heavy_assets,
  count(*) filter (where format is not null and format <> 'webp')::bigint as non_webp_assets,
  max(updated_at) as last_updated_at
from classified
group by storage_bucket, coalesce(entity_type, 'unowned'), coalesce(usage_context, 'unknown');

comment on function public.media_asset_storage_location(text) is
  'Normalizes a media URL into storage_bucket/storage_path/public_url/host flags. Supabase object and render URLs resolve to their bucket/path; external URLs use external/url/{md5}.';

comment on function public.register_media_asset_reference(uuid, text, uuid, text, text, text, jsonb, jsonb, jsonb, integer) is
  'Idempotently registers one legacy media URL in media_assets using (storage_bucket, storage_path) as the canonical key.';

comment on function public.backfill_media_assets_from_legacy_references(uuid, integer, boolean) is
  'Discovers media URLs in legacy Bukeer business tables and optionally upserts them into media_assets. dry_run=true returns counts only.';

comment on view public.media_asset_inventory_report is
  'Grouped operational report for media_assets inventory: external, broken, unowned, missing alt, duplicate, heavy and non-WebP counts.';

revoke all on function public.media_asset_storage_location(text) from public;
revoke all on function public.media_asset_jsonb_urls(jsonb) from public;
revoke all on function public.register_media_asset_reference(uuid, text, uuid, text, text, text, jsonb, jsonb, jsonb, integer) from public;
revoke all on function public.backfill_media_assets_from_legacy_references(uuid, integer, boolean) from public;
revoke all on function public.media_asset_table_has_column(text, text) from public;

grant execute on function public.media_asset_storage_location(text) to authenticated, service_role;
grant execute on function public.media_asset_jsonb_urls(jsonb) to service_role;
grant execute on function public.register_media_asset_reference(uuid, text, uuid, text, text, text, jsonb, jsonb, jsonb, integer) to service_role;
grant execute on function public.backfill_media_assets_from_legacy_references(uuid, integer, boolean) to service_role;
grant execute on function public.media_asset_table_has_column(text, text) to service_role;
grant select on public.media_asset_inventory_report to authenticated, service_role;
