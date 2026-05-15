# SPEC: Public Template Systemic Fix v1 — PT-BR, hreflang, custom pages, JSON-LD, and localized chrome

Status: Draft for PLAN validation
Owner role: Specifier
Pipeline: public-template-systemic-fix-v1
Kanban task: `t_fcd5f6d0`
Repo/worktree: `/opt/data/home/worktrees/bukeer-studio-public-template-systemic-fix`
Target branch: `fix/public-template-systemic-fix`
Base branch: `origin/dev`
Created: 2026-05-15T20:16:46Z
Tenant/site: ColombiaTours (`https://colombiatours.travel`)
Mutation policy: repo/spec only. Production checks are read-only `curl`/HTML inspection. No Supabase writes, no content publishing, no deploy.

## 1. Goal

Close the systemic public-template bugs that make ColombiaTours localized pages fail verification even when transcreated Supabase content exists.

This is frontend/template/routing work, not another content-transcreation batch. The implementation must make the public renderer correctly resolve localized routes, emit reciprocal SEO metadata, use DB/visible authors consistently in JSON-LD, include FAQ schema when FAQ data exists, and remove Spanish-only template labels from non-Spanish public pages.

## 2. Architectural references

- [[ADR-001]] Server-first rendering: public HTML, metadata, canonical URLs, robots and JSON-LD are generated server-side and must be correct on first crawl.
- [[ADR-007]] Edge-first delivery: middleware/routing fixes must remain Cloudflare Worker compatible and avoid Node-only APIs or heavy per-request work.
- [[ADR-009]] Multi-tenant subdomain routing: custom-domain and `*.bukeer.com` rendering must share tenant-safe behavior; do not add ColombiaTours-only hardcoded route hacks.
- [[ADR-011]] Middleware cache: route and locale lookups must preserve bounded cache keys and avoid unbounded path/user-specific cache growth.
- [[ADR-013]] Tech Validator quality gate: this SPEC requires PLAN validation before implementation and CODE validation before merge.
- [[ADR-019]] Multi-locale URL routing: path-prefix routing is the accepted strategy; `pt-BR` requires the regional public segment `/pt-br`, while default Spanish remains unprefixed.
- [[ADR-020]] hreflang policy: emit only default locale + translated/published locales; reciprocal alternates and `x-default` are mandatory.
- [[ADR-021]] Translation Memory + AI Transcreation Pipeline: do not mutate canonical content or publish/edit Supabase rows as part of this template fix; consume published/applied localized rows read-only.
- [[ADR-003]] Contract-first validation: add/extend typed seams for route/schema outputs rather than accepting ad hoc shape drift.

## 3. Read-only evidence captured during specification

Read-only production probes on 2026-05-15T20:16Z confirm the current production symptoms. These are not content writes.

Commands used:

```bash
curl -sSIL https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama
curl -sSL  https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama
curl -sSIL https://colombiatours.travel/pt/blog/viajar-a-colombia-desde-panama
curl -sSL  https://colombiatours.travel/en/blog/viajar-a-colombia-desde-panama
curl -sSL  https://colombiatours.travel/fr/blog/viajar-a-colombia-desde-panama
curl -sSL  https://colombiatours.travel/de/blog/viajar-a-colombia-desde-panama
curl -sSIL https://colombiatours.travel/pt-br/contact
curl -sSL  https://colombiatours.travel/pt-br/contact
```

Observed examples:

| URL | Observed status/headers/body | Interpretation |
| --- | --- | --- |
| `/pt-br/blog/viajar-a-colombia-desde-panama` | HTTP 200 soft 404; `x-public-locale: es`; title `Página no encontrada | ColombiaTours.Travel`; body contains `Página no encontrada` and `noindex`; no `hreflang="pt-BR"`; no `BlogPosting`. | `/pt-br` is not resolved as `pt-BR` in production, so an existing localized post cannot render. |
| `/pt/blog/viajar-a-colombia-desde-panama` | 308 to `/pt-br/blog/viajar-a-colombia-desde-panama`, then same Spanish soft 404. | Alias redirect exists but the canonical target still fails. |
| `/en/blog/viajar-a-colombia-desde-panama` | HTTP 200 with `x-public-locale: en-US`; contains `BlogPosting` and `FAQPage`; no `hreflang="pt-BR"`. | Localized blog routes can render, but alternate coverage is incomplete. |
| `/fr/blog/viajar-a-colombia-desde-panama` | HTTP 200 with `x-public-locale: fr-FR`; contains `BlogPosting` and `FAQPage`; no `hreflang="pt-BR"` or `hreflang="en-US"`. | Hreflang reciprocity is incomplete across published locales. |
| `/de/blog/viajar-a-colombia-desde-panama` | HTTP 200 with `x-public-locale: de-DE`; contains `BlogPosting` and `FAQPage`; no `hreflang="pt-BR"` or `hreflang="en-US"`. | Hreflang reciprocity is incomplete across published locales. |
| `/pt-br/contact` | HTTP 200 soft 404; `x-public-locale: es`; title `Página no encontrada | ColombiaTours.Travel`; body contains `Página no encontrada` and `noindex`. | Custom/static page locale paths can fall through to Spanish 404 instead of resolving localized `website_pages`. |
| `/contact` and `/es/contact` | HTTP 200 contact page; `/es/contact` resolves as Spanish-prefixed route. | Default-locale prefix handling and custom-page canonical policy need explicit acceptance, not accidental behavior. |

The implementation may capture fresher pre/post evidence, but this SPEC does not require any Supabase mutation to reproduce or validate the bug.

## 4. Severity matrix

| Severity | Evidence family | User/search impact | Required outcome |
| --- | --- | --- | --- |
| P0 | PT-BR `/pt-br/blog/<slug>` returns Spanish soft 404/noindex despite published localized content. | Published PT-BR content is undiscoverable and verifiers fail; crawlers see wrong language and noindex. | `/pt-br/blog/<pt-br-slug>` renders the `pt-BR` row with `x-public-locale: pt-BR`, non-404 body, indexable metadata, canonical `/pt-br/...`, and JSON-LD `inLanguage: pt-BR`. |
| P0 | Custom/static page localized routes (`/pt-br/<page>`, `/en/<localized-page>`, etc.) serve Spanish fallback/404 instead of localized `website_pages`. | Non-blog localized landing/legal/contact pages cannot be verified or advertised safely. | Locale-prefixed custom pages resolve by `{website_id, slug, locale}` and translation-group fallback/redirect before generic fallback/404. |
| P0 | hreflang missing/partial for published locale groups. | Google may ignore alternates or rank the wrong-language URL; transcreation rollout cannot be exposed confidently. | All rendered localized pages emit reciprocal `es-CO`/default, `en-US`, `fr-FR`, `de-DE`, `pt-BR` alternates where the content item has published/applied data, plus `x-default` to default locale. |
| P1 | `BlogPosting.author` JSON-LD mismatches visible author / DB author. | Trust schema conflicts with visible editorial byline and rich-results eligibility. | JSON-LD author uses the same selected author identity as visible template byline, with deterministic precedence documented and tests. |
| P1 | `FAQPage` JSON-LD missing when `faq_items` exist. | FAQ rich-result/AI-answer eligibility is lost for otherwise structured content. | Any blog/custom page/product detail with valid FAQ source data emits exactly one valid `FAQPage` schema block unless explicitly disabled. |
| P1 | Spanish hardcoded breadcrumb/category/CTA labels on non-ES pages. | Localized pages look unfinished; reviewers flag transcreation defects that are actually template chrome bugs. | Public template chrome uses locale dictionaries for breadcrumbs, category labels, update labels, CTAs, and schema labels. No visible Spanish labels on non-ES canaries except proper names/content intentionally in Spanish. |
| P2 | Multiple locale representations (`es`, `es-CO`, `pt`, `pt-BR`) are handled inconsistently across middleware/data/schema. | Future locale bugs recur as each surface patches independently. | Centralize or reuse normalization helpers at route, data-access, metadata and schema boundaries; add regression tests for aliases. |
| P2 | QA does not have a single canary matrix covering blog + custom page + metadata + schema. | Future fixes pass unit tests but fail crawler/reviewer checks. | Add a focused canary QA script/spec and document exact checks below. |

