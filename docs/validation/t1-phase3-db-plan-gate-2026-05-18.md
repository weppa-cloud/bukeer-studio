# T1 DB Plan Gate — Phase 3 DB Staging Apply Validation

**Kanban:** `t_d025a79c`
**Parent:** T0 SPEC `t_6279ee1c` → `docs/specs/SPEC_GROWTH_CONTROL_PLANE_PHASE3_DB_STAGING_APPLY.md`
**Date:** 2026-05-18
**Validator:** tech-validator

---

## Verdict: PASS_WITH_WATCH → OPERATOR_PATCHED_FOR_T2

The T0 SPEC and associated migration/script artifacts pass all structural, architectural, and safety checks. Two watch items were identified by T1 and patched by Neo/operator before T2:

- `WATCH-01` resolved in `docs/specs/SPEC_GROWTH_CONTROL_PLANE_PHASE3_DB_STAGING_APPLY.md`: added pre-flight query for `public.touch_growth_backlog_updated_at()` plus `BLOCKED_MISSING_DB_PREREQUISITE` verdict.
- `WATCH-02` resolved in the same SPEC: added `pg_constraint.condeferrable` / `pg_constraint.condeferred` validation plus explicit expected flags for `growth_source_refs_run_fact_uniq`.

| Section | Check | Result |
|---------|-------|--------|
| 1 | RLS tenant scoping (user_roles.account_id isolation) | PASS |
| 2 | service_role-only writes (authenticated users = SELECT only) | PASS |
| 3 | Indexes (coverage, cardinality, no missing scope indexes) | PASS |
| 4 | updated_at triggers (mutable tables only, INSERT-ONLY skipped) | PASS |
| 5 | Rollback safety (full/partial, transactional, re-runnable) | PASS |
| 6 | No prod writes (multi-layer block gate) | PASS |
| 7 | ADR-003 alignment (contract-first, Zod schemas referenced) | PASS |
| 8 | ADR-009 alignment (multi-tenant via user_roles.account_id) | PASS |
| 9 | No secrets in SQL (no passwords, API keys, tokens) | PASS |
| 10 | No provider API URLs in SQL | PASS |
| 11 | All SQL files committed (clean working tree) | PASS |
| 12 | Backfill script safety (commented-out INSERT, SHA hash) | PASS |
| 13 | Canary seed safety (NOT EXISTS, dynamic account_id, canary_only) | PASS |
| 14 | Acceptance criteria with PASS/BLOCK gates | PASS |
| **W** | Prerequisite function `touch_growth_backlog_updated_at()` | **WATCH** |
| **W** | Deferrable constraint validation missing from SQL checks | **WATCH** |
| — | Verdict | **PASS_WITH_WATCH** |

---

## 1. RLS Tenant Scoping — PASS

**Evidence:** Migration SQL lines 358–411

The migration uses a `DO` block to create the same two-policy pattern on all 6 governance tables:

1. `<table>_service_all` — `FOR ALL` with `USING (auth.role() = 'service_role')` and `WITH CHECK (auth.role() = 'service_role')`
2. `<table>_tenant_read` — `FOR SELECT TO authenticated` with `USING (EXISTS ...)` scoped to `user_roles.account_id = <table>.account_id AND user_id = auth.uid() AND is_active = true`

**Correctness checks:**
- Tenant isolation via `user_roles.account_id` matches the established pattern from prior growth tables (ADR-009)
- `user_roles.is_active = true` guard prevents inactive users from reading
- `WITH CHECK` on service_all prevents authenticated users from writing even if service_role policy has a leak
- All 6 tables have `account_id` FK to `public.accounts(id)` — the isolation key is consistent

---

## 2. service_role-only Writes — PASS

**Evidence:** Migration SQL lines 382–408

Grants:
- `SELECT` to `authenticated`
- `ALL` to `service_role`

No `anon` grants. No `INSERT`/`UPDATE`/`DELETE` to `authenticated`. The `service_all` policy covers all commands with `for all`.

---

## 3. Indexes — PASS

**Evidence:** Migration SQL lines 247–260, 309–316, 417–427

| Table | Indexes | Coverage |
|-------|---------|----------|
| growth_source_refs | `scope_idx`, `run_idx`, `fact_idx` (partial), `freshness_idx` (partial) | website_id + locale + market + created_at scans; run_id FK joins; source + fact_id lookups; freshness expiry queries |
| growth_context_packet_log | `scope_idx`, `snapshot_idx`, `verdict_idx` | website_id + locale + market + created_at scans; context_snapshot_id joins; verdict filtering |
| growth_account_plans | `tenant_idx` | account_id + status + created_at descending |
| growth_capabilities | `tenant_idx` | account_id + website_id + locale + market + lane |
| growth_provider_policies | `tenant_idx` | account_id + website_id + provider |
| growth_agent_definitions | `tenant_idx` | website_id + lane + locale + market + enabled |

