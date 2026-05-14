# AUDIT: Growth OS Provider Profile Registry Map — 2026-05

## Purpose
Executable audit map for GitHub issue #536, derived from the merged provider-profile v2 spec in PR #534 and the beta implementation plan. This is audit-first: no provider APIs were called while producing this document.

## Traceability
- Parent issue: #536 Provider Profile Registry Audit Map — Beta Phase 1.
- Runtime direction issue: #521 Hermes Primary Runtime MVE v0 for Growth OS.
- Merged spec PR: #534.
- Source spec: `docs/specs/SPEC_GROWTH_OS_PROVIDER_PROFILE_ARCHITECTURE_V2.md`.
- Source plan: `docs/plans/PLAN_GROWTH_OS_PROVIDER_PROFILE_BETA_IMPLEMENTATION.md`.
- Prior audit: `docs/audits/AUDIT_GROWTH_OS_PROVIDER_PROFILE_SYSTEM_2026-05.md`.
- Related ADRs: [[ADR-003]] contract-first validation, [[ADR-009]] multi-tenant subdomain/account boundaries, [[ADR-016]] SEO intelligence caching and TTLs, [[ADR-018]] idempotent/replay-safe writes, [[ADR-029]] funnel_events as source of truth.

## Non-negotiable audit constraints
- GitHub remains planning SSOT: issues/specs/commits/PRs define scope and traceability.
- Supabase remains operational SSOT: provider runs, caches, facts, work items, outcomes and snapshots.
- Neo/Hermes is orchestrator/validator, not a production provider worker.
- Workers consume context packets and normalized facts; they must not call DataForSEO, GSC, GA4, Clarity, Ads or paid APIs directly in production paths.
- Paid media beta is read-only/recommendations-only. No campaign launch, pause, budget, negative keyword, creative, conversion upload or other mutation is allowed without a separate human-governed issue.
- Every production row/run must be scoped by `website_id` and, where applicable, `account_id` plus provider account/customer/project id.

## Registry inventory snapshot
Generated from `node scripts/seo/growth-provider-profile-registry.mjs` without provider calls.

```json
{
  "profile_count": 45,
  "by_status": {
    "implemented": 8,
    "partial": 35,
    "excluded": 2
  },
  "by_provider": {
    "dataforseo": 17,
    "gsc": 9,
    "ga4": 10,
    "tracking": 1,
    "joint": 8
  },
  "by_priority": {
    "P0": 14,
    "P1": 24,
    "P2": 5,
    "P3": 2
  },
  "by_cadence": {
    "weekly": 23,
    "on_approval": 1,
    "biweekly": 1,
    "monthly": 14,
    "quarterly": 1,
    "no_default": 2,
    "daily": 2,
    "continuous": 1
  }
}
```

Coverage: 45 existing SEO/analytics/joint registry entries were found: 17 DataForSEO, 9 GSC, 10 GA4, 1 tracking, 8 joint. The registry does not yet include Clarity or paid media profile entries even though Clarity runner/schema and paid-media scripts/migrations exist elsewhere.

## Existing execution surfaces audited

