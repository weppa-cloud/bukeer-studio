# SPEC — ColombiaTours public routing recovery (Week 1)

Status: Draft for PLAN validation
Owner role: T0_SPECIFIER
Tenant/site: ColombiaTours (`https://colombiatours.travel`)
Repository/worktree: `/opt/data/home/worktrees/colombiatours-public-routing-recovery`
Branch: `feat/colombiatours-public-routing-recovery`
Created: 2026-05-15T12:10:33Z
Kanban task: `t_495b2404`

## 1. Business goal

Recover ColombiaTours public website quality from approximately 4/10 to >= 6.5/10 in Week 1 by eliminating P0 public routing and navigation failures on critical public routes, without introducing tenant-specific hacks or breaking the multi-tenant Bukeer Studio renderer.

Week 1 targets:

- P0 open routing bugs: 0.
- Unexpected 500s on critical routes: 0.
- Legacy/internal public links (`/site/<subdomain>`, wrong host, wrong locale prefix) in rendered critical pages: 0.
- All critical routes emit deterministic HTTP status, canonical URL, `hreflang` alternates where applicable, and JSON-LD/Open Graph behavior consistent with existing platform policy.

## 2. Architectural constraints and ADR alignment

This recovery must comply with the existing platform architecture:

- [[ADR-007]] Edge-first delivery on Cloudflare Workers:
  - Keep routing/middleware code edge-compatible.
  - Do not add Node-only APIs, persistent filesystem dependencies, or heavy per-request work in middleware.
  - Preserve ISR/cache behavior (`revalidate = 300` or explicit cache strategy on public routes).
- [[ADR-009]] Multi-tenant subdomain routing:
  - Middleware remains the public host resolver and rewrites to internal `/site/[subdomain]...` or `/domain/[host]...` routes.
  - Custom domains and `*.bukeer.com` subdomains must share behavior except where host-specific security gates intentionally differ.
  - Do not special-case ColombiaTours in code unless the data model already expresses a ColombiaTours-specific content/configuration value.
- [[ADR-011]] Middleware in-memory cache:
  - Preserve bounded 5-minute cache semantics for website, custom domain, product, and redirect lookups.
  - New middleware checks must use stable cache keys and must not add unbounded path/user-specific entries.
- [[ADR-013]] Tech Validator quality gate:
  - Plan must be reviewed in PLAN mode before implementation.
  - Implementation must pass CODE validation before merge.
- [[ADR-019]] Multi-locale URL routing:
  - Default locale has no path prefix.
  - Non-default locales use first path segment language prefix (`/en`, `/pt`, `/fr`, `/de`).
  - Middleware strips locale prefix before internal route rewrite and preserves browser URL.
  - Category segment localization must use the existing canonical segment machinery, not duplicate app routes.
- [[ADR-020]] hreflang emission policy:
  - Emit `defaultLocale` + translated/published locale alternates only.
  - `x-default` must point to the default-locale URL for the same page.
  - Page-level alternates and sitemap alternates must remain consistent.

## 3. Current incident hypothesis

Initial inspection indicates the public routing stack is structurally present but fragile around the following seams:

1. Public request routing depends on `middleware.ts` resolving host/domain, locale prefix, legacy redirects, product slug redirects, and internal rewrite order correctly.
2. Dedicated route files exist for home, `/paquetes`, `/actividades`, `/blog`, and `/buscar`; `/hoteles` and `/contacto` are not dedicated app route files and must resolve through catch-all behavior or page data.
3. The catch-all route already contains handling for:
   - activity/package/hotel listings,
   - destination listing/detail,
   - product detail pages under category segments,
   - static/custom DB pages such as contact pages,
   - non-default locale fallbacks/redirects for translated page slugs.
