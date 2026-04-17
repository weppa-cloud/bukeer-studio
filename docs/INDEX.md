# Knowledge Graph — Bukeer Studio

> LLM Wiki entry point. Agents (Claude Code / Codex / Opencode) start here to navigate the knowledge graph. Obsidian-compatible.
>
> **Convention:** `[[ADR-XXX]]` or `[[SPEC_NAME]]` = wikilink resolved below. `[text](path.md)` = regular markdown link. Both coexist.

Last updated: 2026-04-17 (WIKI full-refresh — CORRELATION+AUDIT post 4w)

---

## How to read this index

- **Agents:** grep `[[concept]]` to find every document that touches a concept.
- **Humans:** open in Obsidian for graph view, or follow the resolution table at the bottom.
- **Freshness:** update this file when adding a new ADR, SPEC, runbook, or cross-cutting concept.

---

## Agent entry points

| Artifact | Path | Purpose |
|----------|------|---------|
| Root manifest | `CLAUDE.md` | Primary context for Claude Code. Tech stack, scripts, skills registry. |
| E2E pool rules | `.claude/rules/e2e-sessions.md` | Mandatory for any agent running dev server / Playwright. |
| Cross-repo bridge | `.claude/rules/cross-repo-flutter.md` | Shared DB + decisions with `weppa-cloud/bukeer-flutter`. |
| Skills | `.claude/skills/*/SKILL.md` | 11 skills: nextjs-developer, backend-dev, tech-validator, specifying, docs-keeper, debugger, website-designer, website-section-generator, website-quality-gate, prompt-optimiser. |
| Commands | `.claude/commands/*.md` | `/qa-nextjs`, `/website-creator`, `/design-session`. |
| Auto-memory | `~/.claude/projects/.../memory/MEMORY.md` | Cross-session persistent memory index. Not a repo file — lives in user home. |
| MCP servers | `.claude/mcp-servers/` | `bukeer-studio/` (Studio API) + `dataforseo/` (SEO data). READMEs in each subfolder. |
| Agent setup | [agent-setup](./development/agent-setup.md) | How to configure Codex/Opencode/Claude Code for this repo. |

---

## Architecture — ADRs

All ADRs accepted unless noted. Cross-cut by Principles P1–P10 (see [[ARCHITECTURE]]).

