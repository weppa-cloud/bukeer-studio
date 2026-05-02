# Knowledge Graph — Bukeer Studio

> LLM Wiki entry point. Agents (Claude Code / Codex / Opencode) start here to navigate the knowledge graph. Obsidian-compatible.
>
> **Convention:** `[[ADR-XXX]]` or `[[SPEC_NAME]]` = wikilink resolved below. `[text](path.md)` = regular markdown link. Both coexist.

Last updated: 2026-04-30 (Growth mass execution vs experiments runbook added for #310: 102 backlog items can execute operationally while Council keeps max five measurable readouts); 2026-04-30 (SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER added for #310: profile run ledger, candidate/backlog/experiment tables, freshness, correlation, Council governance and paid-media integration); 2026-04-30 (SPEC_GROWTH_OS_PAID_MEDIA_INTEGRATION added for #310: Meta Ads + Google Ads SEM layer, measurement gates, paid facts, Council governance and manual-first campaign lifecycle); 2026-04-30 (Chatwoot Growth traceability for #310/#322: reference fallback, CRM conflict guard, custom attributes runbook, GA4/Meta reporting boundary); 2026-04-30 (EPIC #310 Max Performance monthly sprint: expanded GSC/GA4, paid DataForSEO smoke USD 0.56186, 5 Council-ready rows promoted, Max Matrix PASS-WITH-WATCH); 2026-04-30 (WAFlow CRM reconciliation dry-run for #310/#322: 13 submitted leads = 13 `waflow_submit`, 6 high-confidence CRM request candidates, CRM link still WATCH); 2026-04-30 (WAFlow CRM lifecycle parity for #310/#322: 11 submitted leads = 11 `waflow_submit` events, CRM/request/itinerary contract documented); 2026-04-30 (SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX added for #310/#337: DataForSEO full coverage, expanded GSC/GA4 profiles, joint normalizers, cadence and backlog rules); 2026-04-30 (Epic #310 follow-up execution: WhatsApp CTA custom-domain smoke PASS locally, GSC/GA4 fresh intake PASS, EN noindex guard added, Panaca remains WATCH); 2026-04-30 (Epic #310 tracking attribution readout: WAFlow WATCH, WhatsApp CTA BLOCKED, itinerary_confirmed PASS, Meta CAPI WATCH, Chatwoot PASS); 2026-04-30 (Epic #310 one-week execution plan plus Council candidates for Panaca performance, EN quality, GSC CTR, GA4/CRO and inventory cleanup); 2026-04-30 (EN quality gate results for Epic #310 #314/#315: 13 review_quality URLs classified publishable/retranslate/restore with sitemap and hreflang recommendation); 2026-04-30 (EN quality backlog for Epic #310 #314/#315: 13 review, 182 translate, 20 do-not-publish and validation gates); 2026-04-29 (Growth Translation Quality Gate for Epic #310: `seo_translation_quality_checks`, localized content quality -> `growth_inventory` -> Growth Council); 2026-04-29 (AI Search / GEO profile for Epic #310: crawler readiness, DataForSEO AI Optimization facts, and `growth_inventory.channel = ai_search`); 2026-04-29 (Growth data automation cadence for Epic #310: provider cache refresh, normalization, inventory backlog and approval gates); 2026-04-29 (Growth provider profiles for Epic #310: DataForSEO crawl, GSC and GA4 extraction profiles); 2026-04-29 (Growth Intelligence DataForSEO flows for Epic #310: provider raw -> normalized facts -> `growth_inventory` Council matrix); 2026-04-28 (Meta Ads MCP scaffold/runbook for Epic #341); 2026-04-28 (Supabase migration governance runbook: Flutter is operational SSOT for shared DB migrations); 2026-04-27 (growth attribution governance runbook for #336); 2026-04-27 (public analytics standard + ColombiaTours GA4 recovery production smoke for #321/#336); 2026-04-26 (ColombiaTours Growth OS #310/#337 marketing infographics added); 2026-04-25 (SPEC_COLOMBIATOURS_GROWTH_OS_2026 stub -> canonical GitHub SPEC #337; Epic #310 renamed ColombiaTours Growth Operating System 2026); 2026-04-25 (SPEC_META_CHATWOOT_CONVERSIONS stub -> canonical GitHub Epic #322); 2026-04-25 (ADR-028 media assets canonical registry for account-managed media); 2026-04-24 (ColombiaTours SEO/GEO P1 production audit — sitemap PASS, JSON-LD PASS, Lighthouse perf debt, console fix deployed `b1d022e4-8148-40f7-adf1-b98115b761e2`); 2026-04-24 (ColombiaTours SEO/GEO public renderer hardening deployed — activities listing/detail, listing schema, Product/Offer schema, custom-domain `/site` leak cleanup); 2026-04-24 (tenant favicons runbook + ColombiaTours favicon wiring); 2026-04-23 (ColombiaTours cutover rerun — SOFT-BLOCK, critical content/redirect/legal issues resolved, Lighthouse SEO/a11y pass with performance warnings); 2026-04-23 (ColombiaTours content classification implemented — blogs preserved, legal pages migrated local, Bogotá package redirects fixed); 2026-04-23 (ColombiaTours cutover audit — NO-GO, public route matrix + screenshots + Lighthouse 401 gate failure); 2026-04-20 (EPIC #250 #259/#260 — ADR-027 + pilot theme rollout/rollback runbook + theme-designer-v1 flag/snapshot docs sync); 2026-04-20 (EPIC #214 Stage 6 autonomous — #213 Flow 2 + Flow 3 + Lighthouse AC-A5 executed on pilot seed; matrix + sign-off stubs published to `docs/qa/pilot/`; partner + QA-lead human sign-off still pending per AC-X4a/b); 2026-04-20 (EPIC #214 Stage 5 W7-b — training onboarding extended with Flows 6/7/8 + cutover checklist Stage map + FAQ expansion); 2026-04-19 (EPIC #214 Stage 2 W7-a — training onboarding ColombiaTours + pilot runbook + cutover checklist); 2026-04-19 (EPIC #214 Stage 1 W1 — matrix refresh pkg+act editable + blog Section P + hotels as-is + Section M booking DEFER; pilot-readiness concept section expanded with matrix/ADR wikilinks); 2026-04-19 (ADR-025 priority-v2 alignment: Activities target Studio ownership with W2 pending); 2026-04-19 (EPIC #214 client priority change v2 — pilot-readiness concept scope notes); 2026-04-19 (EPIC #214 Stage 0 — ADR-024 + ADR-025 skeletons + pilot-readiness-deps); 2026-04-19 (EPIC #190 certification rerun evidence); 2026-04-18 (EPIC #190 certification run evidence + checklist); 2026-04-17 (WIKI full-refresh + #103 media closure checklist); 2026-04-17 wiki-patch (epic128 evidence + issue resolution rows)

---

Latest update: 2026-05-01 (SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR audit revision for #310: contract-first gate added with five Zod schemas, SSOT relationship vs growth_profile_runs / Unified Backlog formalised, lane-level autonomy semantics tightened, sprint scope clarified — Symphony OPERATIONAL ≠ #310 PASS, #256 interlock and ADR matrix added; child issues #402–#409 received labels and TVBs); 2026-05-01 (SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR added for #310: multi-tenant Supabase/Bukeer control plane, VPS Docker runtime, agent definitions/tool permissions/context packs, Growth UI contract and opt-in E2E); 2026-05-01 (WAFlow reference-first E2E for #310/#322: missing-ref guardrail PASS, two references in one Chatwoot conversation create two CRM requests, legacy `waflow_leads.chatwoot_conversation_id` unique index moved to WATCH with Flutter/SSOT migration prepared); 2026-05-01 (SPEC_GROWTH_OS_AGENT_LANES added for #310: five core Growth OS agent lanes, blocked routing, transcreation/content separation and Council governance); 2026-05-01 (SPEC_GROWTH_OS_SSOT_MODEL added for #310: GitHub is implementation SSOT, Supabase/Bukeer Studio is operational Growth SSOT).

## How to read this index

- **Agents:** grep `[[concept]]` to find every document that touches a concept.
- **Humans:** open in Obsidian for graph view, or follow the resolution table at the bottom.
- **Freshness:** update this file when adding a new ADR, SPEC, runbook, or cross-cutting concept.

---

## Agent entry points

| Artifact          | Path                                        | Purpose                                                                                                                                                                           |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root manifest     | `CLAUDE.md`                                 | Primary context for Claude Code. Tech stack, scripts, skills registry.                                                                                                            |
| E2E pool rules    | `.claude/rules/e2e-sessions.md`             | Mandatory for any agent running dev server / Playwright.                                                                                                                          |
| Cross-repo bridge | `.claude/rules/cross-repo-flutter.md`       | Shared DB + decisions with `weppa-cloud/bukeer-flutter`.                                                                                                                          |
| Skills            | `.claude/skills/*/SKILL.md`                 | 11 skills: nextjs-developer, backend-dev, tech-validator, specifying, docs-keeper, debugger, website-designer, website-section-generator, website-quality-gate, prompt-optimiser. |
| Commands          | `.claude/commands/*.md`                     | `/qa-nextjs`, `/website-creator`, `/design-session`.                                                                                                                              |
| Auto-memory       | `~/.claude/projects/.../memory/MEMORY.md`   | Cross-session persistent memory index. Not a repo file — lives in user home.                                                                                                      |
| MCP servers       | `.claude/mcp-servers/`                      | `bukeer-studio/` (Studio API) + `dataforseo/` (SEO data) + `meta-ads/` (Meta Ads scaffold). READMEs in each subfolder.                                                            |
| Agent setup       | [agent-setup](./development/agent-setup.md) | How to configure Codex/Opencode/Claude Code for this repo.                                                                                                                        |

---

## Architecture — ADRs

All ADRs accepted unless noted. Cross-cut by Principles P1–P10 (see [[ARCHITECTURE]]).

| Wikilink    | File                                                                                   | Topic                                                                                                                                                           | Concepts touched                                                                         |
| ----------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [[ADR-001]] | [ADR-001](./architecture/ADR-001-server-first-rendering.md)                            | Server-First Rendering with ISR and PPR                                                                                                                         | [[SSR]] [[ISR]] [[PPR]]                                                                  |
| [[ADR-002]] | [ADR-002](./architecture/ADR-002-error-handling-strategy.md)                           | Three-Tier Error Handling                                                                                                                                       | [[error-handling]] [[observability]]                                                     |
| [[ADR-003]] | [ADR-003](./architecture/ADR-003-contract-first-validation.md)                         | Contract-First Validation with Zod                                                                                                                              | [[website-contract]] [[validation]]                                                      |
| [[ADR-004]] | [ADR-004](./architecture/ADR-004-state-management.md)                                  | State Management without Global Store                                                                                                                           | [[state]] [[server-components]]                                                          |
| [[ADR-005]] | [ADR-005](./architecture/ADR-005-security-defense-in-depth.md)                         | Defense-in-Depth Security                                                                                                                                       | [[auth]] [[RLS]] [[rate-limiting]]                                                       |
| [[ADR-006]] | [ADR-006](./architecture/ADR-006-ai-streaming-architecture.md)                         | Streaming-First AI Integration                                                                                                                                  | [[AI]] [[openrouter]] [[streaming]]                                                      |
| [[ADR-007]] | [ADR-007](./architecture/ADR-007-edge-first-delivery.md)                               | Edge-First Delivery on Cloudflare Workers                                                                                                                       | [[edge]] [[cloudflare]] [[pagination]]                                                   |
| [[ADR-008]] | [ADR-008](./architecture/ADR-008-monorepo-packages.md)                                 | Internal Package Architecture                                                                                                                                   | [[theme-sdk]] [[website-contract]] [[monorepo]]                                          |
| [[ADR-009]] | [ADR-009](./architecture/ADR-009-multi-tenant-subdomain-routing.md)                    | Multi-Tenant Subdomain Routing                                                                                                                                  | [[multi-tenant]] [[subdomain]] [[middleware]]                                            |
| [[ADR-010]] | [ADR-010](./architecture/ADR-010-observability-strategy.md)                            | Observability Strategy                                                                                                                                          | [[logging]] [[observability]]                                                            |
| [[ADR-011]] | [ADR-011](./architecture/ADR-011-middleware-cache.md)                                  | Middleware In-Memory Cache                                                                                                                                      | [[middleware]] [[cache]] [[edge]]                                                        |
| [[ADR-012]] | [ADR-012](./architecture/ADR-012-api-response-envelope.md)                             | Standard API Response Envelope                                                                                                                                  | [[API]] [[validation]]                                                                   |
| [[ADR-013]] | [ADR-013](./architecture/ADR-013-tech-validator-quality-gate.md)                       | Automated Tech Validator Quality Gate                                                                                                                           | [[tech-validator]] [[quality-gate]]                                                      |
| [[ADR-014]] | [ADR-014](./architecture/ADR-014-delta-typescript-quality-gate.md)                     | Delta TypeScript Quality Gate                                                                                                                                   | [[tech-validator]] [[typescript]]                                                        |
| [[ADR-015]] | [ADR-015](./architecture/ADR-015-resilient-map-rendering-and-marker-media-fallback.md) | Resilient Map Rendering and Marker Media Fallback                                                                                                               | [[maps]] [[webgl]] [[fallback]]                                                          |
| [[ADR-016]] | [ADR-016](./architecture/ADR-016-seo-intelligence-caching.md)                          | SEO Content Intelligence Caching and Revalidation                                                                                                               | [[SEO]] [[cache]] [[ISR]] [[places-cache]]                                               |
| [[ADR-017]] | [ADR-017](./architecture/ADR-017-geocoding-activity-circuits.md)                       | Geocoding for Activity Circuit Maps (MapTiler + places_cache)                                                                                                   | [[geocoding]] [[maps]] [[places-cache]]                                                  |
| [[ADR-018]] | [ADR-018](./architecture/ADR-018-webhook-idempotency.md)                               | Webhook Idempotency + Replay Protection (HMAC + 5min window + dedup)                                                                                            | [[webhook]] [[idempotency]] [[wompi]] [[booking]]                                        |
| [[ADR-019]] | [ADR-019](./architecture/ADR-019-multi-locale-url-routing.md)                          | Multi-locale URL Routing (path-prefix strategy)                                                                                                                 | [[multi-locale]] [[routing]] [[middleware]] [[i18n]]                                     |
| [[ADR-020]] | [ADR-020](./architecture/ADR-020-hreflang-emission-policy.md)                          | hreflang Emission Policy and x-default Strategy                                                                                                                 | [[SEO]] [[hreflang]] [[multi-locale]] [[sitemap]]                                        |
| [[ADR-021]] | [ADR-021](./architecture/ADR-021-translation-memory-transcreation-pipeline.md)         | Translation Memory + AI Transcreation Pipeline                                                                                                                  | [[translation]] [[TM]] [[AI]] [[transcreation]] [[multi-locale]]                         |
| [[ADR-023]] | [ADR-023](./architecture/ADR-023-qa-tooling-studio-editor.md)                          | QA Tooling: Playwright Component Testing + Visual Regression                                                                                                    | [[testing]] [[CT]] [[visual-regression]] [[quality-gate]]                                |
| [[ADR-024]] | [ADR-024](./architecture/ADR-024-booking-v1-pilot-scope.md)                            | Booking V1 Pilot Scope (Proposed — W3 decision meeting)                                                                                                         | [[booking]] [[pilot-readiness]] [[leads]]                                                |
| [[ADR-025]] | [ADR-025](./architecture/ADR-025-studio-flutter-field-ownership.md)                    | Studio / Flutter Field Ownership Boundary (**Accepted 2026-04-19** — pkg+act Studio-editable, hotels Flutter-owner; Option A RPC expansion + activities parity) | [[studio-editor-v2]] [[package-kits]] [[pilot-readiness]] [[studio-editor-parity-audit]] |
| [[ADR-028]] | [ADR-028](./architecture/ADR-028-media-assets-canonical-registry.md)                   | Media Assets Canonical Registry                                                                                                                                 | [[media-assets]] [[storage]] [[cross-repo-flutter]]                                      |

> **Note:** `ADR-022` and `ADR-032` referenced in specs are anchored in `weppa-cloud/bukeer-flutter`. Studio respects them but does not own them. See [[cross-repo-flutter]].

### Companion architecture docs

- [ARCHITECTURE](./architecture/ARCHITECTURE.md) — narrative architecture overview + ADR index.
- [ONBOARDING-ARCHITECTURE](./architecture/ONBOARDING-ARCHITECTURE.md) — mentor-style developer onboarding.
- [AI-AGENT-DEVELOPMENT](./architecture/AI-AGENT-DEVELOPMENT.md) — principles for AI-assisted work.

---

## Specs

Feature requests formalized. Status tracked inline. GitHub Issues = source of truth ([[specs-source-of-truth]]).

| Wikilink                                                  | File                                                                     | Concepts                                                                                                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| [[SPEC_MULTI_LOCALE_REMEDIATION]]                         | [file](./specs/SPEC_MULTI_LOCALE_REMEDIATION.md)                         | [[i18n]] [[SEO]] [[growth-ops]]                                                                                                                                 |
| [[SPEC_MEDIA_ASSET_INVENTORY]]                            | [file](./specs/SPEC_MEDIA_ASSET_INVENTORY.md)                            | [[media-assets]] [[storage]] [[cross-repo-flutter]]                                                                                                             |
| [[SPEC_SECTION_ENTITY_TRANSLATION_LAYER]]                 | [file](./specs/SPEC_SECTION_ENTITY_TRANSLATION_LAYER.md)                 | [[i18n]] [[website_sections]] [[package_kits]] [[contacts]] [[translation-overlay]] Epic #273 (infra #274-#278 implemented in code, content population pending) |
| [[SPEC_PACKAGE_DETAIL_CONVERSION_V2]]                     | [file](./specs/SPEC_PACKAGE_DETAIL_CONVERSION_V2.md)                     | [[package-landing]] [[package-kits]] [[maps]] [[conversion]]                                                                                                    |
| [[SPEC_SEO_CONTENT_INTELLIGENCE]]                         | [file](./specs/SPEC_SEO_CONTENT_INTELLIGENCE.md)                         | [[SEO]] [[AI]] [[keyword-research]]                                                                                                                             |
| [[SPEC_SEO_CONTENT_INTELLIGENCE_INTEGRAL]]                | [file](./specs/SPEC_SEO_CONTENT_INTELLIGENCE_INTEGRAL.md)                | [[SEO]] [[AI]] [[content-ops]]                                                                                                                                  |
| [[SPEC_SEO_DASHBOARD_PRODUCT_INTEGRATION]]                | [file](./specs/SPEC_SEO_DASHBOARD_PRODUCT_INTEGRATION.md)                | [[SEO]] [[product-landing]] [[catalog-v2]]                                                                                                                      |
| [[SPEC_SEO_DESTINATIONS_PRODUCTS]]                        | [file](./specs/SPEC_SEO_DESTINATIONS_PRODUCTS.md)                        | [[SEO]] [[destinations]] [[product-landing]]                                                                                                                    |
| [[SPEC_SEO_BLOG_EXECUTION_FRAMEWORK_2026]]                | [file](./specs/SPEC_SEO_BLOG_EXECUTION_FRAMEWORK_2026.md)                | [[SEO]] [[content-ops]] [[quality-gate]]                                                                                                                        |
| [[SPEC_SEO_OPTIMIZATION_TOOLKIT]]                         | [file](./specs/SPEC_SEO_OPTIMIZATION_TOOLKIT.md)                         | [[SEO]] [[AI]] [[bulk-actions]]                                                                                                                                 |
| [[SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX]]                 | [file](./specs/SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX.md)                 | [[growth-os]] [[SEO]] [[analytics]] [[DataForSEO]]                                                                                                              |
| [[SPEC_GROWTH_OS_PAID_MEDIA_INTEGRATION]]                 | [file](./specs/SPEC_GROWTH_OS_PAID_MEDIA_INTEGRATION.md)                 | [[growth-os]] [[paid-media]] [[analytics]] [[conversion]]                                                                                                       |
| [[SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER]] | [file](./specs/SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER.md) | [[growth-os]] [[backlog]] [[analytics]] [[paid-media]] [[DataForSEO]]                                                                                           |
| [[SPEC_GROWTH_OS_SSOT_MODEL]]                             | [file](./specs/SPEC_GROWTH_OS_SSOT_MODEL.md)                             | [[growth-os]] [[SSOT]] [[Supabase]] [[GitHub]]                                                                                                                  |
| [[SPEC_GROWTH_OS_AGENT_LANES]]                            | [file](./specs/SPEC_GROWTH_OS_AGENT_LANES.md)                            | [[growth-os]] [[agents]] [[backlog]] [[Council]]                                                                                                                |
| [[SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR]]                  | [file](./specs/SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md)                  | [[growth-os]] [[agents]] [[orchestration]] [[multi-tenant]] [[VPS]] [[Bukeer Studio]]                                                                           |
| [[SPEC_SKILL_NEXTJS_DEVELOPER_AUDIT]]                     | [file](./specs/SPEC_SKILL_NEXTJS_DEVELOPER_AUDIT.md)                     | [[skills]] [[nextjs-developer]]                                                                                                                                 |
| [[SPEC_UX_IA_AUDIT_BUKEER_STUDIO]]                        | [file](./specs/SPEC_UX_IA_AUDIT_BUKEER_STUDIO.md)                        | [[UX]] [[information-architecture]]                                                                                                                             |
| [[SPEC_BOOKINGS_STUDIO]]                                  | [file](./specs/SPEC_BOOKINGS_STUDIO.md)                                  | Stub — booking flows in Studio                                                                                                                                  | [[bookings]] [[leads]]            |
| [[pilot-readiness-deps]]                                  | [file](./specs/pilot-readiness-deps.md)                                  | EPIC #214 dependency gate (hard deps + parallel gates across W1-W7)                                                                                             | [[pilot-readiness]] [[EPIC-214]]  |
| [[SPEC_MARKET_EXPERIENCE_SWITCHER]]                       | [file](./specs/SPEC_MARKET_EXPERIENCE_SWITCHER.md)                       | [[market-ux]] [[i18n]] [[currency]]                                                                                                                             |
| [[SECTION_TYPES_REGISTRY]]                                | [file](./specs/SECTION_TYPES_REGISTRY.md)                                | Stub — section types table                                                                                                                                      | [[sections]] [[website-contract]] |
| [[EPIC_SEO_CONTENT_INTELLIGENCE_GITHUB]]                  | [file](./specs/EPIC_SEO_CONTENT_INTELLIGENCE_GITHUB.md)                  | [[SEO]] [[EPIC]]                                                                                                                                                |
| [[ISSUE_MAP_SEO_CONTENT_INTELLIGENCE]]                    | [file](./specs/ISSUE_MAP_SEO_CONTENT_INTELLIGENCE.md)                    | [[SEO]] [[issue-tracking]]                                                                                                                                      |
| [[ROADMAP_SEO_CONTENT_INTELLIGENCE]]                      | [file](./specs/ROADMAP_SEO_CONTENT_INTELLIGENCE.md)                      | [[SEO]] [[roadmap]]                                                                                                                                             |

---

## Product

| Wikilink                     | File                                          | Purpose                                                                                               |
| ---------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [[package-detail-anatomy]]   | [file](./product/package-detail-anatomy.md)   | Package landing anatomy: sections, fields, hygiene checklist, gaps.                                   |
| [[product-detail-inventory]] | [file](./product/product-detail-inventory.md) | Activity + package inventory with editability matrix (Flutter / Studio / AI / Computed).              |
| [[product-detail-matrix]]    | [file](./product/product-detail-matrix.md)    | Full product-design matrix: all fields/sections, origin, generation type, artifact, Act/Pkg presence. |
| [[schema-parity-audit]]      | [file](./product/schema-parity-audit.md)      | activities + hotels vs package_kits schema parity audit (F1, 2026-04-18). Informs #204 F2 migrations. |

---

## Ops, runbooks, CI

| Wikilink                                 | File                                                  | Purpose                                                                                                                                                 |
| ---------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [[product-landing-v1-runbook]]           | [file](./ops/product-landing-v1-runbook.md)           | EPIC 7 rollout + monitoring.                                                                                                                            |
| [[lighthouse-ci]]                        | [file](./ops/lighthouse-ci.md)                        | Core Web Vitals gate (perf/a11y/SEO).                                                                                                                   |
| [[issue-103-media-closure-checklist]]    | [file](./ops/issue-103-media-closure-checklist.md)    | Formal SQL/runtime closure validation for media (#176/#177/#179) and residual legacy-bucket risk gate.                                                  |
| [[media-inventory-runbook]]              | [file](./ops/media-inventory-runbook.md)              | Operational inventory and characterization process for `media_assets` across Storage and legacy media URL fields.                                       |
| [[media-asset-guardrails]]               | [file](./ops/media-asset-guardrails.md)               | Guardrails for Studio, Flutter and MLLM-assisted work so new image/media features comply with ADR-028 and `media_assets`.                               |
| [[github-actions-billing-incident]]      | [file](./ops/github-actions-billing-incident.md)      | Runbook: CI fails in 3-4s → GitHub billing/spending-limit issue, not code.                                                                              |
| [[circleci-runbook]]                     | [file](./ops/circleci-runbook.md)                     | Off-GitHub CI fallback for Node/Next.js quality gates when GitHub Actions billing blocks hosted checks.                                                 |
| [[ci-deployment-standard]]               | [file](./ops/ci-deployment-standard.md)               | Cross-repo CI/CD branch model, deployment inventory, and cost-control standard.                                                                         |
| [[transcreate-website-content-runbook]]  | [file](./ops/transcreate-website-content-runbook.md)  | End-to-end flow: traducir todo el contenido de un sitio (glossary → AI draft → review → apply → verify).                                                |
| [[studio-editor-v2-rollback]]            | [file](./ops/studio-editor-v2-rollback.md)            | Rollback runbook for #190 Studio Editor v2 — 4 levels (field / website / account / data restore) + pre-flight re-enable gate.                           |
| [[pilot-theme-designer-v1-rollout]]      | [file](./ops/pilot-theme-designer-v1-rollout.md)      | Pilot designer-reference theme rollout + rollback (`theme_designer_v1_enabled` + `pilot_theme_snapshots` + revalidate).                                 |
| [[pilot-runbook-colombiatours]]          | [file](./ops/pilot-runbook-colombiatours.md)          | EPIC #214 pilot cutover runbook (cross-links 4 existing runbooks; DNS TTL / ±24 h Flutter rule / SLA / post-cutover cadence).                           |
| [[tenant-favicons]]                      | [file](./ops/tenant-favicons.md)                      | Per-tenant browser tab icons: metadata resolver, data contract, and ColombiaTours asset notes.                                                          |
| [[cutover-checklist]]                    | [file](./ops/cutover-checklist.md)                    | Standalone reusable cutover checklist imported into pilot runbook §5.1 (preflight / cutover / post-cutover / rollback criteria + sequence).             |
| [[release-gate-checklist]]               | [file](./ops/release-gate-checklist.md)               | Go/No-Go automated gate checklist for prod deploys (EPIC #207 certification).                                                                           |
| [[ci-seo-i18n-gate]]                     | [file](./ops/ci-seo-i18n-gate.md)                     | CI gate `@p0-seo` + nightly Worker preview (ADR-013).                                                                                                   |
| [[public-analytics-standard]]            | [file](./ops/public-analytics-standard.md)            | Public tracking standard: lightweight GA4 pageview, deferred GTM/Meta/Ads/custom scripts, production smoke and #336 Ads residual.                       |
| [[growth-attribution-governance]]        | [file](./ops/growth-attribution-governance.md)        | Privacy/data-governance gate for Growth OS attribution: ad ids, contact data, provider responses, RLS boundaries and platform payload rules.            |
| [[growth-intelligence-dataforseo-flows]] | [file](./ops/growth-intelligence-dataforseo-flows.md) | Epic #310 runbook: DataForSEO modules, raw/cache storage, normalization into SEO facts, and `growth_inventory` Council matrix.                          |
| [[growth-provider-profiles]]             | [file](./ops/growth-provider-profiles.md)             | Epic #310 Max Performance provider profiles: DataForSEO, GSC, GA4, tracking, AI/GEO, translation cadence, paid-call approvals and joint facts.          |
| [[growth-ai-search-geo-profile]]         | [file](./ops/growth-ai-search-geo-profile.md)         | Epic #310 AI Search / GEO profile: crawler readiness, DataForSEO AI Optimization, normalized visibility facts and `ai_search` inventory rows.           |
| [[growth-translation-quality-gate]]      | [file](./ops/growth-translation-quality-gate.md)      | Epic #310 transcreation lane gate: translation quality checks, QA findings, Growth backlog content status and Council approval rules.                   |
| [[growth-data-automation-cadence]]       | [file](./ops/growth-data-automation-cadence.md)       | Epic #310 Max Performance automation contract: raw/cache -> normalized facts -> joint facts -> `growth_inventory` -> Council, health and backlog rules. |
| [[growth-mass-execution-vs-experiments]] | [file](./ops/growth-mass-execution-vs-experiments.md) | Epic #310 operating runbook: execute large backlog batches while Council keeps only five active measurable readouts.                                    |
| [[waflow-crm-lifecycle-parity]]          | [file](./ops/waflow-crm-lifecycle-parity.md)          | Epic #310/#322 WAFlow parity and shared CRM lifecycle contract: WAFlow -> `requests` -> Chatwoot -> itinerary -> `funnel_events`.                       |
| [[chatwoot-growth-traceability]]         | [file](./ops/chatwoot-growth-traceability.md)         | Epic #310/#322 Chatwoot traceability contract: reference fallback, CRM conflict guard, custom attributes, internal ledger and Meta/GA4 boundary.        |
| [[supabase-migration-governance]]        | [file](./ops/supabase-migration-governance.md)        | Cross-repo migration governance: Studio may originate shared DB migrations, Flutter is the operational SSOT for applying them.                          |
| [[meta-ads-mcp]]                         | [file](./ops/meta-ads-mcp.md)                         | Epic #341 local MCP package scaffold for Meta Ads: env, safe modes, kill switch, ColombiaTours defaults.                                                |
| [[product-landing-rollout-runbook]]      | [file](./runbooks/product-landing-rollout-runbook.md) | Rollout for public site rendering / ISR changes.                                                                                                        |

---

## Training

| Wikilink                     | File                                           | Audience                      | Purpose                                                                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [[colombiatours-onboarding]] | [file](./training/colombiatours-onboarding.md) | Partner Rol 2 (ColombiaTours) | Pilot onboarding: Flows 1-8 (mkt / booking-DEFER / layout / SEO / translation / activity Variant A / hotel Variant B handoff / transcreate technical) + FAQ + what-NOT-to-do + cheat-sheet. Spanish-first. Screencasts pending W7-c. |

---

## QA / Pilot sign-off

| Wikilink                                            | File                                                                  | Purpose                                                                                                                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [[colombiatours-cutover-rerun-2026-04-23]]          | [file](./qa/pilot/colombiatours-cutover-rerun-2026-04-23.md)          | Cutover rerun after content/SEO harness fixes: critical routes pass, 15D product+blog separation retained, Lighthouse SEO/a11y pass with performance warnings.              |
| [[colombiatours-content-classification-2026-04-23]] | [file](./qa/pilot/colombiatours-content-classification-2026-04-23.md) | Classification + data operation report: WordPress real URLs mapped to blog/page/package, legal pages migrated local, redirects fixed.                                       |
| [[colombiatours-cutover-audit-2026-04-23]]          | [file](./qa/pilot/colombiatours-cutover-audit-2026-04-23.md)          | Full cutover audit on local ColombiaTours preview: NO-GO due detail routes rendering 404 content with HTTP 200, Lighthouse preview-token failure, and link/schema findings. |
| [[colombiatours-matrix-2026-04-20]]                 | [file](./qa/pilot/colombiatours-matrix-2026-04-20.md)                 | EPIC #214 #213 Flow 2 — 48-row matrix status on pilot seed (pkg/act/hotel/blog × chromium/firefox/mobile-chrome). Deterministic failures + owners.                          |
| [[sign-off-2026-04-20]]                             | [file](./qa/pilot/sign-off-2026-04-20.md)                             | Stage 6 autonomous sign-off stub (Flow 2 + Flow 3 + Lighthouse AC-A5). Partner + QA-lead human sign-off still pending per AC-X4a/b.                                         |
| [[matrix-playbook]]                                 | [file](./qa/pilot/matrix-playbook.md)                                 | W6 playbook for matrix visual E2E + Lighthouse.                                                                                                                             |
| [[transcreate-playbook]]                            | [file](./qa/pilot/transcreate-playbook.md)                            | W5 playbook for transcreate lifecycle (pkg + act + blog).                                                                                                                   |
| [[editor-to-render-playbook]]                       | [file](./qa/pilot/editor-to-render-playbook.md)                       | W4 playbook for pilot editor→render flows.                                                                                                                                  |

---

## SEO

| Wikilink                                      | File                                                       | Purpose                                                                                                  |
| --------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [[multi-locale-transcreation-infrastructure]] | [file](./seo/multi-locale-transcreation-infrastructure.md) | Multi-locale transcreation: shipped state + target post-EPIC #198 (architecture, pipeline, flows, KPIs). |
| [[SEO-IMPLEMENTATION]]                        | [file](./seo/SEO-IMPLEMENTATION.md)                        | Current shipped product state.                                                                           |
| [[SEO-PLAYBOOK]]                              | [file](./seo/SEO-PLAYBOOK.md)                              | Target operating model.                                                                                  |
| [[SEO-FLUJOS-STUDIO]]                         | [file](./seo/SEO-FLUJOS-STUDIO.md)                         | Shipped user flows.                                                                                      |
| [[SEO-BLOG-EXECUTION-FRAMEWORK-2026]]         | [file](./seo/SEO-BLOG-EXECUTION-FRAMEWORK-2026.md)         | Dual-dimension operating checklist and phased backlog model for blog SEO execution.                      |
| [[jsonld-fixtures]]                           | [file](./seo/jsonld-fixtures.md)                           | JSON-LD rich-results validation samples.                                                                 |

---

## Theming

| Wikilink               | File                                    | Purpose                                |
| ---------------------- | --------------------------------------- | -------------------------------------- |
| [[dark-mode-behavior]] | [file](./theming/dark-mode-behavior.md) | Dark mode reference for QA/design/dev. |

---

## QA & evidence

| Wikilink                                      | File                                                                           | Purpose                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| [[product-landing-qa-matrix]]                 | [file](./qa/product-landing-qa-matrix.md)                                      | QA matrix for 3 release tenants.                                                                                           |
| [[link-validation-colombiatours]]             | [file](./qa/link-validation-colombiatours.md)                                  | Link validation report (2026-04-15).                                                                                       |
| [[epic190-certification-checklist]]           | [file](./qa/studio-unified-product-editor/epic-190-certification-checklist.md) | Executable QA certification checklist for EPIC #190 (D0-D2, commands, SQL/RPC checks, evidence template).                  |
| [[epic190-certification-run-2026-04-18]]      | [file](./evidence/epic190/certification-run-2026-04-18.md)                     | EPIC #190 certification execution report: automated gates, SQL/RPC validations, RLS checks, Go/No-Go decision.             |
| [[epic190-certification-rerun-2026-04-19]]    | [file](./evidence/epic190/certification-rerun-2026-04-19.md)                   | EPIC #190 remediation rerun report: P0 permission hardening verified, gates re-run, final GO decision.                     |
| [[media-inventory-production-run-2026-04-25]] | [file](./evidence/media-inventory-production-run-2026-04-25.md)                | Production execution evidence for Media Asset Inventory v1: migration, dry-run, apply counts and characterization summary. |
| [[media-remediation-backlog-2026-04-25]]      | [file](./evidence/media-remediation-backlog-2026-04-25.md)                     | Actionable media remediation backlog for broken, external, missing-alt and non-WebP assets.                                |
| [[ai-routes-cost-recording]]                  | [file](./audits/ai-routes-cost-recording.md)                                   | AI routes cost-tracking audit — 13 routes mapped, recordCost wire patterns (D1, 2026-04-18). Basis for #195 R9 impl.       |
| [[epic86-walkthrough]]                        | [file](./evidence/epic86/walkthrough.md)                                       | EPIC 86 evidence (Issue #122).                                                                                             |
| [[epic128-lighthouse-summary]]                | [file](./evidence/epic128/lighthouse-summary.md)                               | EPIC 128 Lighthouse/CWV summary.                                                                                           |
| [[epic128-production-ready-attestation-v2]]   | [file](./evidence/epic128/production-ready-attestation-v2.md)                  | EPIC 128 production-ready attestation v2.                                                                                  |
| [[epic128-ux-fluency]]                        | [file](./evidence/epic128/ux-fluency.md)                                       | EPIC 128 UX fluency evidence.                                                                                              |

---

## Growth ops

Persisted state pre-#148 (`seo_website_okrs`). Post-#148 these stay as human-readable exports.

| Wikilink                                        | File                                                                        | Purpose                                                                                                                                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [[growth-okrs-readme]]                          | [file](./growth-okrs/README.md)                                             | Growth OKRs directory README (structure + template).                                                                                                                                          |
| [[growth-okrs-active]]                          | [file](./growth-okrs/active.md)                                             | Active OKRs (7D/30D/90D).                                                                                                                                                                     |
| [[growth-okrs-budget]]                          | [file](./growth-okrs/budget.md)                                             | Provider budget counter (pre-#130).                                                                                                                                                           |
| [[growth-sessions-readme]]                      | [file](./growth-sessions/README.md)                                         | Per-session audit trail.                                                                                                                                                                      |
| [[colombiatours-seo-geo-deploy-2026-04-24]]     | [file](./growth-sessions/2026-04-24-2045-seo-geo-colombiatours-deploy.md)   | ColombiaTours SEO/GEO technical hardening: activities listing/detail, listing schema, Product/Offer schema, custom-domain link hygiene, Worker deploy `41756f91-34b1-4b93-bc82-1993a325b4c0`. |
| [[colombiatours-seo-geo-p1-audit-2026-04-24]]   | [file](./growth-sessions/2026-04-24-2120-seo-geo-p1-audit-colombiatours.md) | ColombiaTours #293 P1 production audit: JSON-LD/crawl PASS, sitemap PASS, Lighthouse performance debt, console/title fixes deployed `b1d022e4-8148-40f7-adf1-b98115b761e2`.                   |
| [[en-quality-backlog-2026-04-30]]               | [file](./growth-sessions/2026-04-30-en-quality-backlog.md)                  | Epic #310 #314/#315 EN quality backlog: 13 review, 182 translate-from-ES, 20 do-not-publish, production behavior and validation gates.                                                        |
| [[en-quality-gate-results-2026-04-30]]          | [file](./growth-sessions/2026-04-30-en-quality-gate-results.md)             | Epic #310 #314/#315 manual EN quality gate: 13 live review_quality URLs classified publishable, needs_retranslation or restore_from_wp_en with sitemap/hreflang recommendation.               |
| [[epic310-one-week-10dev-execution-2026-04-30]] | [file](./growth-sessions/2026-04-30-epic310-one-week-10dev-execution.md)    | Epic #310 one-week execution plan after #312/#313 Council acceptance: 10 lanes, active experiment cap and certification target.                                                               |
| [[panaca-performance-watch-2026-04-30]]         | [file](./growth-sessions/2026-04-30-panaca-performance-watch.md)            | Epic #310 #313 performance watch: Panaca high waiting/loading signal investigated as template/cache payload watch, not immediate scoped runtime patch.                                        |
| [[growth-inventory-cleanup-2026-04-30]]         | [file](./growth-sessions/2026-04-30-growth-inventory-cleanup-plan.md)       | Epic #310 #311/#313 cleanup plan and guarded script for archiving stale old-crawl `growth_inventory` rows after accepted post-P1 crawl.                                                       |
| [[gsc-ctr-candidates-2026-04-30]]               | [file](./growth-sessions/2026-04-30-gsc-ctr-candidates.md)                  | Epic #310 #321 GSC CTR candidates from persisted cache/inventory: destination snippet rescue and agency trust commercial CTR test.                                                            |
| [[ga4-cro-candidates-2026-04-30]]               | [file](./growth-sessions/2026-04-30-ga4-cro-candidates.md)                  | Epic #310 #321/#322 GA4/CRO candidates: editorial activation CTA batch and Facebook paid package landing continuity with attribution gaps.                                                    |
| [[tracking-attribution-readout-2026-04-30]]     | [file](./growth-sessions/2026-04-30-tracking-attribution-readout.md)        | Epic #310 #322/#330/#332/#333 tracking readout: WAFlow parity watch, WhatsApp CTA blocked, itinerary_confirmed pass, Meta CAPI watch and Chatwoot lifecycle pass.                             |
| [[max-performance-monthly-sprint-2026-04-30]]   | [file](./growth-sessions/2026-04-30-max-performance-monthly-sprint.md)      | Epic #310 monthly Max Matrix execution: expanded GSC/GA4, paid DataForSEO smoke, joint normalizers and Council PASS-WITH-WATCH.                                                               |
| [[waflow-crm-reconciliation-2026-04-30]]        | [file](./growth-sessions/2026-04-30-waflow-crm-reconciliation.md)           | Epic #310/#322 WAFlow CRM dry-run reconciliation: clean event parity, six high-confidence request candidates, CRM lifecycle link still WATCH.                                                 |
| [[epic310-followup-execution-2026-04-30]]       | [file](./growth-sessions/2026-04-30-epic310-followup-execution.md)          | Epic #310 follow-up execution: WhatsApp CTA custom-domain smoke, GSC/GA4 refresh apply, EN noindex guard, Council update and remaining WATCH items.                                           |
| [[growth-weekly-readme]]                        | [file](./growth-weekly/README.md)                                           | Weekly quick-wins planning.                                                                                                                                                                   |

---

## Research

| Wikilink                           | File                                                 | Purpose                                     |
| ---------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| [[whatsapp-site-audit-2026-04-14]] | [file](./research/whatsapp-site-audit-2026-04-14.md) | WhatsApp IA/UI audit → ColombiaTours theme. |

---

## Development

| Wikilink           | File                                    | Purpose                                                    |
| ------------------ | --------------------------------------- | ---------------------------------------------------------- |
| [[local-sessions]] | [file](./development/local-sessions.md) | Parallel-safe local dev + Playwright (session pool s1–s4). |
| [[agent-setup]]    | [file](./development/agent-setup.md)    | Configure Codex/Opencode/Claude Code for this repo.        |

---

## Guides

| Wikilink                      | File                                          | Purpose                                         |
| ----------------------------- | --------------------------------------------- | ----------------------------------------------- |
| [[WEBSITE-CREATION-WORKFLOW]] | [file](./guides/WEBSITE-CREATION-WORKFLOW.md) | Zero → production site using skills + commands. |

---

## Cross-repo bridge — bukeer-flutter

Shared Supabase project. Flutter writes data; Studio reads via SSR.

- [[cross-repo-flutter]] → `.claude/rules/cross-repo-flutter.md`
- [[supabase-migration-governance]] → `docs/ops/supabase-migration-governance.md`
- Shared tables: [[websites]], [[package-kits]], [[package_kit_versions]], [[itineraries]], [[contacts]], [[products]]
- Flutter-owned ADRs referenced here: [[ADR-022]] (auth token boundary), [[ADR-032]] (catalog v2).

---

## Concept graph — cross-cutting relations

Each concept below lists the ADRs/SPECs/ops docs that touch it. Use this to find all surfaces affected by a concept.

### [[auth]] + [[RLS]] + [[multi-tenant]]

- [[ADR-005]] — defense in depth
- [[ADR-009]] — subdomain routing + account_id isolation
- [[ADR-022]] — auth token boundary (Flutter-owned)
- Touched by: [[SPEC_SEO_DASHBOARD_PRODUCT_INTEGRATION]]
- Ops gate: [[issue-103-media-closure-checklist]] (media storage/write hardening verification)

### [[media-assets]] + [[storage]]

- [[ADR-028]] — canonical media registry decision for account-managed assets across Studio and Flutter.
- [[SPEC_MEDIA_ASSET_INVENTORY]] — v1 canonical inventory and characterization across Storage + legacy URL fields.
- [[media-inventory-runbook]] — dry-run/apply/report/remediation workflow for media inventory operations.
- [[media-asset-guardrails]] — PR/spec/agent/MLLM guardrails that prevent new URL-only image drift.
- [[media-inventory-production-run-2026-04-25]] — production execution evidence because this backend has no staging database.
- [[media-remediation-backlog-2026-04-25]] — actionable remediation backlog from the first production inventory.
- [[issue-103-media-closure-checklist]] — storage/RLS hardening baseline for `images`, `site-media`, `review-*`, and legacy buckets.
- Registry: `public.media_assets`, keyed by `(storage_bucket, storage_path)`.
- Cross-repo: Flutter continues writing legacy URL fields in v1; follow-up issue registers new Flutter uploads into `media_assets` per [[ADR-028]].

### [[middleware]] + [[cache]] + [[edge]]

- [[ADR-007]] — Cloudflare Workers delivery
- [[ADR-011]] — middleware in-memory cache
- [[ADR-009]] — subdomain routing via middleware
- [[ADR-016]] — SEO content caching (ISR interplay)

### [[SSR]] + [[ISR]] + [[PPR]]

- [[ADR-001]] — server-first rendering (primary)
- [[ADR-016]] — SEO caching revalidation
- [[product-landing-v1-runbook]]
- Sites: `/site/[subdomain]/paquetes/[slug]` (see [[SPEC_PACKAGE_DETAIL_CONVERSION_V2]])

### [[theme-v3]] + [[theme-sdk]]

- [[ADR-008]] — monorepo packages (`@bukeer/theme-sdk`)
- [[ADR-027]] — pilot adoption strategy for designer-reference theme (flag-gated, snapshot-backed rollback)
- [[dark-mode-behavior]]
- DB shape: `websites.theme = { tokens, profile }` — see [[cross-repo-flutter]]
- 8 presets: adventure, luxury, tropical, corporate, boutique, cultural, eco, romantic
- Pilot rollout controls: `account_feature_flags.theme_designer_v1_enabled` + `pilot_theme_snapshots` + [[pilot-theme-designer-v1-rollout]]

### [[multi-locale]] + [[i18n]] + [[routing]]

- [[ADR-019]] — path-prefix URL routing (`/en/...`, default locale has no prefix)
- [[ADR-020]] — hreflang emission for `defaultLocale` + translated locales (`applied|published`); `x-default` → default locale
- [[ADR-021]] — TM + glossary + AI transcreation pipeline; job lifecycle draft→reviewed→applied→published
- [[en-quality-backlog-2026-04-30]] — operational EN backlog for #314/#315, including row-level artifact pointers and publish gates
- [[en-quality-gate-results-2026-04-30]] — manual results for the 13 live `review_quality` EN blog URLs and sitemap/hreflang recommendations
- Key files: `lib/seo/locale-routing.ts`, `lib/seo/hreflang.ts`, `lib/seo/transcreate-workflow.ts`, `middleware.ts`
- Switcher: `components/site/site-header.tsx`, `components/site/language-switcher.tsx`
- Tables: `seo_translation_memory`, `seo_translation_glossary`, `seo_transcreation_jobs`, `seo_localized_variants`
- Open: [[SPEC #188]] (AI wiring), [[SPEC #189]] (fallback strategy)

### [[market-ux]] + [[currency]]

- [[SPEC_MARKET_EXPERIENCE_SWITCHER]] — control unificado de idioma/moneda en header + configuración en Studio.
- Runtime: `components/site/site-header.tsx`, `components/site/site-footer.tsx`, `lib/site/currency.ts`.
- Studio: `app/dashboard/[websiteId]/design/page.tsx`, `components/admin/market-experience-editor.tsx`.

### [[studio-unified-product-editor]] + [[#190]] + [[editor-v2]]

- EPIC: [#190](https://github.com/weppa-cloud/bukeer-studio/issues/190) — Studio Unified Product Editor
- Phase 0 [[#191]] + Phase 0.5 [[#192]] + QA infra [[#193]] — all closed 2026-04-17
- Phase 1 RFCs: [[#194]] R7 migration plan, [[#195]] R9 AI cost tracking, [[#197]] W3 edit history
- Phase 1a children (2026-04-18): [[#200]] marketing editors, [[#201]] gallery curator, [[#204]] schema parity migrations, [[#205]] Flutter banner
- D1 impl closed: [[#203]] — `recordCost()` wired in 13 AI routes with token-based costing via `lib/ai/model-pricing.ts`
- Foundation shipped: `account_feature_flags` + `package_kits_audit_log` + `reconciliation_alerts` + `update_package_kit_marketing_field` RPC + `resolve_studio_editor_v2` RPC
- Phase 1a closeout shipped 2026-04-18 (commits `bbf0a79`→`8d8ca86`):
  - A2 complete [[#200]] — 6 marketing editors + CT specs (description/highlights/inclusions/exclusions/recommendations/instructions/social-image)
  - D2 ai_cost_events ledger [[#195]] — `ai_cost_events` + `ai_cost_budgets` + `log_ai_cost_event` + `get_account_ai_spend` RPC + `lib/ai/cost-ledger.ts`
  - W3 product_edit_history [[#197]] — partitioned RANGE(created_at) monthly + pg_cron rollover/purge + polymorphic `reconcile_product_surfaces` RPC
  - F2 activities/hotels parity [[#204]] — `account_id NOT NULL` backfill + `last_edited_by_surface` column + audit triggers
  - C2 rollback runbook [[studio-editor-v2-rollback]] — 4-level rollback guide
  - G3 smoke test — `e2e/tests/marketing-editor-smoke.spec.ts`
- Key paths: `lib/features/studio-editor-v2.ts`, `lib/ai/cost-ledger.ts`, `components/admin/marketing/*`, `components/admin/ops/*`, `app/dashboard/[w]/products/[slug]/marketing/`, `app/dashboard/[w]/ops/reconciliation/`
- Schema: `packages/website-contract/src/schemas/marketing-patch.ts` — `MarketingFieldPatchSchema` discriminated union (9 fields) · `schemas/edit-history.ts` · `schemas/ai-cost.ts`
- Audits: [[schema-parity-audit]] + [[ai-routes-cost-recording]]
- Certification playbook: [[epic190-certification-checklist]]
- Certification execution evidence: [[epic190-certification-run-2026-04-18]]
- Certification rerun evidence: [[epic190-certification-rerun-2026-04-19]]
- Multi-front strategy: `.claude/plans/generic-crafting-sketch.md`

### [[package-kits]] + [[package-landing]]

- [[SPEC_PACKAGE_DETAIL_CONVERSION_V2]] — Shipped (partial) 2026-04-17; F1/F2/F3 merged
- F1: `PackageAggregatedDataSchema` + `get_package_aggregated_data` RPC — `lib/supabase/get-pages.ts`
- F2: `ItineraryItemRenderer` + `ActivityScheduleInline` — day-by-day specialized render
- F3: `generate-package-content` AI route — `app/api/ai/generate-package-content/route.ts`, prompt: `lib/ai/prompts/package-highlights.ts`
- [[ADR-015]] + [[ADR-017]] — resilient map + geocoding for circuit
- [[product-landing-v1-runbook]]
- [[product-landing-qa-matrix]]
- Shared DB: see [[cross-repo-flutter]] (Flutter admin owns catalog)

### [[SEO]]

- [[ADR-016]] — caching + revalidation
- [[SEO-PLAYBOOK]] [[SEO-IMPLEMENTATION]] [[SEO-FLUJOS-STUDIO]] [[jsonld-fixtures]]
- Specs: [[SPEC_SEO_CONTENT_INTELLIGENCE]] [[SPEC_SEO_CONTENT_INTELLIGENCE_INTEGRAL]] [[SPEC_SEO_DASHBOARD_PRODUCT_INTEGRATION]] [[SPEC_SEO_DESTINATIONS_PRODUCTS]] [[SPEC_SEO_BLOG_EXECUTION_FRAMEWORK_2026]] [[SPEC_SEO_OPTIMIZATION_TOOLKIT]]
- Meta: [[EPIC_SEO_CONTENT_INTELLIGENCE_GITHUB]] [[ROADMAP_SEO_CONTENT_INTELLIGENCE]] [[ISSUE_MAP_SEO_CONTENT_INTELLIGENCE]]
- QA: [[link-validation-colombiatours]]
- Shipped APIs (2026-04-17): serp-snapshot, nlp-score, transcreate, objectives-90d, okrs, translations, weekly-tasks — see [[SEO-IMPLEMENTATION]]
- Trust / JSON-LD: [[trust]] + [[organization-schema]] concepts

### [[AI]] + [[openrouter]] + [[streaming]]

- [[ADR-006]] — streaming-first AI integration
- Specs: [[SPEC_SEO_CONTENT_INTELLIGENCE]] [[SPEC_SEO_OPTIMIZATION_TOOLKIT]] [[SPEC_SEO_DASHBOARD_PRODUCT_INTEGRATION]]
- Env: `OPENROUTER_AUTH_TOKEN`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`
- Cost tracking: `lib/ai/rate-limit.ts` (`checkRateLimit` + `recordCost`) + `lib/ai/model-pricing.ts` (`calculateCost(model, usage)`) — token-based per [[ai-routes-cost-recording]] audit
- Streaming routes use `after()` from `next/server` for Cloudflare Worker cost-record compat
- Pipeline double-counting avoided via header gate (`x-internal-call`) and/or inline-only accounting

### [[validation]] + [[website-contract]]

- [[ADR-003]] — contract-first validation with Zod
- [[ADR-012]] — standard API response envelope
- [[ADR-008]] — `@bukeer/website-contract` package

### [[error-handling]] + [[observability]] + [[logging]]

- [[ADR-002]] — three-tier error handling
- [[ADR-010]] — observability strategy
- Gap: logger adoption at 6%, no Sentry yet (see [[ARCHITECTURE]])

### [[tech-validator]] + [[quality-gate]]

- [[ADR-013]] — tech-validator automated quality gate
- [[ADR-014]] — delta TypeScript quality gate
- Skill: `.claude/skills/tech-validator/SKILL.md`

### [[maps]] + [[webgl]] + [[fallback]] + [[geocoding]]

- [[ADR-015]] — resilient map + marker media fallback (destinations, destination pins)
- [[ADR-017]] — geocoding pipeline for activity circuits (MapTiler + `places_cache`)
- [[SPEC_PACKAGE_DETAIL_CONVERSION_V2]] — `<PackageCircuitMap>` + `<ActivityCircuitMap>` respect both ADRs
- Geocoding code: `lib/geocoding/{geocode,maptiler,normalize}.ts`, `lib/products/activity-circuit.ts`, `lib/products/place-coords.ts`
- Shared map primitive: `components/site/circuit-map.tsx`

### [[i18n]] + [[locale]]

- [[SPEC_MULTI_LOCALE_REMEDIATION]] — Shipped (partial) 2026-04-17
- `lib/seo/locale-routing.ts`, `lib/seo/slug-locale.ts`, `lib/seo/hreflang.ts` — shipped
- Migration `20260418000000_multi_locale_content.sql` — multi-locale content schema
- Remaining gap: `inLanguage` hardcoded `'es'` in keyword persistence (see [[cross-repo-flutter]])

### [[bookings]] + [[payments]] + [[leads]]

- Schemas in `@bukeer/website-contract`: `schemas/{bookings,cancellation,leads,wompi}.ts`
- No dedicated ADR yet — data flows Flutter → Supabase → Studio read-only
- Wompi = payment provider integration schema
- [[SPEC_META_CHATWOOT_CONVERSIONS]] — stub for canonical #322: WAFlow/WhatsApp → Chatwoot → qualified lead → purchase attribution for Meta CAPI.

### [[growth-os]] + [[paid-media]] + [[WAFlow]]

- [[SPEC_COLOMBIATOURS_GROWTH_OS_2026]] — stub for canonical #337 / execution #310: North Star, AARRR funnel, Growth Council, inventory contract, event/attribution contract, and 90-day roadmap.
- [[SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX]] — executable matrix for maximum provider coverage: all DataForSEO features, expanded GSC/GA4 profiles, joint normalizers, cadence and backlog rules.
- [[SPEC_GROWTH_OS_PAID_MEDIA_INTEGRATION]] — implementable SEM layer for #310: Meta Ads + Google Ads profiles, measurement gates, paid facts, Council governance and manual-first campaign lifecycle.
- [[SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER]] — durable backlog architecture for #310: profile run ledger, candidate/backlog/experiment lifecycle, freshness, correlation, confounders, agent review and Council promotion.
- [[SPEC_GROWTH_OS_SSOT_MODEL]] — governance layer for #310: GitHub tracks implementation state while Supabase/Bukeer Studio stores operational Growth backlog, tasks, experiments and learning.
- [[SPEC_GROWTH_OS_AGENT_LANES]] — operating layer for #310: five core agent lanes, blocked routing, technical/transcreation/content/Council responsibilities and evidence rules.
- [[SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR]] — orchestration layer for #310: multi-tenant Supabase/Bukeer control plane, VPS Docker runtime, agent run ledger/events, Growth UI contract and opt-in E2E coverage.
- [[SPEC_META_CHATWOOT_CONVERSIONS]] — stub for canonical #322: Meta + Chatwoot conversion path for WAFlow/WhatsApp to qualified lead, quote, and purchase.
- [[ADR-024]] — booking/date-picker remains deferred for pilot; WAFlow/WhatsApp is primary conversion.
- [[supabase-migration-governance]] — #310 DB migration path: canonical application via `bukeer-flutter`, Studio owns API/contracts/evidence.
- [[growth-translation-quality-gate]] — localized content cannot scale into EN-US/MX without quality check or Council exception.
- [[growth-mass-execution-vs-experiments]] — operational rule for fixing many backlog items in one batch while keeping Council readouts capped and independent.
- [[epic310-one-week-10dev-execution-2026-04-30]] — active execution plan for making #310 `PASS-WITH-WATCH operativo` with five or fewer measurable Council experiments.
- [[growth-inventory-cleanup-2026-04-30]] — guarded cleanup flow for stale old-crawl rows so Council sees only current decision-grade inventory.
- [[gsc-ctr-candidates-2026-04-30]] and [[ga4-cro-candidates-2026-04-30]] — selected demand/CRO candidates that feed the five-experiment cap.
- [[max-performance-monthly-sprint-2026-04-30]] — current Max Matrix execution state: first-party expanded, DataForSEO paid smoke logged, 5 Council-ready rows promoted, remaining provider gaps WATCH.
- [[tracking-attribution-readout-2026-04-30]] — Growth OS tracking status: WhatsApp CTA remains the blocker for activation baselines; itinerary_confirmed is the accepted non-Wompi conversion event.
- [[waflow-crm-lifecycle-parity]] — reconciled ledger parity and official CRM chain: WAFlow submit creates Growth event, links to `requests`, Chatwoot advances pipeline, itinerary confirmation emits booking.
- [[waflow-crm-reconciliation-2026-04-30]] — dry-run evidence: event parity is clean, but CRM request linkage needs controlled apply or productized idempotent linking.
- [[epic310-followup-execution-2026-04-30]] — current execution state after #312/#313 acceptance: CTA fixed locally, fresh GSC/GA4 intake, EN guard in code, Panaca still WATCH.

### [[conversion]] + [[analytics]] + [[webhook]]

- [[SPEC_PACKAGE_DETAIL_CONVERSION_V2]] — package detail conversion surface.
- [[SPEC_COLOMBIATOURS_GROWTH_OS_2026]] — stub for canonical #337: cross-channel conversion governance and event contract for ColombiaTours Growth OS.
- [[SPEC_META_CHATWOOT_CONVERSIONS]] — stub for canonical #322: Meta Pixel/CAPI event contract, Chatwoot webhook lifecycle tracking, and purchase attribution.
- [[public-analytics-standard]] — public-site runtime tracking policy: early GA4 pageview, deferred GTM/Meta/Ads/custom scripts, GA4/GSC reporting rule.
- [[ADR-018]] — webhook idempotency baseline for Chatwoot and payment-provider callbacks.

### [[trust]] + [[organization-schema]]

- `packages/website-contract/src/schemas/trust.ts` — trust content contract
- `components/seo/organization-schema.tsx` — Organization JSON-LD (guards against UUID leak)
- `components/site/trust-badges.tsx` — trust badge UI
- Related: [[SEO]] (JSON-LD), [[SPEC_PACKAGE_DETAIL_CONVERSION_V2]] (trust section on landing)

### [[skills]] + [[specifying]] + [[debugging]]

- [[AI-AGENT-DEVELOPMENT]] — AI-assisted dev principles
- [[SPEC_SKILL_NEXTJS_DEVELOPER_AUDIT]] — skill audit
- Skills registry: `.claude/skills/`

### [[pilot-readiness]] + [[EPIC-214]] + [[ColombiaTours]]

- EPIC: [#214](https://github.com/weppa-cloud/bukeer-studio/issues/214) — Pilot Readiness (work layer for #213)
- Children (W1-W7): [#215](https://github.com/weppa-cloud/bukeer-studio/issues/215) W1 matrix+testids · [#216](https://github.com/weppa-cloud/bukeer-studio/issues/216) W2 parity · [#217](https://github.com/weppa-cloud/bukeer-studio/issues/217) W3 booking decision · [#218](https://github.com/weppa-cloud/bukeer-studio/issues/218) W4 E2E editor→render · [#219](https://github.com/weppa-cloud/bukeer-studio/issues/219) W5 transcreate · [#220](https://github.com/weppa-cloud/bukeer-studio/issues/220) W6 matrix+Lighthouse · [#221](https://github.com/weppa-cloud/bukeer-studio/issues/221) W7 training
- Acceptance sibling: [#213](https://github.com/weppa-cloud/bukeer-studio/issues/213)
- Stage 0 artefacts (2026-04-19): [[ADR-024-booking-v1-pilot-scope]] · [[ADR-025-studio-flutter-field-ownership]] · [[pilot-readiness-deps]]
- Recovery Gate prereq of Stage 4: [#226](https://github.com/weppa-cloud/bukeer-studio/issues/226) QA Recovery Gate P0 GUI (blocks W4 #218, W5 #219, W6 #220 kickoff; details in [[pilot-readiness-deps]] §Parallel / Recovery Gate)
- Stage 1 W1 artefacts (2026-04-19): [[product-detail-matrix]] (refresh pkg+act editable + Sections M/N/O/P + Hotel column as-is + 🟡-flag legend) · [[package-detail-anatomy]] (hygiene checklist cross-ref) · [[product-detail-inventory]] (§3.2 ownership matrix aligned with matrix Sections N/O)
- Stage 2 W7-a artefacts (2026-04-19): [[colombiatours-onboarding]] (partner-facing training — Flows 1-5 + FAQ + what-NOT-to-do + cheat-sheet; screencasts pending W7-c) · [[pilot-runbook-colombiatours]] (operational runbook — cross-links 4 existing runbooks; DNS TTL / ±24 h Flutter rule / SLA / post-cutover cadence) · [[cutover-checklist]] (standalone preflight/cutover/post-cutover/rollback checklist)
- Stage 5 W7-b artefacts (2026-04-20) — docs-only extension of W7-a: [[colombiatours-onboarding]] now covers **Flows 6 / 7 / 8** (Activity Studio editor Variant A — see [[studio-unified-product-editor]] / [[ADR-025]]; Hotel Flutter handoff Variant B — see [[field-ownership]]; SEO transcreate technical layer — see [[transcreate-website-content-runbook]] / [[ADR-021]]) + FAQ expansion (Variant A vs B, bulk partial failure, 429 as expected) + cheat-sheet rows for new flows. [[cutover-checklist]] extended with Stage → Flow verification map (W1→W6 deliverables + PRs #225/#227/#229/#237/#238/#239/#230) + per-flow cutover day verification table. **Screencasts (W7-c) still pending** — `{{screenshot-placeholder}}` markers in onboarding doc.
- **Client priority change v2 (2026-04-19)** — logged in [[pilot-readiness-deps]]: priority 1 = translation (blog + pkg + act); priority 2 = editing (pkg + act Studio editors); hotels as-is (Flutter-owner); booking V1 DEFER post-pilot (ADR-024 Accepted PR pending); no rate-limit mitigation. W2 + W5 bumped to XL; W3 becomes docs-only DEFER closure.
- Matrix foundation: [[product-detail-matrix]] (W1 pkg+act editable + Section M Booking DEFER + Section N editor→campo + Section O Flutter-only gaps + Section P Blog transcreate + 🟡-flag legend + Hotel column as-is)
- Cross-repo boundary: [[cross-repo-flutter]] (Flutter-owner fields per [[ADR-025]])
- Seed strategy (unified): `e2e/setup/pilot-seed.ts` (variant-factory `full | minimum | seo-max | translation-ready`; `translation-ready` covers pkg + act + blog post client v2)
- ADR mapping authoritative: [[ADR-003]] [[ADR-005]] [[ADR-011]] [[ADR-016]] [[ADR-018]] [[ADR-019]] [[ADR-020]] [[ADR-021]] [[ADR-023]] [[ADR-024]] [[ADR-025]]

---

## Wikilink resolution table

Obsidian resolves `[[ADR-005]]` by filename stem or alias. Claude Code / Codex grep for the literal token. Use this map when a wikilink does not resolve automatically.

| Wikilink                                              | Resolves to                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `[[ADR-001]]`                                         | `docs/architecture/ADR-001-server-first-rendering.md`                              |
| `[[ADR-002]]`                                         | `docs/architecture/ADR-002-error-handling-strategy.md`                             |
| `[[ADR-003]]`                                         | `docs/architecture/ADR-003-contract-first-validation.md`                           |
| `[[ADR-004]]`                                         | `docs/architecture/ADR-004-state-management.md`                                    |
| `[[ADR-005]]`                                         | `docs/architecture/ADR-005-security-defense-in-depth.md`                           |
| `[[ADR-006]]`                                         | `docs/architecture/ADR-006-ai-streaming-architecture.md`                           |
| `[[ADR-007]]`                                         | `docs/architecture/ADR-007-edge-first-delivery.md`                                 |
| `[[ADR-008]]`                                         | `docs/architecture/ADR-008-monorepo-packages.md`                                   |
| `[[ADR-009]]`                                         | `docs/architecture/ADR-009-multi-tenant-subdomain-routing.md`                      |
| `[[ADR-010]]`                                         | `docs/architecture/ADR-010-observability-strategy.md`                              |
| `[[ADR-011]]`                                         | `docs/architecture/ADR-011-middleware-cache.md`                                    |
| `[[ADR-012]]`                                         | `docs/architecture/ADR-012-api-response-envelope.md`                               |
| `[[ADR-013]]`                                         | `docs/architecture/ADR-013-tech-validator-quality-gate.md`                         |
| `[[ADR-014]]`                                         | `docs/architecture/ADR-014-delta-typescript-quality-gate.md`                       |
| `[[ADR-015]]`                                         | `docs/architecture/ADR-015-resilient-map-rendering-and-marker-media-fallback.md`   |
| `[[ADR-016]]`                                         | `docs/architecture/ADR-016-seo-intelligence-caching.md`                            |
| `[[ADR-017]]`                                         | `docs/architecture/ADR-017-geocoding-activity-circuits.md`                         |
| `[[ADR-018]]`                                         | `docs/architecture/ADR-018-webhook-idempotency.md`                                 |
| `[[ADR-019]]`                                         | `docs/architecture/ADR-019-multi-locale-url-routing.md`                            |
| `[[ADR-020]]`                                         | `docs/architecture/ADR-020-hreflang-emission-policy.md`                            |
| `[[ADR-021]]`                                         | `docs/architecture/ADR-021-translation-memory-transcreation-pipeline.md`           |
| `[[ADR-023]]`                                         | `docs/architecture/ADR-023-qa-tooling-studio-editor.md`                            |
| `[[ADR-024]]`                                         | `docs/architecture/ADR-024-booking-v1-pilot-scope.md`                              |
| `[[ADR-024-booking-v1-pilot-scope]]`                  | `docs/architecture/ADR-024-booking-v1-pilot-scope.md`                              |
| `[[ADR-025]]`                                         | `docs/architecture/ADR-025-studio-flutter-field-ownership.md`                      |
| `[[ADR-025-studio-flutter-field-ownership]]`          | `docs/architecture/ADR-025-studio-flutter-field-ownership.md`                      |
| `[[ADR-027]]`                                         | `docs/architecture/ADR-027-designer-reference-theme-adoption.md`                   |
| `[[ADR-028]]`                                         | `docs/architecture/ADR-028-media-assets-canonical-registry.md`                     |
| `[[ADR-028-media-assets-canonical-registry]]`         | `docs/architecture/ADR-028-media-assets-canonical-registry.md`                     |
| `[[field-ownership]]`                                 | `docs/architecture/ADR-025-studio-flutter-field-ownership.md` (concept alias)      |
| `[[booking-defer]]`                                   | `docs/architecture/ADR-024-booking-v1-pilot-scope.md` (concept alias)              |
| `[[pilot-readiness-deps]]`                            | `docs/specs/pilot-readiness-deps.md`                                               |
| `[[colombiatours-onboarding]]`                        | `docs/training/colombiatours-onboarding.md`                                        |
| `[[pilot-runbook-colombiatours]]`                     | `docs/ops/pilot-runbook-colombiatours.md`                                          |
| `[[pilot-theme-designer-v1-rollout]]`                 | `docs/ops/pilot-theme-designer-v1-rollout.md`                                      |
| `[[cutover-checklist]]`                               | `docs/ops/cutover-checklist.md`                                                    |
| `[[release-gate-checklist]]`                          | `docs/ops/release-gate-checklist.md`                                               |
| `[[ci-seo-i18n-gate]]`                                | `docs/ops/ci-seo-i18n-gate.md`                                                     |
| `[[public-analytics-standard]]`                       | `docs/ops/public-analytics-standard.md`                                            |
| `[[ADR-022]]`                                         | Flutter repo — auth token boundary                                                 |
| `[[ADR-032]]`                                         | Flutter repo — catalog v2                                                          |
| `[[ARCHITECTURE]]`                                    | `docs/architecture/ARCHITECTURE.md`                                                |
| `[[ONBOARDING-ARCHITECTURE]]`                         | `docs/architecture/ONBOARDING-ARCHITECTURE.md`                                     |
| `[[AI-AGENT-DEVELOPMENT]]`                            | `docs/architecture/AI-AGENT-DEVELOPMENT.md`                                        |
| `[[SPEC_*]]`                                          | `docs/specs/SPEC_*.md` (filename stem match)                                       |
| `[[SEO-BLOG-EXECUTION-FRAMEWORK-2026]]`               | `docs/seo/SEO-BLOG-EXECUTION-FRAMEWORK-2026.md`                                    |
| `[[cross-repo-flutter]]`                              | `.claude/rules/cross-repo-flutter.md`                                              |
| `[[issue-103-media-closure-checklist]]`               | `docs/ops/issue-103-media-closure-checklist.md`                                    |
| `[[media-asset-guardrails]]`                          | `docs/ops/media-asset-guardrails.md`                                               |
| `[[package-detail-anatomy]]`                          | `docs/product/package-detail-anatomy.md`                                           |
| `[[product-detail-inventory]]`                        | `docs/product/product-detail-inventory.md`                                         |
| `[[product-detail-matrix]]`                           | `docs/product/product-detail-matrix.md`                                            |
| `[[studio-editor-parity-audit]]`                      | `docs/product/studio-editor-parity-audit.md`                                       |
| `[[schema-parity-audit]]`                             | `docs/product/schema-parity-audit.md`                                              |
| `[[e2e-sessions]]`                                    | `.claude/rules/e2e-sessions.md`                                                    |
| `[[colombiatours-content-classification-2026-04-23]]` | `docs/qa/pilot/colombiatours-content-classification-2026-04-23.md`                 |
| `[[colombiatours-cutover-rerun-2026-04-23]]`          | `docs/qa/pilot/colombiatours-cutover-rerun-2026-04-23.md`                          |
| `[[colombiatours-cutover-audit-2026-04-23]]`          | `docs/qa/pilot/colombiatours-cutover-audit-2026-04-23.md`                          |
| `[[colombiatours-matrix-2026-04-20]]`                 | `docs/qa/pilot/colombiatours-matrix-2026-04-20.md`                                 |
| `[[sign-off-2026-04-20]]`                             | `docs/qa/pilot/sign-off-2026-04-20.md`                                             |
| `[[matrix-playbook]]`                                 | `docs/qa/pilot/matrix-playbook.md`                                                 |
| `[[transcreate-playbook]]`                            | `docs/qa/pilot/transcreate-playbook.md`                                            |
| `[[editor-to-render-playbook]]`                       | `docs/qa/pilot/editor-to-render-playbook.md`                                       |
| `[[#127]]`                                            | GitHub Issue — Package Detail Conversion v2 (hero chips, WhatsApp CTA)             |
| `[[#165]]`                                            | GitHub Issue — Product Video Field (video_url + hero lightbox)                     |
| `[[#171]]`                                            | GitHub Issue — Package Content Population (epic parent F1/F2/F3)                   |
| `[[#172]]`                                            | GitHub Issue — F1 `get_package_aggregated_data` RPC                                |
| `[[#173]]`                                            | GitHub Issue — F2 `ItineraryItemRenderer` per-type variants                        |
| `[[#174]]`                                            | GitHub Issue — F3 AI highlights + description (`/api/ai/generate-package-content`) |
| `[[SPEC #187]]`                                       | GitHub Issue — Multi-locale translation + SEO migration EPIC                       |
| `[[media-inventory-production-run-2026-04-25]]`       | `docs/evidence/media-inventory-production-run-2026-04-25.md`                       |
| `[[media-remediation-backlog-2026-04-25]]`            | `docs/evidence/media-remediation-backlog-2026-04-25.md`                            |
| `[[epic128-lighthouse-summary]]`                      | `docs/evidence/epic128/lighthouse-summary.md`                                      |
| `[[epic128-production-ready-attestation-v2]]`         | `docs/evidence/epic128/production-ready-attestation-v2.md`                         |
| `[[epic128-ux-fluency]]`                              | `docs/evidence/epic128/ux-fluency.md`                                              |
| Any unresolved concept                                | Search this INDEX with `grep "[[concept]]" docs/INDEX.md`.                         |

---

## Agent update protocol

When you ship a new ADR, SPEC, runbook, or cross-cutting concept:

1. Add a row to the relevant table above.
2. Add or extend the matching concept-graph section.
3. If it introduces a new concept name, add it to the wikilink resolution table.
4. Grep the repo for prose references to the new artifact and convert them to `[[ArtifactName]]` wikilinks (leave existing markdown links intact).

Do **not** delete concepts on removal — mark as deprecated inline so the graph keeps its history.