| Surface | Evidence | Audit result |
| --- | --- | --- |
| Provider registry | `scripts/seo/growth-provider-profile-registry.mjs` | PASS for SEO/GSC/GA4/joint inventory; WATCH because Clarity and paid media are not first-class registry entries. |
| DataForSEO OnPage extractor | `scripts/seo/dataforseo-onpage-crawl.mjs` | PASS with cost/approval WATCH. Script calls provider API; must only be invoked through approved provider runner. |
| DataForSEO OnPage normalizer | `scripts/seo/normalize-dataforseo-onpage.mjs`, `scripts/seo/triage-dataforseo-findings.mjs` | PASS for OnPage facts/inventory path. |
| GSC/GA4 cache population | `scripts/seo/populate-growth-google-cache.ts` | WATCH. Script maps many GSC/GA4 pulls but still directly owns extraction; provider runner/freshness ledger should wrap it. |
| GSC normalizer | `scripts/seo/normalize-growth-gsc-cache.mjs` | PASS for query/page, country, device, trend opportunities against `growth_gsc_cache`. |
| GA4 normalizer | `scripts/seo/normalize-growth-ga4-cache.mjs` | PASS for landing/channel, source/medium, event/page and campaign/source facts against `growth_ga4_cache` plus funnel/CAPI evidence. |
| Joint normalizer | `scripts/seo/run-growth-joint-normalizers.mjs` | WATCH. Useful context/backlog bridge, but it is not yet a formal context packet builder. |
| Clarity runner | `scripts/growth/run-clarity-profile.ts`, `lib/growth/providers/clarity-profile-runner.ts` | WATCH. Existing aggregate runner writes `growth_profile_runs`; absent from central registry and no dedicated cache table. |
| Google Ads read-only scripts | `scripts/google-ads/validate-conversion-governance.cjs`, `scripts/google-ads/colombiatours-crm-growth-study.cjs` | WATCH. Reporting/governance is usable as read-only evidence, but scripts include live API reads and must be wrapped/gated. |
| Google Ads mutation scripts | `scripts/google-ads/apply-*.cjs`, `activate-global-expansion-campaigns.cjs` | BLOCKED for beta runtime. Keep as human-gated/manual tools only; workers must not execute them. |
| Supabase cache schema | `supabase/migrations/20260504111100_growth_cache_tables.sql` | PASS for `growth_gsc_cache`, `growth_ga4_cache`, `growth_dataforseo_cache`, `growth_inventory`; multi-tenant and TTL comments cite ADR-009/ADR-016/ADR-018. |
| Provider run ledger | `supabase/migrations/20260510103000_growth_provider_intelligence_runs.sql`, `20260510115000_growth_profile_runs_provider_clarity.sql` | WATCH. Ledger exists for dataforseo/gsc/ga4/clarity, but not paid providers; #536 should create implementation tasks rather than mutate schema here. |

## SEO / analytics profile matrix

Statuses mean:
- PASS: mapped to existing script/cache/normalizer/fact path enough for beta reuse.
- WATCH: usable design/partial implementation but requires runner, ledger, normalizer, freshness or contract work.
- BLOCKED: explicit implementation gap before the profile can feed workers.

