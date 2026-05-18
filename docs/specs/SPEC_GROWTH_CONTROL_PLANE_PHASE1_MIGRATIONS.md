# SPEC: Growth Control Plane Phase 1 — Supabase Migrations, Backfill, Canary

**Status:** Draft — executable SPEC for T0+ implementation
**Parent:** PR #570 Growth Agents Product Control Plane v1
**Version:** 1.0 (2026-05-18)
**Owner:** Bukeer Studio Growth OS — tech-validator
**Pilot tenant:** ColombiaTours (`website_id=894545b7-73ca-4dae-b76a-da5b6a3f8441`)
**GitHub:** EPIC #569 (trace target), branch `feat/growth-control-plane-phase0-v1`

## 0. Pre-requisites

### 0.1 Contract schemas already delivered (Phase 0/1a)

| Schema | File | Status | File |
|--------|--------|------|
| `ProfileBaseSchema` | Delivered in #569 | `packages/website-contract/src/schemas/growth-profile-base.ts` |
| `ContextPacketSchema` | Delivered in #569 | `packages/website-contract/src/schemas/growth-context-packet.ts` |
| `AgentResolutionSchema` | Delivered in #569 | `packages/website-contract/src/schemas/growth-agent-resolution.ts` |
| `GateVerdictSchema` | Delivered in #569 | `packages/website-contract/src/schemas/growth-agent-resolution.ts` |

### 0.2 Safety rules (inherited from Phase 0)

1. **No provider API calls** in any migration, backfill, or worker code.
2. **No secrets** in schemas or migration SQL (credential refs only).
3. **No deploy to production** until explicit human approval (this branch only).
4. **Explicit locale/market resolution** — implicit `es-CO`/`CO` fallback is BLOCKED.
5. **Workers consume ContextPacket only** — never Supabase raw tables.

---

## 1. Migration M1: Control-Plane Governance Tables

### 1.1 `growth_account_plans`

Strategic growth plan per account. Supersedes the hardcoded `OBJECTIVE` in `context-builder.ts`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK `gen_random_uuid()` | |
| `account_id` | `uuid` | FK → `accounts(id)`, NOT NULL | |
| `plan_name` | `text` | NOT NULL | Human-friendly name, e.g. "ColombiaTours Q2 2026" |
| `plan_version` | `text` | NOT NULL, DEFAULT 'v1' | |
| `objective` | `text` | NOT NULL | Overrides hardcoded OBJECTIVE in context-builder |
| `north_star_metric` | `text` | | e.g. "qualified_trip_requests/month" |
| `key_results` | `jsonb` | DEFAULT '[]', CHECK array | Array of `{metric, baseline, target, timeframe}` |
| `allowed_lanes` | `text[]` | NOT NULL | Lane names allowed for this plan |
| `budget_cents_monthly` | `integer` | | If applicable for paid media plans |
| `status` | `text` | CHECK: 'active', 'archived', 'draft' | |
| `metadata` | `jsonb` | DEFAULT '{}' | |
| `created_by` | `uuid` | FK → `auth.users(id)` | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Constraints:**
- UNIQUE `(account_id, plan_name, plan_version)`
- FK `account_id → public.accounts(id) ON DELETE CASCADE`

### 1.2 `growth_capabilities`

What each account/website/locale/market/lane is allowed to do.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK `gen_random_uuid()` | |
| `account_id` | `uuid` | FK → `accounts(id)`, NOT NULL | |
| `website_id` | `uuid` | FK → `websites(id)`, NOT NULL | |
| `locale` | `text` | NOT NULL | Exact, e.g. `'es-CO'`, `'pt-BR'` |
| `market` | `text` | NOT NULL | CHECK in `('CO','MX','US','CA','BR','EU','OTHER')` |
| `lane` | `text` | NOT NULL | CHECK in lane enum |
| `capability` | `text` | NOT NULL | e.g. `'transcreation'`, `'technical_remediation'` |
| `enabled` | `boolean` | NOT NULL DEFAULT false | |
| `canary_only` | `boolean` | NOT NULL DEFAULT true | Only allowed as canary |
| `max_concurrency` | `integer` | DEFAULT 1 | |
| `config_overrides` | `jsonb` | DEFAULT '{}' | Lane-specific config |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Constraints:**
- UNIQUE `(website_id, locale, market, lane, capability)`
- FK + CHECK combos match existing growth table conventions

