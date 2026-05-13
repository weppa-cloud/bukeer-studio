# Epic #471 Backlog Cleanup Follow-up — 2026-05-11

## Scope

- Account: `9fc24733-b127-4184-aa22-12f03b98927a`
- Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- Objective: reconcile stale runtime state, remove duplicate ready work, and execute a controlled live-gated batch after cleanup.

## Pre-cleanup

- Standard cleanup dry-run returned `0` decisions.
- Manual anti-rework audit found `55` ready work items and `24` duplicate ready items across `4` duplicate target/action groups.
- Open state before cleanup:
  - open cycles: `2`
  - open wakeups: `0`
  - open task sessions: `0`
  - sensitive jobs: `0`

## Reconciliation Applied

- Marked stale running cycles as `failed` with `RuntimeReconciler` because later executor cycles had completed:
  - `cfd6e875-4ab1-441e-8c6a-541148caba75`
  - `93f74de1-40cf-4f8c-9216-b82e16f564bf`

## Duplicate Ready Work Blocked

- Blocked `24` duplicate `growth_work_items`.
- Kept one executable work item per `action_key` / target:
  - `safe_apply:website_pages:59887173-42b7-4cfa-abfe-51a6af2008c5` -> kept `8d135191-b470-4f7b-8d49-ba967ad8ffc4`
  - `transcreation_merge:seo_transcreation_jobs:70110fff-3b92-40f2-89cb-ab2804792b71` -> kept `1d713616-8902-4862-ad9a-7c7d6f46cf89`
  - `transcreation_merge:seo_transcreation_jobs:79866c9c-57b7-4910-8423-32ade776e5e3` -> kept `e0a4d513-f571-452a-b085-dd61544eeba9`
  - `transcreation_merge:seo_transcreation_jobs:94ce6cab-b949-41ca-b10c-180bdcc40f1a` -> kept `666f2ad9-838b-414e-ae12-b49e2bbbcd4c`

## Controlled Production Cycles

### Transcreation Batch

- Cycle: `dcd23751-1a01-4528-846d-06de752d6544`
- Runtime mode: `executor`
- Dry run: `false`
- Claimed: `3`
- Applied: `1`
- Blocked by gate: `2`
- Smoke-passed job:
  - `e13fc078-6ae0-41f3-8990-70919e660e21`

The blocked items were rejected for missing adapter/outcome/rollback contract data, not for smoke failure.

### Technical Batch

- Cycle: `ebe126d9-a3ad-4683-a198-9a34668e8d86`
- Runtime mode: `executor`
- Dry run: `false`
- Claimed: `10`
- Applied: `8`
- Blocked by gate: `2`
- Outcomes evaluated: `8`
- Smoke-passed jobs:
  - `bed6dac1-ba00-45fa-84ec-58219fa7d814`
  - `a521ecd9-f2d7-4883-9da1-b5d29df6d5e8`
  - `0c7eede5-67a7-4fc1-95b8-60cf9af66b36`
  - `76a95a47-f8b2-4368-aa74-042e04f42948`
  - `5063656d-eb20-402a-b851-42014960ab80`
  - `cd561116-3459-4151-ba9d-64ac05341ac0`
  - `4789b245-207d-414a-a5f1-d47855a42088`
  - `d3f0ed50-1a16-4a69-912f-354a9d23693c`

The blocked items were rejected for missing safe-apply adapter contract data, not for smoke failure.

## Final Validation

- Open cycles: `0`
- Open wakeups: `0`
- Open task sessions: `0`
- Open agent runs: `0`
- Ready duplicate groups: `0`
- Ready duplicate items: `0`
- Sensitive jobs in the validation window: `0`
- Recent publication jobs in validation window: `31`
  - `safe_apply`: `24` smoke passed
  - `transcreation_merge`: `2` smoke passed
  - `content_publish`: `5` smoke passed
- Recent outcomes: `20`
  - `inconclusive`: `7`
  - `scheduled`: `13`

## Code Hardening Applied

The runtime now blocks incomplete work before it reaches `growth_work_items.status='ready'`.

Changed files:

- `lib/growth/autonomy/profile-freshness-gate.ts`
  - Added action-class-specific payload validation to `evaluateCandidateDataQuality`.
  - `content_publish` requires full article payload, supported facts and source refs.
  - `transcreation_merge` requires runtime adapter plan, `transcreation_job_id`, source/target locale pair, source entity, page type, payload, quality pass and glossary/TM context.
  - `safe_apply` requires allowlisted target table, target id, patch, before snapshot, rollback payload, effective change and allowlisted fields.
- `lib/growth/autonomy/candidate-promotion.ts`
  - Promotion now passes `allowed_action_class` into the shared data-quality gate.
  - Incomplete candidates are blocked before work item creation.
- `__tests__/lib/growth/autonomy/candidate-promotion.test.ts`
  - Added coverage for content thin payload blocking, transcreation adapter-contract blocking, safe-apply contract blocking and complete safe-apply promotion.

Validation:

- `npm test -- __tests__/lib/growth/autonomy/candidate-promotion.test.ts`: PASS, 7/7.
- `npm run typecheck`: PASS.

## Post-hardening Production Cleanup

After deploying the pre-ready validator locally against production data, the new contract gate found `12` existing `ready` work items that should not have been executable:

- `11` transcreation items missing runtime adapter contract data.
- `1` technical remediation item missing safe-apply adapter contract data.

Applied cleanup:

- Blocked all `12` with `progress_label='Blocked by pre-ready contract gate'`.
- Wrote `evidence.pre_ready_contract_gate.failures[]` on each blocked row.

Post-cleanup validation:

- Ready work items: `12`
  - `content_creator/content_publish`: `2`
  - `technical_remediation/safe_apply`: `10`
- Invalid ready work items under the new validator: `0`
- Open cycles: `0`
- Open wakeups: `0`
- Open task sessions: `0`
- Open agent runs: `0`

## Residual Work

- There are still `12` ready work items, and all pass the new pre-ready contract validator.
- Next technical batch can run at `10` again, then `25` only if the scheduled executor cycle remains clean.
- Transcreation needs artifact generation fixes before scaling again: no work item should be created without an executable `transcreation_job_id` and full payload.
