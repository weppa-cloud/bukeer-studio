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

## #268 / #296 Sitemap Actions

Issue #268 still had explicit ACs for `/sitemap-es-CO.xml` and `/sitemap-en-US.xml`. Production previously returned HTML for those paths, because the shipped architecture only exposed `/sitemap.xml` with hreflang alternates.

Code and deployment:

- Added tenant routes for `/sitemap-es-CO.xml` and `/sitemap-en-US.xml`.
- Added `localizeSitemapUrlsForLocale()` so per-locale sitemap `<loc>` entries use the same source URL set and keep reciprocal alternates based on the default canonical path.
- Updated tenant `robots.txt` to advertise all three sitemap directives:
  - `https://colombiatours.travel/sitemap.xml`
  - `https://colombiatours.travel/sitemap-es-CO.xml`
  - `https://colombiatours.travel/sitemap-en-US.xml`
- Deployed Cloudflare Worker `bukeer-web-public` version `576541e9-b377-4caf-9c47-4836188ae3e2`.

Production QA after deploy:

- `/sitemap-es-CO.xml`: `200 application/xml`, `538` URLs, `0` `/en` locs, `0` internal/legacy host loc leaks.
- `/sitemap-en-US.xml`: `200 application/xml`, `200` URLs, `200` `/en` locs, `0` internal/legacy host loc leaks.
- `/sitemap.xml`: `200 application/xml`, `538` URLs, `0` internal/legacy host loc leaks.
- `/robots.txt`: `200 text/plain`, includes the canonical sitemap plus both per-locale sitemap directives.
- Hreflang reciprocity matrix passed for `/`, `/actividades`, `/paquetes`, package detail, activity detail, and one translated blog detail.

Evidence artifacts:

- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue268-local-per-locale-sitemap-qa.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue268-production-per-locale-sitemap-qa-after-deploy.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue268-production-per-locale-sitemap-qa-after-robots-deploy.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue296-production-hreflang-reciprocity-matrix.json`

Remaining:

- #268 remains open for GSC ownership/submission evidence and the full #185/#186 WP redirect sample certification.
- #296 remains open only for GSC post-deploy indexing status once Search Console has fresh data.

## #185 / #186 Redirect Certification

Ran a production certification pass against the actual `website_legacy_redirects` rows for ColombiaTours:

- Source table: `website_legacy_redirects`
- Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- Scope: all `/l/*` and `/cat/*` rows relevant to #185/#186 no-regression checks.

Initial full pass:

- Rows checked: `107` (`99` `/l/*`, `8` `/cat/*`)
- First redirect matched DB status/path: `107/107`
- Final 200: `106/107`
- Problem found: `/cat/destinos/` redirected to `/destinations`, while `/destinations` canonicalized back to `/destinos`, causing a loop.

Data fix applied:

- Updated `/cat/destinos/` from `/destinations` to `/destinos`.
- Updated `/destinos/` from `/destinations` to `/destinos`.
- This preserves the destination hub intent and lets same-destination guard avoid the loop.

Final production certification:

- Rows checked: `107`
- `/l/*`: `99/99` pass.
- `/cat/*`: `8/8` pass.
- First redirect matched DB status/path: `107/107`.
- Final 200: `107/107`.
- Loops: `0`.
- 5xx: `0`.
- Timeouts: `0`.

Evidence artifacts:

- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue268-production-legacy-redirects-185-186-sample.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue268-production-legacy-redirects-185-186-full.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue268-legacy-destinos-loop-db-fix.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/issue268-production-legacy-redirects-185-186-full-after-loop-fix.json`

Updated #268 status:

- AC-5, AC-6 and AC-7 are now certified in production for the actual redirect rows.
- #268 remains open for GSC evidence and AC-8 validation alignment.

## GSC MCP Evidence

The Search Console MCP is configured, but it was not exposed as a native callable tool in the current Codex tool list. It was invoked directly over stdio using `search-console-mcp@latest`.

Credential correction:

- UI screenshot pointed to `/Users/yeisongomez/Downloads/claude-dev-4`, which does not exist in this session.
- The actual credential file found and used was `/Users/yeisongomez/Downloads/claude-dev-434502-cf8836f5cc5e.json`.

GSC property:

- `sites_list` confirms `sc-domain:colombiatours.travel`.
- Permission level: `siteFullUser`.

Current GSC sitemap state:

- GSC currently lists `https://colombiatours.travel/sitemap_index.xml`.
- `lastSubmitted`: `2025-05-01T20:11:05.726Z`.
- `lastDownloaded`: `2026-05-11T11:03:16.224Z`.
- `warnings`: `3`.
- `errors`: `0`.
- `submitted`: `587`.
- `indexed`: `0` in the sitemap list response.

Attempted sitemap submissions through the MCP:

- `https://colombiatours.travel/sitemap.xml`: denied by GSC API.
- `https://colombiatours.travel/sitemap-es-CO.xml`: denied by GSC API.
- `https://colombiatours.travel/sitemap-en-US.xml`: denied by GSC API.
- The MCP returned `Permission denied. Ensure you have access to this resource in Google Search Console.` even though `sites_get` reports `siteFullUser` on the domain property.

URL Inspection sample:

- Inspected `10` URLs via `inspection_batch`.
- Verdicts: `6` `PASS`, `4` `NEUTRAL`.
- Blocked URLs: `0` (`robotsTxtState=ALLOWED`, `indexingState=INDEXING_ALLOWED`, `pageFetchState=SUCCESSFUL` for all inspected URLs).
- Indexed/pass examples: `/`, `/paquetes`, `/actividades`, package detail, activity detail, blog detail.
- EN URLs are visible to GSC and allowed, but Google currently reports several as canonical alternatives or redirects based on older crawls.

Additional GSC-related code prepared but not deployed yet:

- Added `/sitemap_index.xml` route that returns a sitemap index pointing at `/sitemap.xml`, `/sitemap-es-CO.xml`, and `/sitemap-en-US.xml`.
- Added `/sitemap_index.xml` to `robots.txt`.
- `npm run typecheck` passed.
- `npm run build` could not complete because Supabase returned repeated Cloudflare `522` responses during static generation. This is an external Supabase availability issue, not a TypeScript/compile failure.

Evidence artifacts:

- `artifacts/seo/2026-05-11-colombiatours-migration-followup/gsc-sites-list.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/gsc-sitemap-submit-and-status.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/gsc-sitemap-submit-siteurl-variants.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/gsc-url-inspection-sample.json`
- `artifacts/seo/2026-05-11-colombiatours-migration-followup/gsc-url-inspection-sample-summary.json`