### 1.3 `growth_provider_policies`

Which providers are approved for each account/website/locale/market.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK `gen_random_uuid()` | |
| `account_id` | `uuid` | FK → `accounts(id)`, NOT NULL | |
| `website_id` | `uuid` | FK → `websites(id)`, NOT NULL | |
| `provider` | `text` | NOT NULL | e.g. `'dataforseo'`, `'gsc'`, `'ga4'`, `'clarity'` |
| `provider_profile_type` | `text` | NOT NULL | e.g. `'keyword_research'`, `'traffic_analytics'` |
| `locale` | `text` | | NULL = all locales |
| `market` | `text` | CHECK market enum | |
| `credential_ref` | `text` | | Reference to vaulted credential, never raw secret |
| `consent_granted` | `boolean` | NOT NULL DEFAULT false | |
| `consent_granted_by` | `uuid` | FK → `auth.users(id)` | |
| `data_usage_policy` | `text` | CHECK: 'read_only', 'download', 'store_normalized' | |
| `rate_limit_burst` | `integer` | DEFAULT 60 | |
| `rate_limit_daily` | `integer` | DEFAULT 1000 | |
| `enabled` | `boolean` | NOT NULL DEFAULT false | |
| `notes` | `text` | | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Constraints:**
- UNIQUE `(website_id, provider, provider_profile_type, locale, market)`
- FK constraints

### 1.4 `growth_agent_definitions`

Agent/lane definitions with Zod schema references. Consumed by the agent resolution system.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK `gen_random_uuid()` | |
| `account_id` | `uuid` | FK → `accounts(id)`, NOT NULL | |
| `website_id` | `uuid` | FK → `websites(id)`, NOT NULL | |
| `agent_name` | `text` | NOT NULL | e.g. `'colombiatours-ptbr-transcreator'` |
| `lane` | `text` | NOT NULL, CHECK lane enum | |
| `profile_type` | `text` | NOT NULL | e.g. `'transcreation_agent'` |
| `locale` | `text` | NOT NULL | Primary locale the agent operates in |
| `market` | `text` | NOT NULL, CHECK market enum | |
| `schema_ref` | `text` | | Zod schema name, e.g. `'TranscreationAgentSchema'` |
| `allowed_actions` | `text[]` | NOT NULL DEFAULT '{}' | |
| `blocked_actions` | `text[]` | NOT NULL DEFAULT `ARRAY['call_provider_api_directly']` | |
| `kill_switch` | `boolean` | NOT NULL DEFAULT false | |
| `canary_only` | `boolean` | NOT NULL DEFAULT true | |
| `enabled` | `boolean` | NOT NULL DEFAULT false | |
| `config` | `jsonb` | DEFAULT '{}' | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Constraints:**
- UNIQUE `(website_id, agent_name, locale, market)`
- Agent resolution resolution step = exact match → locale_family_fallback (opt-in) → BLOCKED

### 1.5 `growth_source_refs`

