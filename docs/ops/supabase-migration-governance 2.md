# Supabase Migration Governance

Status: accepted for Growth OS #310 operations.
Last updated: 2026-04-28.

## Decision

`weppa-cloud/bukeer-flutter` is the operational source of truth for applying
Supabase migrations to the shared Bukeer backend.

`weppa-cloud/bukeer-studio` may originate migrations for Studio-owned or
Growth OS features, but any migration that changes the shared Supabase schema
must be mirrored into `bukeer-flutter` and applied from that repository's
migration workflow.

This keeps the single Supabase project aligned with the app that owns most
backend writes and reduces migration-history drift between Studio and Flutter.

## Scope

This applies to:

- New tables, columns, indexes, constraints, RLS policies, triggers and RPCs.
- Backfills that touch shared tenant data.
- Extensions and scheduled jobs, including `pg_cron`.
- Growth OS tables used by Studio APIs but stored in the shared Supabase DB.

This does not apply to:

- Studio-only TypeScript contracts.
- Studio-only API route code.
- Read-only SQL verification queries.
- Local SQL snippets used for exploration and not applied to Supabase.

## Repository Responsibilities

| Repo | Responsibility |
|---|---|
| `bukeer-studio` | Design Studio/Growth feature contracts, propose SQL, validate API usage, document evidence and issue status. |
| `bukeer-flutter` | Own canonical Supabase migration application, backend change review, migration ordering and operational DB history. |
| GitHub Issues | Execution state and evidence. Issue comments must link commits, migration names, verification queries and any remaining blockers. |

## Approved Flow

1. **Author or identify migration in Studio**
   - Use 14-digit timestamp naming: `YYYYMMDDHHMMSS_description.sql`.
   - Make migrations forward-only and idempotent where possible.
   - Include `account_id` / `website_id` for tenant-scoped operational tables.
   - Include RLS and indexes in the same migration unless there is a deliberate staged rollout.

2. **Mirror into Flutter**
   - Copy the exact migration file into `../bukeer_flutter/supabase/migrations`.
   - Preserve timestamp, filename and SQL contents.
   - If the same filename already exists in both repos, diff them before proceeding.

3. **Review from Flutter**
   - Open or update a `bukeer-flutter` PR/branch for the migration set.
   - Review cross-app impact on Flutter writes, Studio SSR reads, RLS and RPC callers.
   - Do not apply SQL ad hoc from Studio unless the issue explicitly records an emergency exception.

4. **Apply from Flutter path**
   - Use the approved Flutter Supabase migration workflow.
   - Never run `supabase migration down`.
   - If production history differs, resolve with a forward-only repair or documented Supabase migration repair, not rollback.

5. **Verify from either repo**
   - Run read-only verification queries.
   - Record counts, table existence and scheduled job status in the relevant GitHub issue.
   - Run Studio code tests after DB shape is confirmed.

## Hard Rules

- Do not apply shared Supabase migrations directly from Studio if Flutter has not accepted the migration set.
- Do not create a duplicate equivalent migration with a different timestamp.
- Do not modify historical migrations already applied to production.
- Do not run destructive DDL or data backfills without an issue-linked rollback/forward-fix plan.
- Do not land Flutter migrations during a declared cutover freeze window.
- Do not use `migration down`; Bukeer migrations are forward-only.

## Drift Checks

Before application, compare migration files that exist in both repos:

```bash
diff -u \
  supabase/migrations/20260504110900_funnel_events.sql \
  ../bukeer_flutter/supabase/migrations/20260504110900_funnel_events.sql

diff -u \
  supabase/migrations/20260504111000_funnel_events_backfill.sql \
  ../bukeer_flutter/supabase/migrations/20260504111000_funnel_events_backfill.sql

diff -u \
  supabase/migrations/20260504111100_growth_cache_tables.sql \
  ../bukeer_flutter/supabase/migrations/20260504111100_growth_cache_tables.sql
```

If output is non-empty, stop and decide which copy is canonical before any
database write.

## Growth OS #310 Migration Set

For Epic #310, the approved source path should be `bukeer-flutter`, with Studio
providing the contracts, API implementation and verification evidence.

