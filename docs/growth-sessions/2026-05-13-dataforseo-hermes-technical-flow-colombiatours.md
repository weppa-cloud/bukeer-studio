---
session_id: "2026-05-13-dataforseo-hermes-technical-flow"
started_at: "2026-05-13T11:45:00-05:00"
agent: "codex"
scope: "dataforseo-hermes-technical-remediation"
tenant: "colombiatours-travel"
account_id: "9fc24733-b127-4184-aa22-12f03b98927a"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
status: "reviewed-not-primary-runtime-ready"
---

# DataForSEO -> Hermes Technical Flow Review

## Executive Result

ColombiaTours has fresh DataForSEO technical evidence from 2026-05-10 and a
working legacy Growth OS technical remediation lane, but Hermes is not yet
operational as the primary technical runtime.

Current safe operating mode:

`DataForSEO -> normalize facts -> Growth OS work_items -> technical_remediation safe_apply -> Growth OS live-gated executor`

Target MVE v0 operating mode:

`DataForSEO/provider profile -> Hermes native Kanban -> technical profile -> hermes_apply_safe_seo_patch MCP tool -> audit/snapshot/outcome`

## DataForSEO Evidence Checked

Latest relevant profile runs in `growth_profile_runs`:

| Profile | Run status | Freshness | Quality | Cost |
| --- | --- | --- | --- | ---: |
| `dfs_onpage_full_comparable_v3` | completed | PASS | PASS | 2.50 |
| `dfs_onpage_changed_urls_v1` | completed | PASS | PASS | 0.25 |
| `dfs_serp_labs_primary_v1` | completed | PASS | PASS | 1.50 each |
| `dfs_historical_trends_v1` | completed | PASS | PASS | 2.00 |
| `dfs_authority_fallback_v1` | completed | PASS | PASS | 0.50 |

DataForSEO OnPage task status checked directly:

| Task | Profile | Progress | Pages |
| --- | --- | --- | ---: |
| `05101157-1574-0216-0000-90ee018c8d26` | full comparable | finished | 588 |
| `05101157-1574-0216-0000-b3bf6cdb8e67` | changed URLs | finished | 1 |

Current gap: these May 10 OnPage results are visible as task/profile evidence,
but are not yet normalized into `seo_audit_results` and `seo_audit_findings`.
The latest normalized crawl evidence found in those tables is still from
2026-04-30 task ids such as `04300334-1574-0216-0000-c57a3723c41d`,
`04301808-1574-0216-0000-1e0a9d846a5f` and
`04302257-1574-0216-0000-3f30b406bb51`.

2026-05-13 execution update:

| Task | Action | Result |
| --- | --- | --- |
| `05101157-1574-0216-0000-90ee018c8d26` | Persisted summary/pages and normalized | `587` audit results, `93` findings, `90` inventory rows |
| `05101157-1574-0216-0000-b3bf6cdb8e67` | Persisted summary/pages and normalized | `1` audit result, `1` finding, `1` inventory row |

Artifacts:

- `artifacts/seo/2026-05-10-dataforseo-onpage-full-comparable-v3/`
- `artifacts/seo/2026-05-10-dataforseo-onpage-changed-urls-v1/`
- `artifacts/seo/2026-05-13-dataforseo-hermes-technical-triage/`

## Technical Findings From Fresh Crawl

Direct read of the 2026-05-10 full crawl pages:

| Signal | Count |
| --- | ---: |
| Total pages | 588 |
| `200` | 335 |
| `301` | 218 |
| `307` | 1 |
| `308` | 24 |
| `404` | 3 |
| `status=0` / broken | 7 |
| `no_h1_tag` | 57 |
| `no_image_alt` | 103 |
| `high_loading_time` | 62 |
| `redirect_chain` | 7 |

Normalized finding counts after apply:

| Finding | Count |
| --- | ---: |
| `critical:broken_fetch:open` | 10 |
| `critical:http_4xx:open` | 3 |
| `info:slow_page:open` | 24 |
| `info:technical_watch:open` | 44 |
| `info:redirect_chain:open` | 3 |
| `info:image_alt_missing:open` | 9 |

