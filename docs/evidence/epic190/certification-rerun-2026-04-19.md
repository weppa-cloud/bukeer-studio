# EPIC #190 Certification Rerun — 2026-04-19

**Epic:** [#190](https://github.com/weppa-cloud/bukeer-studio/issues/190)  
**Purpose:** Remediation verification after initial NO-GO (P0 permission gap + failing Jest gate).  
**Previous run:** [certification-run-2026-04-18](./certification-run-2026-04-18.md)

## Summary

- Previous blockers were remediated.
- Automated gates are now green for unit + CT.
- E2E marketing smoke executes successfully (with data-dependent skips).
- P0 permission risk on `log_ai_cost_event` is closed via migration + privilege verification.

---

## 1) Remediations applied

### A) Jest gate stabilization

Files updated:

- `jest.config.js`
- `__tests__/lib/products/normalize-product.test.ts`
- `__tests__/schema/booking-contracts.test.ts`
- `__tests__/lib/supabase/package-aggregated.test.ts`
- `__tests__/api/ai-editor-routes.test.ts`

Key fixes:

1. Excluded Playwright CT specs from Jest (`__tests__/ct`, `__tests__/visual`).
2. Updated stale schema expectations (lead consents required).
3. Updated normalize-product expectation (`priceCurrency`).
4. Removed cache cross-test bleed in package aggregation tests (unique subdomains).
5. Updated AI route test cost assertions to token-based pricing.

### B) P0 security hardening (`log_ai_cost_event`)

Migration added:

- `supabase/migrations/20260502010000_ai_cost_events_permissions_hardening.sql`

Migration applied via Supabase MCP with success.

Hardening actions:

1. `REVOKE EXECUTE` from `public`, `anon`, `authenticated`.
2. `GRANT EXECUTE` only to `service_role`.
3. Added defense-in-depth role guard in function body:
   - rejects non-`service_role` callers.

---

## 2) Verification results

## 2.1 Automated

### Unit/Jest

```bash
npm run test
```

Result: **PASS**
- `50 passed, 50 total` suites
- `344 passed, 344 total` tests

### Playwright CT

```bash
npm run test:ct
```

Result: **PASS**
- `122 passed`

### E2E marketing smoke (session pool)

```bash
eval "$(bash scripts/session-acquire.sh)"
SESSION_NAME="$SESSION_NAME" PORT="$PORT" npm run test:e2e:session -- e2e/tests/marketing-editor-smoke.spec.ts --project=chromium --workers=1
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

Result: **PASS (partial by dataset)**
- `2 passed`, `2 skipped`
- Skips are due to test account content preconditions in spec.

## 2.2 Security permission re-check

Query result after migration:

- `authenticated_exec = false`
- `anon_exec = false`
- `service_role_exec = true`

Outcome: P0 permission gap closed.

---

## 3) Go/No-Go

**Decision: GO (with environment note)**

Release blockers from the previous run are resolved.

Environment note:

- Two E2E smoke cases remain data-dependent and can skip if the account has no package rows linked from the dashboard UI.
- This is not a code blocker; it is a fixture/seed completeness concern.

---

## 4) Suggested follow-up (non-blocking)

1. Seed deterministic `package_kits` fixture for E2E auth account so marketing smoke never skips.
2. Add a dedicated integration test asserting non-service callers cannot execute `log_ai_cost_event`.

