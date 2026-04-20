# Pilot Theme Rollout — `theme_designer_v1` (ColombiaTours)

**Status:** Active  
**Date:** 2026-04-20  
**Scope:** EPIC #250 / Issue #259 rollout mechanics for designer reference theme in pilot  
**Tenant:** ColombiaTours  
**Related:** [[ADR-027]], [[pilot-runbook-colombiatours]], [[product-landing-v1-runbook]], [[studio-editor-v2-rollback]]

---

## 1. Objective

Roll out the designer reference theme (`colombia-tours-caribe`) with a reversible path:

1. Persist pre-flip `websites.theme` snapshot.
2. Apply new theme via controlled SQL/RPC path.
3. Enable website-scoped rollout flag.
4. Revalidate affected public routes.

Rollback must follow:

1. Flag off.
2. Restore snapshot.
3. Revalidate.

---

## 2. Preconditions

- Caller has `super_admin` role in `user_roles`.
- Target website and account IDs are known.
- Git SHA of the rollout commit is known.
- Revalidation secret is available for `/api/revalidate`.

---

## 3. Roll-forward (pilot only)

### 3.1 Apply designer theme + snapshot + flag on

Use the controlled function (creates snapshot first, then writes theme, then enables flag):

```sql
select public.apply_designer_reference_theme(
  p_account_id := '<ACCOUNT_UUID>',
  p_website_id := '<WEBSITE_UUID>',
  p_theme      := '<CARIBE_THEME_JSON>'::jsonb,
  p_git_sha    := '<GIT_SHA>',
  p_reason     := 'pilot_theme_rollout_colombiatours'
);
```

Expected return:
- `success=true`
- `snapshot_id=<uuid>`
- `flag_enabled=true`

### 3.2 Verify flag resolution

```sql
select public.resolve_theme_designer_v1(
  p_account_id := '<ACCOUNT_UUID>',
  p_website_id := '<WEBSITE_UUID>'
);
```

Expected:
- `enabled=true`
- `scope='website'` (or `account` if intentionally account-wide)

### 3.3 Revalidate public paths

Use existing mechanism (same contract as current rollout docs):

```bash
curl -s -X POST "https://<host>/api/revalidate?path=/&secret=$REVALIDATE_SECRET"
curl -s -X POST "https://<host>/api/revalidate?path=/paquetes/<slug>&secret=$REVALIDATE_SECRET"
curl -s -X POST "https://<host>/api/revalidate?path=/actividades/<slug>&secret=$REVALIDATE_SECRET"
curl -s -X POST "https://<host>/api/revalidate?path=/blog/<slug>&secret=$REVALIDATE_SECRET"
```

For broad refreshes, use `scripts/revalidate-all-tenants.sh` from existing flow.

---

## 4. Rollback (flag off + restore snapshot + revalidate)

### 4.1 Flag off

```sql
select public.toggle_theme_designer_v1(
  p_account_id := '<ACCOUNT_UUID>',
  p_website_id := '<WEBSITE_UUID>',
  p_enabled    := false
);
```

### 4.2 Restore latest or specific snapshot

```sql
-- pick snapshot
select id, website_id, git_sha, created_at, restored_at
from public.pilot_theme_snapshots
where website_id = '<WEBSITE_UUID>'
order by created_at desc
limit 5;

-- restore
select public.restore_pilot_theme_snapshot(
  p_snapshot_id := '<SNAPSHOT_UUID>',
  p_disable_flag := true
);
```

### 4.3 Revalidate

Trigger the same revalidation endpoints used in roll-forward.

---

## 5. Verification checklist

- `resolve_theme_designer_v1` returns expected state.
- `websites.theme` matches intended payload (rolled forward or restored).
- Public home + product + blog pages render expected palette after revalidation.
- Snapshot row has expected `git_sha` and `restored_at` state.

---

## 6. Incident note template

```text
🟠 Designer Theme v1 rollback executed
account=<id> website=<id> snapshot=<id>
reason=<incident or validation signal>
flag_state=off
revalidation=triggered
next_action=<owner + ETA>
```

---

## 7. Guardrails

- Do not run destructive DB commands (`drop`, `truncate`) during rollback.
- Do not edit `websites.theme` manually when controlled functions are available.
- Keep rollout website-scoped for pilot unless an explicit account-wide approval exists.