| Wikilink | File | Topic | Concepts touched |
|----------|------|-------|------------------|
| [[ADR-001]] | [ADR-001](./architecture/ADR-001-server-first-rendering.md) | Server-First Rendering with ISR and PPR | [[SSR]] [[ISR]] [[PPR]] |
| [[ADR-002]] | [ADR-002](./architecture/ADR-002-error-handling-strategy.md) | Three-Tier Error Handling | [[error-handling]] [[observability]] |
| [[ADR-003]] | [ADR-003](./architecture/ADR-003-contract-first-validation.md) | Contract-First Validation with Zod | [[website-contract]] [[validation]] |
| [[ADR-004]] | [ADR-004](./architecture/ADR-004-state-management.md) | State Management without Global Store | [[state]] [[server-components]] |
| [[ADR-005]] | [ADR-005](./architecture/ADR-005-security-defense-in-depth.md) | Defense-in-Depth Security | [[auth]] [[RLS]] [[rate-limiting]] |
| [[ADR-006]] | [ADR-006](./architecture/ADR-006-ai-streaming-architecture.md) | Streaming-First AI Integration | [[AI]] [[openrouter]] [[streaming]] |
| [[ADR-007]] | [ADR-007](./architecture/ADR-007-edge-first-delivery.md) | Edge-First Delivery on Cloudflare Workers | [[edge]] [[cloudflare]] [[pagination]] |
| [[ADR-008]] | [ADR-008](./architecture/ADR-008-monorepo-packages.md) | Internal Package Architecture | [[theme-sdk]] [[website-contract]] [[monorepo]] |
| [[ADR-009]] | [ADR-009](./architecture/ADR-009-multi-tenant-subdomain-routing.md) | Multi-Tenant Subdomain Routing | [[multi-tenant]] [[subdomain]] [[middleware]] |
| [[ADR-010]] | [ADR-010](./architecture/ADR-010-observability-strategy.md) | Observability Strategy | [[logging]] [[observability]] |
| [[ADR-011]] | [ADR-011](./architecture/ADR-011-middleware-cache.md) | Middleware In-Memory Cache | [[middleware]] [[cache]] [[edge]] |
| [[ADR-012]] | [ADR-012](./architecture/ADR-012-api-response-envelope.md) | Standard API Response Envelope | [[API]] [[validation]] |
| [[ADR-013]] | [ADR-013](./architecture/ADR-013-tech-validator-quality-gate.md) | Automated Tech Validator Quality Gate | [[tech-validator]] [[quality-gate]] |
| [[ADR-014]] | [ADR-014](./architecture/ADR-014-delta-typescript-quality-gate.md) | Delta TypeScript Quality Gate | [[tech-validator]] [[typescript]] |
| [[ADR-015]] | [ADR-015](./architecture/ADR-015-resilient-map-rendering-and-marker-media-fallback.md) | Resilient Map Rendering and Marker Media Fallback | [[maps]] [[webgl]] [[fallback]] |
| [[ADR-016]] | [ADR-016](./architecture/ADR-016-seo-intelligence-caching.md) | SEO Content Intelligence Caching and Revalidation | [[SEO]] [[cache]] [[ISR]] [[places-cache]] |
| [[ADR-017]] | [ADR-017](./architecture/ADR-017-geocoding-activity-circuits.md) | Geocoding for Activity Circuit Maps (MapTiler + places_cache) | [[geocoding]] [[maps]] [[places-cache]] |

> **Note:** `ADR-022` and `ADR-032` referenced in specs are anchored in `weppa-cloud/bukeer-flutter`. Studio respects them but does not own them. See [[cross-repo-flutter]].

### Companion architecture docs

- [ARCHITECTURE](./architecture/ARCHITECTURE.md) — narrative architecture overview + ADR index.
- [ONBOARDING-ARCHITECTURE](./architecture/ONBOARDING-ARCHITECTURE.md) — mentor-style developer onboarding.
- [AI-AGENT-DEVELOPMENT](./architecture/AI-AGENT-DEVELOPMENT.md) — principles for AI-assisted work.

---

## Specs

Feature requests formalized. Status tracked inline. GitHub Issues = source of truth ([[specs-source-of-truth]]).

