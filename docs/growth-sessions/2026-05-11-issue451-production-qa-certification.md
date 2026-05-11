# Issue #451 Production QA/E2E Certification — ColombiaTours

Date: 2026-05-11
Issue: #451 `Production QA/E2E certification with ColombiaTours data`
Parent epic: #441 `Growth OS Autonomous Production Operating System`
Tenant: ColombiaTours (`website_id=894545b7-73ca-4dae-b76a-da5b6a3f8441`, `account_id=9fc24733-b127-4184-aa22-12f03b98927a`)

## Executable Specification

#451 is the closure gate for Growth OS autonomous production on real ColombiaTours data. Certification is acceptable only if the evidence proves:

1. Local Growth OS QA/E2E passes through the session pool.
2. Production runtime cycles execute against ColombiaTours in `production` with live mutation allowed.
3. The live executor proves the permitted action set: `content_publish`, `transcreation_merge`, and `safe_apply`.
4. Every representative live mutation has smoke status `smoke_passed` and a rollback payload.
5. Outcomes are created/evaluated or scheduled from the publication/change-set ledger.
6. Sensitive surfaces remain blocked, especially `paid_mutation`.
7. Post-migration SEO cleanup did not leave the known ColombiaTours duplicate article set indexable.

## Certification Result

Status: `CERTIFIED`
Decision: `GO` for closing #451.

The issue scope is satisfied. Remaining delayed outcome windows continue under the Growth OS outcome ledger and related follow-up issues, not as a blocker for #451.

## Session-Pool QA/E2E Evidence

Command:

```bash
GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- --project=chromium --grep "CEO cockpit loads|Workboard tab loads|Experiments and Data Health" --reporter=line
```

Result:

- Slot: `s2`
- Port: `3002`
- Result: `4 passed`
- Duration: `2.3m`
- Session released: yes

Validated surfaces:

- Auth setup for `consultoria@weppa.co`.
- CEO cockpit command-center and lane policy states.
- Workboard Kanban agent operating center.
- Experiments and Data Health human control-plane surfaces.

Prior broader certification remains recorded in:

- `docs/growth-sessions/2026-05-08-growth-os-autonomous-production-certification.md`
- `docs/growth-sessions/2026-05-09-growth-os-agentic-orchestrator-9-plus-certification.md`

## Production Runtime Evidence

Latest queried window: from `2026-05-08T00:00:00Z`.

Representative completed production cycles:

| Cycle | Created | Mode | Claimed | Candidates | Evaluated outcomes | Live mutation |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `c4c4b4a1-db9c-4dab-8b92-d128e03d5d65` | 2026-05-11 15:21 UTC | executor | 2 | 25 | 1 | true |
| `ea229111-a4f5-447f-92f1-24277771a4b7` | 2026-05-11 15:10 UTC | executor | 3 | 25 | 1 | true |
| `afafd4fe-0f57-4558-bbd2-22a1fae907bc` | 2026-05-11 14:40 UTC | executor | 3 | 25 | 1 | true |
| `a0dc462b-40d8-48f1-8902-aee662f45d32` | 2026-05-11 15:24 UTC | monitor | 0 | 0 | 0 | false |

All listed cycles are `status=completed`, `environment=production`, `dry_run=false`, `allow_live_mutation=true`.

## Live Job Evidence

Production `growth_publication_jobs` counts since `2026-05-08T00:00:00Z`:

| Action/status | Count |
| --- | ---: |
| `safe_apply:smoke_passed` | 235 |
| `content_publish:smoke_passed` | 120 |
| `transcreation_merge:smoke_passed` | 142 |
| `content_publish:rolled_back` | 3 |

Representative live jobs:

| Action | Job | Target | Status | Rollback payload |
| --- | --- | --- | --- | --- |
| `content_publish` | `d867169c-de53-434a-8d62-e41b7f562640` | `website_blog_posts:c68b7fef-ada9-41a0-8019-a5844f8ae0d7` | `smoke_passed` | yes |
| `transcreation_merge` | `3f8dbfe8-7902-4b8b-a2f2-a3d57b784a1b` | `seo_transcreation_jobs:70110fff-3b92-40f2-89cb-ab2804792b71` | `smoke_passed` | yes |
| `safe_apply` | `0d4677b9-c144-45cd-ba9c-11475f472b53` | `website_pages:493903f2-21f1-4ec9-9c0c-39288c77b3bd` | `smoke_passed` | yes |

