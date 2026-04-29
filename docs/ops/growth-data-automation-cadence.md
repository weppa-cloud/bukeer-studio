# Growth Data Automation Cadence

Status: operating contract for Epic #310 / Spec #337  
Tenant: ColombiaTours (`colombiatours.travel`)  
Website id: `894545b7-73ca-4dae-b76a-da5b6a3f8441`  
Last updated: 2026-04-29

## Purpose

Define what runs automatically, what requires human approval, and when provider
data becomes an actionable `growth_inventory` backlog.

The Growth OS data rule is:

`provider raw -> provider cache -> normalized facts -> growth_inventory -> Growth Council`

Automation may fetch and normalize approved sources. It must not approve new
experiments or launch expensive provider tasks without an explicit run profile
and owner issue.

## Automation Levels

| Level               | Meaning                                                        | Allowed actions                                                                                            |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Manual approval     | Human approves the run before provider cost or broad crawling. | Start DataForSEO OnPage full crawls, AI/GEO pilots, backlinks, broad SERP pulls.                           |
| Automatic follow-up | A task was already approved and started.                       | Poll status, persist summaries, fetch finished pages/resources, normalize, diff and update health reports. |
| Automatic weekly    | Low-risk recurring pulls before Council.                       | GSC/GA4 cache refresh, normalizers, cache health, `growth_inventory` backlog refresh.                      |
| Automatic daily     | Lightweight monitoring only.                                   | Freshness checks, tracking/event anomaly checks, cache expiry alerts.                                      |

## Provider Cadence

| Provider/profile                           | Cadence                                                      | Automation mode                                                      | Output                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| DataForSEO `dfs_onpage_full_v2`            | Weekly while #312/#313 are blocked or watch.                 | Manual approval to start; automatic follow-up until complete.        | `growth_dataforseo_cache`, `seo_provider_usage`, `seo_audit_results`, `seo_audit_findings`, actionable technical `growth_inventory` rows. |
| DataForSEO `dfs_onpage_rendered_sample_v1` | On demand for priority URLs.                                 | Manual approval to start; automatic follow-up.                       | Render/performance watch rows and evidence.                                                                                               |
| Search Console `gsc_growth_minimum_v1`     | Weekly before Growth Council; optional daily anomaly window. | Automatic weekly/daily.                                              | `growth_gsc_cache`, GSC decision rows in `growth_inventory`.                                                                              |
| GA4 `ga4_growth_minimum_v1`                | Weekly before Growth Council; optional daily anomaly window. | Automatic weekly/daily.                                              | `growth_ga4_cache`, GA4/CRO decision rows in `growth_inventory`.                                                                          |
| Tracking facts                             | Continuous ingestion where webhooks exist; weekly smoke.     | Automatic where configured.                                          | `funnel_events`, `meta_conversion_events`, conversion status in `growth_inventory`.                                                       |
| AI Search/GEO `geo_ai_visibility_v1`       | Monthly baseline; weekly only for active AI/GEO experiments. | Manual approval for pilot/full run; automatic follow-up after start. | `seo_ai_visibility_runs`, `seo_ai_visibility_facts`, `growth_inventory` rows with `channel = 'ai_search'`.                                |
| Translation quality gate                   | Before target-locale content scale or Council approval.      | Automatic scoring can run after draft/review; publish still requires human approval. | `seo_translation_quality_checks`, `seo_translation_qa_findings`, content status rows in `growth_inventory`.                               |

## Weekly Council Sequence

Run this sequence before every Growth Council:

1. Refresh GSC and GA4 caches for the last completed 28 days.
2. Normalize decision-grade GSC/GA4 rows into `growth_inventory`.
3. Poll any approved DataForSEO task still in progress.
4. If the DataForSEO task is complete, fetch final pages/resources, persist raw
   cache rows, normalize facts, run diff and refresh technical inventory rows.
5. Run cache/data health report.
6. Run translation quality gate for localized candidates that may enter the
   Council.
7. Generate Council intake from normalized rows only.
8. Reject experiments without source row, baseline, owner, success metric and
   evaluation date.

