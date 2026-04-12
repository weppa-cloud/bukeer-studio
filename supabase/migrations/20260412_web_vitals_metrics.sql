create table if not exists web_vitals_metrics (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references websites(id),
  metric_name text not null,
  value float not null,
  rating text not null,
  path text,
  created_at timestamptz default now()
);

create index if not exists idx_vitals_website_time on web_vitals_metrics(website_id, created_at desc);