4. Navigation components and section components may generate a mix of public custom-domain URLs, internal `/site/<subdomain>` URLs, anchor links, and category links. Internal links are likely a primary source of quality loss if they leak to public pages.
5. Locale/category canonicalization can produce subtle mismatches: `/en/packages` vs `/en/paquetes`, `/pt/paquetes` vs localized PT segments, default-locale no-prefix canonical, and old Spanish legacy paths.
6. Live smoke evidence at spec time shows the listed critical routes currently return 200 after redirects, but `/contacto` resolves to `/contact` after redirect, so acceptance must explicitly define whether `/contacto` should remain a Spanish canonical page, a redirect alias, or a translated static page.

## 4. Evidence gathered during specification

Static code inspection:

- `middleware.ts`:
  - Resolves Bukeer production domains and custom domains.
  - Resolves locale via `resolveLocaleFromPublicPath(...)`.
  - Checks legacy redirects except SEO metadata/legal paths.
  - Checks missing blog not-found behavior.
  - Runs product slug redirect checks before locale-aware tenant rewrite.
  - Rewrites subdomain traffic to `/site/${subdomain}${canonicalPathname}` and custom domains to `/domain/${host}${pathname}`.
- `lib/seo/locale-routing.ts`:
  - Provides locale normalization, language-prefix handling, public localized path construction, category segment translation, and OG locale helpers.
- `app/site/[subdomain]/page.tsx`:
  - Homepage route with locale-aware metadata and ISR.
- `app/site/[subdomain]/paquetes/page.tsx`, `actividades/page.tsx`, `blog/page.tsx`, `buscar/page.tsx`:
  - Dedicated listing/search routes with locale-aware metadata, schema/alternate generation as applicable, and ISR where appropriate.
- `app/site/[subdomain]/[...slug]/page.tsx`:
  - Catch-all route handles `/hoteles`, `/hoteles/[slug]`, `/destinos`, `/destinos/[slug]`, product detail routes, and regular DB pages.
- No dedicated route file was found for `app/site/[subdomain]/hoteles` or `app/site/[subdomain]/contacto`.

Live smoke probe (2026-05-15T12:10Z, `curl -L -o /dev/null`) produced:

| Route | Result |
| --- | --- |
| `/` | 200 `https://colombiatours.travel/` |
| `/en` | 200 `https://colombiatours.travel/en` |
| `/pt` | 200 `https://colombiatours.travel/pt` |
| `/fr` | 200 `https://colombiatours.travel/fr` |
| `/de` | 200 `https://colombiatours.travel/de` |
| `/paquetes` | 200 `https://colombiatours.travel/paquetes` |
| `/actividades` | 200 `https://colombiatours.travel/actividades` |
| `/hoteles` | 200 `https://colombiatours.travel/hoteles` |
| `/blog` | 200 `https://colombiatours.travel/blog` |
| `/planners` | 200 `https://colombiatours.travel/planners` |
| `/buscar` | 200 `https://colombiatours.travel/buscar` |
| `/contacto` | 200 final URL `https://colombiatours.travel/contact` |

The live 200s do not prove page quality; Week 1 validation must inspect rendered links, metadata, canonical/hreflang, JSON-LD, and representative detail routes.

## 5. Scope

### In scope

- Public routing for ColombiaTours on custom domain `colombiatours.travel` and equivalent internal tenant rendering.
- Locale-aware routing for default Spanish and non-default `/en`, `/pt`, `/fr`, `/de` entry points.
- Critical public route smoke matrix:
  - `/`
  - `/en`
  - `/pt`
  - `/fr`
  - `/de`
  - `/paquetes`
  - `/actividades`
  - `/hoteles`
  - `/blog`
  - `/planners`
  - `/buscar`
  - `/contacto`
- Representative detail routes for each public category when data exists:
  - `/paquetes/<slug>`
  - `/actividades/<slug>`
  - `/hoteles/<slug>`
  - `/destinos/<slug>`
  - `/blog/<slug>`
- Public navigation/header/footer links and high-impact section links on critical pages.
- Canonical, `hreflang`, Open Graph, Twitter, and JSON-LD behavior on critical pages.
- Legacy redirect correctness for Spanish aliases and WordPress-era URLs where DB redirects exist.
- Test and validation automation necessary to prove the recovery.

### Out of scope for Week 1