Immutable source reference ledger. Every provider run produces one or more source refs that link run_id → fact_id → freshness status.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK `gen_random_uuid()` | |
| `account_id` | `uuid` | FK → `accounts(id)`, NOT NULL | |
| `website_id` | `uuid` | FK → `websites(id)`, NOT NULL | |
| `run_id` | `uuid` | FK → `growth_profile_runs(id)`, NOT NULL | |
| `source` | `text` | NOT NULL | e.g. `'growth_profiles'`, `'growth_signal_facts'` |
| `fact_id` | `uuid` | | The row in the target table |
| `fact_type` | `text` | | e.g. `'profile'`, `'signal_fact'`, `'freshness_entry'` |
| `locale` | `text` | NOT NULL | |
| `market` | `text` | NOT NULL, CHECK market enum | |
| `profile_type` | `text` | | |
| `freshness_status` | `text` | CHECK: 'fresh', 'stale', 'expired', 'unknown' | |
| `valid_from` | `timestamptz` | | |
| `valid_until` | `timestamptz` | | |
| `payload_hash` | `text` | | For dedup verification |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Constraints:**
- UNIQUE `(run_id, source, fact_id)` where fact_id IS NOT NULL
- INDEX ON `(website_id, locale, market)` for context-builder lookups
- This is INSERT-ONLY — no UPDATE, no DELETE

### 1.6 `growth_context_packet_log`

Immutable log of every ContextPacket sent to a worker. Required for audit, replay, and T6 learning.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK `gen_random_uuid()` | |
| `account_id` | `uuid` | FK → `accounts(id)`, NOT NULL | |
| `website_id` | `uuid` | FK → `websites(id)`, NOT NULL | |
| `context_snapshot_id` | `uuid` | FK → `growth_context_snapshots(id)` | |
| `worker_run_id` | `text` | | Hermes/Kanban run ID |
| `packet_version` | `text` | NOT NULL DEFAULT '1' | |
| `locale` | `text` | NOT NULL | |
| `market` | `text` | NOT NULL, CHECK market enum | |
| `lane` | `text` | NOT NULL | |
| `source_refs_included` | `text[]` | DEFAULT '{}' | Snapshot of refs in this packet |
| `verdict` | `text` | CHECK: 'PASS_AUTONOMOUS', 'PASS_WITH_WATCH', 'BLOCKED' | |
| `blocked_reasons` | `text[]` | DEFAULT '{}' | |
| `outcome` | `text` | | 'completed', 'failed', 'reclaimed', etc. |
| `token_estimate` | `integer` | DEFAULT 0 | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**Constraints:**
- INSERT-ONLY — immutable log
- INDEX ON `(website_id, locale, market, created_at DESC)`

---

## 2. RLS Policies

All six tables follow the same tenant-scoped RLS pattern used by existing growth tables:

```sql
-- Example: growth_source_refs RLS
ALTER TABLE public.growth_source_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY growth_source_refs_tenant_select
  ON public.growth_source_refs
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Service role: full access (used by provider-runner, context-builder)
-- Authenticated users: tenant-scoped reads only
-- No INSERT/UPDATE/DELETE from authenticated (service_role only for writes)
```

**All tables:** SELECT policies for authenticated users scoped via `user_roles`. INSERT/UPDATE/DELETE restricted to `service_role`.

---

## 3. ColombiaTours Source Ref Backfill Strategy

### 3.1 Scope

Backfill `growth_source_refs` from existing `growth_profile_runs` for ColombiaTours only.

### 3.2 Backfill query (dry-run first)

```sql
-- Dry-run: count rows to backfill
SELECT COUNT(*) FROM public.growth_profile_runs
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND status = 'completed';
```

```sql
-- Insert backfill
INSERT INTO public.growth_source_refs (
  account_id, website_id, run_id, source, fact_id, fact_type,
  locale, market, profile_type, freshness_status,
  valid_from, valid_until
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
  NULL AS fact_id,  -- Will be updated after fact linking
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
  gpr.valid_until
FROM public.growth_profile_runs gpr
WHERE gpr.website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND gpr.status = 'completed';
```

### 3.3 Verification

```sql
-- Expected: every completed growth_profile_runs row → 1+ growth_source_refs row
-- Verification query:
SELECT pr.provider, pr.profile_type, COUNT(pr.id) AS runs, COUNT(sr.id) AS refs
FROM public.growth_profile_runs pr
LEFT JOIN public.growth_source_refs sr ON sr.run_id = pr.id
WHERE pr.website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND pr.status = 'completed'
GROUP BY pr.provider, pr.profile_type
ORDER BY pr.provider;
```