## 5. Canonical route and locale contract

### 5.1 Public locale segments

| Locale | Public route segment | Canonical? | Notes |
| --- | --- | ---: | --- |
| `es-CO` / default Spanish | none | yes | Default locale remains unprefixed per [[ADR-019]]. The implementation may continue accepting legacy `es` at read boundaries. |
| `en-US` | `/en` | yes | Keep existing short segment. |
| `fr-FR` | `/fr` | yes | Keep existing short segment. |
| `de-DE` | `/de` | yes | Keep existing short segment. |
| `pt-BR` | `/pt-br` | yes | Brazil-specific canonical segment; do not emit `/pt` as canonical/hreflang for ColombiaTours PT-BR content. |
| `pt` | `/pt` | alias only | Redirect permanently to `/pt-br/...` when the corresponding PT-BR content exists; never emit as canonical/hreflang. |

### 5.2 Content lookup policy

- Blog posts: resolve by slug + normalized requested locale first; then translation-group redirects when a slug belongs to another published locale; never silently serve a default-locale post as an indexable localized page.
- Custom/static pages (`website_pages`): resolve by slug + requested locale and/or translation group before falling back to default-locale/system fallback pages. A locale-prefixed URL must not render a Spanish fallback page as if it were localized content.
- Product/listing pages: keep existing category-segment localization from [[ADR-019]] and include this task's metadata/schema/chrome fixes where applicable.
- All read-time normalization must be non-destructive. Do not update `website_blog_posts.locale`, `website_pages.locale`, translations, or publish flags in this implementation.

## 6. Canary URLs and slugs

Use these canaries for implementation and PLAN/CODE validation. If any row is missing in a non-production DB, the local test fixture must create deterministic mock rows; do not write production data.

### 6.1 Blog locale group canary

Slug family: `viajar-a-colombia-desde-panama`

| Locale | Canary URL | Required checks |
| --- | --- | --- |
| ES/default | `https://colombiatours.travel/blog/viajar-a-colombia-desde-panama` | 200 if published; canonical unprefixed; `x-default` points here; no default-locale `/es` canonical unless explicitly accepted by ADR update. |
| EN | `https://colombiatours.travel/en/blog/viajar-a-colombia-desde-panama` | 200; `x-public-locale: en-US`; title/body not Spanish 404; reciprocal `hreflang` includes all published locale siblings. |
| FR | `https://colombiatours.travel/fr/blog/viajar-a-colombia-desde-panama` | 200; `x-public-locale: fr-FR`; reciprocal alternates include `en-US` and `pt-BR` when siblings exist. |
| DE | `https://colombiatours.travel/de/blog/viajar-a-colombia-desde-panama` | 200; `x-public-locale: de-DE`; reciprocal alternates include `en-US` and `pt-BR` when siblings exist. |
| PT-BR | `https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama` | P0: 200 real post, not soft 404; no `Página no encontrada`; no accidental `noindex`; canonical `/pt-br/...`; JSON-LD `inLanguage: pt-BR`. |
| PT alias | `https://colombiatours.travel/pt/blog/viajar-a-colombia-desde-panama` | 301/308 to `/pt-br/blog/viajar-a-colombia-desde-panama`; no indexable `/pt/blog/...` page; no hreflang points to `/pt/blog/...`. |

### 6.2 Custom/static page canaries

Primary slug family: `contact` / localized equivalents if present in `website_pages.translation_group_id`.

| Locale | Canary URL | Required checks |
| --- | --- | --- |
| ES/default | `https://colombiatours.travel/contact` and/or the accepted Spanish canonical for the contact page | 200; clear canonical decision documented; no accidental redirect loop. |
| EN | `https://colombiatours.travel/en/contact` or localized EN slug from `website_pages` | Resolves the EN `website_pages` row if present; otherwise explicit 404/redirect policy, not Spanish fallback. |
| PT-BR | `https://colombiatours.travel/pt-br/contact` or localized PT-BR slug from `website_pages` | Resolves PT-BR row if present; otherwise true 404/noindex with localized not-found chrome, not Spanish soft 404 caused by missed locale parsing. |
| FR/DE | localized URL from `website_pages` translation group | Same as above; verify slug redirect from wrong-language slug to localized slug when sibling exists. |

