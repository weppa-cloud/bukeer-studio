# EPIC #190 Certification Evidence — Run 2026-04-18

**Epic:** [#190](https://github.com/weppa-cloud/bukeer-studio/issues/190)  
**Checklist used:** [epic-190-certification-checklist](../../qa/studio-unified-product-editor/epic-190-certification-checklist.md)  
**Environment:** Supabase project connected via MCP (`postgres` session) + local workspace session pool (`s1`)  
**Execution date:** 2026-04-18

## Window

- `commit_start`: `9f0f4f0` (current HEAD at execution start)
- `commit_end`: `9f0f4f0` (no code changes made during execution)
- `working_tree`: dirty pre-existing changes (not modified by this run except evidence docs)

---

## 1) Automated checks (Day 1)

### 1.1 Session pool baseline

Command:

```bash
npm run session:list
```

Result:

- `s1..s4` all `FREE`.

### 1.2 Unit/Jest

Command:

```bash
npm run test
```

Result: **FAIL**

- Summary: `23 failed, 46 passed, 69 total` suites.
- Summary: `9 failed, 335 passed, 344 total` tests.
- Notable failures:
  - `__tests__/lib/products/normalize-product.test.ts` (unexpected `priceCurrency` in payload)
  - `__tests__/schema/booking-contracts.test.ts`
  - `__tests__/lib/supabase/package-aggregated.test.ts`
  - `__tests__/api/ai-editor-routes.test.ts` (expected flat costs vs received `0`)
  - Multiple Playwright CT files executed under Jest context (`Playwright Test needs to be invoked via 'npx playwright test'`)

### 1.3 Component Testing (Playwright CT)

Command:

```bash
npm run test:ct
```

Result: **PASS**

- `122 passed (13.7s)`.

### 1.4 E2E smoke (session pool)

Initial wrappers with grep (`session:run`) were unstable/blocked. Final successful command:

```bash
eval "$(bash scripts/session-acquire.sh)"
SESSION_NAME="$SESSION_NAME" PORT="$PORT" npm run test:e2e:session -- e2e/tests/marketing-editor-smoke.spec.ts --project=chromium --workers=1
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

Result: **PASS (with dataset skips)**

- `2 passed, 2 skipped`.
- Passed:
  - setup/auth
  - `reconciliation surface is reachable for super_admin`
- Skipped:
  - package-dependent smoke cases (`No package_kits in test account — seed first` path in spec)

---

## 2) Data/RPC certification (Day 2)

All write validations executed in explicit transactions with `ROLLBACK`.

## 2.1 R7 flags + resolve

Validation:

- `resolve_studio_editor_v2(account, website)` before and after `toggle_studio_editor_v2(...)`.
- `toggle` with website scope and fields `['description','program_highlights']`.

Observed:

- `resolve_after = { scope: 'website', fields: ['description','program_highlights'], enabled: true }`.

Status: **PASS**

## 2.2 R7 write path (marketing RPC)

Validation:

- `update_package_kit_marketing_field(product_id, account_id, 'description', ...)`.
- Post-update checks inside transaction:
  - audit rows increment
  - `product_edit_history` rows increment
  - `last_edited_by_surface='studio'`

Observed inside tx:

- `audit_after=2`, `history_after=3`, `last_edited_by_surface='studio'`.

Post-rollback integrity:

- `audit_current=1`, `history_current=0`, `last_edited_by_surface='flutter'`.

Status: **PASS**

## 2.3 R9 D2 AI ledger

Validation:

- `log_ai_cost_event(...)`
- `get_account_ai_spend(account,'month')`

Observed inside tx:

- `events_after=1`
- `spent_usd=0.123456`

Post-rollback integrity:

- `events_current=0`
- `spent_usd=0`

Status: **PASS**

## 2.4 W3 reconcile dual-surface

Validation:

- synthetic `log_edit_history` writes for same product from `studio` and `flutter`.
- call `reconcile_product_surfaces('package_kit','24 hours')`.

Observed:

- `anomalies_count=1`
- anomaly includes both sources (`flutter`, `studio`) for same `product_id`.

Status: **PASS**

## 2.5 Rollback drill (L2 semantics)

Validation:

- `toggle_studio_editor_v2(... enabled=false, fields=[])`
- `resolve_studio_editor_v2(...)`

Observed:

- `resolve_after_disable = { scope:'website', fields: [], enabled:false }`

Status: **PASS**

---

## 3) RLS and permission checks

## 3.1 Read isolation

Validation performed by:

- inserting synthetic rows for account A and B in tx,
- switching to `role authenticated` + `request.jwt.claim.sub=<super_admin_of_A>`.

### `ai_cost_events`

Observed:

- `visible_total=1`
- `visible_account_a=1`
- `visible_account_b=0`

Status: **PASS**

### `product_edit_history`

Observed:

- `visible_total=1`
- `visible_account_a=1`
- `visible_account_b=0`

Status: **PASS**

## 3.2 Write surface restrictions

Critical check:

- switched to `role authenticated`, set JWT claims,
- executed `public.log_ai_cost_event(...)` for **another account**.

Observed:

- call succeeded and returned UUID (`authenticated_call_result` non-null).

Interpretation:

- authenticated callers can execute `log_ai_cost_event` (security-definer) and write cross-account ledger rows if not externally guarded.

Status: **FAIL (P0 Security)**

---

## 4) Defect summary

- `P0`: 1
  - `log_ai_cost_event` executable by `authenticated` in SQL role test (cross-account write possible).
- `P1`: 1+
  - Automated unit/Jest gate failing broadly (`npm run test` red).
- `P2`: 0 (not triaged in depth due blockers).
- `P3`: 0.

---

## 5) Go/No-Go

**Decision: NO-GO**

Blocking reasons:

1. Unit/Jest gate failing (`npm run test` not green).
2. P0 permission issue on ledger write path (`log_ai_cost_event` reachable by `authenticated` role test).

---

## 6) Recommended immediate actions

1. Patch permissions for `log_ai_cost_event`:
   - revoke execute from `authenticated` path and restrict to `service_role` only,
   - add defensive account ownership checks inside function if any non-service execution remains possible.
2. Fix Jest scope/config so CT specs are excluded from `npm run test`.
3. Resolve failing suites in:
   - `normalize-product`
   - `booking-contracts`
   - `package-aggregated`
   - `ai-editor-routes`
4. Re-run this certification checklist end-to-end after fixes.

