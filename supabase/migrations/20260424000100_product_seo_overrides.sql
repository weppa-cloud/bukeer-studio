-- product_seo_overrides: per-locale SEO overlay for products (packages, hotels, activities, transfers).
-- Source of truth product fields (name, price, amenities) stay in Flutter-owned tables.
-- This table holds only SEO-layer overrides consumed by Studio SSR.

create table if not exists public.product_seo_overrides (
  id             uuid         primary key default gen_random_uuid(),
  website_id     uuid         not null references public.websites(id) on delete cascade,
  product_type   text         not null check (product_type in ('package_kit', 'hotel', 'activity', 'transfer')),
  product_id     uuid         not null,
  locale         text         not null,
  meta_title     text         check (char_length(meta_title) <= 70),
  meta_desc      text         check (char_length(meta_desc) <= 160),
  slug           text         check (slug ~ '^[a-z0-9-]+$'),
  h1             text         check (char_length(h1) <= 100),
  keywords       text[]       default '{}',
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now(),
  constraint product_seo_overrides_unique unique (website_id, product_type, product_id, locale)
);

create index if not exists idx_product_seo_overrides_lookup
  on public.product_seo_overrides(website_id, product_type, product_id, locale);

alter table if exists public.product_seo_overrides enable row level security;

create policy "Users can read overrides for their websites"
  on public.product_seo_overrides
  for select
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = product_seo_overrides.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can manage overrides for their websites"
  on public.product_seo_overrides
  for all
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = product_seo_overrides.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = product_seo_overrides.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );
