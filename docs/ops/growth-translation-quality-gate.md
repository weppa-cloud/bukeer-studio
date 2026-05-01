# Growth Transcreation Quality Gate

Status: operating contract for Epic #310 / Spec #337  
Tenant: ColombiaTours (`colombiatours.travel`)  
Website id: `894545b7-73ca-4dae-b76a-da5b6a3f8441`  
Last updated: 2026-05-01
Related: [SPEC_GROWTH_OS_AGENT_LANES](../specs/SPEC_GROWTH_OS_AGENT_LANES.md), [SPEC_GROWTH_OS_SSOT_MODEL](../specs/SPEC_GROWTH_OS_SSOT_MODEL.md)

## Purpose

Define how translated and localized content becomes decision-grade for Growth
OS. This is the operating gate for the Transcreation Growth Agent defined in
`SPEC_GROWTH_OS_AGENT_LANES`: target-language content must be adapted to market
intent, not translated literally. EN-US, Mexico and future locale expansion can
scale only when quality is measurable, reviewable and connected to Growth OS
backlog and Council evidence.

The canonical flow is:

```text
seo_transcreation_jobs
  -> seo_translation_quality_checks
  -> seo_translation_qa_findings
  -> seo_localized_variants
  -> GSC/GA4 by locale and market
  -> growth_backlog_items / growth_inventory compatibility
  -> Growth Council #321
```

`seo_translation_quality_checks` stores the comparable summary. Existing
`seo_translation_qa_findings` stores detailed issues. `growth_inventory` and
the unified backlog store only actionable rows, not every QA observation.

## Gate Model

| Layer                 | Table                            | Purpose                                                                           |
| --------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| Draft/review workflow | `seo_transcreation_jobs`         | Source/target locale job, payload, status, reviewer and keyword re-research gate. |
| Quality summary       | `seo_translation_quality_checks` | One quality result per job/page/locale check with score, grade, status and risks. |
| Quality details       | `seo_translation_qa_findings`    | Specific translation/localization issues, evidence and resolution state.          |
| Published/apply state | `seo_localized_variants`         | Final localized overlay consumed by SSR and hreflang/sitemap policy.              |
| Executive action      | `growth_inventory`               | Only blocked/watch/pass-with-action rows that affect Council decisions.           |

## Transcreation Agent Responsibilities

The Transcreation Growth Agent owns the locale quality lane. Its goal is not to
translate every page as fast as possible; it is to create market-fit pages that
can be indexed, measured and scaled.

| Responsibility    | Rule                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Market adaptation | Re-research intent, terminology, CTA and trust proof for the target market.                                              |
| Quality gate      | Do not apply/publish when grade is D/F, critical risk exists or the target URL redirects to default-locale content.      |
| Sitemap/hreflang  | Keep target-locale URLs hidden until `pass` or documented `watch` with Council exception.                                |
| Backlog routing   | `locale_gate_required` items stay in the Transcreation lane, not the technical remediation lane.                         |
| Evidence          | Store grade, status, risks, reviewer, target locale, market intent and publish decision in operational tables/artifacts. |

Creator and Curator are separate responsibilities: the same agent may draft a
transcreation, but a curator or reviewer must validate it before apply/publish.

## Quality Dimensions

| Dimension         | What it checks                                                                    | Blocking examples                                                               |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Fluency           | Natural target-language copy and readability.                                     | Literal or broken translation, awkward English, mixed-language paragraphs.      |
| Accuracy          | Meaning preserved from source without invented facts.                             | Wrong itinerary facts, wrong destination, unsupported claim.                    |
| Brand glossary    | Required terms and brand voice respected.                                         | ColombiaTours brand variants, forbidden translations, missing planner language. |
| SEO preservation  | Meta title, meta description, H1, slug, keyword and FAQ intent preserved/adapted. | Keyword removed, slug not localized, meta too long, FAQ schema broken.          |
| Locale adaptation | Target market context, CTA and vocabulary are localized.                          | US copy using Colombia-only assumptions, Mexico copy missing market intent.     |

## Status Rules