| Wikilink | File | Concepts |
|----------|------|----------|
| [[SPEC_MULTI_LOCALE_REMEDIATION]] | [file](./specs/SPEC_MULTI_LOCALE_REMEDIATION.md) | [[i18n]] [[SEO]] [[growth-ops]] |
| [[SPEC_PACKAGE_DETAIL_CONVERSION_V2]] | [file](./specs/SPEC_PACKAGE_DETAIL_CONVERSION_V2.md) | [[package-landing]] [[package-kits]] [[maps]] [[conversion]] |
| [[SPEC_SEO_CONTENT_INTELLIGENCE]] | [file](./specs/SPEC_SEO_CONTENT_INTELLIGENCE.md) | [[SEO]] [[AI]] [[keyword-research]] |
| [[SPEC_SEO_CONTENT_INTELLIGENCE_INTEGRAL]] | [file](./specs/SPEC_SEO_CONTENT_INTELLIGENCE_INTEGRAL.md) | [[SEO]] [[AI]] [[content-ops]] |
| [[SPEC_SEO_DASHBOARD_PRODUCT_INTEGRATION]] | [file](./specs/SPEC_SEO_DASHBOARD_PRODUCT_INTEGRATION.md) | [[SEO]] [[product-landing]] [[catalog-v2]] |
| [[SPEC_SEO_DESTINATIONS_PRODUCTS]] | [file](./specs/SPEC_SEO_DESTINATIONS_PRODUCTS.md) | [[SEO]] [[destinations]] [[product-landing]] |
| [[SPEC_SEO_OPTIMIZATION_TOOLKIT]] | [file](./specs/SPEC_SEO_OPTIMIZATION_TOOLKIT.md) | [[SEO]] [[AI]] [[bulk-actions]] |
| [[SPEC_SKILL_NEXTJS_DEVELOPER_AUDIT]] | [file](./specs/SPEC_SKILL_NEXTJS_DEVELOPER_AUDIT.md) | [[skills]] [[nextjs-developer]] |
| [[SPEC_UX_IA_AUDIT_BUKEER_STUDIO]] | [file](./specs/SPEC_UX_IA_AUDIT_BUKEER_STUDIO.md) | [[UX]] [[information-architecture]] |
| [[SPEC_BOOKINGS_STUDIO]] | [file](./specs/SPEC_BOOKINGS_STUDIO.md) | Stub — booking flows in Studio | [[bookings]] [[leads]] |
| [[SECTION_TYPES_REGISTRY]] | [file](./specs/SECTION_TYPES_REGISTRY.md) | Stub — section types table | [[sections]] [[website-contract]] |
| [[EPIC_SEO_CONTENT_INTELLIGENCE_GITHUB]] | [file](./specs/EPIC_SEO_CONTENT_INTELLIGENCE_GITHUB.md) | [[SEO]] [[EPIC]] |
| [[ISSUE_MAP_SEO_CONTENT_INTELLIGENCE]] | [file](./specs/ISSUE_MAP_SEO_CONTENT_INTELLIGENCE.md) | [[SEO]] [[issue-tracking]] |
| [[ROADMAP_SEO_CONTENT_INTELLIGENCE]] | [file](./specs/ROADMAP_SEO_CONTENT_INTELLIGENCE.md) | [[SEO]] [[roadmap]] |

---

## Product

| Wikilink | File | Purpose |
|----------|------|---------|
| [[package-detail-anatomy]] | [file](./product/package-detail-anatomy.md) | Package landing anatomy: sections, fields, hygiene checklist, gaps. |

---

## Ops, runbooks, CI

| Wikilink | File | Purpose |
|----------|------|---------|
| [[product-landing-v1-runbook]] | [file](./ops/product-landing-v1-runbook.md) | EPIC 7 rollout + monitoring. |
| [[lighthouse-ci]] | [file](./ops/lighthouse-ci.md) | Core Web Vitals gate (perf/a11y/SEO). |
| [[product-landing-rollout-runbook]] | [file](./runbooks/product-landing-rollout-runbook.md) | Rollout for public site rendering / ISR changes. |

---

## SEO

| Wikilink | File | Purpose |
|----------|------|---------|
| [[SEO-IMPLEMENTATION]] | [file](./seo/SEO-IMPLEMENTATION.md) | Current shipped product state. |
| [[SEO-PLAYBOOK]] | [file](./seo/SEO-PLAYBOOK.md) | Target operating model. |
| [[SEO-FLUJOS-STUDIO]] | [file](./seo/SEO-FLUJOS-STUDIO.md) | Shipped user flows. |
| [[jsonld-fixtures]] | [file](./seo/jsonld-fixtures.md) | JSON-LD rich-results validation samples. |

---

## Theming

| Wikilink | File | Purpose |
|----------|------|---------|
| [[dark-mode-behavior]] | [file](./theming/dark-mode-behavior.md) | Dark mode reference for QA/design/dev. |

---

## QA & evidence