Representative production spot check:

| URL | Live result | Interpretation |
| --- | --- | --- |
| `/blog?page=1` | 200 | DataForSEO `status=0` needs crawler-context validation before action. |
| `/blog?page=3` | 200 | Same as above. |
| `/hoteles` | 200 | DataForSEO broken signal should not become direct mutation. |
| `/hoteles/aloft-bogota-airport` | 200 | DataForSEO broken signal should not become direct mutation. |
| `/paquetes/gran-tour-colombia-15-dias-bogota-eje-cafetero-medellin-y-santa-marta` | 200 | DataForSEO broken signal should not become direct mutation. |
| `/activities/adrenalina-san-gil-pasad-a` | 301 to `/actividades/...` | Likely expected legacy redirect; treat as watch unless chain is bad. |
| `/10-de-las-mejores-islas-en-colombia` | 301 to `/blog/...` | Likely expected legacy redirect; treat as watch unless chain is bad. |
| `/en/blog/10-de-las-mejores-islas-en-colombia` | 404 | Real technical candidate. |
| `/en/blog/15-lugares-para-ir-de-vacaciones-en-colombia` | 404 | Real technical candidate. |
| `/en/blog/cano-cristales-guia-de-viajes` | 404 | Real technical candidate. |

## Existing Technical Backlog State

Production `growth_work_items` already contains a large technical remediation
backlog:

| Metric | Value |
| --- | ---: |
| Technical work items sampled | 500 |
| `published_applied` | 146 |
| `blocked` | 354 |
| Recent safe apply publication jobs sampled | 298 |
| Safe apply `smoke_passed` | 298 |
| Unique safe apply idempotency keys sampled | 298 |

The current lane can execute `safe_apply` safely through Growth OS, but much of
the remaining backlog is blocked by correlation/duplicate cleanup or missing
pre-ready contract fields such as target table, target id, patch, before row and
rollback payload.

## Hermes Runtime State On VPS

Read-only VPS check on `growth-os-vps-prod`:

| Component | Current state |
| --- | --- |
| Deployed SHA | `875cb8cf40b7ce3e23b0612607435cddf2146a01` |
| Docker service | `growth-orchestrator` running |
| Hermes binary | `/usr/local/bin/hermes` |
| Hermes version | `0.13.0` |
| Hermes profile | `growth-os-colombiatours` exists |
| Hermes native Kanban board | `default`, empty |
| Hermes cron jobs | none |
| Hermes gateway | stopped |
| Dedicated `hermes-runtime` service | not present |
| Dedicated `hermes-mcp-tool-host` service | not present |
| Dedicated `hermes-watchdog` service | not present |

Hermes does have native Kanban, profile, cron and MCP capabilities available in
the binary. The current deployment is still a hybrid sidecar/runtime bridge:
`runtime/growth-hermes` runs Hermes for availability and prompt execution, but
still emits deterministic Growth OS artifacts and leaves public mutation to the
Growth OS live-gated executor.

VPS sidecar smoke performed with the real ColombiaTours profile context:

| Field | Value |
| --- | --- |
| Sidecar run | `dce955f6-fdca-4d60-8925-701599976e19` |
| Mode | `deterministic` |
| Hermes available | `true` |
| Lane | `technical_remediation` |
| Artifact | `e9609a3c-75a4-4689-85f1-fb8f527641b2` |
| Artifact type | `safe_apply_patch` |
| Mutation performed | `false` |

The smoke proves the deployed sidecar can accept a technical remediation
request and produce a safe-patch shaped artifact. It does not prove Hermes is
ready to solve the finding autonomously: the deterministic artifact proposed a
metadata patch for a 404 URL and still needs target resolution, before snapshot,
rollback payload and route-level fix selection before any live action.

## Hermes Native Board Created

Board created on VPS:

`colombiatours-growth-technical`

Tasks created:

| Hermes task | Status | Purpose |
| --- | --- | --- |
| `t_4ca29fba` | blocked | Parent dry-run sprint for May 10 DataForSEO remediation |
| `t_20c81ea0` | todo, blocked by parent | P0: `/en/blog/10-de-las-mejores-islas-en-colombia` |
| `t_6b9c680c` | todo, blocked by parent | P0: `/en/blog/15-lugares-para-ir-de-vacaciones-en-colombia` |
| `t_0995d7b0` | todo, blocked by parent | P0: `/en/blog/cano-cristales-guia-de-viajes` |

Board stats after seed:

| Status | Count |
| --- | ---: |
| blocked | 1 |
| todo | 3 |
| ready | 0 |
| running | 0 |

The three child cards remain `todo` because Hermes only allowed `block` on the
ready parent task, but each child has an explicit blocking comment and parent
dependency. There is no `ready` executable task on the board.

## Hermes Technical Workflow To Create

Board:

`colombiatours-growth-technical`

Profiles:

| Profile | Skill | Scope |
| --- | --- | --- |
| `chief-profile` | `bukeer-orchestrator` | Reads provider profile, scores, creates technical cards. |
| `technical-seo-profile` | `bukeer-technical-remediation` | Produces safe patches only. |
| `risk-profile` | `bukeer-risk-guardian` | Rejects unsafe field/table/scope. |
| `outcome-profile` | `bukeer-outcome-analyst` | Schedules day 7/day 28 recrawl and outcome reads. |

Kanban statuses:

`triage -> todo -> ready -> running -> blocked -> done -> archived`

Card body contract:

```json
{
  "account_id": "9fc24733-b127-4184-aa22-12f03b98927a",
  "website_id": "894545b7-73ca-4dae-b76a-da5b6a3f8441",
  "tenant_slug": "colombiatours-travel",
  "lane": "technical_remediation",
  "source": "dataforseo:on_page",
  "provider_profile_run_id": "127f3609-58e2-4c60-a730-d48b97588a97",
  "crawl_task_id": "05101157-1574-0216-0000-90ee018c8d26",
  "finding_url": "https://colombiatours.travel/en/blog/10-de-las-mejores-islas-en-colombia",
  "finding_type": "http_4xx",
  "severity": "P0",
  "candidate_action": "safe_seo_patch_or_redirect_review",
  "required_fields": {
    "target_table": null,
    "target_id": null,
    "patch": null,
    "before_snapshot": null,
    "rollback_payload": null,
    "smoke_plan": "route_returns_expected_status_and_metadata"
  },
  "score": {
    "impact": 8,
    "confidence": 7,
    "ease": 6,
    "risk": 3,
    "total_score": 78
  }
}
```

Execution rule:

1. `chief-profile` creates cards only after the May 10 crawl is normalized.
2. `technical-seo-profile` may move a card to `ready` only when target table,
   target id, patch, before snapshot and rollback payload are present.
3. `risk-profile` blocks fields outside the technical allowlist.
4. `technical-seo-profile` calls only `hermes_apply_safe_seo_patch`.
5. Tool host writes `hermes_tool_invocations` and
   `hermes_mutation_snapshots`.
6. `outcome-profile` creates day 7/day 28 follow-up.

## Go / No-Go

GO for read-only triage and workflow creation in Hermes native Kanban.

GO completed on 2026-05-13:

- May 10 DataForSEO OnPage results were persisted and normalized.
- A dry-run Hermes native Kanban board was created.
- Three validated P0 English blog 404 cards were seeded.
- No Hermes live mutation or production publication was performed.

NO-GO for Hermes as primary production runtime today because:

- Hermes cron is empty.
- Gateway is stopped.
- Dedicated `hermes-runtime`, `hermes-mcp-tool-host` and `hermes-watchdog`
  services are not deployed.
- The sidecar currently ignores Hermes CLI output and emits deterministic
  artifacts, so Hermes is not yet deciding or applying technical remediation.
- Child cards still lack target row, before snapshot, patch and rollback
  payload.

Recommended next step:

Resolve the three P0 cards into full safe-apply contracts or redirect/removal
decisions, then run one dry-run `hermes_apply_safe_seo_patch` smoke before
enabling any Hermes production mutation.
