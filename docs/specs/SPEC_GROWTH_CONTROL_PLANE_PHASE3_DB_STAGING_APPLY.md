# SPEC — Growth Control Plane Phase 3: DB Staging Apply Plan

**Status:** `DRAFT_READY_FOR_T1_PLAN_GATE`
**Kanban T0:** `t_6279ee1c`
**Parent:** PR #570 (merged `e7c978c7` — Phase 0/1/2)
**Branch:** `feat/growth-control-plane-phase3-db-staging`
**Tenant beta:** ColombiaTours (`website_id = 894545b7-73ca-4dae-b76a-da5b6a3f8441`)
**Pipeline:** `growth-control-plane-phase3-db-staging`
**Date:** 2026-05-18

---

## 0. Table of Contents

1. [Phase 3 Scope](#1-phase-3-scope)
2. [Phase 3 Non-Negotiables](#2-phase-3-non-negotiables)
3. [Staging Target Requirements](#3-staging-target-requirements)
4. [Migration Apply Plan (M1 — 6 Governance Tables)](#4-migration-apply-plan-m1--6-governance-tables)
5. [Backfill Apply Plan (growth_source_refs — ColombiaTours)](#5-backfill-apply-plan-growth_source_refs--colombiatours)
6. [Canary Seed Apply Plan (Capabilities + Agent Definitions)](#6-canary-seed-apply-plan-capabilities--agent-definitions)
7. [Validation SQL](#7-validation-sql)
8. [RLS Verification](#8-rls-verification)
9. [Rollback Plan](#9-rollback-plan)
10. [Explicit Prod-Block Gate](#10-explicit-prod-block-gate)
11. [Acceptance Criteria](#11-acceptance-criteria)
12. [Implementation Order](#12-implementation-order)
13. [Watch Items](#13-watch-items)

---

## 1. Phase 3 Scope

Phase 3 validates and applies the Phase 1b migration artifacts to a **staging/dev Supabase target** — never production. This is the first time the M1 migration, ColombiaTours backfill, and canary seed data are executed against a real database (as opposed to SQL review or dry-run SELECTs).

### Artifacts (already delivered in Phase 1b — committed in PR #570)

| Artifact | File | Status |
|----------|------|--------|
| Migration M1 — 6 governance tables | `supabase/migrations/20260518160000_growth_control_plane_governance_tables.sql` | Committed |
| Backfill — ColombiaTours source_refs | `scripts/sql/growth-source-refs-backfill-colombiatours.sql` | Committed (commented-out INSERT) |
| Canary seed — pt-BR capabilities + agent | `scripts/sql/growth-canary-seed-colombiatours-ptbr.sql` | Committed (safe INSERT with NOT EXISTS) |
| Rollback script | `scripts/sql/growth-control-plane-rollback.sql` | Committed (commented-out DROP/DELETE) |

### What Phase 3 adds

- Staging target specification and provisioning requirements
- Migration apply procedure (dry-run → apply → verify)
- Backfill apply procedure (count → preview → insert → verify)
- Canary seed apply procedure (verify preconditions → seed → verify)
- Validation SQL suite (structural, data integrity, RLS, rollback)
- Explicit production-block gate (BLOCKED_NEEDS_STAGING_TARGET)
- Acceptance criteria with PASS/BLOCK gates

---

## 2. Phase 3 Non-Negotiables

1. **NO production migration apply.** All migration, backfill, and seed commands target a staging/dev Supabase instance only.
2. **NO provider calls** in any migration, backfill, or validation step.
3. **NO publish or transcreation** triggered by DB staging work.
4. **NO service_role secrets in worker logs, stdout, or persisted artifacts.**
5. **NO .env dumps, temp key files, or credential capture.**
6. **All evidence is read-only or operator-safe** unless an explicit staging/dev DB target is provided.
7. **If staging/dev target is missing, the result is `BLOCKED_NEEDS_STAGING_TARGET`**, not a workaround with production.
8. **ColombiaTours beta tenant remains dry-run only** — no production activation.
9. **ContextPacket autonomy** requires fact-level `source_refs`, freshness, policy, permissions, exact locale/market or explicit fallback.

---

## 3. Staging Target Requirements

### 3.1 Must haves

Before any apply step, the operator MUST provide:

| Requirement | Format | Example |
|-------------|--------|---------|
| Supabase project reference | `project_ref` string | `abcdefghijklmnopqrst` |
| Staging DB connection string | `postgresql://user:password@host:5432/postgres` | With service_role or migration user |
| Staging DB URL (for Supabase CLI) | `SUPABASE_DB_URL` | `postgresql://postgres:xxx@db.abcdefghijklmnopqrst.supabase.co:5432/postgres` |
| Supabase access token (for CLI) | `SUPABASE_ACCESS_TOKEN` | `sbp_xxxxx` |
| Branch name (if branch-based) | Branch name or `main` | `staging/growth-control-plane` |
| Staging is isolated from production | Confirmation | No shared DB, no shared secrets |

### 3.2 Pre-flight verification

The operator MUST run before any apply:

```bash
# 1. Confirm the target is NOT production
psql "$STAGING_DB_URL" -c "SELECT current_database(), inet_server_addr(), current_user;"

# 2. Verify the target is empty of growth_* tables (clean staging)
psql "$STAGING_DB_URL" -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'growth_%'
ORDER BY table_name;
"

# 3. Verify ColombiaTours website exists
psql "$STAGING_DB_URL" -c "
SELECT id, account_id, name
FROM public.websites
WHERE id = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
"

# 4. Verify prerequisite trigger function exists before M1 apply
# M1 creates updated_at triggers that call public.touch_growth_backlog_updated_at().
# Clean staging targets must already have this function from earlier Growth migrations.
psql "$STAGING_DB_URL" -c "
SELECT
  p.oid::regprocedure AS function_signature,
  n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'touch_growth_backlog_updated_at';
"
```

If the function query returns zero rows, T2 MUST stop with:

```text
RESULT: BLOCKED_MISSING_DB_PREREQUISITE
REASON: public.touch_growth_backlog_updated_at() is missing on the staging target.
        Apply/verify prerequisite Growth migrations before M1.
```

### 3.3 What happens if staging target is missing

The entire pipeline MUST block with:

```
RESULT: BLOCKED_NEEDS_STAGING_TARGET
REASON: No staging/dev database target provided. 
        Production apply is forbidden. Set SUPABASE_DB_URL and 
        SUPABASE_ACCESS_TOKEN for a staging instance, or provide 
        a confirmed-isolated dev database connection string.
```

No workaround, no inference, no fallback to production.

---

## 4. Migration Apply Plan (M1 — 6 Governance Tables)

### 4.1 File

`supabase/migrations/20260518160000_growth_control_plane_governance_tables.sql`

### 4.2 Dry-run (syntax check)

```bash
# Parse SQL for syntax errors without executing
psql "$STAGING_DB_URL" -f supabase/migrations/20260518160000_growth_control_plane_governance_tables.sql \
  --no-psqlrc -E 2>&1 | head -5 || echo "DRY-RUN: SQL parse check complete"

# Supabase CLI dry-run (if available)
npx supabase db diff --linked --file growth_governance \
  || echo "Supabase CLI dry-run available"
```

### 4.3 Apply

```bash
# Option A: Direct psql (preferred for controlled staging)
psql "$STAGING_DB_URL" -f supabase/migrations/20260518160000_growth_control_plane_governance_tables.sql \
  -1  # Transactional: all-or-nothing

# Option B: Supabase CLI
npx supabase migration up --linked \
  || npx supabase db push
```

### 4.4 Idempotency check

```bash
# Run migration a second time — must produce zero errors
psql "$STAGING_DB_URL" -f supabase/migrations/20260518160000_growth_control_plane_governance_tables.sql \
  -1 2>&1 | grep -i 'error\|already exists' || echo "Idempotent: PASS"
```

### 4.5 Post-apply verification

See [Section 7 — Validation SQL](#7-validation-sql).

---

## 5. Backfill Apply Plan (growth_source_refs — ColombiaTours)

### 5.1 File

`scripts/sql/growth-source-refs-backfill-colombiatours.sql`

### 5.2 Step 1 — Dry-run count

```sql
-- Count rows to backfill
SELECT
  COUNT(*) AS total_completed_runs,
  COUNT(DISTINCT provider) AS unique_providers,
  COUNT(DISTINCT profile_type) AS unique_profile_types
FROM public.growth_profile_runs
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND status = 'completed';
```

### 5.3 Step 2 — Preview transformation (SELECT-only)

```sql
-- Preview what will be inserted
SELECT
  gpr.account_id,
  gpr.website_id,
  gpr.id AS run_id,
  CASE
    WHEN gpr.provider = 'dataforseo' THEN 'growth_profiles'
    WHEN gpr.provider = 'gsc' THEN 'growth_profiles'
    WHEN gpr.provider = 'ga4' THEN 'growth_profiles'
    WHEN gpr.provider = 'clarity' THEN 'growth_profiles'
    ELSE 'growth_profile_runs'
  END AS source,
  NULL::uuid AS fact_id,
  'profile_run' AS fact_type,
  COALESCE(gpr.locale, 'es-CO') AS locale,
  COALESCE(gpr.market, 'CO') AS market,
  gpr.profile_type,
  CASE
    WHEN gpr.freshness_status IS NOT NULL THEN gpr.freshness_status::text
    WHEN gpr.valid_until IS NOT NULL AND gpr.valid_until < now() THEN 'expired'
    ELSE 'unknown'
  END AS freshness_status,
  gpr.created_at AS valid_from,
  gpr.valid_until,
  encode(sha256(coalesce(gpr.evidence_fingerprint, gpr.id::text)::bytea), 'hex') AS payload_hash
FROM public.growth_profile_runs gpr
WHERE gpr.website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND gpr.status = 'completed'
ORDER BY gpr.created_at DESC
LIMIT 20;  -- Remove LIMIT for full preview
```

### 5.4 Step 3 — Apply (transactional)

```sql
BEGIN;

INSERT INTO public.growth_source_refs (
  account_id, website_id, run_id, source, fact_id, fact_type,
  locale, market, profile_type, freshness_status,
  valid_from, valid_until, payload_hash
)
SELECT
  gpr.account_id,
  gpr.website_id,
  gpr.id AS run_id,
  CASE
    WHEN gpr.provider = 'dataforseo' THEN 'growth_profiles'
    WHEN gpr.provider = 'gsc' THEN 'growth_profiles'
    WHEN gpr.provider = 'ga4' THEN 'growth_profiles'
    WHEN gpr.provider = 'clarity' THEN 'growth_profiles'
    ELSE 'growth_profile_runs'
  END AS source,
  NULL::uuid AS fact_id,
  'profile_run' AS fact_type,
  COALESCE(gpr.locale, 'es-CO') AS locale,
  COALESCE(gpr.market, 'CO') AS market,
  gpr.profile_type,
  CASE
    WHEN gpr.freshness_status IS NOT NULL THEN gpr.freshness_status::text
    WHEN gpr.valid_until IS NOT NULL AND gpr.valid_until < now() THEN 'expired'
    ELSE 'unknown'
  END AS freshness_status,
  gpr.created_at AS valid_from,
  gpr.valid_until,
  encode(sha256(coalesce(gpr.evidence_fingerprint, gpr.id::text)::bytea), 'hex') AS payload_hash
FROM public.growth_profile_runs gpr
WHERE gpr.website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND gpr.status = 'completed';

COMMIT;
```

### 5.5 Step 4 — Verify

```sql
-- Expected: every completed growth_profile_runs row produces 1+ growth_source_refs row
SELECT
  pr.provider,
  pr.profile_type,
  COUNT(pr.id) AS runs,
  COUNT(sr.id) AS refs,
  CASE
    WHEN COUNT(pr.id) = COUNT(sr.id) THEN 'MATCH'
    ELSE 'MISMATCH'
  END AS status
FROM public.growth_profile_runs pr
LEFT JOIN public.growth_source_refs sr ON sr.run_id = pr.id
WHERE pr.website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND pr.status = 'completed'
GROUP BY pr.provider, pr.profile_type
ORDER BY pr.provider;
```

---

## 6. Canary Seed Apply Plan (Capabilities + Agent Definitions)

### 6.1 File

`scripts/sql/growth-canary-seed-colombiatours-ptbr.sql`

### 6.2 Precondition check

```sql
-- Verify ColombiaTours website exists in staging
SELECT id, account_id, name
FROM public.websites
WHERE id = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
```

### 6.3 Apply

The seed script is already safe: it uses `SELECT ... WHERE NOT EXISTS` for idempotency and fetches `account_id` dynamically from `websites`. Run as-is:

```bash
psql "$STAGING_DB_URL" -f scripts/sql/growth-canary-seed-colombiatours-ptbr.sql -1
```

### 6.4 Verify

```sql
-- Verify growth_capabilities seed
SELECT
  'growth_capabilities' AS table_name,
  COUNT(*) AS rows_seeded
FROM public.growth_capabilities
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND locale = 'pt-BR'
  AND market = 'BR'
  AND lane = 'transcreation'

UNION ALL

-- Verify growth_agent_definitions seed
SELECT
  'growth_agent_definitions' AS table_name,
  COUNT(*) AS rows_seeded
FROM public.growth_agent_definitions
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND agent_name = 'colombiatours-ptbr-transcreator';
```

---

## 7. Validation SQL

### 7.1 Structural validation — tables exist

```sql
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size,
  obj_description(quote_ident(table_name)::regclass, 'pg_class') AS comment
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'growth_account_plans',
    'growth_capabilities',
    'growth_provider_policies',
    'growth_agent_definitions',
    'growth_source_refs',
    'growth_context_packet_log'
  )
ORDER BY table_name;
```

### 7.2 Column validation — all expected columns present

```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'growth_%'
ORDER BY table_name, ordinal_position;
```

### 7.3 Constraint validation — CHECK, UNIQUE, FK

```sql
SELECT
  tc.table_name,
  tc.constraint_type,
  tc.constraint_name,
  ccu.column_name,
  ccu2.table_name AS foreign_table_name,
  ccu2.column_name AS foreign_column_name,
  pc.condeferrable,
  pc.condeferred
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
  AND tc.table_schema = ccu.table_schema
LEFT JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu2
  ON rc.unique_constraint_name = ccu2.constraint_name
  AND tc.table_schema = ccu2.table_schema
LEFT JOIN pg_constraint pc
  ON pc.conname = tc.constraint_name
  AND pc.connamespace = 'public'::regnamespace
WHERE tc.table_schema = 'public'
  AND tc.table_name LIKE 'growth_%'
ORDER BY tc.table_name, tc.constraint_type;
```

Expected critical constraint flags:

```sql
SELECT
  conname,
  condeferrable,
  condeferred
FROM pg_constraint
WHERE conname = 'growth_source_refs_run_fact_uniq';
-- Expected: condeferrable = true, condeferred = true
```

### 7.4 Index validation

```sql
SELECT
  tablename AS table_name,
  indexname AS index_name,
  indexdef AS index_definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'growth_%'
ORDER BY tablename, indexname;
```

### 7.5 Trigger validation (updated_at triggers)

```sql
SELECT
  event_object_table AS table_name,
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table LIKE 'growth_%'
ORDER BY event_object_table;
```

### 7.6 Data integrity — no orphaned FK references

```sql
-- Check for orphaned records in each table
SELECT 'growth_account_plans' AS table_name,
  COUNT(*) AS orphan_count
FROM public.growth_account_plans gap
LEFT JOIN public.accounts a ON a.id = gap.account_id
WHERE a.id IS NULL

UNION ALL

SELECT 'growth_capabilities', COUNT(*)
FROM public.growth_capabilities gc
LEFT JOIN public.accounts a ON a.id = gc.account_id
WHERE a.id IS NULL

UNION ALL

SELECT 'growth_provider_policies', COUNT(*)
FROM public.growth_provider_policies gpp
LEFT JOIN public.accounts a ON a.id = gpp.account_id
WHERE a.id IS NULL

UNION ALL

SELECT 'growth_agent_definitions', COUNT(*)
FROM public.growth_agent_definitions gad
LEFT JOIN public.accounts a ON a.id = gad.account_id
WHERE a.id IS NULL

UNION ALL

SELECT 'growth_source_refs', COUNT(*)
FROM public.growth_source_refs gsr
LEFT JOIN public.accounts a ON a.id = gsr.account_id
WHERE a.id IS NULL

UNION ALL

SELECT 'growth_context_packet_log', COUNT(*)
FROM public.growth_context_packet_log gcpl
LEFT JOIN public.accounts a ON a.id = gcpl.account_id
WHERE a.id IS NULL;
```

### 7.7 Freshness distribution (growth_source_refs)

```sql
SELECT
  freshness_status,
  COUNT(*) AS count,
  MIN(valid_from) AS earliest_valid_from,
  MAX(valid_until) AS latest_valid_until
FROM public.growth_source_refs
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
GROUP BY freshness_status
ORDER BY freshness_status;
```

### 7.8 Locale/market coverage

```sql
SELECT
  locale,
  market,
  COUNT(*) AS row_count
FROM public.growth_capabilities
GROUP BY locale, market
ORDER BY locale, market;
```

### 7.9 Growth_profile_runs ↔ growth_source_refs join coverage

```sql
-- What percentage of completed runs have been backfilled?
SELECT
  ROUND(
    100.0 * COUNT(sr.id) / NULLIF(COUNT(pr.id), 0),
    1
  ) AS backfill_coverage_pct,
  COUNT(pr.id) AS total_completed_runs,
  COUNT(sr.id) AS refs_created
FROM public.growth_profile_runs pr
LEFT JOIN public.growth_source_refs sr ON sr.run_id = pr.id
WHERE pr.website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND pr.status = 'completed';
```

---

## 8. RLS Verification

### 8.1 RLS is enabled on all 6 tables

```sql
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname IN (
  'growth_account_plans',
  'growth_capabilities',
  'growth_provider_policies',
  'growth_agent_definitions',
  'growth_source_refs',
  'growth_context_packet_log'
)
  AND relnamespace = 'public'::regnamespace
ORDER BY relname;
```

**Expectation:** `rls_enabled = true` for all 6 tables.

### 8.2 RLS policies are correct

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'growth_%'
ORDER BY tablename, policyname;
```

**Expectation per table:**

| Policy | Command | Roles | Using expression |
|--------|---------|-------|-----------------|
| `<table>_service_all` | ALL | `{service_role}` | `auth.role() = 'service_role'` |
| `<table>_tenant_read` | SELECT | `{authenticated}` | EXISTS(`user_roles` join with `account_id`) |

### 8.3 Grant validation

```sql
SELECT
  table_schema || '.' || table_name AS full_table_name,
  privilege_type,
  grantee
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name LIKE 'growth_%'
  AND grantee IN ('authenticated', 'service_role', 'anon')
ORDER BY table_name, grantee, privilege_type;
```

**Expectation:**
- `service_role` → `ALL` on all 6 tables
- `authenticated` → `SELECT` on all 6 tables
- `anon` → no grants on any growth table

### 8.4 RLS isolation test (conceptual)

To test tenant isolation, the operator would:

1. Create two test accounts in staging
2. Insert data for both accounts
3. Authenticate as a user belonging to account A
4. Verify: `SELECT COUNT(*) FROM public.growth_<table>` returns only account A's rows

This test is **informational only** in staging — the RLS pattern is identical to established growth tables.

---

## 9. Rollback Plan

### 9.1 Rollback scenarios

| Scenario | Action | Risk | Re-runnable? |
|----------|--------|------|-------------|
| Migration SQL error mid-apply | Automatic ROLLBACK within transaction | None — atomic | Yes |
| Migration applied, no data written | `DROP TABLE IF EXISTS` (all 6) | Low — no data loss | Yes |
| Migration applied, backfill completed | `DROP TABLE IF EXISTS` then reapply | Medium — lose backfill | Yes (re-runnable) |
| RLS policy error | `DROP POLICY IF EXISTS` | Low | Yes |
| Canary seed data written | `DELETE FROM ... WHERE website_id = '894...'` | Low | Yes (re-seedable) |
| Backfill on staging with bad data | `DELETE FROM growth_source_refs WHERE website_id = '894...'` | Low | Yes |

### 9.2 Full rollback (all 6 tables)

```sql
-- ⚠ WARNING: Destructive. All data in these tables will be lost.
BEGIN;

DROP TABLE IF EXISTS public.growth_context_packet_log CASCADE;
DROP TABLE IF EXISTS public.growth_source_refs CASCADE;
DROP TABLE IF EXISTS public.growth_agent_definitions CASCADE;
DROP TABLE IF EXISTS public.growth_provider_policies CASCADE;
DROP TABLE IF EXISTS public.growth_capabilities CASCADE;
DROP TABLE IF EXISTS public.growth_account_plans CASCADE;

COMMIT;
```

### 9.3 Backfill-only rollback

```sql
BEGIN;

DELETE FROM public.growth_source_refs
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND fact_type = 'profile_run';

COMMIT;
```

### 9.4 Canary-only rollback

```sql
BEGIN;

DELETE FROM public.growth_capabilities
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND capability = 'transcreation';

DELETE FROM public.growth_agent_definitions
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441';

COMMIT;
```

### 9.5 Rollback verification

After any rollback, verify clean state:

```sql
-- Should return empty set
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'growth_%';
```

```sql
-- For backfill-only rollback: should return 0
SELECT COUNT(*)
FROM public.growth_source_refs
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
```

---

## 10. Explicit Prod-Block Gate

### 10.1 The gate

Before ANY apply step executes, the system MUST verify the target database is NOT production.

**Detection method:**

```sql
-- Check 1: Is this a production-like URL?
-- Production Supabase projects typically have:
--   - db.<project_ref>.supabase.co host
--   - Production project_ref matches the known production ref

-- Check 2: Does this DB have real data (websites, users, etc.)?
-- If growth_* tables already exist with real tenant data, this is NOT a clean staging target.

-- Check 3: Explicit environment marker
-- Staging targets MUST have a user-defined marker or confirmation.
```

**Gate pseudocode:**

```
function is_production_target(connection_string):
    # Rule 1: If staging target was not explicitly provided → BLOCK
    if staging_target_missing:
        return BLOCKED

    # Rule 2: If connection_string matches known production project_ref → BLOCK
    production_refs = ['<known-production-ref>']
    if any(ref in connection_string for ref in production_refs):
        return BLOCKED

    # Rule 3: If DB has >10 active websites with real user traffic → BLOCK
    website_count = query("SELECT COUNT(*) FROM websites")
    if website_count > 50:
        return BLOCKED

    # Rule 4: If growth_* tables already have data from live tenants → WARN + operator confirm
    growth_tables_populated = query("SELECT COUNT(*) FROM growth_account_plans")
    if growth_tables_populated > 0:
        return NEEDS_OPERATOR_CONFIRMATION

    return UNKNOWN_OK
```

### 10.2 Operator ask — mandatory before apply

If the target passes all pre-flight checks but has ambiguous characteristics, the operator MUST confirm in writing:

```
I confirm that the target database at <DB_URL> is a staging/dev instance,
NOT production. I accept responsibility for any data impact.
[Operator name]
[Timestamp]
```

### 10.3 What happens if the gate blocks

The system outputs:

```
╔══════════════════════════════════════════════════════════════╗
║                    PRODUCTION BLOCK GATE                     ║
╠══════════════════════════════════════════════════════════════╣
║ STATUS: BLOCKED                                              ║
║                                                              ║
║ This target appears to be, or cannot be confirmed as NOT     ║
║ being, a production database. Phase 3 staging apply is       ║
║ FORBIDDEN.                                                   ║
║                                                              ║
║ To proceed:                                                   ║
║   1. Provision an isolated staging/db dev Supabase instance   ║
║   2. Provide the connection string + access token             ║
║   3. Run the pre-flight verification from §3.2                ║
║   4. Provide operator confirmation from §10.2                 ║
║                                                              ║
║ DO NOT attempt to work around this gate.                     ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 11. Acceptance Criteria

### 11.1 Staging apply gates

| ID | Gate | PASS condition | Verification method |
|----|------|----------------|---------------------|
| AC-01 | Staging target provisioned | Explicit staging DB URL + credentials provided, confirmed isolated | §3 pre-flight |
| AC-02 | Prod-block gate | `BLOCKED_NEEDS_STAGING_TARGET` if no target; otherwise explicit "not prod" confirmation | §10 gate check |
| AC-03 | M1 migration applies | `psql -1` succeeds, 6 tables created | `\dt growth_*` |
| AC-04 | M1 idempotency | Running migration twice produces zero errors, no duplicate schema | `psql -1` second run |
| AC-05 | Backfill dry-run | SELECT COUNT matches completed growth_profile_runs for ColombiaTours | §5.2 query |
| AC-06 | Backfill INSERT | Row count in growth_source_refs >= completed run count | §5.5 verification |
| AC-07 | Canary seed | growth_capabilities + growth_agent_definitions contain ColombiaTours pt-BR/BR rows | §6.4 verification |
| AC-08 | All 6 tables have RLS enabled | RLS = true for each table | §8.1 query |
| AC-09 | service_role has ALL, authenticated has SELECT | Correct grants on all 6 tables | §8.3 query |
| AC-10 | No orphaned FK references | All FK join counts = 0 | §7.6 query |
| AC-11 | updated_at triggers active | Triggers registered on mutable tables | §7.5 query |
| AC-12 | Rollback commands verified | Drop + delete commands produce clean state on staging | §9.5 verification |

### 11.2 Code quality gates

| ID | Gate | PASS condition |
|----|------|----------------|
| QC-01 | No secrets in SQL | `grep -i 'password\|secret\|key'` against all migration/script files returns no false positives |
| QC-02 | All SQL files committed | `git status` shows clean working tree |
| QC-03 | Validation evidence recorded | docs/validation/t1-phase3-db-plan-gate-2026-05-18.md exists with PASS verdict |
| QC-04 | No provider API URLs in SQL | `grep -i 'https\?://'` against migration SQL returns only legal references (no API endpoints) |

---

## 12. Implementation Order

```
T0 (this SPEC) — Phase 3 DB staging apply plan
    ↓
T1 (t_d025a79c) — DB plan gate: validate SPEC + SQL/RLS/rollback
    ↓
     [ STAGING MIGRATION APPLY — operator executes M1 ]
    ↓
T2 — Backfill + Canary seed apply
    ↓
T3 — Post-apply validation (RLS, data integrity, rollback verify)
    ↓
T4 — Validation report archived under docs/validation/
    ↓
T5 — Operator sign-off (human approval before any prod consideration)
    ↓
     [ BLOCKED: Production apply requires separate authorization ]
```

---

## 13. Watch Items

1. **Staging target availability** — If no staging Supabase instance exists, this SPEC produces a `BLOCKED_NEEDS_STAGING_TARGET` report only. The pipeline cannot advance to T2+ without a target.

2. **ColombiaTours in staging** — The pilot tenant's website must exist in staging. If the staging DB is a fresh fork of production, this is guaranteed. If it's a clean instance, ColombiaTours data must be seeded first.

3. **growth_profile_runs in staging** — Backfill depends on completed `growth_profile_runs` rows for ColombiaTours. If these don't exist in staging (fresh DB), the backfill INSERT produces zero rows, which is a correct no-op but must be documented.

4. **Cross-repo coordination** — If the Flutter repo (`weppa-cloud/bukeer-flutter`) has its own migration timeline, staging apply must not conflict with Flutter-owned migrations. Current governance (see `docs/ops/supabase-migration-governance.md`) allows Studio-originated shared DB migrations.

5. **Migration naming** — The current migration `20260518160000_growth_control_plane_governance_tables.sql` must not conflict with existing migrations on the staging target. Coordination with any parallel migrations is required.

6. **Evidence persistence** — All validation output (queries, row counts, structural checks) must be captured and saved under `docs/validation/` for audit trail.

7. **No GitHub CLI available** — PR operations are manual. Branch-based staging apply must be tracked via kanban artifacts, not GitHub PRs.