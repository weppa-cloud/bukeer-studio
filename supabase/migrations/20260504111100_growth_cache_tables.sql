-- ============================================================================
-- Growth cache + inventory tables — A1 W2 backing schema (#310 / SPEC #337)
-- ============================================================================
-- Purpose:
--   Persists the cache layer used by the Growth A1 client wrappers
--   (lib/growth/{gsc,ga4,dataforseo}-client.ts) and the durable inventory
--   table read by app/api/growth/inventory/route.ts. Without these tables
--   every client falls back to typed mock and the dashboard renders empty.
--
-- Cache governance (ADR-016):
--   - Each cache row carries a `cache_tag` matching the runtime tag
--     (`growth:gsc:website:<id>:locale:<locale>`, etc) so Cloudflare Worker
--     `cache-tag` purges and Supabase row deletes can be coordinated.
--   - TTL is enforced in client code (24h GSC, 6h GA4, 7d DFS); the schema
--     stores `expires_at` so the cron purge job can drop stale rows without
--     reading TTL constants from app config.
--
-- Multi-tenant scoping (ADR-009):
--   - Every row carries account_id + website_id; RLS exposes account-scoped
--     reads to authenticated users and full access to service_role.
--
-- Idempotency (ADR-018):
--   - UNIQUE (website_id, cache_key) — or (website_id, endpoint, cache_key)
--     for DataForSEO multi-endpoint — keeps upserts deterministic across
--     retries and parallel callers.
--
-- Safety:
--   - Additive, forward-only. Idempotent (CREATE ... IF NOT EXISTS, DROP
--     POLICY IF EXISTS pattern). Safe to re-run.
-- ============================================================================

-- ─── growth_gsc_cache ───────────────────────────────────────────────────────
create table if not exists public.growth_gsc_cache (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  cache_key text not null,
  cache_tag text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  -- expires_at defaults to fetched_at + 24h so client upserts that omit it
  -- (current A1 W2 wrappers do) still satisfy NOT NULL. Cron purge reads this.
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint growth_gsc_cache_website_key_uniq unique (website_id, cache_key)
);

create index if not exists growth_gsc_cache_tenant_tag_idx
  on public.growth_gsc_cache(account_id, website_id, cache_tag);

create index if not exists growth_gsc_cache_expires_at_idx
  on public.growth_gsc_cache(expires_at);

alter table public.growth_gsc_cache enable row level security;

drop policy if exists growth_gsc_cache_service_all on public.growth_gsc_cache;
create policy growth_gsc_cache_service_all
  on public.growth_gsc_cache
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_gsc_cache_account_read on public.growth_gsc_cache;
create policy growth_gsc_cache_account_read
  on public.growth_gsc_cache
  for select
  to authenticated
  using (account_id = auth.uid());

comment on table public.growth_gsc_cache is
  'Tenant-scoped Search Console response cache (ADR-016, 24h TTL enforced in client).';

-- ─── growth_ga4_cache ───────────────────────────────────────────────────────
create table if not exists public.growth_ga4_cache (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  cache_key text not null,
  cache_tag text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  -- expires_at defaults to fetched_at + 6h (GA4 TTL); client wrappers omit it.
  expires_at timestamptz not null default (now() + interval '6 hours'),
  constraint growth_ga4_cache_website_key_uniq unique (website_id, cache_key)
);

create index if not exists growth_ga4_cache_tenant_tag_idx
  on public.growth_ga4_cache(account_id, website_id, cache_tag);

create index if not exists growth_ga4_cache_expires_at_idx
  on public.growth_ga4_cache(expires_at);

alter table public.growth_ga4_cache enable row level security;

drop policy if exists growth_ga4_cache_service_all on public.growth_ga4_cache;
create policy growth_ga4_cache_service_all
  on public.growth_ga4_cache
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_ga4_cache_account_read on public.growth_ga4_cache;
create policy growth_ga4_cache_account_read
  on public.growth_ga4_cache
  for select
  to authenticated
  using (account_id = auth.uid());

comment on table public.growth_ga4_cache is
  'Tenant-scoped GA4 Data API response cache (ADR-016, 6h TTL enforced in client).';

-- ─── growth_dataforseo_cache ────────────────────────────────────────────────
create table if not exists public.growth_dataforseo_cache (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  endpoint text not null,
  cache_key text not null,
  cache_tag text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  -- expires_at defaults to fetched_at + 7d (DFS TTL); client wrappers omit it.
  expires_at timestamptz not null default (now() + interval '7 days'),
  constraint growth_dataforseo_cache_website_endpoint_key_uniq
    unique (website_id, endpoint, cache_key)
);

create index if not exists growth_dataforseo_cache_tenant_tag_idx
  on public.growth_dataforseo_cache(account_id, website_id, cache_tag);

create index if not exists growth_dataforseo_cache_expires_at_idx
  on public.growth_dataforseo_cache(expires_at);

create index if not exists growth_dataforseo_cache_endpoint_idx
  on public.growth_dataforseo_cache(website_id, endpoint);

alter table public.growth_dataforseo_cache enable row level security;

drop policy if exists growth_dataforseo_cache_service_all on public.growth_dataforseo_cache;
create policy growth_dataforseo_cache_service_all
  on public.growth_dataforseo_cache
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_dataforseo_cache_account_read on public.growth_dataforseo_cache;
create policy growth_dataforseo_cache_account_read
  on public.growth_dataforseo_cache
  for select
  to authenticated
  using (account_id = auth.uid());

comment on table public.growth_dataforseo_cache is
  'Tenant-scoped DataForSEO response cache (ADR-016, 7d TTL enforced in client). Budget capped via seo_provider_usage.';

-- ─── growth_inventory ───────────────────────────────────────────────────────
-- Mirrors GrowthInventoryRowSchema in
-- packages/website-contract/src/schemas/growth-inventory.ts. Each row = one
-- growth-actionable surface (URL/funnel step) tracked by the Weekly Council.
create table if not exists public.growth_inventory (
  id uuid primary key default gen_random_uuid(),

  -- GrowthTenantScopeSchema
  account_id uuid not null,
  website_id uuid not null,
  locale text not null,
  market text not null,

  -- Surface identity
  source_url text not null,
  canonical_url text not null,

  -- Classification
  template_type text not null,
  cluster text,
  intent text,
  funnel_stage text not null,
  channel text not null,

  -- GSC metrics (28d window)
  gsc_clicks_28d integer not null default 0,
  gsc_impressions_28d integer not null default 0,
  gsc_ctr numeric not null default 0,
  gsc_avg_position numeric not null default 0,

  -- GA4 metrics (28d window)
  ga4_sessions_28d integer not null default 0,
  ga4_engagement numeric not null default 0,

  -- Funnel counters
  waflow_opens integer not null default 0,
  waflow_submits integer not null default 0,
  whatsapp_clicks integer not null default 0,
  qualified_leads integer not null default 0,
  quotes_sent integer not null default 0,
  bookings_confirmed integer not null default 0,
  booking_value numeric not null default 0,
  gross_margin numeric not null default 0,

  -- Experiment fields
  hypothesis text,
  experiment_id text,
  "ICE_score" numeric,
  "RICE_score" numeric,
  success_metric text,
  baseline_start timestamptz,
  baseline_end timestamptz,
  owner text,
  owner_issue text,
  change_shipped_at timestamptz,
  evaluation_date timestamptz,
  result text not null default 'pending',
  learning text,
  next_action text,

  -- Sub-status pillars
  technical_status text not null default 'unknown',
  content_status text not null default 'unknown',
  conversion_status text not null default 'unknown',
  attribution_status text not null default 'unknown',

  -- Lifecycle
  status text not null default 'idea',
  priority_score numeric not null default 0,

  updated_at timestamptz not null default now(),

  -- Idempotent per surface URL within a website (ADR-018).
  constraint growth_inventory_website_source_url_uniq
    unique (website_id, source_url),

  -- Enum guards mirroring Zod enums in growth-inventory.ts.
  constraint growth_inventory_locale_chk
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint growth_inventory_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint growth_inventory_template_type_chk
    check (template_type in (
      'home', 'destination', 'package', 'activity', 'hotel',
      'transfer', 'blog', 'landing', 'other'
    )),
  constraint growth_inventory_intent_chk
    check (intent is null or intent in (
      'informational', 'navigational', 'commercial', 'transactional', 'mixed'
    )),
  constraint growth_inventory_funnel_stage_chk
    check (funnel_stage in (
      'acquisition', 'activation', 'qualified_lead',
      'quote_sent', 'booking', 'review_referral'
    )),
  constraint growth_inventory_channel_chk
    check (channel in (
      'seo', 'google_ads', 'meta', 'tiktok', 'whatsapp',
      'waflow', 'chatwoot', 'direct', 'referral', 'email', 'unknown'
    )),
  constraint growth_inventory_result_chk
    check (result in (
      'pending', 'win', 'loss', 'inconclusive', 'scale', 'stop'
    )),
  constraint growth_inventory_status_chk
    check (status in (
      'idea', 'queued', 'in_progress', 'shipped', 'evaluated', 'archived'
    )),
  constraint growth_inventory_technical_status_chk
    check (technical_status in ('pass', 'pass_with_watch', 'blocked', 'unknown')),
  constraint growth_inventory_content_status_chk
    check (content_status in ('pass', 'pass_with_watch', 'blocked', 'unknown')),
  constraint growth_inventory_conversion_status_chk
    check (conversion_status in ('pass', 'pass_with_watch', 'blocked', 'unknown')),
  constraint growth_inventory_attribution_status_chk
    check (attribution_status in ('pass', 'pass_with_watch', 'blocked', 'unknown')),
  constraint growth_inventory_owner_issue_chk
    check (owner_issue is null or owner_issue ~ '^#?\d+$')
);

create index if not exists growth_inventory_tenant_idx
  on public.growth_inventory(account_id, website_id, locale, market);

create index if not exists growth_inventory_funnel_status_idx
  on public.growth_inventory(funnel_stage, status);

create index if not exists growth_inventory_updated_at_idx
  on public.growth_inventory(updated_at desc);

create index if not exists growth_inventory_priority_idx
  on public.growth_inventory(website_id, priority_score desc);

alter table public.growth_inventory enable row level security;

drop policy if exists growth_inventory_service_all on public.growth_inventory;
create policy growth_inventory_service_all
  on public.growth_inventory
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_inventory_account_read on public.growth_inventory;
create policy growth_inventory_account_read
  on public.growth_inventory
  for select
  to authenticated
  using (account_id = auth.uid());

-- updated_at touch trigger to keep the column honest on direct updates.
create or replace function public.touch_growth_inventory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_growth_inventory_updated_at on public.growth_inventory;
create trigger trg_growth_inventory_updated_at
before update on public.growth_inventory
for each row execute function public.touch_growth_inventory_updated_at();

comment on table public.growth_inventory is
  'Growth Inventory surfaces tracked by the Weekly Growth Council. Tenant-scoped (ADR-009). Idempotent per (website_id, source_url) (ADR-018). Schema mirrors GrowthInventoryRowSchema.';
comment on column public.growth_inventory.priority_score is
  'Composite score (ICE/RICE-derived) used for default ordering in /api/growth/inventory.';
comment on column public.growth_inventory.result is
  'Experiment outcome: pending|win|loss|inconclusive|scale|stop.';

-- ─── Cleanup helper ─────────────────────────────────────────────────────────
-- Should be triggered daily via pg_cron (pg_cron is enabled on this project).
-- Suggested schedule once verified in staging:
--   select cron.schedule('growth-cache-purge-expired', '15 3 * * *',
--     $$ select public.growth_cache_purge_expired() $$);
create or replace function public.growth_cache_purge_expired()
returns table (table_name text, deleted bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  gsc_deleted bigint := 0;
  ga4_deleted bigint := 0;
  dfs_deleted bigint := 0;
begin
  delete from public.growth_gsc_cache where expires_at < now();
  get diagnostics gsc_deleted = row_count;

  delete from public.growth_ga4_cache where expires_at < now();
  get diagnostics ga4_deleted = row_count;

  delete from public.growth_dataforseo_cache where expires_at < now();
  get diagnostics dfs_deleted = row_count;

  return query values
    ('growth_gsc_cache'::text, gsc_deleted),
    ('growth_ga4_cache'::text, ga4_deleted),
    ('growth_dataforseo_cache'::text, dfs_deleted);
end;
$$;

comment on function public.growth_cache_purge_expired() is
  'Deletes expired rows from growth_{gsc,ga4,dataforseo}_cache. Trigger daily via pg_cron.';