| Wikilink | File | Purpose |
|----------|------|---------|
| [[product-landing-qa-matrix]] | [file](./qa/product-landing-qa-matrix.md) | QA matrix for 3 release tenants. |
| [[link-validation-colombiatours]] | [file](./qa/link-validation-colombiatours.md) | Link validation report (2026-04-15). |
| [[epic86-walkthrough]] | [file](./evidence/epic86/walkthrough.md) | EPIC 86 evidence (Issue #122). |

---

## Growth ops

Persisted state pre-#148 (`seo_website_okrs`). Post-#148 these stay as human-readable exports.

| Wikilink | File | Purpose |
|----------|------|---------|
| [[growth-okrs-active]] | [file](./growth-okrs/active.md) | Active OKRs (7D/30D/90D). |
| [[growth-okrs-budget]] | [file](./growth-okrs/budget.md) | Provider budget counter (pre-#130). |
| [[growth-sessions-readme]] | [file](./growth-sessions/README.md) | Per-session audit trail. |
| [[growth-weekly-readme]] | [file](./growth-weekly/README.md) | Weekly quick-wins planning. |

---

## Research

| Wikilink | File | Purpose |
|----------|------|---------|
| [[whatsapp-site-audit-2026-04-14]] | [file](./research/whatsapp-site-audit-2026-04-14.md) | WhatsApp IA/UI audit → ColombiaTours theme. |

---

## Development

| Wikilink | File | Purpose |
|----------|------|---------|
| [[local-sessions]] | [file](./development/local-sessions.md) | Parallel-safe local dev + Playwright (session pool s1–s4). |
| [[agent-setup]] | [file](./development/agent-setup.md) | Configure Codex/Opencode/Claude Code for this repo. |

---

## Guides

| Wikilink | File | Purpose |
|----------|------|---------|
| [[WEBSITE-CREATION-WORKFLOW]] | [file](./guides/WEBSITE-CREATION-WORKFLOW.md) | Zero → production site using skills + commands. |

---

## Cross-repo bridge — bukeer-flutter

Shared Supabase project. Flutter writes data; Studio reads via SSR.

- [[cross-repo-flutter]] → `.claude/rules/cross-repo-flutter.md`
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
- [[dark-mode-behavior]]
- DB shape: `websites.theme = { tokens, profile }` — see [[cross-repo-flutter]]
- 8 presets: adventure, luxury, tropical, corporate, boutique, cultural, eco, romantic

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
- Specs: [[SPEC_SEO_CONTENT_INTELLIGENCE]] [[SPEC_SEO_CONTENT_INTELLIGENCE_INTEGRAL]] [[SPEC_SEO_DASHBOARD_PRODUCT_INTEGRATION]] [[SPEC_SEO_DESTINATIONS_PRODUCTS]] [[SPEC_SEO_OPTIMIZATION_TOOLKIT]]
- Meta: [[EPIC_SEO_CONTENT_INTELLIGENCE_GITHUB]] [[ROADMAP_SEO_CONTENT_INTELLIGENCE]] [[ISSUE_MAP_SEO_CONTENT_INTELLIGENCE]]
- QA: [[link-validation-colombiatours]]
- Shipped APIs (2026-04-17): serp-snapshot, nlp-score, transcreate, objectives-90d, okrs, translations, weekly-tasks — see [[SEO-IMPLEMENTATION]]
- Trust / JSON-LD: [[trust]] + [[organization-schema]] concepts

### [[AI]] + [[openrouter]] + [[streaming]]
- [[ADR-006]] — streaming-first AI integration
- Specs: [[SPEC_SEO_CONTENT_INTELLIGENCE]] [[SPEC_SEO_OPTIMIZATION_TOOLKIT]] [[SPEC_SEO_DASHBOARD_PRODUCT_INTEGRATION]]
- Env: `OPENROUTER_AUTH_TOKEN`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`

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

### [[trust]] + [[organization-schema]]
- `packages/website-contract/src/schemas/trust.ts` — trust content contract
- `components/seo/organization-schema.tsx` — Organization JSON-LD (guards against UUID leak)
- `components/site/trust-badges.tsx` — trust badge UI
- Related: [[SEO]] (JSON-LD), [[SPEC_PACKAGE_DETAIL_CONVERSION_V2]] (trust section on landing)

### [[skills]] + [[specifying]] + [[debugging]]
- [[AI-AGENT-DEVELOPMENT]] — AI-assisted dev principles
- [[SPEC_SKILL_NEXTJS_DEVELOPER_AUDIT]] — skill audit
- Skills registry: `.claude/skills/`

---

## Wikilink resolution table

Obsidian resolves `[[ADR-005]]` by filename stem or alias. Claude Code / Codex grep for the literal token. Use this map when a wikilink does not resolve automatically.

| Wikilink | Resolves to |
|----------|-------------|
| `[[ADR-001]]` | `docs/architecture/ADR-001-server-first-rendering.md` |
| `[[ADR-002]]` | `docs/architecture/ADR-002-error-handling-strategy.md` |
| `[[ADR-003]]` | `docs/architecture/ADR-003-contract-first-validation.md` |
| `[[ADR-004]]` | `docs/architecture/ADR-004-state-management.md` |
| `[[ADR-005]]` | `docs/architecture/ADR-005-security-defense-in-depth.md` |
| `[[ADR-006]]` | `docs/architecture/ADR-006-ai-streaming-architecture.md` |
| `[[ADR-007]]` | `docs/architecture/ADR-007-edge-first-delivery.md` |
| `[[ADR-008]]` | `docs/architecture/ADR-008-monorepo-packages.md` |
| `[[ADR-009]]` | `docs/architecture/ADR-009-multi-tenant-subdomain-routing.md` |
| `[[ADR-010]]` | `docs/architecture/ADR-010-observability-strategy.md` |
| `[[ADR-011]]` | `docs/architecture/ADR-011-middleware-cache.md` |
| `[[ADR-012]]` | `docs/architecture/ADR-012-api-response-envelope.md` |
| `[[ADR-013]]` | `docs/architecture/ADR-013-tech-validator-quality-gate.md` |
| `[[ADR-014]]` | `docs/architecture/ADR-014-delta-typescript-quality-gate.md` |
| `[[ADR-015]]` | `docs/architecture/ADR-015-resilient-map-rendering-and-marker-media-fallback.md` |
| `[[ADR-016]]` | `docs/architecture/ADR-016-seo-intelligence-caching.md` |
| `[[ADR-017]]` | `docs/architecture/ADR-017-geocoding-activity-circuits.md` |
| `[[ADR-022]]` | Flutter repo — auth token boundary |
| `[[ADR-032]]` | Flutter repo — catalog v2 |
| `[[ARCHITECTURE]]` | `docs/architecture/ARCHITECTURE.md` |
| `[[ONBOARDING-ARCHITECTURE]]` | `docs/architecture/ONBOARDING-ARCHITECTURE.md` |
| `[[AI-AGENT-DEVELOPMENT]]` | `docs/architecture/AI-AGENT-DEVELOPMENT.md` |
| `[[SPEC_*]]` | `docs/specs/SPEC_*.md` (filename stem match) |
| `[[cross-repo-flutter]]` | `.claude/rules/cross-repo-flutter.md` |
| `[[package-detail-anatomy]]` | `docs/product/package-detail-anatomy.md` |
| `[[e2e-sessions]]` | `.claude/rules/e2e-sessions.md` |
| Any unresolved concept | Search this INDEX with `grep "[[concept]]" docs/INDEX.md`. |

---

## Agent update protocol

When you ship a new ADR, SPEC, runbook, or cross-cutting concept:

1. Add a row to the relevant table above.
2. Add or extend the matching concept-graph section.
3. If it introduces a new concept name, add it to the wikilink resolution table.
4. Grep the repo for prose references to the new artifact and convert them to `[[ArtifactName]]` wikilinks (leave existing markdown links intact).

Do **not** delete concepts on removal — mark as deprecated inline so the graph keeps its history.
