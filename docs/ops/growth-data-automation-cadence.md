# Growth Data Automation Cadence

Status: operating contract for Epic #310 / Spec #337  
Tenant: ColombiaTours (`colombiatours.travel`)  
Website id: `894545b7-73ca-4dae-b76a-da5b6a3f8441`  
Last updated: 2026-04-29

## Purpose

Define what runs automatically, what requires human approval, and when provider
data becomes an actionable `growth_inventory` backlog.

The Growth OS Max Performance data rule is:

`provider raw -> provider cache -> normalized facts -> joint facts -> growth_inventory -> Growth Council`

Automation may fetch and normalize approved sources. It must not approve new
experiments or launch expensive provider tasks without an explicit run profile
and owner issue.

## Max Performance Implementation Flow

All Growth OS automation must preserve the same implementation flow, even when
only one provider is involved:

| Stage              | Contract                                                                                                                                        | Examples                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider raw       | Provider response, task id, endpoint name, request profile and timestamp are captured without manual interpretation.                            | DataForSEO `task_post`/summary/pages/resources, GSC Search Analytics response pages, GA4 Data API reports, tracking webhook/event payloads. |
| Provider cache     | Raw payload is stored idempotently with `tenant_id`, `website_id`, `profile`, `window` or `task_id`, `cache_key`, freshness metadata and error. | `growth_dataforseo_cache`, `growth_gsc_cache`, `growth_ga4_cache`, event logs where configured.                                             |
| Normalized facts   | Provider-specific scripts convert cache rows into stable, comparable facts.                                                                     | `seo_audit_results`, `seo_audit_findings`, future GSC facts, future GA4 facts, `funnel_events`, `meta_conversion_events`.                   |
| Joint facts        | Cross-provider normalizers join facts by canonical URL/path, market, device, campaign, event and date window. No new provider calls happen.     | Search demand + activation, market fit, mobile SEO/CRO, paid governance, post-fix validation, locale launch readiness.                      |
| `growth_inventory` | Only decision-grade facts are promoted, deduplicated and scored with owner issue, next action, baseline and evaluation rule.                    | P0/P1 remediation, WATCH health rows, Council experiment candidates, paid BLOCKED/WATCH/PASS rows, localization gates.                      |
| Growth Council     | Council reviews only inventory rows backed by source facts and fresh cache.                                                                     | Approve experiment, keep WATCH, block for data quality, assign owner, set metric/evaluation date, or archive as low strategic value.        |

The joint-fact stage is mandatory for Council decisions that combine channels:
SEO demand with GA4 activation, technical fixes with search/behavior recovery,
paid campaigns with funnel/Meta CAPI continuity, or localized content with GSC,
GA4 and translation quality.

## Automation Levels

| Level               | Meaning                                                        | Allowed actions                                                                                            |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Manual approval     | Human approves the run before provider cost or broad crawling. | Start DataForSEO OnPage full crawls, AI/GEO pilots, backlinks, broad SERP pulls.                           |
| Automatic follow-up | A task was already approved and started.                       | Poll status, persist summaries, fetch finished pages/resources, normalize, diff and update health reports. |
| Automatic weekly    | Low-risk recurring pulls before Council.                       | GSC/GA4 cache refresh, normalizers, cache health, `growth_inventory` backlog refresh.                      |
| Automatic daily     | Lightweight monitoring only.                                   | Freshness checks, tracking/event anomaly checks, cache expiry alerts.                                      |

## Provider Cadence

