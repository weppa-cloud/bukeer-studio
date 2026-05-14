# AUDIT: Growth OS Provider Profile System Existing State — 2026-05

## Purpose
Recognize what already exists before changing architecture or implementing new runtime work. This audit supports `SPEC_GROWTH_OS_PROVIDER_PROFILE_ARCHITECTURE_V2`.

## Executive Summary
Score: **7/10 design, 5/10 operational connection**.

The repo already contains strong Growth OS design assets: #471 provider profiles, #521 Hermes runtime MVE, #460/#441 orchestration/autonomy, #502 transcreation and paid media specs. The missing piece is not imagination; it is a clean beta execution design that connects existing provider profiles, cache/facts, workers and GitHub traceability without allowing workers to call APIs independently.

## GitHub/Epic Audit
| Issue | State | Role | Finding |
| --- | --- | --- | --- |
| #310 | open | ColombiaTours business epic | Remains pilot business scope and planning umbrella. |
| #441 | open | Autonomous production OS | Valid autonomy/gating model; should consume context packets. |
| #460 | open | Agentic orchestrator 9+ | Valid orchestrator model; must not bypass provider profiles. |
| #471 | closed | Provider intelligence precedent | SEO/analytics provider profile spec exists and is certification-backed; reuse it. |
| #502 | closed | Transcreation precedent | Worker/output pattern exists; must be refit to context packet + anti-rework gate. |
| #521 | open | Hermes primary runtime MVE | Needs direction-change update: Neo/Hermes orchestrates provider-profile beta; Supabase remains operational SSOT. |

## Spec Audit
| Spec | Status | Useful existing decisions | Gap for beta |
| --- | --- | --- | --- |
| `SPEC_GROWTH_OS_PROVIDER_EXTRACTION_PROFILES.md` | strong precedent | DataForSEO/GSC/GA4/Clarity profile matrix, freshness, circuit breakers, `growth_profile_runs`. | SEO-specific; needs generic domain model and paid-media-ready contracts. |
| `SPEC_GROWTH_OS_HERMES_PRIMARY_RUNTIME_MVE_V0.md` | strong but direction shift needed | Hermes profiles, skill bindings, MCP safety layer, tenant/provider context. | Overstates Hermes Kanban as canonical runtime queue; beta should keep Supabase as operational SSOT. |
| `SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER.md` | strong | Provider run ledger, profile freshness, candidates/backlog/outcomes and paid media inclusion. | Needs context packet/worker-contract enforcement. |
| `SPEC_GROWTH_OS_PAID_MEDIA_INTEGRATION.md` | strong design | Google Ads/Meta profiles, paid facts, joint normalizers, mutation gates. | Needs alignment under generic provider profile v2; TikTok/LinkedIn future profiles not first implementation. |
| `SPEC_GROWTH_OS_SSOT_MODEL.md` | strong | GitHub planning SSOT, Supabase operational SSOT. | Must be enforced in #521 update. |
| `SPEC_GLOBAL_MULTILOCALE_TRANSCREATION_SEO.md` | implemented precedent | Multi-locale quality/post-publish gates. | Worker currently needs formal provider context packet dependency. |

## Code/Script Audit
Known scripts already present:
- `scripts/seo/growth-provider-profile-registry.mjs`
- `scripts/seo/dataforseo-onpage-crawl.mjs`
- `scripts/seo/populate-growth-google-cache.ts`
- `scripts/seo/normalize-dataforseo-onpage.mjs`
- `scripts/seo/normalize-growth-gsc-cache.mjs`
- `scripts/seo/normalize-growth-ga4-cache.mjs`
- `scripts/seo/run-growth-joint-normalizers.mjs`
- `scripts/seo/run-growth-max-matrix-orchestrator.mjs`
- `scripts/seo/run-growth-weekly-intake.mjs`
- `scripts/seo/triage-dataforseo-findings.mjs`
- `scripts/google-ads/validate-conversion-governance.cjs`
- `scripts/google-ads/colombiatours-crm-growth-study.cjs`
- `scripts/google-ads/apply-colombiatours-negative-keywords.cjs`

Finding: **do not build new extractors until each existing script is mapped to a profile, cache target, normalizer, consumer worker and GitHub owner issue.**

## Migration/Schema Audit
Relevant migrations already exist:
- `20260504111100_growth_cache_tables.sql`
- `20260507182000_growth_profile_freshness_flow.sql`
- `20260510103000_growth_provider_intelligence_runs.sql`
- `20260510114500_growth_profile_runs_compat_indexes.sql`
- `20260510115000_growth_profile_runs_provider_clarity.sql`
- `20260511210500_growth_agent_context_manifests.sql`
- `20260503140000_google_ads_offline_uploads.sql`
- funnel/CRM migrations for attribution and conversion truth.

Finding: migration work must be additive and likely belongs in `bukeer-flutter` when the schema is shared operationally.

## Architecture Gaps
| Gap | Severity | Why it matters | Proposed closure |
| --- | --- | --- | --- |
| Worker direct provider reads | CRITICAL | Duplicates cost and creates conflicting truth. | Block via worker contracts; context packets only. |
| Runtime/scheduler not consistently connected | CRITICAL | Specs/scripts exist but data freshness depends on execution. | Provider runner beta with freshness/budget ledger. |
| GSC/GA4 cache historically empty in reviewed data | CRITICAL | Free first-party data should be baseline. | First provider-run certification should populate/read these. |
| Hermes Kanban vs Supabase SSOT ambiguity | CRITICAL | Confuses runtime truth and auditability. | GitHub/Supabase SSOT; Hermes orchestrates and may dual-write temporarily. |
| Paid media separated from SEO flow | WATCH | Campaign learning must join with SEO/funnel facts. | Use generic profile domains and joint normalizers. |
| No formal context packet | CRITICAL | Workers get noisy/incomplete context. | Add context packet contract and builder plan. |
| Anti-rework not enforced at worker boundary | CRITICAL | Repeats tasks already applied/in measurement. | Dedupe gate before every action. |

## Recommended Direction
1. Update #521 with v2 direction: Neo/Hermes provider-profile beta.
2. Add `SPEC_GROWTH_OS_PROVIDER_PROFILE_ARCHITECTURE_V2.md`.
3. Add implementation plan for audit -> context packet -> runner -> worker contract.
4. Comment/link existing epics to establish traceability.
5. Validate technically before implementation.

## PASS/WATCH/BLOCKED Readiness
- GitHub planning SSOT: **PASS** — issues/specs already structured.
- Supabase operational SSOT: **PASS WITH WATCH** — schema exists, but runtime connection must be enforced.
- Existing scripts: **PASS** — many scripts exist; mapping is required.
- Provider freshness: **WATCH** — `growth_profile_runs` exists, but scheduler/runner needs current certification.
- Paid media readiness: **WATCH** — spec is strong, implementation must stay read-only first.
- Worker contract enforcement: **BLOCKED until implemented** — currently design-level only.
- Neo/Hermes boundary: **WATCH** — must be written into #521 and worker contracts.
