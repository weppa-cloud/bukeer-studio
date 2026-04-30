---
session_id: "2026-04-30-growth-inventory-cleanup"
started_at: "2026-04-30T09:00:00-05:00"
ended_at: "2026-04-30T09:25:00-05:00"
agent: "codex-lane-4"
scope: "audit"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
initiator: "Lane 4 - Growth Inventory cleanup: identify stale #313 growth_inventory rows from old crawl tasks still queued|blocked after current task 04300334-1574-0216-0000-c57a3723c41d was accepted."
outcome: "completed"
linked_weekly: "docs/growth-weekly/2026-05-04-council.md"
related_issues: [310, 313]
---

# Growth Inventory Cleanup Plan - colombiatours-travel - 2026-04-30

## Intent

Identify stale `growth_inventory` rows for issue `#313` that still look active
after the accepted DataForSEO crawl `04300334-1574-0216-0000-c57a3723c41d`.
Do not run destructive updates without a dry-run and tight criteria.

## Safety Frame

- Website: `colombiatours-travel`
- `website_id`: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- Current accepted crawl task: `04300334-1574-0216-0000-c57a3723c41d`
- Current crawl evidence: `artifacts/seo/2026-04-30-dataforseo-onpage-post-p1/summary.md`
  reports `finished`, 952 pages crawled, 0 pages in queue.
- Current triage evidence: `artifacts/seo/2026-04-30-dataforseo-post-p1-triage/dataforseo-v2-triage.md`
  reports apply mode, 91 current findings, 52 inventory updates, and current run
  `04300334-1574-0216-0000-c57a3723c41d`.
- No mutation was run during this audit.

## Read-only Findings

Read-only Supabase query scope:

- `growth_inventory.website_id = 894545b7-73ca-4dae-b76a-da5b6a3f8441`
- `owner_issue = '#313'`
- Active rows: `status = 'queued'` OR any sub-status is `blocked`
- Stale rows: active rows whose `next_action` references a known old crawl run
  and whose `source_url` has no `seo_audit_findings` row in the current accepted
  crawl task.

Known old crawl runs used for the dry-run:

- `04290125-1574-0216-0000-00a1195b1ba0`
- `04291924-1574-0216-0000-e2085593ce67`
- `04300144-1574-0216-0000-a822a2744350`

Evidence summary:

| Metric                                                      | Count |
| ----------------------------------------------------------- | ----: |
| Total `#313` inventory rows                                 |   615 |
| Active `#313` rows (`queued` or blocked sub-status)         |    88 |
| Active rows referencing known old crawl runs                |    87 |
| Active old-run rows absent from current crawl findings      |    87 |
| Active old-run rows still present in current crawl findings |     0 |
| Current crawl findings in `seo_audit_findings`              |    91 |

Stale candidates by old run:

| Old crawl task                         | Rows |
| -------------------------------------- | ---: |
| `04291924-1574-0216-0000-e2085593ce67` |   69 |
| `04300144-1574-0216-0000-a822a2744350` |   16 |
| `04290125-1574-0216-0000-00a1195b1ba0` |    2 |

Stale candidates by current row state:

| Field              | Value             | Rows |
| ------------------ | ----------------- | ---: |
| `status`           | `queued`          |   87 |
| `technical_status` | `blocked`         |   47 |
| `technical_status` | `pass_with_watch` |   40 |

Excluded from automatic cleanup:

- 1 active `#313` row without a crawl id in `next_action`:
  `https://colombiatours.travel/actividades/panaca-ingresos`. It was updated
  after the accepted crawl with residual Instant Pages evidence, so it is not an
  old-crawl stale row.
- All `#313` rows where `next_action` already references the current accepted
  crawl.
- All WATCH/idea rows; this pass only targets rows that still pollute active
  queued/blocked backlog state.

## Cleanup Criteria

Archive a row only if all conditions are true:

1. `website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'`
2. `owner_issue = '#313'`
3. `status = 'queued'` OR one of `technical_status`, `content_status`,
   `conversion_status`, `attribution_status` is `blocked`
4. `next_action` contains one of the known old crawl task ids listed above
5. `next_action` does not contain the current task id
6. `source_url` is absent from `seo_audit_findings` for current task
   `04300334-1574-0216-0000-c57a3723c41d`
7. Dry-run candidate count matches the expected reviewed count before apply

Recommended apply mutation, only after dry-run review:

- Set `status = 'archived'`
- Set `result = 'stop'`
- Preserve `source_url`, metrics, owner, and issue fields
- Add `learning` with current crawl id, old crawl id, and archive rationale
- Replace `next_action` with an archive note that keeps the old action context

Do not delete rows. Do not archive rows with unknown crawl provenance.

## Script

Created script:

```bash
node scripts/seo/archive-stale-growth-inventory-rows.mjs
```

Default mode is dry-run. It writes JSON and CSV artifacts under
`artifacts/seo/2026-04-30-growth-inventory-cleanup/` and prints a count summary.

Safe apply command, if the dry-run still reports exactly 87 candidates:

```bash
node scripts/seo/archive-stale-growth-inventory-rows.mjs \
  --apply true \
  --expected-count 87 \
  --confirm "archive-stale-growth-inventory-313"
```

## Mutations

| Entity                      | Action                            | Before | After      | Source                                       |
| --------------------------- | --------------------------------- | ------ | ---------- | -------------------------------------------- |
| Supabase `growth_inventory` | None                              | n/a    | n/a        | This audit performed read-only queries only. |
| Repo                        | Add cleanup plan + dry-run script | n/a    | documented | User request                                 |

## External Costs

| Provider   | Operation | Cost USD | Notes                                              |
| ---------- | --------- | -------: | -------------------------------------------------- |
| DataForSEO | none      |        0 | Used existing artifacts and existing DB rows only. |
| OpenRouter | none      |        0 | No AI provider call.                               |

## Handoff

Run dry-run first and review `stale-growth-inventory-candidates.csv`. If counts
match this plan, the apply command above is tight enough to archive only stale
old-crawl rows. If the candidate count changes, do not apply; inspect the diff
first because another lane may have normalized or archived rows in parallel.