### 3.4 Freshness evaluation

After backfill, evaluate freshness of each source ref:
- `fresh` if `valid_until > now()` or `refresh_window` not expired
- `stale` if within 2× TTL grace period
- `expired` if past TTL
- `unknown` if no valid_until set

---

## 4. Dry-Run Canary — ColombiaTours pt-BR

### 4.1 Canary scope

Single entity: ColombiaTours `es-CO/CO → pt-BR/BR` transcreation agent definition.

### 4.2 Pre-requisite data

Insert seed row into `growth_capabilities`:
```sql
INSERT INTO public.growth_capabilities (
  account_id, website_id, locale, market, lane,
  capability, enabled, canary_only
)
VALUES (
  (SELECT account_id FROM public.websites WHERE id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'),
  '894545b7-73ca-4dae-b76a-da5b6a3f8441',
  'pt-BR', 'BR', 'transcreation',
  'transcreation', true, true
);
```

Insert seed row into `growth_agent_definitions`:
```sql
INSERT INTO public.growth_agent_definitions (
  account_id, website_id, agent_name, lane, profile_type,
  locale, market, allowed_actions, blocked_actions, canary_only, enabled
)
VALUES (
  (SELECT account_id FROM public.websites WHERE id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'),
  '894545b7-73ca-4dae-b76a-da5b6a3f8441',
  'colombiatours-ptbr-transcreator',
  'transcreation',
  'transcreation_agent',
  'pt-BR', 'BR',
  ARRAY['observe', 'prepare', 'safe_apply']::text[],
  ARRAY['call_provider_api_directly', 'paid_mutation', 'experiment_activation']::text[],
  true, true
);
```

### 4.3 Canary test procedure (dry-run only)

1. **Dry-run migration M1** against local Supabase or CI database: `supabase db diff --linked`
2. **Dry-run backfill** (SELECT COUNT, preview INSERT as SELECT-only)
3. **Verify gate chain** using context-builder with explicit `es-CO → pt-BR/BR`:
   - Source locale: `es-CO, target locale = pt-BR, target market = BR → should PASS
   - Missing locale → should BLOCK with "implicit es-CO fallback is forbidden"
   - `pt-BR/BR` mismatch (e.g. pt-BR/CO) → should BLOCK
4. **Verify block paths**:
   - No source_refs → BLOCKED status
   - No `growth_capabilities` row → BLOCKED
   - No `growth_agent_definitions` row → BLOCKED
5. **No actual Supabase writes** in dry-run mode — rollback all INSERTs.

### 4.4 Acceptance gate for canary

| Check | Expectation | Verification method |
|-------|-------------|---------------------|
| M1 migration runs idempotently | Rerun-safe, no errors | `supabase migration up` 2× |
| Backfill SELECT matches run count | Row count = completed runs | COUNT query |
| RLS permits tenant-scoped reads | auth.uid() sees own rows | `EXPLAIN SELECT` with RLS |
| Context-builder `pt-BR/BR` PASS | All gates pass | Unit test or dry-run |
| Context-builder implicit es-CO BLOCK | Throws error | Unit test |
| Canary seed data persists | Caps row exists | SELECT |
| No provider calls in migration | Static SQL only | Code review |
| No secrets in migration SQL | No credential strings | `grep -i 'password\\|secret\\|key'` |

---

## 5. Rollback Plan

### 5.1 Migration rollback

Each migration block is wrapped in explicit SAVEPOINT/ROLLBACK:

```sql
-- For any migration step that fails mid-way:
-- Statement-level rollback using transactions:
BEGIN;
  -- ... migration SQL ...
  -- If error: ROLLBACK;
