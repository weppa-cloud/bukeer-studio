---
session_id: "2026-05-14-0928-colombiatours-p0-lcp-sprint"
started_at: "2026-05-14T09:28:48-05:00"
agent: "codex"
scope: "p0-lcp-mobile-cwv-hotfix"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
domain: "colombiatours.travel"
initiator: "Sprint P0 LCP Movil ColombiaTours Sin Degradar UX"
ended_at: "2026-05-14T09:43:00-05:00"
outcome: "implemented_pending_deploy"
related_issues: []
---

# ColombiaTours P0 LCP mobile sprint

## Implementation scope

- Added Workers Static Assets header rules for `/_next/static/*`, `/tenant-assets/*`, and `/tenant-icons/*` with `public,max-age=31536000,immutable`.
- Updated custom-domain blog detail rendering to keep the same visual hero while delivering Supabase featured images through `supabaseImageUrl(..., { width: 1200, quality: 74 })`.
- Updated the shared public `BlogDetail` rendering path with the same Supabase transform after live smoke confirmed ColombiaTours uses this component for current custom-domain blog detail pages.
- Tightened blog sitemap grouping so `robots_noindex` rows and EN quality-gated rows are excluded from per-locale sitemap URLs and hreflang alternates.
- Preserved multi-tenant behavior: ColombiaTours appears only in smoke/data scope.

## Data mutations

Tenant-scoped table: `website_legacy_redirects`.

| Action | old_path | new_path | status |
|---|---|---|---:|
| updated | `/l/city-tour-bogota/` | `/actividades/city-tour-por-bogot-duraci-n-de-6-horas-grupal--c5e58907-be49-4185-9c26-fcee67322074` | 301 |
| inserted | `/activities/city-tour-6-horas-2-museos-monserrate-y-jardin-botanico` | `/actividades/city-tour-por-bogot-duraci-n-de-6-horas-grupal--c5e58907-be49-4185-9c26-fcee67322074` | 301 |

Tenant-scoped table: `website_blog_posts`.

| Action | id | slug | locale | reason |
|---|---|---|---|---|
| updated `robots_noindex=true` | `2703c454-be16-4e05-88a2-97206811cfc9` | `los-10-mejores-lugares-turisticos-de-colombia` | `en` | EN URL has Spanish title/content and must not remain in EN sitemap/indexable set during freeze |

## Validation

- Unit: `npm test -- --runTestsByPath __tests__/lib/seo/sitemap.test.ts __tests__/app/domain-blog-lcp.test.ts __tests__/cloudflare/static-headers.test.ts __tests__/middleware/public-cache.test.ts` passed, `12` tests.
- TypeScript: `npm run typecheck` passed.
- Tech validator: `npm run tech-validator:code:quick -- --no-typecheck` passed with `0` errors and `1` expected warning for untouched API routes.
- Full tech validator: `npm run tech-validator:code` passed with `0` errors and `1` expected warning for untouched API routes.
- Worker build: `npm run build:worker` completed. Supabase returned transient `520/522/525` and statement-timeout responses during static generation, but Next/OpenNext recovered and produced `.open-next/worker.js`.
- Local sitemap generation with live ColombiaTours data produced `386` EN sitemap URLs and did not include:
  - `https://colombiatours.travel/en/blog/10-de-las-mejores-islas-en-colombia`
  - `https://colombiatours.travel/en/blog/15-lugares-para-ir-de-vacaciones-en-colombia`
  - `https://colombiatours.travel/en/blog/cano-cristales-guia-de-viajes`
  - `https://colombiatours.travel/en/blog/los-10-mejores-lugares-turisticos-de-colombia`
- Live data-only redirect smoke:
  - `/l/city-tour-bogota/` now returns one `301` to the canonical activity and final `200` is `index, follow`.
  - `/activities/city-tour-6-horas-2-museos-monserrate-y-jardin-botanico` now returns one `301` to the same canonical activity.
- Live pre-deploy static asset smoke still shows `/tenant-assets/colombiatours/home-hero-cartagena-lcp.webp` as `public, max-age=0, must-revalidate`; expected to change only after code deploy with `public/_headers`.
