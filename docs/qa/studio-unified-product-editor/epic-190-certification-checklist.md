# EPIC #190 — Certification Checklist (Executable)

**Status:** Active  
**Date:** 2026-04-18  
**Epic:** [#190](https://github.com/weppa-cloud/bukeer-studio/issues/190)  
**Scope:** Phase 0/0.5 foundations + Phase 1a closeout (`#194`, `#195` D1/D2, `#197`, `#200`, `#201`, `#204`, `#205`)  
**Primary references:** [[#190]], [[ADR-023]], [[studio-editor-v2-rollback]], [[ai-routes-cost-recording]], [[schema-parity-audit]]

---

## 0) Roles and owners

| Role | Owner | Responsibility |
|---|---|---|
| QA Lead | `<name>` | Drives checklist execution, evidence bundle, Go/No-Go recommendation |
| Frontend Owner | `<name>` | CT/E2E green for editor UX, visual baselines, regressions |
| Backend Owner | `<name>` | RPC/data integrity, RLS validation, ledger/history correctness |
| Ops Owner | `<name>` | Rollback drill, incident comms template, re-enable preflight |
| Product Sign-off | `<name>` | Accepts residual P2/P3 risks or blocks release |

---

## 1) Definition of done (release gate)

Release is **blocked** unless all are true:

1. `P0/P1 = 0` open defects.
2. Automated suite for epic scope is green (unit + CT + E2E smoke).
3. Critical RPCs validated with happy + negative paths and evidence.
4. RLS checks passed for new tables/functions.
5. Rollback drill executed (L1 or L2) and validated with reconciliation back to zero anomalies.
6. Evidence bundle published and linked in the EPIC issue.

---

## 2) Day-by-day execution plan

## Day 0 — Scope freeze + traceability matrix

### Checklist

- [ ] Freeze certification window (`commit_start`, `commit_end`).
- [ ] Build matrix `Issue -> AC -> Test -> Evidence -> Status`.
- [ ] Confirm dataset prerequisites (at least 1 website + package_kit with slug).
- [ ] Confirm super_admin path for reconciliation checks.
- [ ] Confirm session pool availability (`s1..s4`).

### Commands

```bash
npm run session:list
npm run test -- --listTests
npm run test:ct -- --list
```

### Evidence required

- Screenshot/log of session pool availability.
- Matrix file attached to EPIC (or comment with table).
- SHA range documented.

### Exit criteria (Day 0)

- Traceability matrix complete for all child issues in #190 scope.

---

## Day 1 — Automated regression (UI + route smoke)

### Checklist

- [ ] Unit tests green.
- [ ] CT suite green (marketing editors + gallery curator + content health + page customization).
- [ ] E2E smoke for marketing editor executed via session pool.
- [ ] No flaky failures after one clean rerun.

### Commands

```bash
npm run test
npm run test:ct
npm run session:run -- --grep "Marketing editor — smoke"
```

If first run fails due to infra/transient issues:

```bash
npm run session:run -- --grep "Marketing editor — smoke" --retries=1
```

### Must-cover files (evidence pointers)

- `__tests__/ct/studio-editor/marketing/*.spec.tsx`
- `e2e/tests/marketing-editor-smoke.spec.ts`
- `__tests__/visual/studio-editor-baselines/studio-editor/marketing/*`

### Evidence required

- Test summaries (pass/fail + duration).
- Screenshot artifact references for CT visual baselines.
- List of failed tests (if any) with severity and owner.

### Exit criteria (Day 1)

- All automated checks green or defects logged with severity + owner.

---

## Day 2 — Data/RPC certification + rollback drill

### 2.1 Critical RPC/data checks

Run these checks in staging (or isolated cert env) with controlled test IDs.

#### A) Flag resolution and field ownership (R7)

```sql
-- resolve
select public.resolve_studio_editor_v2('<ACCOUNT_UUID>', '<WEBSITE_UUID>');

-- toggle website scope
select public.toggle_studio_editor_v2(
  p_account_id := '<ACCOUNT_UUID>',
  p_website_id := '<WEBSITE_UUID>',
  p_enabled := true,
  p_fields := '["description","program_highlights"]'::jsonb
);
```

Expected:
- Scope precedence works (`website` overrides account defaults).
- Disabled fields enforce read-only behavior in Studio.

#### B) Marketing write path (single-tx RPC)

```sql
select public.update_package_kit_marketing_field(
  '<PACKAGE_KIT_UUID>',
  '<ACCOUNT_UUID>',
  'description',
  '"Texto de certificación QA"'::jsonb,
  null
);
```

Expected:
- Row updates correctly.
- Audit/history append happens via triggers.

#### C) AI ledger (R9 D2)

```sql
-- insert ledger event via RPC
select public.log_ai_cost_event(
  '<ACCOUNT_UUID>',
  '<WEBSITE_UUID>',
  null,
  'seo-transcreate',
  '/api/seo/content-intelligence/transcreate/stream',
  'openai/gpt-5',
  1000,
  500,
  0.123456,
  'ok',
  '<ACCOUNT_UUID>:seo:transcreate',
  '{"qa_run":"epic190-cert"}'::jsonb
);

-- spend summary
select public.get_account_ai_spend('<ACCOUNT_UUID>', 'month');
```

Expected:
- Event persists in `ai_cost_events`.
- Spend summary reflects insert and budget metadata.

#### D) Edit history + reconciliation (W3)

```sql
select public.reconcile_product_surfaces('package_kit', interval '24 hours');
```

Expected:
- JSON response with `anomalies_count`.
- If dual-source anomaly seeded, alert row appears in `reconciliation_alerts`.

### 2.2 RLS checks

- [ ] Account member can only read own `ai_cost_events`/`ai_cost_budgets`/`product_edit_history`.
- [ ] Cross-account access denied.
- [ ] Write surface restricted as designed (service_role for ledger writes).

### 2.3 Rollback drill (C2 / #205 readiness)

Execute **L1 or L2** from [[studio-editor-v2-rollback]] and validate:

- [ ] Field or website disabled through flag RPC.
- [ ] Studio renders read-only ownership message.
- [ ] `reconcile_product_surfaces(..., '1 hour')` returns `anomalies_count=0` after rollback.
- [ ] Incident comms template posted in cert channel.

### Exit criteria (Day 2)

- Data/RPC integrity validated with evidence.
- Rollback workflow proven executable by ops team.

---

## 3) Defect triage policy

| Severity | Rule | Action |
|---|---|---|
| P0 | Data corruption, broken ownership boundary, security/RLS break | Block release immediately |
| P1 | Core editor flow broken, reconciliation false negatives, rollback unusable | Block release |
| P2 | Non-critical regressions with workaround | Can ship only with owner + due date |
| P3 | Cosmetic/docs-only | Backlog |

---

## 4) Evidence bundle template (attach to #190)

Use this structure in the EPIC closeout comment:

```markdown
## EPIC #190 Certification Evidence

### Window
- commit_start: <sha>
- commit_end: <sha>
- environment: <staging|cert>

### Automated
- unit: PASS/FAIL (link/log)
- ct: PASS/FAIL (link/log)
- e2e smoke: PASS/FAIL (link/log)

### Data/RPC
- resolve/toggle: PASS/FAIL (query + output)
- update_package_kit_marketing_field: PASS/FAIL (query + output)
- log_ai_cost_event/get_account_ai_spend: PASS/FAIL (query + output)
- reconcile_product_surfaces: PASS/FAIL (query + output)

### RLS
- same-account read: PASS/FAIL
- cross-account denied: PASS/FAIL
- write restrictions: PASS/FAIL

### Rollback Drill
- level executed: L1/L2
- result: PASS/FAIL
- reconciliation after rollback: anomalies_count=<n>

### Open defects
- P0: <n>
- P1: <n>
- P2: <n> (owner/date)
- P3: <n>

### Go/No-Go
- Decision: GO / NO-GO
- Approved by: <names>
```

---

## 5) Optional hardening (recommended before epic close)

1. Add automated integration tests for `lib/ai/cost-ledger.ts` RPC wiring (`log_ai_cost_event`, `get_account_ai_spend`).
2. Add integration tests for `reconcile_product_surfaces` and `rollback_product_field`.
3. Add one E2E happy-path test that performs a real marketing edit and validates reconciliation UI signal.

