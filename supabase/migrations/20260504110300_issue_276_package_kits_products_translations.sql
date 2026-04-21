-- Issue #276
-- Add locale overlay translation columns for package_kits/products names and copy.

alter table if exists public.package_kits
  add column if not exists translations jsonb not null default '{}'::jsonb;

comment on column public.package_kits.translations is
  'Locale overlay map, e.g. {"en-US":{"name":"Cartagena 5-Day Package","description_short":"..."}}';

alter table if exists public.products
  add column if not exists translations jsonb not null default '{}'::jsonb;

comment on column public.products.translations is
  'Locale overlay map for product fields, e.g. {"en-US":{"name":"Coffee Tour","description":"..."}}';