Secondary custom-page slug family: `planners` (because it has a dedicated route and public template overlay). Validate `/planners`, `/en/planners`, `/fr/planners`, `/de/planners`, `/pt-br/planners` according to the same locale/metadata rules.

### 6.3 Template chrome canaries

Inspect at least one blog detail, one custom/static page, one listing page and one product/detail page in each non-ES locale:

- Blog detail: `/en/blog/viajar-a-colombia-desde-panama`, `/fr/blog/viajar-a-colombia-desde-panama`, `/de/blog/viajar-a-colombia-desde-panama`, `/pt-br/blog/viajar-a-colombia-desde-panama`.
- Custom page: `/en/contact` or localized contact slug, `/pt-br/contact` or localized contact slug.
- Listing: `/en/packages`, `/fr/forfaits`, `/de/pakete`, `/pt-br/pacotes` where supported by routing helpers.
- Product/detail: one published package or activity with localized overlay; implementer should discover the concrete slug read-only from local fixtures or Supabase read queries.

## 7. Functional requirements

### FR1 — Regional locale routing and PT-BR canonicalization (P0)

- `resolveLocaleFromPublicPath(...)` and middleware must recognize BCP-47-like first segments such as `pt-br`.
- `localeToPublicSegment('pt-BR')` / public path builders must emit `pt-br` for PT-BR and short segments for EN/FR/DE.
- Middleware must set stable locale headers for PT-BR requests:
  - `x-public-locale: pt-BR`
  - `x-public-lang: pt`
  - `x-public-locale-segment: pt-br`
- `/pt/...` is an alias only when matching PT-BR content exists and must permanently redirect to `/pt-br/...`.
- No route helper may generate canonical or hreflang URLs under `/pt/...` for PT-BR content.

### FR2 — Blog route/data/metadata consistency (P0)

- Blog detail pages must use a single normalized locale tuple across:
  - data lookup (`getBlogPostBySlug`, `getBlogPostByTranslationGroup`, `getBlogPostTranslationLocales`),
  - canonical URL,
  - alternates/hreflang,
  - HTML/request locale,
  - JSON-LD `inLanguage`,
  - visible template strings.
- Missing localized blog content should result in explicit redirect to an available localized sibling or true 404/noindex; do not serve Spanish fallback body under a non-ES canonical.
- Existing EN quality-gate behavior may still noindex blocked EN rows, but it must not mask PT-BR/FR/DE rendering bugs.

### FR3 — Custom/static page locale resolution (P0)

- `website_pages` resolution must become locale-aware at the public route boundary.
- Lookup order for custom pages:
  1. Requested slug + requested normalized locale.
  2. Requested slug without locale only for default locale.
  3. Translation group sibling for requested locale when the slug belongs to another locale.
  4. Explicit redirect to localized slug when found.
  5. True localized 404/noindex when no requested-locale page exists and fallback is not allowed.
- System fallback pages must not override a published localized `website_pages` row.
- Contact/legal/planners routes must document whether they are dedicated route files, system fallbacks, or `website_pages` rows, and tests must cover the chosen behavior.

### FR4 — hreflang reciprocity and sitemap consistency (P0)

- Page-level metadata must emit a reciprocal alternate set for every canary page based on the same content item/translation group.
- Include `x-default` pointing to the default-locale canonical for that same content item.
- Exclude locales without published/applied localized content, except default locale per [[ADR-020]].
- Sitemap alternate generation must match page-level alternates for the same route classes.
- All alternate hrefs must use the public custom domain and localized public segments; no `/site/<subdomain>`, `/domain/<host>`, localhost, `/pt/blog/...`, or double locale prefixes.

### FR5 — BlogPosting author consistency (P1)

- Define one author precedence shared by visible template and JSON-LD. Recommended precedence:
  1. Linked planner from `post.created_by` when available.
  2. `post.author_name` / `post.author_avatar` from `website_blog_posts`.
  3. Organization fallback from website/account.
- If the visible byline intentionally displays a reviewer while JSON-LD author displays the author, then JSON-LD must include `reviewedBy` and the UI must label reviewer vs author clearly.
- Acceptance requires equality or explicitly documented author/reviewer separation for canary posts.

### FR6 — FAQPage schema when FAQ source data exists (P1)

- Blog posts with valid `faq_items` must emit one `FAQPage` JSON-LD node with non-empty `Question.name` and `acceptedAnswer.text` values.
- Product/custom/static pages with FAQ source data (`custom_faq`, FAQ section content, or page-specific FAQ blocks) must emit a valid `FAQPage` node unless a schema-disabled flag exists.
- Avoid duplicate `FAQPage` nodes for the same page. If multiple sources exist, define precedence and dedupe by normalized question.
- Invalid/empty FAQ rows should be filtered, not emitted.

### FR7 — Localized public template chrome (P1)

- Replace hardcoded Spanish/English fallback strings in public template components with `getPublicUiMessages(...)` / `getPublicUiExtraTextGetter(...)` or equivalent typed dictionaries.
- Surfaces to audit:
  - blog detail breadcrumbs, category chips, author/update labels, CTA strings, related-post labels,
  - listing breadcrumbs/category labels,
  - product detail breadcrumbs and section labels,
  - static/custom page breadcrumbs and CTA labels,
  - JSON-LD `BreadcrumbList` names.
- Non-ES pages must not visibly contain hardcoded Spanish labels such as `Página no encontrada`, `Actualizado`, `Paquetes`, `Inicio`, `Ver paquete`, `Actividades`, `Destinos`, `Hoteles`, `Preguntas Frecuentes`, unless the string is tenant content intentionally stored in Spanish.

### FR8 — QA harness for crawler-facing output (P2)

Add or extend a focused canary validation that can run locally with session pool or against production read-only:

- HTTP status and redirect chain.
- `x-public-*` headers when available.
- `<html lang>`.
- canonical link.
- alternates/hreflang map.
- robots/noindex markers.
- JSON-LD node types and selected fields (`BlogPosting.author`, `inLanguage`, `FAQPage`, `BreadcrumbList`).
- visible text forbidden-string scan for localized chrome.
- internal URL leakage scan.

## 8. Likely implementation files

Routing/locale:

- `middleware.ts`
- `lib/seo/locale-routing.ts`
- `lib/seo/public-metadata.ts`
- `lib/seo/hreflang.ts`
- `lib/seo/sitemap.ts`

Blog/custom page data access:

- `lib/supabase/get-website.ts`
- `lib/supabase/get-pages.ts`
- `app/site/[subdomain]/blog/[slug]/page.tsx`
- `app/site/[subdomain]/[...slug]/page.tsx`
- `app/domain/[host]/[[...slug]]/page.tsx` if custom-domain catch-all behavior still diverges from `/site/[subdomain]` behavior.

Structured data:

- `lib/schema/generators.ts`
- `lib/schema/types.ts`
- `components/seo/product-schema.tsx`
- `components/seo/landing-page-schema.tsx`
- `components/pages/static-page.tsx`
- `components/pages/product-landing-page.tsx`

Localized chrome:

- `lib/site/public-ui-messages.ts`
- `lib/site/public-ui-extra-text.ts`
- `components/site/blog/blog-detail.tsx`
- `components/site/themes/editorial-v1/pages/blog-detail.tsx`
- `components/site/themes/editorial-v1/pages/*`
- `components/site/themes/editorial-v1/primitives/breadcrumbs.tsx`

Tests/QA:

- `__tests__/lib/seo/locale-routing.test.ts`
- `__tests__/lib/seo/hreflang-translated-locales.test.ts`
- `__tests__/middleware/locale-site-route.test.ts`
- Add focused tests for `getPageBySlug` / translated `website_pages` lookup seam if no current harness exists.
- Add focused JSON-LD tests around `generateBlogPostSchemas` and FAQ generation.
- Add a canary crawler script/spec, e.g. `scripts/qa/public-template-canaries.mjs` or Playwright route checks under `e2e/tests/public-template-systemic-fix.spec.ts`.