| Profile | Provider | Priority | Cadence | Audit | Cache / ledger | Extractor | Normalizer | Fact outputs | Gaps / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dfs_onpage_full_comparable_v3` | dataforseo | P0 | weekly | PASS | `growth_dataforseo_cache` | `scripts/seo/dataforseo-onpage-crawl.mjs; scripts/seo/persist-dataforseo-onpage-artifact.mjs` | `scripts/seo/normalize-dataforseo-onpage.mjs; scripts/seo/triage-dataforseo-findings.mjs; scripts/seo/diff-growth-audit-runs.mjs` | seo_audit_results, seo_audit_findings | approval/cost gate required |
| `dfs_onpage_rendered_sample_v1` | dataforseo | P1 | on_approval | WATCH | `growth_dataforseo_cache` | `scripts/seo/dataforseo-onpage-crawl.mjs` | `scripts/seo/normalize-dataforseo-onpage.mjs` | seo_audit_results, seo_audit_findings | registry marks partial; approval/cost gate required |
| `dfs_serp_priority_keywords_v1` | dataforseo | P1 | biweekly | BLOCKED | `growth_dataforseo_cache` | `scripts/seo/run-dataforseo-max-performance-profiles.mjs; lib/seo/serp-snapshot.ts` | `GAP` | seo_serp_snapshots, seo_serp_features | normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_serp_local_pack_v1` | dataforseo | P1 | monthly | BLOCKED | `growth_dataforseo_cache` | `scripts/seo/run-dataforseo-max-performance-profiles.mjs` | `GAP` | seo_local_serp_facts | normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_keyword_volume_trends_v1` | dataforseo | P1 | monthly | BLOCKED | `growth_dataforseo_cache` | `GAP` | `GAP` | seo_keyword_opportunities | extractor mapping missing; normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_labs_demand_cluster_v1` | dataforseo | P0 | monthly | BLOCKED | `growth_dataforseo_cache` | `GAP` | `GAP` | seo_keyword_opportunities, seo_topic_clusters | extractor mapping missing; normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_labs_competitor_visibility_v1` | dataforseo | P1 | monthly | BLOCKED | `growth_dataforseo_cache` | `GAP` | `GAP` | seo_competitor_visibility | extractor mapping missing; normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_labs_gap_intersections_v1` | dataforseo | P1 | monthly | BLOCKED | `growth_dataforseo_cache` | `scripts/seo/run-dataforseo-max-performance-profiles.mjs` | `GAP` | seo_keyword_gap_facts | normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_backlinks_authority_v1` | dataforseo | P1 | monthly | BLOCKED | `growth_dataforseo_cache` | `scripts/seo/run-dataforseo-max-performance-profiles.mjs` | `GAP` | seo_backlink_facts | normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_backlinks_competitor_gap_v1` | dataforseo | P1 | monthly | BLOCKED | `growth_dataforseo_cache` | `scripts/seo/run-dataforseo-max-performance-profiles.mjs` | `GAP` | seo_backlink_gap_facts | normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_business_local_v1` | dataforseo | P1 | monthly | BLOCKED | `growth_dataforseo_cache` | `scripts/seo/run-dataforseo-max-performance-profiles.mjs` | `GAP` | seo_local_reputation_facts | normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_reviews_sentiment_v1` | dataforseo | P2 | monthly | BLOCKED | `growth_dataforseo_cache` | `scripts/seo/run-dataforseo-max-performance-profiles.mjs` | `GAP` | seo_review_facts | normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_ai_geo_visibility_v1` | dataforseo | P1 | monthly | WATCH | `growth_dataforseo_cache` | `scripts/seo/run-dataforseo-ai-visibility.mjs` | `scripts/seo/normalize-ai-visibility-inventory.mjs` | seo_ai_visibility_runs, seo_ai_visibility_facts | registry marks partial; approval/cost gate required |
| `dfs_content_brand_sentiment_v1` | dataforseo | P2 | monthly | BLOCKED | `growth_dataforseo_cache` | `scripts/seo/run-dataforseo-max-performance-profiles.mjs` | `GAP` | seo_content_sentiment_facts | normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_domain_competitive_baseline_v1` | dataforseo | P2 | quarterly | BLOCKED | `growth_dataforseo_cache` | `scripts/seo/run-dataforseo-max-performance-profiles.mjs` | `GAP` | seo_domain_competitive_facts | normalizer/fact builder missing; registry marks partial; approval/cost gate required |
| `dfs_merchant_watch_v1` | dataforseo | P3 | no_default | WATCH | `growth_dataforseo_cache` | `GAP` | `GAP` | GAP | extractor mapping missing; normalizer/fact builder missing; excluded/no default run; approval/cost gate required |
| `dfs_app_data_watch_v1` | dataforseo | P3 | no_default | WATCH | `growth_dataforseo_cache` | `GAP` | `GAP` | GAP | extractor mapping missing; normalizer/fact builder missing; excluded/no default run; approval/cost gate required |
| `gsc_daily_complete_web_v1` | gsc | P0 | daily | WATCH | `growth_gsc_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-gsc-cache.mjs` | seo_gsc_daily_facts | registry marks partial |
| `gsc_daily_complete_image_v1` | gsc | P1 | weekly | WATCH | `growth_gsc_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-gsc-cache.mjs` | seo_gsc_image_facts | registry marks partial |
| `gsc_council_28d_query_page_v1` | gsc | P0 | weekly | PASS | `growth_gsc_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-gsc-cache.mjs` | seo_gsc_query_page_facts | none for audit scope |
| `gsc_council_28d_page_market_v1` | gsc | P0 | weekly | PASS | `growth_gsc_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-gsc-cache.mjs` | seo_gsc_market_facts | none for audit scope |
| `gsc_council_28d_page_device_v1` | gsc | P1 | weekly | PASS | `growth_gsc_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-gsc-cache.mjs` | seo_gsc_device_facts | none for audit scope |
| `gsc_trend_90d_page_v1` | gsc | P1 | weekly | WATCH | `growth_gsc_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-gsc-cache.mjs` | seo_gsc_trend_facts | registry marks partial |
| `gsc_search_appearance_v1` | gsc | P1 | weekly | WATCH | `growth_gsc_cache` | `scripts/seo/populate-growth-google-cache.ts` | `GAP` | seo_gsc_appearance_facts | normalizer/fact builder missing; registry marks partial |
| `gsc_locale_path_v1` | gsc | P1 | weekly | WATCH | `growth_gsc_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-gsc-cache.mjs` | seo_gsc_locale_facts | registry marks partial |
| `gsc_brand_nonbrand_v1` | gsc | P1 | weekly | WATCH | `growth_gsc_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-gsc-cache.mjs` | seo_gsc_brand_facts | registry marks partial |
| `ga4_daily_landing_channel_v1` | ga4 | P0 | daily | WATCH | `growth_ga4_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-ga4-cache.mjs` | seo_ga4_landing_daily_facts | registry marks partial |
| `ga4_council_landing_channel_28d_v1` | ga4 | P0 | weekly | PASS | `growth_ga4_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-ga4-cache.mjs` | seo_ga4_landing_facts | none for audit scope |
| `ga4_page_source_medium_28d_v1` | ga4 | P0 | weekly | PASS | `growth_ga4_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-ga4-cache.mjs` | seo_ga4_source_facts | none for audit scope |
| `ga4_event_page_28d_v1` | ga4 | P0 | weekly | PASS | `growth_ga4_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-ga4-cache.mjs` | seo_ga4_event_facts | none for audit scope |
| `ga4_campaign_source_medium_28d_v1` | ga4 | P0 | weekly | PASS | `growth_ga4_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-ga4-cache.mjs` | seo_ga4_campaign_facts | none for audit scope |
| `ga4_geo_landing_28d_v1` | ga4 | P1 | weekly | WATCH | `growth_ga4_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-ga4-cache.mjs` | seo_ga4_geo_facts | registry marks partial |
| `ga4_device_landing_28d_v1` | ga4 | P1 | weekly | WATCH | `growth_ga4_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-ga4-cache.mjs` | seo_ga4_device_facts | registry marks partial |
| `ga4_hostname_locale_28d_v1` | ga4 | P1 | weekly | WATCH | `growth_ga4_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-ga4-cache.mjs` | seo_ga4_locale_facts | registry marks partial |
| `ga4_internal_search_v1` | ga4 | P2 | weekly | WATCH | `growth_ga4_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-ga4-cache.mjs` | seo_ga4_search_facts | registry marks partial |
| `ga4_file_outbound_engagement_v1` | ga4 | P2 | monthly | WATCH | `growth_ga4_cache` | `scripts/seo/populate-growth-google-cache.ts` | `scripts/seo/normalize-growth-ga4-cache.mjs` | seo_ga4_engagement_facts | registry marks partial |

## Clarity profile map

| Profile | Provider | Priority | Cadence | Audit | Posture | Script / runner | Cache / ledger | Fact outputs | Gaps / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `clarity_ux_friction_v1` | clarity | P0 | daily | WATCH | aggregate read-only | `scripts/growth/run-clarity-profile.ts`; `lib/growth/providers/clarity-profile-runner.ts`; `lib/growth/clarity-client.ts` | `growth_profile_runs` payload rows; latest row exposed by `growth_funnel_observability_view` | UX friction aggregate by URL/device/source | Add to central provider registry; enforce 1-3 day/3 dimensions/quota policy in runner manifest; decide whether a dedicated `growth_clarity_cache` table is needed or ledger payload is enough. |
| `clarity_session_evidence_on_demand_v1` | clarity | P1 | on demand | BLOCKED | human/admin initiated only | GAP for production worker path | none | Session summary evidence only | Do not persist raw recordings or PII. Requires explicit human/admin flow and redaction contract before workers can consume. |

## Paid media read-only profile map

| Profile | Provider | Priority | Cadence | Audit | Beta posture | Script / runner | Cache / ledger | Fact outputs | Gaps / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `google_ads_campaign_daily_v1` | google_ads | P0 | daily | WATCH | read-only reporting | `Google Ads API searchStream via scripts/google-ads/colombiatours-crm-growth-study.cjs` | `artifacts/google-ads + future growth_google_ads_cache/growth_profile_runs` | campaign daily facts joined to funnel_events/GA4 | No campaign mutation; account_id + customer_id required. |
| `google_ads_search_terms_v1` | google_ads | P0 | daily/weekly | WATCH | read-only reporting | `scripts/google-ads/colombiatours-crm-growth-study.cjs search terms` | `artifacts/google-ads + future growth_google_ads_cache` | paid_search_term_content_opportunity | No negative keyword application in beta; existing apply-* scripts are mutation-capable and must stay human-gated. |
| `google_ads_landing_page_v1` | google_ads | P0 | weekly | WATCH | read-only reporting | `scripts/google-ads/colombiatours-crm-growth-study.cjs landing pages` | `artifacts/google-ads + growth_inventory join` | paid_landing_page_watch | Requires website_id + account_id + customer_id. |
| `google_ads_conversion_import_status_v1` | google_ads | P0 | weekly/on approval | WATCH | read-only smoke/governance | `scripts/google-ads/validate-conversion-governance.cjs` | `docs/audits + growth_profile_runs` | paid_tracking_blocked | No conversion upload/mutation; offline upload schema exists only for governed path. |
| `meta_ads_campaign_daily_v1` | meta_ads | P1 | daily | BLOCKED | design-only/read-only target | `GAP: no Meta Ads reporting extractor found in repo` | `future growth_meta_ads_cache/growth_profile_runs` | paid_wasted_spend / paid_tracking_watch | Meta CAPI tables exist; Ads reporting credentials/scope/cache not audited as implemented. |
| `meta_ads_capi_quality_v1` | meta_ads | P0 | continuous/weekly | WATCH | read-only quality | `Supabase meta_conversion_events + funnel_events; no Ads API call` | `meta_conversion_events + funnel_events` | tracking_conversion_facts_v1 | CAPI is operational evidence, not campaign mutation. |
| `tiktok_ads_campaign_daily_v1` | tiktok_ads | P2 | weekly | BLOCKED | design-only | `GAP` | `future cache/profile registry only` | future paid facts | No credentials/scope/cache/extractor found. |
| `linkedin_ads_campaign_daily_v1` | linkedin_ads | P2 | weekly | BLOCKED | design-only | `GAP` | `future cache/profile registry only` | future paid facts | No credentials/scope/cache/extractor found. |

