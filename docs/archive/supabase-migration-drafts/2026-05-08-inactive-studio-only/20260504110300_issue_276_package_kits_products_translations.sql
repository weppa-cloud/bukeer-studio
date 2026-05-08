-- Issue #276 (revised)
-- Add locale overlay translation columns. No public.products table — real entities are
-- package_kits, activities, hotels. Overlay model: website_product_pages handles SEO;
-- these columns carry display-layer name/description translations.

alter table if exists public.package_kits
  add column if not exists translations jsonb not null default '{}'::jsonb;

comment on column public.package_kits.translations is
  'Locale overlay map, e.g. {"en-US":{"name":"Cartagena 5-Day Package","description_short":"..."}}';

alter table if exists public.activities
  add column if not exists translations jsonb not null default '{}'::jsonb;

comment on column public.activities.translations is
  'Locale overlay map, e.g. {"en-US":{"name":"Guatapé Tour","description":"..."}}';