| Provider/profile                           | Cadence                                                      | Automation mode                                                                      | Output                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| DataForSEO `dfs_onpage_full_v2`            | Weekly while #312/#313 are blocked or watch.                 | Manual approval to start; automatic follow-up until complete.                        | `growth_dataforseo_cache`, `seo_provider_usage`, `seo_audit_results`, `seo_audit_findings`, actionable technical `growth_inventory` rows. |
| DataForSEO `dfs_onpage_rendered_sample_v1` | On demand for priority URLs.                                 | Manual approval to start; automatic follow-up.                                       | Render/performance watch rows and evidence.                                                                                               |
| Search Console `gsc_growth_minimum_v1`     | Weekly before Growth Council; optional daily anomaly window. | Automatic weekly/daily.                                                              | `growth_gsc_cache`, GSC decision rows in `growth_inventory`.                                                                              |
| GA4 `ga4_growth_minimum_v1`                | Weekly before Growth Council; optional daily anomaly window. | Automatic weekly/daily.                                                              | `growth_ga4_cache`, GA4/CRO decision rows in `growth_inventory`.                                                                          |
| Tracking facts                             | Continuous ingestion where webhooks exist; weekly smoke.     | Automatic where configured.                                                          | `funnel_events`, `meta_conversion_events`, conversion status in `growth_inventory`.                                                       |
| AI Search/GEO `geo_ai_visibility_v1`       | Monthly baseline; weekly only for active AI/GEO experiments. | Manual approval for pilot/full run; automatic follow-up after start.                 | `seo_ai_visibility_runs`, `seo_ai_visibility_facts`, `growth_inventory` rows with `channel = 'ai_search'`.                                |
| Translation quality gate                   | Before target-locale content scale or Council approval.      | Automatic scoring can run after draft/review; publish still requires human approval. | `seo_translation_quality_checks`, `seo_translation_qa_findings`, content status rows in `growth_inventory`.                               |

## Paid-Call Approval Rules

A provider call is approval-gated when it can create material external cost,
change a comparable baseline, crawl broadly, or produce data that may be used to
approve paid spend.

| Call type                                                                      | Approval rule                                                                                              | Automatic after approval                                                                                |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| DataForSEO OnPage full crawl, rendered sample or broad SERP/API pull           | Requires profile name, owner issue, tenant/website, max pages/units, tag, expected output and cost intent. | Poll task, persist cache, account usage once, normalize, diff, refresh health and inventory.            |
| DataForSEO AI Optimization / GEO pilot or full run                             | Requires Council or owner approval, stable prompt set, market/locale scope and experiment/watch objective. | Fetch completed result sets, persist cache, normalize AI visibility facts, create WATCH/candidate rows. |
| Meta/paid-platform API calls that mutate spend, campaigns, audiences or events | Requires explicit campaign owner approval and rollback/kill-switch path.                                   | Read-only reporting and continuity checks may continue within the approved profile.                     |
| GSC and GA4 read-only cache refreshes                                          | No per-run approval when using documented profiles and completed-date windows.                             | Weekly/daily schedules may refresh cache and run normalizers.                                           |
| Tracking webhook/event ingestion                                               | No per-event approval after platform integration is approved.                                              | Ingest, dedupe, reconcile and emit health rows.                                                         |

Approval must be recorded outside the provider payload, usually in the owner
GitHub issue or Council note, and the run must include that issue reference in
metadata. Re-running the same expensive profile with a new task id is a new
approval unless the owner issue explicitly authorizes a recurring cadence.

## Weekly Council Sequence

Run this sequence before every Growth Council:

1. Refresh GSC and GA4 caches for the last completed 28 days.
2. Normalize decision-grade GSC/GA4 rows into `growth_inventory`.
3. Run joint normalizers for search-to-activation, market fit, mobile SEO/CRO,
   paid governance, post-fix validation and locale launch readiness.
4. Poll any approved DataForSEO task still in progress.
5. If the DataForSEO task is complete, fetch final pages/resources, persist raw
   cache rows, normalize facts, run diff and refresh technical inventory rows.
6. Run cache/data health report.
7. Run translation quality gate for localized candidates that may enter the
   Council.
8. Generate Council intake from normalized and joint-fact rows only.
9. Reject experiments without source row, baseline, owner, success metric and
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

## Tracking Lifecycle

Tracking facts are the conversion truth for Growth OS. GA4 can show behavior and
key events, but paid and CRO decisions must reconcile against durable funnel or
platform facts.