## Multi-tenant scoping contract

| Scope key | Required for | Current evidence | Audit |
| --- | --- | --- | --- |
| `website_id` | all provider caches, profile runs, inventory, funnel facts, context packets | defaults appear in existing scripts for ColombiaTours; migrations include `website_id` columns and indexes | PASS WITH WATCH: defaults are acceptable for scripts, but provider runner must require explicit `--website-id` for multi-tenant beta. |
| `account_id` | account-owned provider credentials, CRM/funnel joins, paid media accounts | defaults appear in existing scripts and schemas; migrations include `account_id` | PASS WITH WATCH: provider runner must require explicit `--account-id`; no architecture may hardcode ColombiaTours. |
| provider account id | GSC site, GA4 property, Clarity project, Google Ads customer, Meta/TikTok/LinkedIn account | Clarity uses project id; Google Ads scripts use customer/login ids; SEO integrations store provider metadata | WATCH: paid provider account mapping must move into tenant channel contracts/service_channels before production. |
| `owner_issue` / approval | cost-gated DataForSEO and paid/risky actions | registry includes owner issues; provider run schema supports approval metadata | WATCH: implement as required gate in runner before invoking paid/costly scripts. |

## PASS / WATCH / BLOCKED summary

### PASS
- SEO/GSC/GA4/DataForSEO inventory can be audited from an existing registry and scripts without new architecture.
- `growth_gsc_cache`, `growth_ga4_cache`, `growth_dataforseo_cache`, `growth_inventory` exist with tenant columns and TTL/idempotency semantics tied to ADR-009, ADR-016 and ADR-018.
- DataForSEO OnPage, GSC core Council, GA4 Council profiles have usable extractor/normalizer mappings.
- `growth_profile_runs` exists for provider freshness/evidence ledger across dataforseo/gsc/ga4/clarity.

