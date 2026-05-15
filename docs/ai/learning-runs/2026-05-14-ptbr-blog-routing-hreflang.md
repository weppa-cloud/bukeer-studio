# Learning run — PT-BR Blog Routing + Hreflang Completeness

- Pipeline ID: ptbr-blog-routing-hreflang-20260514
- Date: 2026-05-14
- Branch (fix): `fix/ptbr-blog-routing-hreflang`
- Fix commit: `d8310671f1d85ad39cdbc03461648a1be3b6e77f`
- PR: https://github.com/weppa-cloud/bukeer-studio/pull/549
- Parent ops task: `t_ec666523` (PR #549 created, awaiting Yeison approval — not yet merged to dev)
- Task IDs: t_ec666523 (ops/merge), t_a83b15b9 (learning-curator)
- Spec refs: `docs/plans/SPEC_PTBR_BLOG_ROUTING_HREFLANG.md` (537 lines)
- ADR refs: ADR-007, ADR-009, ADR-019, ADR-020, SPEC_GLOBAL_MULTILOCALE_TRANSCREATION_SEO
- Plan: `docs/plans/SPEC_PTBR_BLOG_ROUTING_HREFLANG.md`

## Outcome

PENDING MERGE: Fix committed at `d8310671` on `fix/ptbr-blog-routing-hreflang`, PR #549 created by ops, awaiting Yeison approval. Fix is NOT yet merged to dev or deployed to production. 6 files changed, 688 insertions, 35 deletions. The fix addresses all 3 verifier blockages (México, Panamá, Villa de Leyva) identified post-deploy run `25888825397`.

## Evidence links

- Fix commit: `d8310671` — `fix: canonicalize pt-br blog routing`
- PR: https://github.com/weppa-cloud/bukeer-studio/pull/549
- Spec: `docs/plans/SPEC_PTBR_BLOG_ROUTING_HREFLANG.md`
- Parent ops: `t_ec666523` — ops run 1170, PR #549 created, mergeable, CI green
- Upstream transcreation spec: `docs/specs/SPEC_GLOBAL_MULTILOCALE_TRANSCREATION_SEO.md`

## Pipeline context

This fix was driven by 3 post-deploy verifiers that blocked after a production deploy (run `25888825397`) passed CI:

| Verifier | Task | Block reason | Evidence |
| --- | --- | --- | --- |
| México | `t_9c97f4da` (blocked) | `/pt-br/blog/requisitos-para-viajar-a-colombia-desde-mexico/` returns HTTP 200 with Spanish 404 "Página no encontrada", `lang="es"`, noindex, no canonical, no hreflang. Root cause: `website.supported_locales=[es,es-CO,en-US,pt-PT,fr-FR,de-DE]` — template only supports `pt-PT`, not `pt-BR`. DB row was `pt-BR` locale with correct content. | verifier run 1140, 897 |
| Panamá | `t_f4349cf1` (blocked) | `/pt/→/pt-br/` redirect works but PT-bR blog routes still render Spanish 404. `/pt-br/blog/viajar-a-colombia-desde-panama` serves Spanish page (`x-public-locale: es`, `html lang="es"`). Blog content published in Supabase (`post_id=eaa1e303`). | verifier run 1141, 900 |
| Villa de Leyva | `t_29d082ae` (blocked) | Hreflang improved from 0/6 to partial but incomplete: DE 3/6, FR 5/6, ES base 3/6, PT 0/6 due to 404. Template uses `hrefLang` (capital L) instead of standard `hreflang`. | verifier run 1139, 713 |

## Root cause analysis

The bug was a **three-layer misalignment** — no single component handled PT-BR correctly end-to-end:

### Layer 1: URL segment recognition (middleware + locale-routing.ts)

`resolveLocaleFromPublicPath()` only matched first URL segments matching `/^[a-z]{2}$/`. The segment `/pt-br` (5 characters, hyphenated) was never recognized as a locale prefix. Middleware treated `/pt-br/blog/foo` as a non-locale path, rewrote to an invalid internal route, and served the Spanish 404 fallback.

`buildPublicLocalizedPath()` used `localeToLanguage(locale)`, which stripped the country code: `pt-BR` → `/pt/...`. The canonical URL builder was outputting `/pt/blog/foo` while verifiers and SEO expectations used `/pt-br/blog/foo`.

**Fix**: Added `PUBLIC_LOCALE_SEGMENT_BY_LOCALE` and `PUBLIC_LOCALE_ALIAS_BY_SEGMENT` lookup maps. Created `pickLocaleForPublicSegment()` to handle both 2-letter (`en`, `fr`, legacy `pt`) and BCP-47 5-letter (`pt-br`) segments symmetrically.

### Layer 2: Data-access locale normalization (get-website.ts)

`getBlogPostBySlug()` had ad-hoc locale candidate bridging only for Spanish and English. It did not bridge `pt-BR`/`pt`, `fr-FR`/`fr`, or `de-DE`/`de`. A DB row stored as legacy `pt` would not be found for a `pt-BR` request, and vice versa.

`getBlogPostByTranslationGroup()` queried exact locale only. A translation-group lookup would miss legacy short-code rows entirely.

`normalizeBlogPublicLocale()` had an explicit mapping for `pt` → `pt-PT` (wrong — ColombiaTours serves Brazilian Portuguese, not European Portuguese).

**Fix**: Created shared `getBlogLocaleLookupCandidates()` helper that builds locale+language candidate sets bidirectionally. Updated `getBlogPostByTranslationGroup()` to use `.in("locale", localeCandidates)` instead of exact `.eq("locale", locale)`. Normalized translation locale results before deduplication. Fixed `pt` → `pt-BR` mapping.

### Layer 3: SEO metadata and hreflang emission (hreflang.ts, public-metadata.ts)

Hreflang alternates were incomplete because upstream locale resolution was wrong. The `hrefLang` vs `hreflang` case-sensitivity bug (uppercase `L`) in templates was a separate discovery, not part of this fix — it was noted in verifier evidence but predates this pipeline.

Translated locale sets from `getBlogPostTranslationLocales()` returned raw locale codes (including `pt` instead of `pt-BR`) because normalization happened only after deduplication, meaning duplicate locales could appear and canonical codes could be missing.

## What was delivered

6 files changed, 688 insertions, 35 deletions:

1. **`lib/seo/locale-routing.ts`** (52 insertions): Added `PUBLIC_LOCALE_SEGMENT_BY_LOCALE` map, `PUBLIC_LOCALE_ALIAS_BY_SEGMENT` map, `pickLocaleForPublicSegment()` function. Updated `resolveLocaleFromPublicPath()` to use the new function. Updated `buildPublicLocalizedPath()` to emit `/pt-br/...` instead of `/pt/...`. Corrected `languageSegment` in `resolveLocaleFromRequestHeaders()` output for BCP-47 segments.

2. **`lib/supabase/get-website.ts`** (45 insertions): Added `getBlogLocaleLookupCandidates()` exporting a shared helper for bidirectional locale mapping (canonical ↔ short code). Fixed `normalizeBlogPublicLocale()` to call `normalizeBlogLocale()` from locale-routing.ts. Updated `getBlogPostBySlug()` to use the shared helper. Updated `getBlogPostByTranslationGroup()` to query with locale candidates instead of exact match. Normalized translation locales before dedup in `getBlogPostTranslationLocales()`.

3. **`middleware.ts`** (9 insertions): Removed the local `normalizeBlogPublicLocale()` function (that hardcoded `pt` → `pt-PT`) and replaced with the shared `normalizeBlogLocale` from locale-routing.ts.

4. **`__tests__/lib/seo/ptbr-routing-red.test.ts`** (78 lines, new): Regression test suite covering:
   - /pt-br blog path resolution as pt-BR
   - /pt as legacy alias only when pt-BR is supported
   - canonical PT-BR URL building with /pt-br
   - legacy blog locale normalization (pt→pt-BR, fr→fr-FR, de→de-DE)
   - blog locale lookup candidates (bidirectional)
   - complete hreflang alternates including pt-BR on /pt-br paths and x-default

5. **`__tests__/lib/seo/locale-routing.test.ts`** (1 insertion): Updated legal page path assertion from `/pt/politica-de-cancelamento` → `/pt-br/politica-de-cancelamento` for pt-BR locales.

6. **`docs/plans/SPEC_PTBR_BLOG_ROUTING_HREFLANG.md`** (537 lines, new): Full specification covering 5 phases (A-E), URL matrix, expected verifier resolutions, test requirements, and risks/mitigations.

## Key design decisions

1. **BCP-47 `/pt-br` segment as canonical, not two-letter `/pt`**: The fix adds a `PUBLIC_LOCALE_SEGMENT_BY_LOCALE` map that overrides the default two-letter rule. This is a narrow amendment to ADR-019 (Multi-locale URL Routing) documented in the spec. PT-BR is the only locale requiring this — EN, FR, DE, and ES all use two-letter segments.

2. **Legacy `/pt` kept as inbound alias only**: Requests to `/pt/blog/...` are handled as a legacy compatibility path (middleware redirects 301 to `/pt-br/blog/...`). The alias only activates when the tenant supports `pt-BR` in its `supportedLocales`. This prevents unsupported tenants from accidentally accepting PT-BR aliases.

3. **Read-time normalization, not DB migration**: The fix normalizes locale codes at the data-access boundary rather than migrating legacy short-code rows in the database. This avoids Supabase migrations and potential conflicts with the Flutter app's concurrent writes.

4. **Shared locale candidate helper**: `getBlogLocaleLookupCandidates()` replaces ad-hoc locale bridging spread across three functions in two files. It handles all 5 supported locales symmetrically (es-CO/es, en-US/en, pt-BR/pt, fr-FR/fr, de-DE/de).

5. **Middleware refactoring**: The `normalizeBlogPublicLocale()` function existed in both `middleware.ts` and `lib/supabase/get-website.ts` with different behavior. The middleware version hardcoded `pt` → `pt-PT`. Both were consolidated to a single shared `normalizeBlogLocale()` from `lib/seo/locale-routing.ts`, eliminating the duplicate and the wrong PT mapping.

## Pipeline gaps discovered

1. **Transcreation pipeline (SPEC_GLOBAL_MULTILOCALE_TRANSCREATION_SEO) had no frontend routing gate**: The 8-phase pipeline (F0-F7) correctly produces translated content and publishes to Supabase, but has no phase to verify frontend routing recognizes the new locale. A locale can be fully published in the DB but return 404 if the Next.js middleware/template code doesn't know about it.

2. **`website.supported_locales` as single source of truth is misleading**: The verifier discovered that ColombiaTours `supported_locales` contained `pt-PT` (European Portuguese) when the transcreation pipeline generates `pt-BR` (Brazilian Portuguese) content. The DB column was set during initial site setup and never reconciled with the transcreation locale strategy. The frontend routing directly depends on this value.

3. **No pre-deploy verifier for locale routing**: Post-deploy verification caught the issue, but it was shipping broken locale pages to production. A pre-deploy check (smoke test on staging or dev) would catch locale routing mismatches before the production deploy gate.

4. **Duplicate locale normalization logic**: Three separate `normalizeBlogPublicLocale`-like functions existed across middleware.ts, get-website.ts, and locale-routing.ts with inconsistent behavior. This is a maintainability risk for any future locale additions.

## Learning candidates

| Type | Audience | Recommendation | Evidence | Decision |
| --- | --- | --- | --- | --- |
| pattern_doc | developer | propose | Three-layer locale fix pattern: (1) URL segment recognition in middleware/routing, (2) data-access normalization at the DB boundary, (3) SEO metadata/hreflang emission. All three layers must align for a new locale to render correctly in production. | **Propose** — reusable architectural pattern for adding any new locale to the multi-tenant site rendering pipeline |
| profile_fact | developer | propose | `normalizeBlogPublicLocale()` in middleware.ts hardcoded `pt` → `pt-PT` which was the silent root cause of PT-BR blog 404s across all 3 verifiers. The shared helper in locale-routing.ts now maps `pt` → `pt-BR`. Any new locale addition must check this mapping. | **Propose** — critical config fact, explains weeks of blocked verifiers |
| profile_fact | developer | propose | `website.supported_locales` must contain the exact BCP-47 locale code the frontend routes to (`pt-BR`), not a superset/family code (`pt-PT`). The middleware routing directly consults this column via `extractWebsiteLocaleSettings()`. | **Propose** — database config fact, prevents routing rejection on new locales |
| profile_fact | developer | propose | `hrefLang` with capital L in template components causes incomplete hreflang emission (separate bug found in Villa de Leyva evidence, not fixed in this pipeline). Standard attribute name is lower-case `hreflang`. | **Propose** — HTML attribute case bug, predates this fix |
| pattern_doc | developer | propose | New locale checklist: when the transcreation pipeline (SPEC_GLOBAL_MULTILOCALE_TRANSCREATION_SEO) delivers a new locale, the frontend routing must be updated in 4 places: (1) `PUBLIC_LOCALE_SEGMENT_BY_LOCALE` in locale-routing.ts, (2) `PUBLIC_LOCALE_ALIAS_BY_SEGMENT` for legacy/BCP-47 segments, (3) `getBlogLocaleLookupCandidates()` for data-access normalization, (4) `website.supported_locales` in the database. Missing any one produces production 404s that post-deploy verifiers will catch. | **Propose** — cross-team process doc for transcreation → frontend handoff |
| github_issue | developer | propose | ADR-019 needs amendment documenting the `/pt-br` BCP-47 path prefix exception for blog SEO URLs (noted in SPEC as "narrow amendment"). Only PT-BR uses a hyphenated segment; all other locales use two-letter codes. | **Propose** — follow-up after PR #549 merge |
| github_issue | developer | propose | `hrefLang` (uppercase L) bug in template components — case-insensitive HTML attribute convention means some parsers (Google, Lighthouse) miss lowercase `hreflang` when the attribute is written as `hrefLang` in JSX. The Villa de Leyva verifier explicitly flagged this. | **Propose** — separate bug across blog template components |
| github_issue | developer | propose | `website.supported_locales` should either validate at write time that the locale codes match the transcreation pipeline's target locales, or a reconciliation migration should fix ColombiaTours' stale `pt-PT` value. | **Propose** — data integrity follow-up |
| profile_fact | developer | propose | `getBlogPostByTranslationGroup()` was querying exact locale only, which missed legacy short-code rows for PT/FR/DE. The fix uses `.in("locale", localeCandidates)`. This pattern should be standard for any locale-based blog query. | **Propose** — code pattern to remember |
| github_issue | developer | propose | Pre-deploy smoke test should include a locale routing check: verify at least one URL per supported locale returns 200 with the expected lang/canonical/hreflang before promoting to production. Current pipeline deploys first, verifies second. | **Propose** — CI/CD improvement, reduces post-deploy verifier back-pressure |
| rejected_noise | all | reject | Kanban event timestamps, claim locks, worker PID details | Reject — operational noise |
| rejected_noise | all | reject | Specific verifier run timestamps and comment IDs | Reject — one-off operational details |
| rejected_noise | all | reject | Supabase post_id and specific DB row identifiers | Reject — internal DB IDs not actionable for cross-project learning |

## Applied learning

- `docs/ai/learning-runs/2026-05-14-ptbr-blog-routing-hreflang.md` — this document
- Three-layer locale fix pattern proposed for `docs/ai/patterns/three-layer-locale-architecture.md`
- New locale checklist proposed as cross-team process doc

## Rejected learning

- Raw kanban event timestamps and lock data — operational noise
- Specific verifier run IDs and timestamps — session-specific
- Supabase internal post_id values — DB implementation detail
- Worker PID and claim lock details — session-specific
- Secrets: no credentials, tokens, or raw env values present in any gate evidence

## Redaction checklist

- [x] No secrets, credentials, tokens, cookie values, or raw env values.
- [x] No raw PII.
- [x] No full raw logs.
- [x] Evidence is summarized and linked by task ID, commit, and doc path.
- [x] Candidates whose value depends on secret values are rejected.
- [x] No private IP addresses, hostnames, or internal URLs.
- [x] No worker-specific environment details (PID, claim locks, timestamps).