- Content transcreation quality improvements beyond route availability and metadata consistency.
- New visual redesigns or component restyling unless required to remove broken links.
- Paid-media campaign setup, analytics goal provisioning, or manual deploys.
- Database schema migrations unless a routing bug cannot be fixed safely in code/config; any migration must be cross-repo/governance reviewed.
- Manual production deployment. Merge to the configured deployment branch must trigger GitHub Actions.

## 6. Route acceptance matrix

Each gate must return PASS/FAIL/WARN with evidence.

| Route | Expected status | Canonical expectation | Locale expectation | Rendering expectation | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` | 200 | `https://colombiatours.travel/` | default locale, no prefix | Home renders public content; no internal links | SEO schemas generated from homepage helpers. |
| `/en` | 200 | `https://colombiatours.travel/en` or normalized trailing-slash equivalent | `en-*` resolved from supported locales | English/fallback content acceptable only if locale policy allows it | Must not redirect to `/site/...`. |
| `/pt` | 200 | `https://colombiatours.travel/pt` | `pt-*` resolved from supported locales | PT content/fallback policy explicit | Related prior work around PT-BR must not regress. |
| `/fr` | 200 | `https://colombiatours.travel/fr` | `fr-*` resolved from supported locales | FR content/fallback policy explicit | Validate hreflang emitted only where translated content exists. |
| `/de` | 200 | `https://colombiatours.travel/de` | `de-*` resolved from supported locales | DE content/fallback policy explicit | Validate route is not a soft 404. |
| `/paquetes` | 200 | `https://colombiatours.travel/paquetes` | default locale | Packages listing renders package products | Dedicated route and catch-all behavior must agree. |
| `/en/packages` | 200 | `https://colombiatours.travel/en/packages` | English | Packages listing renders; browser URL stays English segment | Category segment localization per ADR-019 amendment. |
| `/actividades` | 200 | `https://colombiatours.travel/actividades` | default locale | Activities listing renders filters and products | Query filters preserve behavior. |
| `/en/activities` | 200 | `https://colombiatours.travel/en/activities` | English | Activities listing renders | No 301 to Spanish segment. |
| `/hoteles` | 200 | `https://colombiatours.travel/hoteles` | default locale | Hotels list renders via `hoteles-list` TemplateSlot or acceptable generic fallback | No dedicated app route; catch-all owns it. |
| `/en/hotels` | 200 | `https://colombiatours.travel/en/hotels` | English | Hotels list/detail links use public custom-domain paths | Confirm `CATEGORY_CANONICAL_SEGMENT` covers hotels. |
| `/blog` | 200 | `https://colombiatours.travel/blog` | default locale | Blog list renders posts/categories | Non-default locales filter translated rows per existing behavior. |
| `/planners` | 200 | `https://colombiatours.travel/planners` | default locale or static page locale | Static/custom page renders | Confirm DB page exists and is published. |
| `/buscar` | 200 | `https://colombiatours.travel/buscar` | default locale | Search UI renders | Must remain `robots: noindex, follow`. |
| `/contacto` | 200 or intentional 301/308 | Decision required: Spanish canonical `/contacto` OR redirect alias to `/contact` | default locale | Contact page renders and nav target is stable | Current live behavior redirects to `/contact`; implementer must resolve as platform/content decision before changing. |

Representative detail acceptance:

| Route class | Expected behavior |
| --- | --- |
| Package detail | `/paquetes/<slug>` and `/en/packages/<slug>` resolve when product exists; missing products return true 404, not soft-404 200. |
| Activity detail | `/actividades/<slug>` and `/en/activities/<slug>` resolve when product exists; activity circuit/review enrichment failures cannot 500 the page. |
| Hotel detail | `/hoteles/<slug>` and `/en/hotels/<slug>` resolve when product exists; hotel TemplateSlot receives `hotel-detail` payload. |
| Destination detail | `/destinos/<slug>` and `/en/destinations/<slug>` resolve when destination exists; SERP enrichment timeout remains bounded. |
| Blog detail | `/blog/<slug>` locale behavior matches blog listing policy; missing translated non-default row should follow existing fallback/noindex/404 policy, not 500. |

