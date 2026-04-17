-- EPIC #128 / Issue #129
-- Multi-locale columns + translation grouping in truth tables

alter table if exists public.website_blog_posts
  add column if not exists locale text not null default 'es-CO',
  add column if not exists translation_group_id uuid;

alter table if exists public.website_pages
  add column if not exists locale text not null default 'es-CO',
  add column if not exists translation_group_id uuid;

alter table if exists public.destinations
  add column if not exists locale text not null default 'es-CO',
  add column if not exists translation_group_id uuid;

alter table if exists public.website_product_pages
  add column if not exists locale text not null default 'es-CO';

alter table if exists public.websites
  add column if not exists default_locale text not null default 'es-CO',
  add column if not exists supported_locales text[] not null default array['es-CO']::text[];

update public.website_blog_posts
set translation_group_id = id
where translation_group_id is null;

update public.website_pages
set translation_group_id = id
where translation_group_id is null;

update public.destinations
set translation_group_id = id
where translation_group_id is null;

alter table if exists public.website_blog_posts
  alter column translation_group_id set not null;

alter table if exists public.website_pages
  alter column translation_group_id set not null;

alter table if exists public.destinations
  alter column translation_group_id set not null;

create index if not exists idx_website_blog_posts_translation_group
  on public.website_blog_posts(website_id, translation_group_id, locale);

create index if not exists idx_website_pages_translation_group
  on public.website_pages(website_id, translation_group_id, locale);

create index if not exists idx_destinations_translation_group
  on public.destinations(account_id, translation_group_id, locale);

-- Slug uniqueness moves from mono-locale to locale-aware
create unique index if not exists uq_website_blog_posts_slug_locale
  on public.website_blog_posts(website_id, locale, slug);

create unique index if not exists uq_website_pages_slug_locale
  on public.website_pages(website_id, locale, slug);

create unique index if not exists uq_destinations_slug_locale
  on public.destinations(account_id, locale, slug)
  where deleted_at is null;

create unique index if not exists uq_website_product_pages_locale_product
  on public.website_product_pages(website_id, locale, product_type, product_id);

