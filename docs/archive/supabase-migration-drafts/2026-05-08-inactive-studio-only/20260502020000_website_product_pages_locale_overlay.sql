-- Issue #202
-- Ensure product SEO overlays are locale-aware for transcreate v2/v2.1 apply.

alter table if exists public.website_product_pages
  add column if not exists locale text not null default 'es-CO',
  add column if not exists translation_group_id uuid;

update public.website_product_pages
set translation_group_id = id
where translation_group_id is null;

alter table if exists public.website_product_pages
  alter column translation_group_id set not null;

create index if not exists idx_website_product_pages_translation_group
  on public.website_product_pages(website_id, translation_group_id, locale);

-- Drop mono-locale unique constraints/indexes so we can persist one overlay
-- row per locale and product.
do $$
declare
  rec record;
begin
  for rec in
    select conname
    from pg_constraint
    where conrelid = 'public.website_product_pages'::regclass
      and contype = 'u'
      and conkey = array[
        (select attnum from pg_attribute where attrelid='public.website_product_pages'::regclass and attname='website_id'),
        (select attnum from pg_attribute where attrelid='public.website_product_pages'::regclass and attname='product_type'),
        (select attnum from pg_attribute where attrelid='public.website_product_pages'::regclass and attname='product_id')
      ]::smallint[]
  loop
    execute format('alter table public.website_product_pages drop constraint if exists %I', rec.conname);
  end loop;
end $$;

drop index if exists public.website_product_pages_website_id_product_type_product_id_key;

create unique index if not exists uq_website_product_pages_locale_product
  on public.website_product_pages(website_id, locale, product_type, product_id);