## 7. Functional requirements

### FR1 — Public host and custom-domain routing

- Requests to `colombiatours.travel` and any configured canonical custom host must resolve to the ColombiaTours website record.
- Requests must not expose internal `/domain/<host>` or `/site/<subdomain>` paths in browser-visible navigation.
- Custom-domain security checks in `app/domain/[host]/[[...slug]]/page.tsx` must continue verifying that the host maps to the website record.

### FR2 — Locale prefix and category segment routing

- Default-locale Spanish paths must remain unprefixed.
- Non-default locale paths must use language prefixes.
- English category segments (`packages`, `activities`, `hotels`, `destinations`) must be browser-visible and internally rewritten to the canonical Spanish/catch-all route when applicable.
- Spanish category segments under `/en/...` should either be normalized by existing policy or explicitly accepted only where already canonicalized; no duplicate route files should be added for English segments.

### FR3 — Listing route consistency

- Dedicated listing routes (`/paquetes`, `/actividades`, `/blog`, `/buscar`) and catch-all listing handlers must not diverge in metadata, TemplateSlot payload, or product-fetch locale behavior.
- `/hoteles` must be explicitly validated because it only exists via catch-all logic.
- If the generic fallback for `/hoteles` uses `PackagesListingPage`, implementation must decide whether this is acceptable for Week 1 or whether a dedicated generic `HotelsListingPage` is needed; editorial-v1 overlay must not regress.

### FR4 — Static/custom page routing

- DB-backed static/custom pages such as `/planners` and contact pages must be resolved through `getPageBySlug(...)` and render only when published.
- Non-default locale + translated page slugs must redirect to the localized slug through existing `translation_group_id` behavior.
- The `/contacto` versus `/contact` canonical decision must be captured as either:
  - data-only redirect/content fix, or
  - code-level alias handling if the platform requires Spanish public category/page aliases.

### FR5 — Detail route correctness

- Product category slug mapping must include Spanish and English aliases for packages, activities, hotels, transfers, and destinations.
- Existing product slug redirect behavior must preserve non-default locale prefixes only for non-default locale URLs and must not prefix default locale URLs.
- Missing detail entities must call `notFound()` and produce a 404 response, not a rendered not-found message with HTTP 200.

### FR6 — SEO metadata and structured data

- Each critical route must produce stable canonical and alternates based on `resolvePublicMetadataLocale(...)`, `buildLocaleAwareAlternateLanguages(...)`, and ADR-020 policy.
- Search (`/buscar`) must remain `robots: { index: false, follow: true }`.
- Listing/detail JSON-LD must use the resolved locale in `inLanguage` and must not emit internal URLs.
- Open Graph and Twitter metadata must use tenant/custom-domain base URLs and valid OG locale strings.

### FR7 — Public link hygiene

- Header, footer, section CTA, listing cards, detail related cards, schema URLs, and language switcher links must not emit:
  - `/site/colombiatours...` on custom-domain public pages,
  - localhost or preview-token URLs in production-rendered pages,
  - wrong-host URLs,
  - double locale prefixes (`/en/en/...`),
  - default-locale prefixes if default locale is configured as Spanish.
- Anchor links such as `/#hotels` are acceptable only when the target section exists on the destination page.

## 8. Likely implementation files

Primary routing/locale files:

- `middleware.ts`
- `lib/seo/locale-routing.ts`
- `lib/seo/hreflang.ts`
- `lib/seo/sitemap.ts`
- `app/site/[subdomain]/page.tsx`
- `app/site/[subdomain]/paquetes/page.tsx`
- `app/site/[subdomain]/actividades/page.tsx`
- `app/site/[subdomain]/blog/page.tsx`
- `app/site/[subdomain]/buscar/page.tsx`
- `app/site/[subdomain]/[...slug]/page.tsx`
- `app/domain/[host]/[[...slug]]/page.tsx`

Primary navigation/link files:

- `components/site/site-header.tsx`
- `components/site/site-footer.tsx`
- `components/site/language-switcher.tsx`
- `lib/site/base-path.ts` or equivalent base-path utilities
- `components/site/sections/hotels-section.tsx`
- Editorial-v1 theme pages and cards under `components/site/themes/editorial-v1/**`

Data access files:

- `lib/supabase/get-website.ts` or equivalent website/domain lookup helpers
- `lib/supabase/get-pages.ts`
- product/category query helpers used by listing/detail pages
- redirect lookup helpers consumed by middleware

Tests/validation files to add or extend:

- Route smoke script or Playwright spec for ColombiaTours critical routes.
- Metadata/hreflang unit tests around `lib/seo/locale-routing.ts` and `lib/seo/hreflang.ts`.
- Middleware tests for host + locale + category segment combinations if an existing harness exists.
- Link-hygiene test that parses rendered HTML for internal path leakage.

## 9. DB/data impact

Expected data impact: low; prefer code/config and validation fixes before migrations.

Potential data-only remediation:

- Verify `websites.custom_domain` / host canonicalization for ColombiaTours.
- Verify `websites.default_locale` and `websites.supported_locales` contain intended locales.
- Verify published DB pages for `/planners`, `/contact` and/or `/contacto`.
- Verify legacy redirects for WordPress-era and Spanish alias URLs.
- Verify product/page translation groups for non-default locale slugs.

Potential migration impact only if unavoidable:

- Add or adjust redirect records via governed migration/seed if the current DB lacks aliases required by the public contract.
- No schema change is expected for Week 1 routing recovery.
- Any shared Supabase migration must follow the documented cross-repo migration governance and not be applied manually from Studio without Flutter/ops coordination.

No secrets, tokens, API keys, passwords, or connection strings may be logged in evidence. Redact as `[REDACTED]` if encountered.

## 10. Validation plan

### Gate A — Static route contract inspection

PASS criteria:

- `middleware.ts` route order remains documented and tested: host/domain -> locale -> legacy redirect -> missing blog -> slug redirect -> tenant rewrite.
- Category mapping includes Spanish and English aliases for the route classes in scope.
- Public route files changed in implementation declare cache strategy (`revalidate`, `dynamic`, `fetchCache`, or equivalent accepted by tech-validator policy).

Evidence:

- File/line references in implementation handoff.
- Unit test results where available.

### Gate B — Live/local critical route smoke

Use session pool for local app/browser validation; never raw port 3000 from agents.

Recommended local pattern:

```bash
npm run session:list
eval "$(bash scripts/session-acquire.sh)"
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session
# run route smoke against http://localhost:$PORT with Host/header strategy if supported
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

Production/non-mutating smoke can use `curl` when needed:

```bash
for path in / /en /pt /fr /de /paquetes /actividades /hoteles /blog /planners /buscar /contacto; do
  curl -sS -L -o /dev/null -w "$path %{http_code} %{url_effective}\n" "https://colombiatours.travel$path"
