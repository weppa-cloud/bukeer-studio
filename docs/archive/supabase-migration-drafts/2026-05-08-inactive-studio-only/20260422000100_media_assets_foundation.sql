-- Media assets foundation (#176)
-- Adds per-tenant media registry + blog featured alt backfill helper.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid references public.websites(id) on delete set null,
  storage_bucket text not null,
  storage_path text not null,
  public_url text not null,
  alt jsonb not null default '{}'::jsonb,
  title jsonb not null default '{}'::jsonb,
  caption jsonb not null default '{}'::jsonb,
  entity_type text,
  entity_id text,
  usage_context text,
  ai_generated boolean not null default false,
  ai_model text,
  http_status integer,
  last_verified_at timestamptz,
  file_size_bytes bigint,
  width_px integer,
  height_px integer,
  format text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_entity_type_check
    check (entity_type is null or entity_type in ('blog_post', 'page', 'package', 'activity', 'brand', 'review', 'gallery_item')),
  constraint media_assets_usage_context_check
    check (usage_context is null or usage_context in ('hero', 'gallery', 'featured', 'og', 'avatar', 'body')),
  constraint media_assets_format_check
    check (format is null or format in ('webp', 'jpeg', 'jpg', 'png', 'gif'))
);

create unique index if not exists media_assets_path_idx
  on public.media_assets(storage_bucket, storage_path);

create index if not exists media_assets_entity_idx
  on public.media_assets(entity_type, entity_id);

create index if not exists media_assets_website_idx
  on public.media_assets(website_id);

create index if not exists media_assets_broken_idx
  on public.media_assets(http_status)
  where http_status is not null and http_status <> 200;

alter table if exists public.website_blog_posts
  add column if not exists featured_alt text;

alter table public.media_assets enable row level security;

do $$
declare
  rec record;
begin
  for rec in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'media_assets'
  loop
    execute format('drop policy if exists %I on public.media_assets', rec.policyname);
  end loop;

  create policy "Users can select media_assets"
    on public.media_assets
    for select
    using (
      exists (
        select 1
        from public.user_roles ur
        where ur.account_id = media_assets.account_id
          and ur.user_id = auth.uid()
          and ur.is_active = true
      )
    );

  create policy "Users can manage media_assets"
    on public.media_assets
    for all
    using (
      exists (
        select 1
        from public.user_roles ur
        where ur.account_id = media_assets.account_id
          and ur.user_id = auth.uid()
          and ur.is_active = true
      )
    )
    with check (
      exists (
        select 1
        from public.user_roles ur
        where ur.account_id = media_assets.account_id
          and ur.user_id = auth.uid()
          and ur.is_active = true
      )
    );
end $$;

create or replace function public.backfill_blog_featured_images_to_media_assets(
  p_website_id uuid default null,
  p_limit integer default 10000
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  with candidates as (
    select
      wbp.website_id,
      w.account_id,
      wbp.id::text as entity_id,
      wbp.slug,
      wbp.featured_image as public_url,
      coalesce(
        substring(wbp.featured_image from '/object/public/([^/]+)/'),
        'external'
      ) as storage_bucket,
      coalesce(
        substring(wbp.featured_image from '/object/public/[^/]+/(.+)$'),
        wbp.featured_image
      ) as storage_path,
      row_number() over (partition by wbp.featured_image order by wbp.updated_at desc nulls last, wbp.created_at desc nulls last) as rn
    from public.website_blog_posts wbp
    join public.websites w on w.id = wbp.website_id
    where wbp.featured_image is not null
      and btrim(wbp.featured_image) <> ''
      and w.account_id is not null
      and (p_website_id is null or wbp.website_id = p_website_id)
  ),
  dedup as (
    select *
    from candidates
    where rn = 1
    limit greatest(coalesce(p_limit, 10000), 0)
  ),
  ins as (
    insert into public.media_assets (
      account_id,
      website_id,
      storage_bucket,
      storage_path,
      public_url,
      entity_type,
      entity_id,
      usage_context,
      http_status,
      created_at,
      updated_at
    )
    select
      d.account_id,
      d.website_id,
      d.storage_bucket,
      d.storage_path,
      d.public_url,
      'blog_post',
      d.entity_id,
      'featured',
      200,
      now(),
      now()
    from dedup d
    on conflict (storage_bucket, storage_path) do update
      set
        account_id = excluded.account_id,
        website_id = coalesce(public.media_assets.website_id, excluded.website_id),
        public_url = excluded.public_url,
        entity_type = coalesce(public.media_assets.entity_type, excluded.entity_type),
        entity_id = coalesce(public.media_assets.entity_id, excluded.entity_id),
        usage_context = coalesce(public.media_assets.usage_context, excluded.usage_context),
        updated_at = now()
    returning 1
  )
  select count(*) into v_inserted from ins;

  return coalesce(v_inserted, 0);
end;
$$;

-- Best-effort initial backfill for existing featured images.
select public.backfill_blog_featured_images_to_media_assets(null, 100000);
