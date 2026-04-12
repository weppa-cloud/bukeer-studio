create table destination_seo_overrides (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  destination_slug text not null,
  custom_seo_title text,
  custom_seo_description text,
  custom_description text,
  target_keyword text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(website_id, destination_slug)
);

alter table destination_seo_overrides enable row level security;
create policy "Users can manage their website destination overrides"
  on destination_seo_overrides
  using (website_id in (select id from websites where account_id = auth.uid()))
  with check (website_id in (select id from websites where account_id = auth.uid()));

-- Add target_keyword to existing tables
ALTER TABLE product_page_customizations ADD COLUMN IF NOT EXISTS target_keyword text;
ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS target_keyword text;