| Capability | Canonical migration | Notes |
|---|---|---|
| Provider budget caps | `20260418000100_growth_ops_tables.sql` | Creates `seo_provider_usage`; verify Flutter has an equivalent or import it before applying Growth cache tables. |
| Growth provider integrations | `20260428131601_seo_integrations_growth_contract.sql` | Creates `seo_integrations` and backfills GSC/GA4 from `seo_gsc_credentials`; required by Growth GSC/GA4 clients. |
| Meta CAPI event log | `20260504110700_meta_conversion_events.sql` | Required by #322/#332 smoke. If missing in Flutter, mirror from Studio before applying tracking smoke. |
| Funnel event ledger | `20260504110900_funnel_events.sql` | Required by WAFlow/Chatwoot/WhatsApp CTA tracking. |
| Historical funnel seed | `20260504111000_funnel_events_backfill.sql` | Optional for production history; requires `funnel_events` and `meta_conversion_events`. |
| Growth inventory and caches | `20260504111100_growth_cache_tables.sql` | Creates GSC/GA4/DataForSEO caches, `growth_inventory`, and `growth_cache_purge_expired()`. |

### Current Cross-Repo Audit — 2026-04-28

Checked from Studio `dev` against local
`/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer_flutter`.

| Migration | Flutter status | Action |
|---|---|---|
| `20260418000100_growth_ops_tables.sql` | Mirrored locally, identical | Commit in Flutter migration branch before applying; required for `seo_provider_usage`. |
| `20260428131601_seo_integrations_growth_contract.sql` | Mirrored locally, identical | Commit in Flutter migration branch before Growth ingestion; required by GSC/GA4 clients. |
| `20260504110700_meta_conversion_events.sql` | Mirrored locally, identical | Commit in Flutter migration branch before #322/#332 smoke. |
| `20260504110900_funnel_events.sql` | Present, identical | Can be included in Flutter migration PR. |
| `20260504111000_funnel_events_backfill.sql` | Present, identical | Studio was aligned to Flutter's `extensions.digest(...)` form. |
| `20260504111100_growth_cache_tables.sql` | Present, identical | Can be included in Flutter migration PR after `seo_provider_usage` is confirmed. |

Do not apply the #310 migration set until the mirrored Flutter files are
committed/reviewed in `bukeer-flutter`.

## pg_cron Cache Purge

After `20260504111100_growth_cache_tables.sql` is applied and verified, enable
a scheduled purge for expired cache rows from the Flutter-approved DB path.

Recommended schedule:

```sql
select cron.schedule(
  'growth-cache-purge-expired',
  '17 * * * *',
  $$select public.growth_cache_purge_expired();$$
);
```

Read-only verification:

```sql
select jobid, schedule, command, active
from cron.job
where jobname = 'growth-cache-purge-expired';
```

If `pg_cron` is not enabled in the Supabase project, record the blocker in #310
and run the purge manually only as an explicitly approved operational action.

## Verification Queries

Table existence:

```sql
select
  to_regclass('public.funnel_events') as funnel_events,
  to_regclass('public.meta_conversion_events') as meta_conversion_events,
  to_regclass('public.growth_inventory') as growth_inventory,
  to_regclass('public.growth_gsc_cache') as growth_gsc_cache,
  to_regclass('public.growth_ga4_cache') as growth_ga4_cache,
  to_regclass('public.growth_dataforseo_cache') as growth_dataforseo_cache,
  to_regclass('public.seo_provider_usage') as seo_provider_usage;
```

Counts:

```sql
select 'funnel_events' as table_name, count(*) from public.funnel_events
union all
select 'meta_conversion_events', count(*) from public.meta_conversion_events
union all
select 'growth_inventory', count(*) from public.growth_inventory
union all
select 'growth_gsc_cache', count(*) from public.growth_gsc_cache
union all
select 'growth_ga4_cache', count(*) from public.growth_ga4_cache
union all
select 'growth_dataforseo_cache', count(*) from public.growth_dataforseo_cache
union all
select 'seo_provider_usage', count(*) from public.seo_provider_usage;
```

RLS enabled:

```sql
select relname, relrowsecurity
from pg_class
where relname in (
  'funnel_events',
  'meta_conversion_events',
  'growth_inventory',
  'growth_gsc_cache',
  'growth_ga4_cache',
  'growth_dataforseo_cache',
  'seo_provider_usage'
)
order by relname;
```

## Evidence Required In Issues

Every migration issue update must include:

- Repo and branch used for application.
- Migration filenames and commit SHA.
- Verification query output with secrets redacted.
- Any drift or repair decision.
- Follow-up owners for Studio code, Flutter code and operational smoke.

For #310, the minimum evidence is:

- `bukeer-flutter` commit/PR containing the canonical migration set.
- Table existence and counts for the Growth OS tables.
- `pg_cron` job verification or blocker.
- Tracking smoke output from `docs/ops/growth-tracking-smoke.md`.
- Link to the Studio commit that consumes the schema.