## DataForSEO Task Lifecycle

| State                 | Automation behavior                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `task_post` created   | Persist task response and usage immediately.                                                                                       |
| `in_progress`         | Poll summary every 15-30 minutes while an operator session is active, or hourly from a scheduled job. Persist each latest summary. |
| `complete` / finished | Fetch pages/resources, persist final raw cache rows and usage, then run normalizer and diff.                                       |
| `failed` / partial    | Persist failure, mark `growth_inventory` and Council intake as WATCH/BLOCKED with reason. Do not silently restart.                 |

Starting a new DataForSEO full crawl remains approval-gated because it can
create provider cost and change the comparable baseline.

## GSC And GA4 Lifecycle

GSC and GA4 are safe for scheduled refresh because they are fast, low-cost and
read-only.

Weekly run:

- window: last completed 28 days;
- cache: `growth_gsc_cache`, `growth_ga4_cache`;
- normalize immediately after cache refresh;
- promote only decision-grade rows to `growth_inventory`;
- mark the Council as WATCH if cache freshness fails.

Daily anomaly run:

- window: last 7 completed days vs previous 7 completed days;
- output: health/anomaly artifact and optional watch rows;
- do not approve experiments from daily anomalies without Council review.

## Backlog Generation Rule

`growth_inventory` is the backlog source for the Growth Council, but it is not a
raw data lake.

Promote a row only when it has:

- provider source and cache key or fact id;
- date window or run id;
- baseline metric;
- owner issue;
- priority score;
- next action;
- evaluation date if it becomes an experiment.

Do not promote:

- raw provider JSON;
- low-volume rows without strategic value;
- provider errors except as health/watch rows;
- unverified AI/GEO responses without stable prompt id and source fact.
- localized content rows without a translation quality check or explicit
  Council exception.

## Automation Guardrails

- GitHub issues remain the source of truth for status.
- Shared Supabase migrations must be mirrored through `bukeer-flutter`.
- Provider secrets must stay in local/project env, never in docs or artifacts.
- Automation may update cache/facts/inventory only through idempotent scripts.
- `seo_provider_usage` must account each provider `cache_key` once via
  `metadata.accounted_cache_keys`; repeated polling may refresh raw cache rows
  but must not add cost again.
- Expensive provider runs need profile, owner issue, tag and explicit approval.
- `growth_inventory` rows must remain tenant-scoped and RLS-compatible.
- The Council cannot approve experiments from stale data.
- The Council cannot scale EN-US/MX localized content when translation quality
  status is `blocked`.

## Current State

As of 2026-04-29:

- GSC and GA4 cache refresh plus normalizers are implemented as scripts and can
  become scheduled weekly automation.
- DataForSEO OnPage v2 is running as an approved task; follow-up polling,
  persistence, normalization and diff are reproducible by script, but not yet
  scheduled end-to-end.
- AI Search/GEO is specified as `geo_ai_visibility_v1`; tables and runner are
  pending before automation.
- Translation quality gate is specified and backed by migration
  `20260429203000_translation_quality_gate.sql`; scoring/normalizer scripts are
  pending.

## Implementation Backlog

| Priority | Task                                                                                                      | Owner issue    |
| -------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| P0       | Add scheduled wrapper for GSC/GA4 weekly refresh + normalizers + health report.                           | #321           |
| P0       | Add DataForSEO task monitor that polls approved task ids and runs final normalization/diff on completion. | #312/#313      |
| P1       | Add daily anomaly job for GSC/GA4/tracking freshness and 7d vs 7d watch rows.                             | #321/#322      |
| P1       | Add GitHub/Council report generator from normalized counts and `growth_inventory`.                        | #310/#321      |
| P1       | Implement AI Search/GEO tables and pilot runner before scheduling `geo_ai_visibility_v1`.                 | #321/#334/#335 |
| P1       | Add translation quality scoring + normalizer into `growth_inventory` for EN-US/MX scale decisions.        | #314/#315/#321 |