## 9. Acceptance criteria

### A. P0 routing/rendering

1. `/pt-br/blog/viajar-a-colombia-desde-panama` resolves as PT-BR, renders a real post, and does not contain Spanish not-found chrome for a published row.
2. `/pt-br/blog/viajar-a-colombia-desde-panama` does not emit noindex unless the PT-BR row itself is explicitly noindexed.
3. `/pt/blog/viajar-a-colombia-desde-panama` permanently redirects to `/pt-br/blog/viajar-a-colombia-desde-panama` and never becomes an indexable canonical.
4. At least one localized custom/static page canary resolves the localized `website_pages` row; missing localized content returns a true localized 404/noindex rather than a Spanish soft 404.
5. Default Spanish canonical paths remain unprefixed.
6. EN/FR/DE existing localized blog routes keep rendering.

### B. P0 metadata/hreflang

7. Every blog locale canary emits a reciprocal alternate set containing the same published locale siblings.
8. `pt-BR` alternate href uses `/pt-br/...` and no alternate href uses `/pt/...`.
9. `x-default` points to the default-locale canonical for the same content item.
10. Page-level hreflang and sitemap alternates are consistent for canary content.
11. Canonical, Open Graph URL, JSON-LD URLs and visible share URLs use `https://colombiatours.travel`, not internal `/site` or `/domain` paths.

### C. P1 structured data

12. Blog canary JSON-LD `BlogPosting.author.name` matches the visible author/byline, or visible reviewer and JSON-LD `reviewedBy` separation is explicitly represented and tested.
13. Blog canaries with `faq_items` emit exactly one valid `FAQPage` node.
14. Product/custom page canaries with FAQ data emit valid `FAQPage` schema or explicitly document a data reason for no FAQ source.
15. JSON-LD `inLanguage` matches the requested normalized locale.

### D. P1 localized chrome

16. Non-ES canaries do not display Spanish system/template labels listed in FR7.
17. Breadcrumb labels and JSON-LD `BreadcrumbList` names are localized according to the resolved locale.
18. Localized not-found pages, when intentionally returned, use localized not-found chrome and true 404/noindex.

### E. P2 maintainability/safety

19. Locale normalization is centralized/reused across middleware, metadata, blog data and page data seams; no new one-off ColombiaTours-only branch is added.
20. No production writes, Supabase data mutation, publish operations, secrets, or deploy commands are included.
21. Tests include unit coverage plus a canary QA command documenting exact URLs and fields inspected.
22. Session-pool rules are followed for any local server/E2E validation.

## 10. Exact QA checks

### 10.1 Read-only production/local curl checks

Use production only for read-only smoke. For local validation, first start the app through the session pool and target that port/host strategy.

```bash
CANARY_BASE="https://colombiatours.travel"
for path in \
  /blog/viajar-a-colombia-desde-panama \
  /en/blog/viajar-a-colombia-desde-panama \
  /fr/blog/viajar-a-colombia-desde-panama \
  /de/blog/viajar-a-colombia-desde-panama \
  /pt-br/blog/viajar-a-colombia-desde-panama \
  /pt/blog/viajar-a-colombia-desde-panama \
  /contact \
  /en/contact \
  /pt-br/contact; do
  curl -sSIL "$CANARY_BASE$path" | sed -n '1,12p'
done
```

Expected:

- PT alias shows permanent redirect to `/pt-br/...`.
- PT-BR canonical does not show `x-public-locale: es`.
- Custom page localized routes either resolve localized content or true 404 by explicit policy; no Spanish soft 404 with HTTP 200.

### 10.2 HTML marker checks

```bash
curl -sSL "$CANARY_BASE/pt-br/blog/viajar-a-colombia-desde-panama" \
  | grep -E '<html lang=|rel="canonical"|hreflang="pt-BR"|hreflang="en-US"|hreflang="fr-FR"|hreflang="de-DE"|hreflang="x-default"|BlogPosting|FAQPage|inLanguage|Página no encontrada|noindex'
```

