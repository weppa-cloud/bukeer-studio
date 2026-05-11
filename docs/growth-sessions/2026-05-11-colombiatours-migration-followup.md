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

Result:

- `12/12` enabled home sections now have `content_translations.en-US`.
- This addresses the homepage section overlay gap noted in #273.

Remaining for #273:

- Activity/entity EN coverage remains incomplete.
- Visual QA still needs a browser pass for `/en`, `/en/paquetes`, `/en/actividades`, planner list/detail, and priority product pages.
- Package/planner overlay data should be rechecked after this section pass before closure.

## #359 Actions

Observed production behavior before code change:

- `https://en.colombiatours.travel/` redirects to `https://colombiatours.travel/en`.
- Some high-value legacy paths, including `/los-10-mejores-lugares-turisticos-de-colombia/` and `/los-10-mejores-destinos-para-conocer-colombia/`, first redirected to `/en/<slug>` and then lost the EN prefix through a second redirect to `/blog/<slug>`.

Code change:

- Added explicit high-value mappings in `middleware.ts` for:
  - `/los-10-mejores-lugares-turisticos-de-colombia`
  - `/los-10-mejores-destinos-para-conocer-colombia`
  - `/isla-mucura-un-tesoro-del-caribe-colombiano`
  - `/palabras-colombianas`
- Existing `/tipos-de-mamas` mapping remains pointed to `/en/blog` because it is off-topic for travel intent.

Local middleware validation via session pool:

- Claimed slot `s2`, port `3002`; released after validation.
- `Host: en.colombiatours.travel` redirects now resolve as:
  - `/` -> `/en`
  - `/los-10-mejores-lugares-turisticos-de-colombia/` -> `/en/blog/los-10-mejores-lugares-turisticos-de-colombia`
  - `/los-10-mejores-destinos-para-conocer-colombia/` -> `/en/blog/los-10-mejores-destinos-para-conocer-colombia`
  - `/isla-mucura-un-tesoro-del-caribe-colombiano/` -> `/en/blog/isla-mucura-un-tesoro-del-caribe-colombiano`
  - `/palabras-colombianas/` -> `/en/blog/palabras-colombianas`
  - `/tipos-de-mamas/` -> `/en/blog`

Production deployment is still required before #359 can close.

## Validation

- `npm run typecheck`: PASS.
- `git diff --check` for touched files: pending final run.
- Public GET body for `/en` timed out from this local runtime, while HEAD/redirect checks responded; render validation should be completed with Browser/Playwright after deployment or through an authenticated preview route.

## Decisions

- Keep #273 open until activity/entity data and visual QA are complete.
- Keep #359 open until the middleware redirect patch is deployed and production single-hop/page-level redirects are verified.