done
```

PASS criteria:

- All critical routes return expected status.
- No unexpected 500.
- 404 only where explicitly expected for nonexistent detail samples.
- Redirects are finite and intentional.

### Gate C — Rendered HTML link hygiene

For each critical route and representative detail route, parse rendered HTML and fail if any href/src/canonical/schema URL contains:

- `/site/colombiatours`
- `/domain/`
- `localhost`
- preview-only tokens
- duplicate locale prefixes
- non-canonical wrong host

PASS criteria:

- 0 internal public link leaks on the critical matrix.
- WARN allowed for admin/dashboard links only if explicitly hidden from public navigation or `rel="nofollow"` where appropriate.

### Gate D — SEO metadata/hreflang/JSON-LD

For each indexable critical route:

- Read `<link rel="canonical">`.
- Read `<link rel="alternate" hreflang="...">` set.
- Validate `x-default` points to the default-locale canonical for the same page.
- Validate no alternates to untranslated pages if ADR-020 says they should be omitted.
- Extract JSON-LD and assert URLs are public custom-domain URLs.
- Assert `inLanguage` matches resolved locale.

Special case:

- `/buscar` must be noindex/follow.

### Gate E — Detail-route sampling

Discover at least one published slug each for package, activity, hotel, destination, and blog, using non-secret DB-safe tooling or existing fixtures.

PASS criteria:

- Existing slugs return 200 and render expected template/page title.
- Nonexistent slug under each category returns 404.
- Product/category pages do not soft-404 with HTTP 200.

### Gate F — Automated quality gates

Before implementation handoff:

- `npm run tech-validator:code:quick` at minimum.
- `npm run lint` and `npm run build` unless explicitly blocked by environment.
- Route-focused Playwright/session-pool tests for changed routing/navigation behavior.

Every gate result must be reported as PASS/FAIL/WARN with evidence artifact paths or command output snippets.

## 11. Rollout plan

1. PLAN review:
   - Tech-validator reviews this spec in PLAN mode before implementation.
2. Implementation:
   - Next.js developer/debugger fixes routing/link issues only after PLAN approval.
   - Keep changes generic and multi-tenant.
3. Local validation:
   - Use session pool and route-focused tests.
   - Run metadata/link-hygiene checks.
4. Code validation:
   - Run tech-validator CODE gate and build/lint/typecheck as required.
5. PR:
   - Open PR from `feat/colombiatours-public-routing-recovery` to the configured base branch.
   - Include matrix evidence and rollback notes.
6. Deploy:
   - Do not deploy manually. Merge triggers GitHub Actions deployment.
7. Post-deploy smoke:
   - Run production non-mutating smoke against the critical matrix.
   - Compare status, final URL, canonical, hreflang, and internal-link hygiene.

## 12. Rollback plan

Rollback levels:

1. Data-only rollback:
   - Revert/disable problematic redirect records or page publication changes if recovery used DB content/redirect edits.
2. Code rollback:
   - Revert PR or use GitHub revert commit if routing regression is introduced.
3. Cloudflare Worker rollback:
   - Use existing operational rollback (`wrangler rollback`) only by authorized deployment operator; agents must not deploy/rollback manually.
4. Cache recovery:
   - Revalidate affected paths using existing revalidation endpoint/runbook after authorized rollback.

Rollback trigger examples:

- Any critical route returns unexpected 500 after deploy.
- Public navigation leaks `/site/colombiatours` on production.
- `hreflang` points to non-existent or untranslated critical pages.
- Product/detail routes soft-404 with HTTP 200.
- Custom domain resolves to wrong tenant or wrong host canonical.

## 13. Open decisions for validator/implementer

1. `/contacto` canonical decision:
   - Current live behavior follows to `/contact` with 200.
   - Decide whether Spanish `/contacto` should remain an accepted redirect alias or become the canonical default-locale contact URL.
   - Prefer data/redirect decision unless platform policy requires code-level aliasing.
2. `/hoteles` generic fallback:
   - Catch-all currently uses `PackagesListingPage` as a generic fallback body while editorial-v1 can override via `hoteles-list` TemplateSlot.
   - Decide whether this is acceptable for Week 1 or must be replaced by a dedicated generic hotels listing component.
3. Non-default locale fallback/noindex policy for untranslated landing pages:
   - Ensure implementation follows ADR-020 and existing transcreation policy rather than inventing page-specific behavior.

## 14. Definition of done

- This spec is reviewed by tech-validator in PLAN mode.
- Implementation plan from validator/developer names exact tasks and changed files.
- All critical routes in the acceptance matrix have PASS/FAIL/WARN evidence.
- Unexpected 500 count on critical routes is 0.
- Public internal-link leakage count is 0.
- Canonical/hreflang/JSON-LD behavior is validated for all indexable critical routes.
- `/buscar` remains noindex/follow.
- Representative existing detail pages return 200 and nonexistent detail pages return 404.
- CODE gate passes or any failures are explicitly documented with owner and blocker.
- Rollback path is documented in PR/handoff.
