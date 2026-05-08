-- Geocoding cache for activity + package circuit maps.
-- Canonical source of truth; CF caches.default is the hot layer (volatile per-colo).

create table if not exists public.places_cache (
  normalized_name text primary key,
  lat double precision not null check (lat >= -90 and lat <= 90),
  lng double precision not null check (lng >= -180 and lng <= 180),
  source text not null check (source in ('static','maptiler','manual')),
  country_code text check (country_code is null or char_length(country_code) = 2),
  updated_at timestamptz not null default now()
);

create index if not exists places_cache_country_idx on public.places_cache(country_code);

alter table public.places_cache enable row level security;

-- Public SELECT (coords are not sensitive; geocoding is a public utility).
create policy "places_cache_select_public" on public.places_cache
  for select
  using (true);

-- Writes restricted to service_role only (server-side geocoder path).
create policy "places_cache_insert_service" on public.places_cache
  for insert
  to service_role
  with check (true);

create policy "places_cache_update_service" on public.places_cache
  for update
  to service_role
  using (true)
  with check (true);

comment on table public.places_cache is 'Geocoding cache (toponym -> lat/lng). Populated by server-side geocoder. Hot layer is CF caches.default.';