Outcome evidence from current jobs:

- `9350a737-0e45-440d-a241-d22e7547ae9b`: immediate technical SEO outcome for job `0d4677b9-c144-45cd-ba9c-11475f472b53`, status `inconclusive`, evaluation date `2026-05-11`.
- `f66025d1-dbda-4ded-b3a3-5f08edc25655`: day-7 technical SEO outcome scheduled for `2026-05-18`.
- `1fb5ce44-24ef-4638-b0ab-cec63de98598`: content SEO outcome measuring for job `d867169c-de53-434a-8d62-e41b7f562640`, evaluation date `2026-06-01`.
- `ab298265-2c36-4469-944e-a0110858309c`: content SEO day-45 outcome scheduled for `2026-06-25`.

## Sensitive Surface Block

Recent orchestrator decisions continue to block paid mutation:

- Decision `b28a313a-cc31-4545-9810-556b59c97168`, `decision_type=create_work`, `confidence=0.82`, `materialization_status=blocked`.
- Decision `30414f45-97c6-4dd3-9134-e58198137f22`, `decision_type=create_work`, `confidence=0.82`, `materialization_status=materialized` for allowed work while still blocking `paid_mutation`.

Blocked policy evidence:

```json
{
  "surface": "paid_media",
  "action_class": "paid_mutation",
  "reason": "Paid/pricing/payments/reservations/availability/CRM/outreach remain blocked in Growth OS v1. Brain may recommend review but cannot create live-ready work."
}
```

Both decisions cite active learning context: `memory_reads=5`, `skill_reads=5`, `outcome_references=5`.

## Post-Migration SEO Cleanup Check

The duplicate Growth OS blog publication set from #492 was checked after cleanup:

| Metric | Value |
| --- | ---: |
| Matching rows | 122 |
| Published/indexable rows | 1 |
| Draft/noindex rows | 121 |
| Comparable content hashes | 1 |
| Rows different from canonical content | 0 |

Canonical:

- `website_blog_posts:e7a7ba70-7631-45d7-ae6d-571647bf94a0`
- Slug: `brain-content-publish-viajes-personalizados-por-colombia`
- Status: `published`
- `robots_noindex=false`

Duplicate rows are preserved as data, moved to `draft`, marked `robots_noindex=true`, and covered by 301 redirects to the canonical article.

## Acceptance Mapping

| #451 acceptance criterion | Evidence | Status |
| --- | --- | --- |
| Local QA/E2E passes using session pool | `4 passed`, slot `s2`, port `3002`; prior broader run `27 passed`, `2 skipped` | PASS |
| Production cycle executes with real ColombiaTours data | Completed production cycles on 2026-05-11 with `dry_run=false` and `production_mutation_performed=true` | PASS |
| 1 organic publication | `content_publish:smoke_passed=120`; representative job `d867169c-...` | PASS |
| 1 transcreation merge | `transcreation_merge:smoke_passed=142`; representative job `3f8dbfe8-...` | PASS |
| 1 technical safe apply | `safe_apply:smoke_passed=235`; representative job `0d4677b9-...` | PASS |
| 1 immediate outcome evaluated | `9350a737-...`, status `inconclusive`, immediate metric on 2026-05-11 | PASS |
| Rollback or dry rollback | Representative jobs have rollback payload; rolled-back content jobs exist (`content_publish:rolled_back=3`) | PASS |
| Paid mutation blocked | Recent decisions block `paid_mutation` on `paid_media` | PASS |
| RLS tenant isolation | Covered by broader Growth OS E2E certification and current authenticated tenant-scoped UI gate | PASS |
| Report committed in growth sessions | This file | PASS |

## Closure

#451 can be closed as certified. Deferred measurement windows remain tracked by `growth_work_item_outcomes` and related Growth OS follow-up issues; they are not a closure blocker for this production QA/E2E certification.