COMMIT;
```

For production rollbacks after migration is applied:
```sql
-- V1 rollback: drop tables (only if no data loss acceptable)
DROP TABLE IF EXISTS public.growth_context_packet_log;
DROP TABLE IF EXISTS public.growth_source_refs;
DROP TABLE IF EXISTS public.growth_agent_definitions;
DROP TABLE IF EXISTS public.growth_provider_policies;
DROP TABLE IF EXISTS public.growth_capabilities;
DROP TABLE IF EXISTS public.growth_account_plans;
```

**Rollback decision table:**

| Scenario | Action | Risk |
|----------|--------|------|
| Migration SQL error mid-apply | Automatic ROLLBACK within transaction | None — atomic |
| Migration applied, no data written | `DROP TABLE IF EXISTS` | Low — no data loss |
| Migration applied, backfill completed | `DROP TABLE` + reapply later | Medium — lose backfill, re-runnable |
| RLS policy error | `DROP POLICY` | Low |
| Canary seed data written | `DELETE FROM ... WHERE website_id = '894...'` | Low — re-seedable |

### 5.2 Backfill rollback

```sql
-- Rollback backfill:
DELETE FROM public.growth_source_refs
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND fact_type = 'profile_run';
```

### 5.3 Canary rollback

```sql
DELETE FROM public.growth_capabilities
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND capability = 'transcreation';

DELETE FROM public.growth_agent_definitions
WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
```

---

## 6. Acceptance Criteria (Full Phase 1)

### 6.1 Functional gates

| ID | Gate | PASS condition |
|----|------|----------------|
| AC-01 | M1 migration | `supabase migration up` succeeds, `supabase db diff` shows no pending changes |
| AC-02 | M1 idempotency | Running migration twice produces same schema (no errors, no duplicates) |
| AC-03 | Backfill dry-run | SELECT COUNT matches expected completed growth_profile_runs for ColombiaTours |
| AC-04 | Backfill INSERT | Row count in growth_source_refs ≥ completed run count |
| AC-05 | RLS tenant isolation | Authenticated user from tenant A cannot read tenant B's rows |
| AC-06 | Context-builder PASS | `es-CO → pt-BR/BR` yields VALID context packet with source_refs |
| AC-07 | Context-builder BLOCK | Missing locale/market → explicit error, implicit fallback forbidden |
| AC-08 | Canary seed data | `growth_capabilities` and `growth_agent_definitions` contain canary row |
| AC-09 | No provider calls | Migration SQL contains no provider API URLs or credential strings |
| AC-10 | Rollback verified | DROP + DELETE rollback commands produce clean state |

### 6.2 Code quality gates

| ID | Gate | PASS condition |
|----|------|----------------|
| QC-01 | TypeScript compile | `npm run typecheck` passes in `@bukeer/website-contract` |
| QC-02 | Migration naming | Follows `202605NNNNNN_descriptive_name.sql` convention |
| QC-03 | CHECK | Existing CHECK constraint patterns | New tables reuse existing market/lane enums (`NOT VALID` for prod hotfixes, direct for new tables) |
| QC-04 | No Zod regressions | `npm run typecheck` in root (watch item from T6 — may fail if root deps missing) |

### 6.3 Evidence requirements

After Phase 1 completion, deliver:
1. Migration SQL files in `supabase/migrations/`
2. Backfill verification output (row counts by provider)
3. Canary test results (PASS/BLOCK per gate)
4. Review of context-builder against new tables
5. Updated `docs/INDEX.md` with this SPEC reference

---

## 7. Implementation Order

```
Phase 1a (already done) — Zod contract schemas (PR #569)
    ↓
Phase 1b (this SPEC) — Supabase migrations, RLS, backfill, canary
    ↓
Phase 1c — Integrate with context-builder to read from new tables
    ↓
Phase 1d — Unit tests for gate chain with new tables
    ↓
Phase 1e — T6 learning run materialization
```

## 8. Watch Items (from T6)

1. Root `npm run typecheck` may fail if root dependencies are missing — package-level check at `@bukeer/website-contract` is the verified gate.
2. GitHub issue/PR automation unavailable — manual handoff required.
3. `normalizeGrowthLocale` defaults exist in `locale-targeting.ts` — this SPEC hardens only the context-builder path, not every caller globally.
4. Migration naming must not conflict with existing migrations in main (coordination required before PR merge).