PASS:

- Contains `<html lang="pt-BR"` or an accepted PT language equivalent plus `inLanguage: pt-BR`.
- Contains `BlogPosting`.
- Contains `FAQPage` if `faq_items` are present.
- Contains reciprocal `hreflang` values for published siblings.
- Does not contain `Página no encontrada` or accidental `noindex`.

### 10.3 JSON-LD parser check

Implement a test/script that parses every `<script type="application/ld+json">` block and asserts:

- At least one `BlogPosting` on blog detail canaries.
- `BlogPosting.inLanguage === requestedLocale`.
- `BlogPosting.author.name` matches visible byline or documented author/reviewer split.
- `FAQPage.mainEntity.length > 0` when FAQ data exists.
- `BreadcrumbList.itemListElement[*].name` is localized for non-ES pages.
- No schema URL contains `/site/`, `/domain/`, `localhost`, `/pt/blog/`, or duplicate locale prefixes.

### 10.4 Forbidden localized chrome scan

For non-ES canaries, fail if rendered text contains Spanish system labels outside tenant-provided content allowlists:

```text
Página no encontrada
Actualizado
Volver al inicio
Ver paquete
Ver actividad
Ver hotel
Paquetes
Actividades
Destinos
Hoteles
Preguntas Frecuentes
```

Allowlist rules:

- Proper nouns and tenant/content body copy may remain Spanish if the DB row intentionally contains Spanish text.
- Template chrome, breadcrumbs, buttons, not-found labels, and schema breadcrumb names are never allowlisted.

### 10.5 Local E2E/session-pool rule

Never run `npm run dev`, `npm run test:e2e`, or raw `playwright test` directly from agents.

```bash
npm run session:list
npm run session:run -- --grep "public-template-systemic-fix"
```

For interactive local smoke:

```bash
eval "$(bash scripts/session-acquire.sh)"
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session
# run canary checks against the claimed port
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

## 11. Implementation sequencing guidance

1. Add failing unit tests for `/pt-br` locale parsing, `/pt` alias canonicalization, and public path generation.
2. Add failing unit tests for blog alternate generation including `pt-BR`, `en-US`, `fr-FR`, `de-DE`, and default locale reciprocity.
3. Add tests for custom `website_pages` localized lookup and translation-group redirect behavior.
4. Add JSON-LD tests for blog author precedence and FAQPage emission.
5. Patch `lib/seo/locale-routing.ts`, `middleware.ts`, and metadata helpers until routing/hreflang unit tests pass.
6. Patch blog/custom data-access seams (`get-website.ts`, `get-pages.ts`) without production data writes.
7. Patch schema generators and visible template author selection so JSON-LD and UI agree.
8. Replace hardcoded template chrome labels with locale dictionary calls.
9. Add canary QA script/spec and run focused checks.
10. Run `npm run typecheck`, `npm run lint`, relevant Jest tests, and session-pool E2E/canary checks.
11. Capture before/after evidence in the implementation handoff or a QA doc only if available without production writes.

## 12. Non-goals

- No translation copy rewrites.
- No Supabase data edits, publish operations, migrations, or destructive SQL.
- No production deploy from this task.
- No Growth OS/provider/transcreation-agent refactor.
- No new route strategy replacing [[ADR-019]]; this is a targeted regional-locale and template correctness fix.
- No broad redesign of the editorial-v1 template.

## 13. Open validation questions for Tech Validator

1. Should `/es/<slug>` remain accepted as a default-locale alias for custom pages, or should default Spanish canonical strictly remain unprefixed with redirects away from `/es`?
2. For custom pages without a requested-locale row, should the renderer return localized true 404 or redirect to default-locale canonical? This SPEC prefers true 404/noindex for indexable localized URLs unless product policy says fallback is acceptable.
3. Should the author precedence be planner-first or post-author-first when both `post.created_by` and `post.author_name` exist? Acceptance only requires visible UI and JSON-LD consistency.
4. Should FAQPage support for custom/static pages read from `website_pages.sections`, `custom_faq`, or a normalized contract in `website-contract` first? PLAN validation should pick the least invasive existing source.