| Source                        | Cadence                                                                         | Health rule                                                                                      | Council use                                                      |
| ----------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `funnel_events`               | Continuous where instrumented; daily freshness check; weekly smoke.             | BLOCKED if expected lead/CTA/booking events disappear for active conversion paths.               | Activation baseline, CRO drop-off, WAFlow/CRM continuity.        |
| `meta_conversion_events`      | Continuous where CAPI is enabled; daily freshness check; weekly reconciliation. | WATCH/BLOCKED if Meta events exist without matching funnel events or vice versa.                 | Paid readiness, campaign traceability, spend approval gate.      |
| WhatsApp/Chatwoot lifecycle   | Continuous if webhook/API integration is active; weekly smoke.                  | WATCH if page CTA exists but no lifecycle event follows; BLOCKED if custom-domain CTA is broken. | Lead lifecycle completeness and paid/CRO measurement confidence. |
| Public analytics pageview/CTA | Deploy smoke and weekly sample.                                                 | WATCH if GA4 pageviews exist but public CTA event mapping is absent or inconsistent.             | Data-quality precondition for Council experiment approval.       |

Tracking health rows may enter `growth_inventory` as WATCH/BLOCKED even when
volume is low, because they are measurement prerequisites rather than growth
opportunities.

## Health And Freshness Rules

The Council cannot approve experiments from stale or unhealthy data. Each
scheduled run must emit a health artifact or issue comment that reports:

| Area              | PASS                                                                 | WATCH                                                         | BLOCKED                                                                                  |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Cache freshness   | Weekly profiles refreshed for the intended completed window.         | Cache older than expected but still directionally useful.     | Missing cache for a required provider/window.                                            |
| Provider errors   | No unhandled provider errors; partial pulls are labeled.             | Retriable provider errors with unaffected core profiles.      | Failed core profile or expensive task failure without usable baseline.                   |
| Normalizers       | Cache rows mapped to facts with stable keys and dedupe.              | Non-critical profile lacks normalized output.                 | Core normalizer failed or produced rows without source/cache references.                 |
| Joint facts       | Required joins completed with canonical URL/path reconciliation.     | Join gaps explainable by missing market/device/campaign data. | Council candidate depends on a cross-provider join that did not run or cannot reconcile. |
| Tracking          | Expected CTA/funnel/platform events fresh for active flows.          | Event volume is low but integration smoke passes.             | Active paid/CRO decision lacks funnel/Meta/CRM continuity.                               |
| Usage accounting  | `seo_provider_usage` accounted each paid `cache_key` exactly once.   | Usage estimate pending but cache is persisted.                | Paid provider run has no usage record or duplicate cost accounting risk.                 |
| Translation gates | Locale candidates have pass/review status and source language facts. | Manual review pending.                                        | Locale candidate is `blocked`, lacks QA check, or violates sitemap/hreflang guardrails.  |

Freshness windows:

- Weekly Council GSC/GA4 profiles: last completed 28 days, refreshed before
  Council.
- Daily GSC/GA4/tracking anomaly profiles: last completed day or last completed
  7 days vs previous 7 days; WATCH only.
- DataForSEO full crawl: fresh for the weekly technical Council while #312/#313
  remain blocked/watch; a new baseline requires approved rerun.
- AI/GEO: monthly baseline unless an active experiment explicitly approves
  weekly measurement.
- Translation quality: fresh for the content batch being approved; stale if the
  source or localized page changed after the last QA check.

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

Backlog generation runs in three passes:

1. Provider fact pass: create or update provider-specific rows for technical
   findings, search opportunities, GA4/CRO gaps, tracking health and
   localization status.
2. Joint fact pass: deduplicate cross-provider rows by canonical URL/path,
   market, device, campaign and issue type, then boost priority when multiple
   providers confirm the same opportunity or blocker.
3. Council intake pass: emit a ranked candidate list with status `candidate`,
   `watch` or `blocked`; never auto-approve experiments.

Status rules:

| Status      | Meaning                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `candidate` | Fresh facts, measurable baseline, owner issue, next action and Council decision required.         |
| `watch`     | Signal is real but lacks volume, confidence, tracking continuity, or a completed evaluation date. |
| `blocked`   | Provider health, tracking, translation, technical crawl, or paid-governance prerequisite failed.  |
| `archived`  | Superseded by newer accepted crawl/window, duplicate, fixed and validated, or low strategic fit.  |

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