| Status    | Rule                                                                                           | Growth behavior                                                                      |
| --------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `pass`    | Grade A/B, no critical risk, reviewer can apply/publish.                                       | Can feed locale experiments and content scale.                                       |
| `watch`   | Grade B/C or non-critical risks; usable with explicit next action.                             | Promote to `growth_inventory` only if there is traffic/demand or a Council decision. |
| `blocked` | Grade D/F, critical risk, missing target-market re-research or unresolved factual/brand issue. | Blocks content scale for that URL/locale and creates a remediation row.              |

Recommended initial thresholds:

- A: `overall_score >= 85`
- B: `70-84.99`
- C: `55-69.99`
- D: `40-54.99`
- F: `< 40`

Council default:

- A/B -> `pass`
- C -> `watch`
- D/F or critical risk -> `blocked`

## Promotion To `growth_inventory`

Promote only rows that can drive a decision.

| Signal                                                           | Inventory mapping                                                                   |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Translation quality `blocked` for an indexable target-locale URL | `content_status = blocked`, `channel = seo`, owner issue `#314` or `#315`.          |
| Quality `watch` on a URL with GSC impressions or GA4 sessions    | `content_status = pass_with_watch`, next action explains remediation.               |
| Translation quality `pass` plus strong demand                    | Candidate content experiment row with baseline, success metric and evaluation date. |
| Locale mismatch in hreflang/sitemap                              | Technical/content row linked to #312/#313 plus locale issue.                        |
| Glossary miss across many pages                                  | Cluster/editorial governance row linked to #314-#320.                               |

Required inventory fields:

- `source_url`
- `locale`
- `market`
- `content_status`
- `owner_issue`
- `priority_score`
- `next_action`
- `baseline_start` / `baseline_end` when connected to GSC/GA4
- `hypothesis`, `success_metric`, `evaluation_date` when approved as experiment

## Council Rule

Growth Council must reject localized content experiments when any of these are
missing:

- target-locale URL or page id;
- translation quality check or explicit exception;
- source demand row from GSC/DataForSEO or strategic exception;
- baseline metric;
- owner;
- success metric;
- evaluation date.

For #310, EN-US and Mexico content scale stays `PASS-WITH-WATCH` until the
quality gate is populated and at least the priority pages have `pass` or
documented `watch` status.

## Migration

Shared schema migration:

- Studio: `supabase/migrations/20260429203000_translation_quality_gate.sql`
- Flutter SSOT mirror:
  `../bukeer_flutter/supabase/migrations/20260429203000_translation_quality_gate.sql`

The migration creates `seo_translation_quality_checks` with tenant RLS,
score/grade/status columns and evidence fields. It does not mutate existing
content.

### Application Evidence — 2026-04-29

Applied to Supabase via MCP `apply_migration`:

- Migration name: `translation_quality_gate`
- Supabase migration registry version: `20260429183445`
- Result: `success: true`

Read-only verification:

| Check                                                  | Result                                                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `to_regclass('public.seo_translation_quality_checks')` | `seo_translation_quality_checks`                                                                                                             |
| Existing related tables                                | `seo_translation_qa_findings`, `seo_transcreation_jobs`, `seo_localized_variants` present                                                    |
| Initial row count                                      | `0`                                                                                                                                          |
| RLS                                                    | enabled                                                                                                                                      |
| Policies                                               | `seo_translation_quality_checks_service_all`, `seo_translation_quality_checks_account_read`, `seo_translation_quality_checks_account_manage` |
| Indexes                                                | `seo_translation_quality_checks_pkey`, `idx_translation_quality_lookup`, `idx_translation_quality_job`, `idx_translation_quality_page`       |

## Open Implementation Backlog

| Priority | Task                                                                                                     | Owner issue |
| -------- | -------------------------------------------------------------------------------------------------------- | ----------- |
| P0       | Add quality-check script/API that scores transcreation jobs and writes `seo_translation_quality_checks`. | #314/#315   |
| P0       | Normalizer: blocked/watch quality rows -> `growth_inventory`.                                            | #311/#321   |
| P1       | Dashboard badges in translations UI: grade, status, risks, last checked.                                 | #314/#315   |
| P1       | Council report section for EN-US/MX quality coverage.                                                    | #321        |
| P2       | Automated LLM-assisted QA suggestions, still human-reviewed before apply.                                | #314-#320   |
