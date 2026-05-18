# T2 Staging Apply — BLOCKED: No Staging/Dev Supabase Target

**Kanban:** `t_0ec329b3`
**Parent:** `t_d025a79c` (T1 DB Plan Gate — PASS_WITH_WATCH)
**SPEC:** `SPEC_GROWTH_CONTROL_PLANE_PHASE3_DB_STAGING_APPLY.md`
**Date:** 2026-05-18
**Worker:** ops

---

## Verdict: BLOCKED_NEEDS_STAGING_TARGET

**No migration, backfill, or seed commands were executed.**

The pre-flight staging-target check found zero explicit staging/dev Supabase targets available in this session'session's environment. Per Phase 3 Non-Negotiable #7 (SPEC Section 2, rule 7), the result is BLOCKED_NEEDS_STAGING_TARGET — no workaround, no fallback to production.

---

## Staging Target Audit

| Check | Result |
|-------|--------|
| `.env.local` file exists | MISSING |
| `.dev.vars` file exists | MISSING |
| `NEXT_PUBLIC_SUPABASE_URL` env var | UNSET |
| `SUPABASE_SERVICE_ROLE_KEY` env var | UNSET |
| `STAGING_SUPABASE_URL` env var | UNSET |
| `DEV_SUPABASE_URL` env var | UNSET |
| `SUPABASE_STAGING_URL` env var | UNSET |
| `NEXT_PUBLIC_STAGING_SUPABASE_URL` env var | UNSET |
| `TEST_SUPABASE_URL` env var | UNSET |
| Example config files contain placeholders only | CONFIRMED |
| Wrangler staging/dev envs (CF Worker) define workers_dev vars only — no DB URL | CONFIRMED |

**Conclusion:** No valid staging/dev Supabase database URL or connection string is present in any env file, env var, or config.

---

## Artifacts Ready (NOT applied)

These artifacts remain in committed state, ready for apply once a staging target is provisioned:

| Artifact | File | Action |
|----------|------|--------|
| Migration M1 — 6 governance tables | `supabase/migrations/20260518160000_growth_control_plane_governance_tables.sql` | `supabase db push` or direct SQL apply |
| Backfill — ColombiaTours source_refs | `scripts/sql/growth-source-refs-backfill-colombiatours.sql` | Uncomment INSERT, then execute |
| Canary seed — Canary seed | Canary seed — ColombiaTours pt-BR capabilities + agent defs | Execute |
| Rollback script | `scripts/sql/growth-control-plane-rollback.sql` | Available on demand |

---

## Pre-Apply Checklist (from SPEC Section 3)

Before a staging target is provided, the operator must ensure:

- [ ] **Supabase project reference** (`project_ref` string — e.g. `abcdefghijklmnopqrst`)
- [ ] **Staging DB connection string** (`postgresql://user:***@host:5432/postgres`)
- [ ] **Supabase CLI DB URL** (`SUPABASE_DB_URL` for `supabase db push`)
- [ ] **Staging instance has Phase 0/1/2 migrations applied** (prerequisite function `public.touch_growth_backlog_updated_at()` must exist — see WATCH-01 from T1)

---

## T1 Watch Items (Unresolved)

The T1 plan gate identified two watch items that need operator attention **before** apply to a clean staging instance:

### WATCH-01: Prerequisite function `touch_growth_backlog_updated_at()` (MEDIUM)

The migration creates triggers that reference `public.touch_growth_backlog_updated_at()`. This function was created by a prior Phase 0/1/2 migration. On a clean staging instance (not a production fork), the function does not exist and trigger creation will fail.

**Recommended fix:** Run pre-flight verification:
```sql
SELECT proname, pronargs
  pg_proc
WHERE proname = 'touch_growth_backlog_updated_at'
  AND pronamespace = 'public'::regnamespace;
```
If missing, apply prior Phase 1/2 migrations first, or add a `create function if not exists` wrapper at the top of the migration.