No missing indexes identified. The partial indexes on `growth_source_refs` (`WHERE fact_id IS NOT NULL`, `WHERE freshness_status IN ('fresh', 'stale')`) are correctly scoped.

---

## 4. updated_at Triggers — PASS

**Evidence:** Migration SQL lines 322–348

| Table | Trigger | Rationale |
|-------|---------|-----------|
| growth_account_plans | `trg_growth_account_plans_touch` | Mutable — plan updates expected |
| growth_capabilities | `trg_growth_capabilities_touch` | Mutable — enable/disable, config changes |
| growth_provider_policies | `trg_growth_provider_policies_touch` | Mutable — consent, rate limits change |
| growth_agent_definitions | `trg_growth_agent_definitions_touch` | Mutable — kill_switch, config changes |
| growth_source_refs | (none) | INSERT-ONLY — correct to skip |
| growth_context_packet_log | (none) | INSERT-ONLY — correct to skip |

Each trigger fires `BEFORE UPDATE FOR EACH ROW` and calls `public.touch_growth_backlog_updated_at()`.

---

## 5. Rollback Safety — PASS

**Evidence:** `scripts/sql/growth-control-plane-rollback.sql` + SPEC Section 9

**Three rollback options provided:**

| Scenario | SQL | Risk | Re-runnable |
|----------|-----|------|-------------|
| Full rollback | `DROP TABLE IF EXISTS ... CASCADE` (6 tables) | Destructive — all data lost | Yes (re-apply from scratch) |
| Backfill-only rollback | `DELETE FROM growth_source_refs WHERE website_id = '894...'` | Low — only pilot tenant data | Yes (re-backfill) |
| Canary-only rollback | `DELETE FROM growth_capabilities + growth_agent_definitions` | Low — only canary seed | Yes (re-seed) |

**SPEC Section 9.1** provides a rollback decision table with 7 scenarios. All scenarios include post-rollback verification queries.

**Correctness:**
- `DROP TABLE ... CASCADE` correctly removes dependent objects (indexes, triggers, policies)
- Backfill-only and canary-only rollbacks use scoped DELETEs with `website_id` filter — no risk of collateral data loss on multi-tenant databases
- Transactional wrapping: all options use `BEGIN/COMMIT` (rollback script) or can be wrapped

---

## 6. No Prod Writes — PASS

**Evidence:** SPEC Sections 2, 3.3, 10

**Three-layer production block:**

1. **Non-negotiable (Section 2):** "NO production migration apply" — explicitly enumerated rule #1
2. **Staging target gate (Section 3.3):** If no staging target, output is `BLOCKED_NEEDS_STAGING_TARGET` with no workaround
3. **Prod-block gate (Section 10):** 4-rule detection function + operator confirmation + blocked output box

**The gate is comprehensive:**
- Explicit staging credentials required
- Pre-flight verification queries confirm target is NOT production
- If ambiguous, `NEEDS_OPERATOR_CONFIRMATION` with written acknowledgement
- No inference, no fallback, no override path

---

## 7. ADR-003 Alignment (Contract-First Validation) — PASS

The SPEC does not introduce new API routes, so no runtime Zod validation changes are needed. The validation SQL queries (Section 7) verify column types, constraints, and data integrity structurally — this is appropriate for a DB staging gate.

The `@bukeer/website-contract` Zod schemas remain the SSOT for any future Growth OS agent resolution consuming these tables. The migration SQL column types match the expected types from existing Phase 1/2 SPECs.

---

## 8. ADR-009 Alignment (Multi-Tenant Scoping) — PASS

- All 6 tables have `account_id` FK to `public.accounts(id) ON DELETE CASCADE`
- All RLS policies use `user_roles.account_id` for tenant-scoped reads
- Indexes include `account_id` and/or `website_id` for efficient tenant-scoped lookups
- `canary_only` column on `growth_capabilities` and `growth_agent_definitions` provides tenant-level safety gating

---

## 9. No Secrets in SQL — PASS

Audited all 4 SQL files for `password`, `secret`, `key`, `token`, `credential`:

| File | Findings |
|------|----------|
| Migration M1 | None. `credential_ref` column stores vaulted references only |
| Backfill script | None. No secrets in any commented or uncommented SQL |
| Canary seed | None |
| Rollback | None |

---

## 10. No Provider API URLs in SQL — PASS

Audited all 4 SQL files for `https?://`:

| File | Findings |
|------|----------|
| Migration M1 | None |
| Backfill script | None |
| Canary seed | None |
| Rollback | None |

---

## 11. Clean Git Working Tree — PASS

```
# git status --short → (empty)
```

All migration and script files committed. No uncommitted changes.

---

## 12. Backfill Script Safety — PASS

**File:** `scripts/sql/growth-source-refs-backfill-colombiatours.sql`

**Safety features:**
- All SQL is commented out by default — operator must explicitly uncomment to execute
- `payload_hash` uses SHA-256 for dedup verification
- `COALESCE(gpr.locale, 'es-CO')` and `COALESCE(gpr.market, 'CO')` provide safe defaults
- INSERT is wrapped in `BEGIN/COMMIT` for atomicity

---

## 13. Canary Seed Safety — PASS

**File:** `scripts/sql/growth-canary-seed-colombiatours-ptbr.sql`

**Safety features:**
- `NOT EXISTS` subqueries for idempotency
- `account_id` fetched dynamically from `websites` table (no hardcoded UUID)
- `canary_only = true` — not production
- `blocked_actions` includes `call_provider_api_directly`, `paid_mutation`, `experiment_activation`

---

## 14. Acceptance Criteria — PASS

SPEC Section 11 defines 12 staging apply gates (AC-01 through AC-12) and 4 code quality gates (QC-01 through QC-04) — all with explicit PASS conditions and verification methods.

---

## WATCH Items

### WATCH-01: Prerequisite function `touch_growth_backlog_updated_at()`

**Severity:** MEDIUM
**File:** Migration M1, lines 327, 334, 341, 348

The migration references `public.touch_growth_backlog_updated_at()` in trigger definitions:

```sql
create trigger trg_growth_account_plans_touch
  before update on public.growth_account_plans
  for each row execute function public.touch_growth_backlog_updated_at();
```

This function was created by a prior migration (Phase 0/1/2). On a **clean staging instance** (not a production fork), the function does not exist, and the trigger creation will fail.

**Recommendation:** Add to SPEC Section 3.2 (pre-flight verification):

```sql
SELECT proname, pronargs
FROM pg_proc
WHERE proname = 'touch_growth_backlog_updated_at'
  AND pronamespace = 'public'::regnamespace;
```

If the function doesn't exist, apply prior Phase 1/2 migrations first, or create the function as a migration dependency.

**Upstream fix:** Add a `create function if not exists` wrapper at the top of the migration, or document the dependency chain explicitly in the pre-flight checks.

---

### WATCH-02: Deferrable constraint not verified in validation SQL

**Severity:** LOW
**File:** SPEC Section 7.3 (constraint validation)

The `growth_source_refs` table uses a `DEFERRABLE INITIALLY DEFERRED` unique constraint:

```sql
constraint growth_source_refs_run_fact_uniq
  unique (run_id, source, fact_id)
  deferrable initially deferred
```

Section 7.3's constraint validation query (`information_schema.table_constraints`) does not verify that the `is_deferrable` and `initially_deferred` flags are correctly set. A non-deferred version of this constraint would cause INSERT failures in transactional backfills where rows are inserted before all referenced facts.

**Recommendation:** Add to Section 7.3:

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

## Summary

| Gate | Status |
|------|--------|
| Migration SQL review | PASS |
| RLS tenant isolation | PASS |
| Service_role write enforcement | PASS |
| Indexes & triggers | PASS |
| Rollback plan & scripts | PASS |
| Production block gate | PASS |
| ADR-003 / ADR-009 alignment | PASS |
| Secret / URL leakage | PASS |
| Acceptance criteria completeness | PASS |
| Pre-requisite function dependency | **WATCH** |
| Deferrable constraint verification | **WATCH** |

**Final Verdict: PASS_WITH_WATCH**

Both watch items should be resolved before T2 (staging apply) executes on a clean staging target. They are non-blocking for the gate decision itself — the SPEC is architecturally sound and safe to proceed with.

---

## Next

- T2 (`t_0ec329b3`) — Apply staging migration if safe target exists. Must resolve WATCH-01 (function dependency) before apply to a clean staging instance.
- T3 — Post-apply validation (RLS, data integrity, rollback verify).
- This validation document fulfills QC-03.