### WATCH
- The central registry omits Clarity and paid media even though code/schema exists elsewhere.
- Many DataForSEO non-OnPage profiles are partial: they name intended fact targets but lack dedicated normalizers or have only generic max-performance runner coverage.
- GSC `search_appearance` extraction has no explicit normalizer mapping in the registry.
- GSC/GA4 population still appears script-driven; beta needs a provider runner wrapper with freshness, budget and approval checks before any API call.
- Joint normalizers create inventory/backlog-style output but are not yet formal context packet builders.
- Paid media read-only scripts exist for Google Ads diagnostics, but paid caches/profile ledger/provider registry entries are missing.

### BLOCKED
- Workers are not yet technically forced to consume context packets instead of provider APIs.
- Meta Ads, TikTok Ads and LinkedIn Ads reporting profiles do not have audited extractors/caches/normalizers in this repo.
- Paid mutation scripts exist and must be explicitly excluded from autonomous beta execution.
- Clarity session-level evidence is blocked for worker consumption until privacy/redaction/on-demand human gate is implemented.

## Recommended next implementation tasks

1. `feat(growth): add provider registry schema entries for clarity and paid media read-only profiles`
   - Add Clarity and paid profile definitions to `scripts/seo/growth-provider-profile-registry.mjs` or a new generic registry module.
   - Include `domain`, `required_identifiers`, `mutation_allowed: false`, `blocked_direct_consumers`, `pii_policy`, `cache_target`, `normalizer`, `fact_outputs`.

2. `feat(growth): implement provider runner dry-run and freshness gate`
   - Wrap existing scripts instead of rewriting them.
   - Required inputs: `website_id`, `account_id`, profile id, owner issue, dry-run/apply mode.
   - Behavior: check `growth_profile_runs` / cache TTL first; return PASS/WATCH/BLOCKED without calling providers when fresh/missing approval/cost-gated.

3. `feat(contract): add GrowthProviderContextPacket schema`
   - Implement in `packages/website-contract/src` using ADR-003 contract-first validation.
   - Include freshness map, source profiles, facts, previous actions, dedupe verdict, allowed actions and blocked action `call_provider_api_directly`.

4. `feat(growth): build read-only context packet builder over Supabase facts`
   - Inputs: `website_id`, `account_id`, entity, lane/work type.
   - Reads: provider run ledger, growth caches/facts, `growth_inventory`, `funnel_events`, publication/outcome/work item tables.
   - Does not call provider APIs.

5. `chore(growth): quarantine paid mutation scripts from autonomous runners`
   - Add documentation/guardrails so `apply-*` and `activate-*` Google Ads scripts are human-gated only.
   - Provider runner should reject profiles with `mutation_allowed !== false` during beta.

6. `feat(growth): add paid read-only cache/ledger path`
   - Start with Google Ads campaign/search term/landing/conversion status read-only profiles.
   - Store only redacted, tenant-scoped facts; no secrets, raw PII or mutation payloads.

7. `test(growth): certify first no-provider-call context packet`
   - Use existing cache/fixture data to build a ColombiaTours packet.
   - Verify stale/missing profiles produce WATCH/BLOCKED instead of empty context.
   - Verify direct provider API action is always blocked for worker consumers.

## Validation performed for this audit

- Read `AGENTS.md` and `CLAUDE.md` for repository conventions.
- Read v2 spec and beta plan.
- Inspected registry, SEO provider scripts, Clarity runner, Google Ads scripts, relevant migrations and existing audit docs.
- Ran `node scripts/seo/growth-provider-profile-registry.mjs` only to print local registry metadata. This command does not call provider APIs.
- No DataForSEO, GSC, GA4, Clarity, Google Ads, Meta, TikTok or LinkedIn provider APIs were called.

## Secret handling

The audit discovered that the local `origin` URL contains an embedded GitHub token. It was not copied into this document or committed. Before sharing logs externally, redact `git remote -v` output.