### WATCH-02: Deferrable constraint `growth_source_refs_run_fact_uniq` (LOW)

The T1 gate identified that the SPEC's Section 7.3 constraint validation does not verify `is_deferrable` and `initially_deferred` flags on `growth_source_refs_run_fact_uniq`.

**Recommended post-apply verification:**
```sql
SELECT
  conname AS constraint_name,
  condeferrable AS is_deferrable,
  condeferred AS initially_deferred
FROM pg_constraint
WHERE conrelid = 'public.growth_source_refs'::regclass
  AND conname = 'growth_source_refs_run_fact_uniq';
```
**Expected:** `is_deferrable = true`, `initially_deferred = true`.

---

## Staging Provisioning Requirements (from SPEC Section 3.1)

The staging Supabase instance must:

1. **Share the same schema shape** as production (same tables, indexes, RLS policies from Phase 0/1/2).
2. **Have the prerequisite function** `public.touch_growth_backlog_updated_at()` available (from Phase 1/2 migration).
3. **Have `websites` and `user_roles` tables** populated for ColombiaTours tenant (for RLS verification).
4. **Be isolated from production** — not a direct fork of production unless read-only access is confirmed.
5. **Have `service_role` API key** available for the apply operator (never the production key).

---

## Post-Apply Verification (for the next worker — T3)

Once a staging target is provisioned and this task is unblocked, the apply operator should run:

1. **Migration:**
   ```bash
   supabase db push --db-url "$SUPABASE_DB_URL"
   # or direct psql:
   psql "$STAGING_DB_URL" -f supabase/migrations/20260518160000_growth_control_plane_governance_tables.sql
   ```

2. **Structural verification:**
   ```sql
   -- Verify all 6 tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'growth_account_plans',
       'growth_capabilities',
       'growth_provider_policies',
       'growth_agent_definitions',
       'growth_source_refs',
       'growth_context_packet_log'
     );
   ```

3. **RLS verification:**
   ```sql
   -- Confirm RLS enabled on all 6 tables
   SELECT relname, relrowsecurity FROM pg_class
   WHERE relname IN (
     'growth_account_plans',
     'growth_capabilities',
     'growth_provider_policies',
     'growth_agent_definitions',
     'growth_source_refs',
     'growth_context_packet_log'
   ) AND relnamespace = 'public'::regnamespace;
   ```

4. **Backfill (ColombiaTours):** Uncomment INSERT in `scripts/sql/growth-source-refs-backfill-colombiatours.sql` and execute.

5. **Canary seed** — Execute `scripts/sql/growth-canary-seed-colombiatours-ptbr.sql`.

6. **WATCH-02 deferrable constraint check** — Run the pg_constraint query above.

---

## Rollback Readiness (from SPEC Section 9)

The rollback script `scripts/sql/growth-control-plane-rollback.sql` is committed and ready. No rollback action was taken because no apply was performed.

---

## Summary

| Gate | Status |
|------|--------|
| Staging target presence | **BLOCKED** |
| Migration apply | — (skipped) |
| Backfill apply | — (skipped) |
| Canary seed apply | — (skipped) |
| Post-apply verification | — (skipped) |
| Rollback | — (not needed) |
| T1 WATCH-01 resolution | PENDING (operator) |
| T1 WATCH-02 verification | PENDING (post-apply) |

**Final Verdict: BLOCKED_NEEDS_STAGING_TARGET**

No migration, backfill, or seed commands were executed against any database.

---

## Next

1. Operator provisions staging/dev Supabase instance with Phase 0/1/2 schema.
2. Resolve T1 WATCH-01 (prerequisite function) before or during staging apply.
3. Unblock this task (`t_0ec329b3`) with the staging DB URL provided.
4. T2 worker re-runs: apply migration → backfill → canary seed → verify.
5. T3 worker runs post-apply validation (RLS, data integrity, rollback verify).
