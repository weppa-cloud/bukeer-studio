# ColombiaTours Migration Follow-up — #273 and #359

Date: 2026-05-11
Website: `colombiatours.travel`
Website id: `894545b7-73ca-4dae-b76a-da5b6a3f8441`

## Scope

Follow-up on the prior ColombiaTours migration issues, specifically:

- #273 Section & Entity Translation Layer.
- #359 Legacy `en.colombiatours.travel` consolidation into `/en`.

## MCP / Provider Availability

- Supabase: available through service-role environment.
- OpenRouter: available, not used for paid generation in this pass.
- DataForSEO: credentials available, not used.
- GA4/GSC direct MCP: not available in this runtime; #359 used persisted GSC/DataForSEO evidence already committed in repo plus live/local HTTP checks.

## #273 Actions

Production data before this pass showed 12 enabled `website_sections` rows and no `en-US` section overlays.

Mutation applied:

- Updated `website_sections.content_translations` for all 12 enabled ColombiaTours home sections.
- Added an `en-US` overlay only; Spanish base `content` was not changed.
- Sections covered: `hero`, `trust_bar`, `destinations`, `packages`, `explore_map`, `stats`, `about`, `planners`, `testimonials`, `blog`, `faq`, `cta`.

Evidence artifacts:

- `artifacts/seo/2026-05-11-colombiatours-migration-followup/section-translations-before.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/section-translations-after.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/section-translations-summary.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue273-translation-coverage-snapshot.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue273-production-route-content-qa.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue273-local-en-visible-qa-after-code-fix.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue273-production-en-route-qa-after-deploy.json`

Result:

- `12/12` enabled home sections now have `content_translations.en-US`.
- This addresses the homepage section overlay gap noted in #273.
- Active package kits have EN coverage for the active commercial set (`10/10` active translated; the `4` missing rows are draft/test fixtures).
- Website planner candidates have `4/4` EN translation overlays.
- Activity SEO overlays exist for `20` activity product pages, but `activities.translations.en-US` remains `0/702` active activity rows by design; this table is ADR-025 truth data and should not be bulk-mutated from Website Studio without an approved ownership path.

Remaining for #273:

- Activity/entity EN display-copy coverage remains incomplete (`0/702` active activity truth rows have `translations.en-US`; `20` activity SEO overlays exist in `website_product_pages`).
- Cache-busted production route QA after Worker `56ce28f8-2bd7-498b-a890-0e6744d2e129` shows corrected EN title/H1/canonical for `/en/packages`, `/en/activities`, `/en/planners`, and `/en/blog`.
- The remaining #273 blocker is deeper entity/content coverage, especially activity display-copy ownership and Spanish snippets/categories inside migrated blog/product content, not listing-page metadata.
- Manual ISR revalidation attempted with the local secret returned `401`; route QA used cache-busted URLs for immediate validation.

Additional code fix deployed:

- Localized dedicated listing metadata for `/paquetes` and `/actividades` when rendered as `/en/packages` and `/en/activities`.
- Passed `resolvedLocale` into the planners listing template so `/en/planners` renders EN copy.
- Added missing EN editorial-v1 copy keys for packages, activities, planners, blog, breadcrumbs, and destination labels.
- Deployed Cloudflare Worker `bukeer-web-public` version `56ce28f8-2bd7-498b-a890-0e6744d2e129`.

## #359 Actions

Observed production behavior before code change:

- `https://en.colombiatours.travel/` redirects to `https://colombiatours.travel/en`.
- Some high-value legacy paths, including `/los-10-mejores-lugares-turisticos-de-colombia/` and `/los-10-mejores-destinos-para-conocer-colombia/`, first redirected to `/en/<slug>` and then lost the EN prefix through a second redirect to `/blog/<slug>`.

Data and code change:

- Reused the existing `website_legacy_redirects` table instead of hardcoding a second redirect map.
- Inserted 18 host-aware legacy redirect rows for `en.colombiatours.travel/<path>`.
- Refactored `middleware.ts` so the `en.colombiatours.travel` consolidation reads the existing legacy redirect surface, then falls back to `/en/<path>` when no row exists.
- Existing `/tipos-de-mamas` redirect remains pointed to `/en/blog` because it is off-topic for travel intent.

Local middleware validation via session pool:

- Claimed slot `s2`, port `3002`; released after validation.
- `Host: en.colombiatours.travel` redirects now resolve as:
  - `/` -> `/en`
  - `/los-10-mejores-lugares-turisticos-de-colombia/` -> `/en/blog/los-10-mejores-lugares-turisticos-de-colombia`
  - `/los-10-mejores-destinos-para-conocer-colombia/` -> `/en/blog/los-10-mejores-destinos-para-conocer-colombia`
  - `/isla-mucura-un-tesoro-del-caribe-colombiano/` -> `/en/blog/isla-mucura-un-tesoro-del-caribe-colombiano`
  - `/palabras-colombianas/` -> `/en/blog/palabras-colombianas`
  - `/tipos-de-mamas/` -> `/en/blog`

Production deployment:

- Deployed Cloudflare Worker `bukeer-web-public` version `f82b8700-a52f-4061-9b80-2496b83f146c`.
- Production trigger includes `en.colombiatours.travel/*`.
- Production redirect matrix passed `7/7` checked paths with single-hop `301` to the expected canonical URL and final `200`.
- Cache-busted production HTML checks found `0` remaining `en.colombiatours.travel` links in the three inspected EN article bodies after content cleanup.

Evidence artifacts:

- `artifacts/seo/2026-05-11-colombiatours-migration-followup/host-aware-legacy-redirects-summary.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/production-redirect-matrix.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/production-final-url-canonical-hreflang.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/legacy-host-content-link-cleanup.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/legacy-host-content-link-canonicalization.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/legacy-host-content-link-malformed-fix.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/production-content-legacy-host-cachebusted.json`

## Validation

- `npm run typecheck`: PASS.
- `git diff --check` for touched files: PASS before deployment.
- Local session-pool redirect validation: PASS on `s2:3002`.
- Production redirect matrix: PASS after deployment.
- Production final URL canonical/hreflang spot check: PASS for canonical host and status; cache-busted content check confirmed no inspected legacy-host links remain after cleanup.
- Manual ISR revalidation attempted with local secret returned `401`; cache-busted checks were used for immediate content verification, and normal ISR TTL remains `300s`.

## Decisions

- Keep #273 open until activity/entity data and visual QA are complete.
- #359 can close after certification comment because middleware deploy, host-aware DB redirects, production redirect matrix, and inspected body-link cleanup are complete.
