# SPEC: PT-BR Blog Routing + Hreflang Completeness

Status: Ready for PLAN review
Owner: Specifier
Repo: weppa-cloud/bukeer-studio
Branch: fix/ptbr-blog-routing-hreflang
Scope: documentation/spec only; no functional implementation in this task

## 1. Goal

Fix the public blog rendering and SEO signals for PT-BR blog posts so that production verifiers stop seeing soft/hard 404s and incomplete alternates.

The implementation must make these surfaces correct for both tenant subdomains and verified custom domains:

- `/pt-br/blog/<slug>` renders the real published PT-BR blog row when one exists.
- `/pt/blog/<slug>` redirects permanently to `/pt-br/blog/<slug>` for PT-BR blog content, or is explicitly handled as a compatibility alias during migration.
- Blog detail metadata and rendered HTML agree on locale: `<html lang>`, canonical, `og:url`, hreflang alternates, and JSON-LD `inLanguage`.
- Complete translated blog groups emit reciprocal alternates for `es-CO`, `en-US`, `de-DE`, `fr-FR`, `pt-BR`, and `x-default`.

## 2. Critical failure context

Main deploy run `25888825397` passed, but post-deploy verifiers are still blocked:

1. México verifier `t_9c97f4da`
   - URL: `/pt-br/blog/requisitos-para-viajar-a-colombia-desde-mexico/`
   - Current failure: still serves 404/no real content.

2. Panamá verifier `t_f4349cf1`
   - `/pt/` to `/pt-br/` redirect works.
   - PT-BR blog routes still do not render correctly.

3. Villa de Leyva verifier `t_29d082ae`
   - Hreflang improved from 0/6 to partial.
   - Locale alternates are still incomplete.

Do not run manual deploys. Closure is PR to dev/main and normal CI/CD after merge. Do not print secrets; redact as `[REDACTED]` if encountered.

## 3. Architecture references and constraints

This plan is intentionally grounded in the accepted ADRs:

- ADR-007 Edge-First Delivery on Cloudflare Workers
  - Next.js 15 is deployed through OpenNext on Cloudflare Workers.
  - Middleware and public routing must remain Worker-compatible: no Node-only APIs, no persistent filesystem, no heavyweight per-request logic.
  - Do not add `export const runtime = 'edge'`; OpenNext handles runtime.

- ADR-009 Multi-Tenant Subdomain Routing
  - Middleware is the tenant routing boundary.
  - Browser URL remains custom-domain/subdomain public URL; internal route rewrites to `/site/<subdomain>/...`.
  - Verified custom domains should use the stable tenant pipeline via `website.subdomain`, not a divergent rendering path.

- ADR-019 Multi-locale URL Routing
  - Existing accepted rule uses path-prefix locale routing and two-letter language prefixes for non-default locales.
  - Current failure context and acceptance require `/pt-br` as the public PT-BR blog canonical prefix. This conflicts with the original two-letter `/pt` rule and must be treated as a narrow amendment/compatibility rule for PT-BR public blog URLs, not an accidental fork of the routing model.
  - The implementation must document the amendment in code comments/tests or update ADR-019 in a follow-up docs task if reviewers require it.

- ADR-020 Hreflang Emission Policy
  - Emit alternates only for translated/published locales plus default locale.
  - Always emit `x-default` to the default-locale canonical URL.
  - Hreflang attributes use full BCP-47 locale codes (`pt-BR`, `en-US`, etc.).
  - Reciprocal links inside the emitted set are mandatory.

## 4. Current code observations

Inspected files:

- `middleware.ts`
- `lib/seo/locale-routing.ts`
- `lib/seo/hreflang.ts`
- `lib/seo/public-metadata.ts`
- `lib/supabase/get-website.ts`
- `lib/schema/generators.ts`
- `app/layout.tsx`
- `app/site/[subdomain]/blog/[slug]/page.tsx`
- `app/site/[subdomain]/blog/page.tsx`
- `app/site/[subdomain]/layout.tsx`
- `__tests__/lib/seo/locale-routing.test.ts`
- `__tests__/middleware/locale-site-route.test.ts`
- `__tests__/lib/seo/hreflang-translated-locales.test.ts`
- `__tests__/lib/seo/public-metadata-locale.test.ts`
- `e2e/tests/pilot/matrix/pilot-matrix-public-blog.spec.ts`

Key observations:

1. `resolveLocaleFromPublicPath()` in `lib/seo/locale-routing.ts` only detects a first segment matching `/^[a-z]{2}$/`. Therefore `/pt-br/blog/...` is currently not recognized as a locale-prefixed public path. It will be treated as a normal path segment, which explains why PT-BR blog URLs can miss the intended `/site/<subdomain>/blog/<slug>` rewrite.

2. `buildPublicLocalizedPath()` currently derives the public prefix from `localeToLanguage(locale)`, so `pt-BR` builds `/pt/...`, not `/pt-br/...`.

3. `middleware.ts` has `localeLookupCandidates()` that correctly includes `pt` for `pt-BR`, but a separate `normalizeBlogPublicLocale()` maps legacy `pt` to `pt-PT`, which is wrong for this product surface where `pt` is the legacy alias for `pt-BR`.

4. `lib/supabase/get-website.ts` handles legacy `es`/`en` blog rows in several paths, but PT-BR handling is incomplete:
   - `getBlogPostBySlug()` locale fallback only bridges `es-CO`/`es` and `en-US`/`en`; it does not bridge `pt-BR`/`pt`, `fr-FR`/`fr`, or `de-DE`/`de`.
   - exported `normalizeBlogPublicLocale()` maps `es` and `en` but not `pt`, `fr`, or `de`.
   - `getBlogPostByTranslationGroup()` queries exact locale only, so translation-group lookups can miss legacy short-code rows.
   - `getBlogPostTranslationLocales()` returns raw locales without normalizing legacy short codes, so hreflang completeness can be partial even when translated rows exist.

5. `app/layout.tsx` derives `<html lang>` from middleware-injected headers (`x-public-lang` / resolved locale). Therefore PT-BR correctness depends on middleware recognizing `/pt-br` and injecting the correct public locale/lang headers before App Router rendering.

6. Blog metadata already covers several required outputs when locale context is correct:
   - canonical: `metadata.alternates.canonical`
   - hreflang: `metadata.alternates.languages`
   - `og:url`: `metadata.openGraph.url`
   - JSON-LD `inLanguage`: `generateArticleSchema()` calls `resolveSchemaLanguage(post, website, requestLocale)`.
   The likely bug is upstream locale resolution and locale-normalized blog data lookup, not a missing metadata field.

## 5. Probable root cause

The production failures are most likely caused by a combination of two mismatches:

1. Public URL segment mismatch:
   - Verifiers and current product expectation use `/pt-br/blog/<slug>`.
   - Core locale routing only recognizes two-letter prefixes and builders output `/pt/blog/<slug>`.
   - Result: `/pt-br/...` can bypass locale stripping and rewrite to an invalid internal path, producing 404/no content.

2. Blog locale normalization mismatch:
   - Blog rows may store canonical BCP-47 locales (`pt-BR`, `fr-FR`, `de-DE`) or legacy short codes (`pt`, `fr`, `de`).
   - Current read paths bridge Spanish and English but not PT-BR/FR/DE consistently.
   - Result: real translated rows can be missed by detail lookup, translation-group lookup, and hreflang alternate computation.

A safe fix should not add special behavior only in the page component. The routing, data-access normalization, metadata, and tests must align.

## 6. Non-goals

- Do not manually deploy with `wrangler deploy`.
- Do not modify Supabase data directly as part of this code fix.
- Do not introduce subdomain-per-locale or ccTLD routing.
- Do not add Node-only dependencies or filesystem usage to middleware.
- Do not change dashboard/editor routes.
- Do not make untranslated locales indexable; keep ADR-020 filtering.

## 7. Proposed implementation approach

### Phase A — Locale segment contract

Files likely affected:

- `lib/seo/locale-routing.ts`
- `__tests__/lib/seo/locale-routing.test.ts`

Tasks:

1. Add an explicit public locale segment mapping for BCP-47 blog/SEO URLs:

   - `es-CO` default: no prefix
   - `en-US`: `/en`
   - `de-DE`: `/de`
   - `fr-FR`: `/fr`
   - `pt-BR`: `/pt-br` canonical

2. Keep `/pt` as a legacy alias for inbound requests only.

3. Update `resolveLocaleFromPublicPath()` so the first segment may be either:

   - two-letter language segment (`en`, `fr`, `de`, legacy `pt`), or
   - supported BCP-47 lower-case segment (`pt-br`) when mapped to a configured locale.

4. Add a boolean/field to the resolution result if needed, e.g. `canonicalLocaleSegment`, so middleware can redirect legacy aliases without guessing.

5. Update `buildPublicLocalizedPath()` so `pt-BR` emits `/pt-br/...` and not `/pt/...`.

6. Ensure the default-locale no-prefix rule remains unchanged.

Acceptance for Phase A:

- `resolveLocaleFromPublicPath('/pt-br/blog/foo', settings)` returns:
  - `resolvedLocale: 'pt-BR'`
  - `resolvedLanguage: 'pt'`
  - `languageSegment: 'pt-br'` or an equivalent canonical segment field
  - `pathnameWithoutLang: '/blog/foo'`
  - `canonicalPathname: '/blog/foo'`
- `buildPublicLocalizedPath('/blog/foo', 'pt-BR', 'es-CO')` returns `/pt-br/blog/foo`.
- `buildPublicLocalizedPath('/blog/foo', 'en-US', 'es-CO')` still returns `/en/blog/foo`.
- `buildPublicLocalizedPath('/blog/foo', 'es-CO', 'es-CO')` still returns `/blog/foo`.

### Phase B — Middleware redirect and rewrite parity

Files likely affected:

- `middleware.ts`
- `__tests__/middleware/locale-site-route.test.ts` or a new focused middleware test file

Tasks:

1. Apply the new locale resolution to all public tenant routing branches already present in middleware:

   - localhost/dev subdomain path
   - production Bukeer subdomain path
   - verified custom domain path using `website.subdomain`
   - internal `/site/<subdomain>/<locale>/...` path used by E2E/staging smoke tests, if applicable

2. Add permanent redirect handling for legacy PT aliases:

   - `/pt/blog/<slug>` -> `/pt-br/blog/<slug>` when the tenant supports `pt-BR`.
   - `/pt/` -> `/pt-br/` may stay as already implemented if covered elsewhere, but must not regress.
   - Do not redirect unsupported `/pt/...` tenants into PT-BR. If the tenant supports only `es-CO`/`en-US`, keep current unsupported-prefix behavior.

3. Preserve host and query string during redirects:

   - custom domain: `https://www.example.travel/pt/blog/foo` -> `https://www.example.travel/pt-br/blog/foo`
   - subdomain: `https://colombiatours.bukeer.com/pt/blog/foo` -> `https://colombiatours.bukeer.com/pt-br/blog/foo`
   - keep allowed query params unless existing cache-bust stripping rules remove them.

4. Ensure `applyLocaleAwareTenantRewrite()` receives:

   - `pathnameWithoutLang: '/blog/<slug>'`
   - `canonicalPathname: '/blog/<slug>'`
   - `resolvedLocale: 'pt-BR'`
   - `resolvedLanguage: 'pt'`
   - `hasLanguageSegment: true`

Acceptance for Phase B:

- `/pt-br/blog/<slug>` rewrites internally to `/site/<subdomain>/blog/<slug>` with PT-BR headers.
- `/pt/blog/<slug>` redirects 301 or 308 to `/pt-br/blog/<slug>` for PT-BR-supporting tenants.
- Custom domains and Bukeer subdomains behave identically.
- Reserved subdomains and dashboard/API paths remain unaffected.

### Phase C — Blog locale normalization at data-access boundary

Files likely affected:

- `lib/supabase/get-website.ts`
- possibly a small shared helper in `lib/seo/locale-routing.ts` if duplication can be reduced safely
- unit tests under `__tests__/lib/supabase/` or `__tests__/lib/seo/`

Tasks:

1. Replace ad-hoc blog locale candidate building with one shared helper, e.g.:

   - `getBlogLocaleLookupCandidates(locale)`
   - maps canonical to legacy short code and short code to canonical:
     - `es-CO` <-> `es`
     - `en-US` <-> `en`
     - `pt-BR` <-> `pt`
     - `fr-FR` <-> `fr`
     - `de-DE` <-> `de`

2. Fix exported `normalizeBlogPublicLocale()` so:

   - `pt` -> `pt-BR`
   - `fr` -> `fr-FR`
   - `de` -> `de-DE`
   - existing `es` -> `es-CO` and `en` -> `en-US` remain.

3. Update `getBlogPostBySlug()` fallback candidates to include PT-BR/FR/DE legacy forms.

4. Update `getBlogPostByTranslationGroup()` to query a locale candidate set instead of exact locale only, or make it use the shared helper.

5. Update `getBlogPostTranslationLocales()` to normalize returned locales before dedupe.

6. Do not write to database; this is read-time normalization only.

Acceptance for Phase C:

- A post stored as `locale='pt'` is found for a PT-BR request.
- A post stored as `locale='pt-BR'` is found for a legacy PT request before redirect.
- `getBlogPostTranslationLocales()` returns canonical locales such as `pt-BR`, not legacy `pt`, before hreflang generation.
- Translation group lookups can find the localized counterpart regardless of short/canonical stored locale.

### Phase D — Blog metadata and JSON-LD coherence

Files likely affected:

- `app/site/[subdomain]/blog/[slug]/page.tsx`
- `lib/seo/public-metadata.ts`
- `lib/schema/generators.ts` only if tests prove `inLanguage` is wrong
- metadata/schema tests

Tasks:

1. Ensure `resolvePublicMetadataLocale()` receives the canonical public blog pathname and resolved locale from middleware headers.

2. Ensure canonical for PT-BR blog detail uses `/pt-br/blog/<slug>`, not `/pt/blog/<slug>`.

3. Ensure `openGraph.url` equals canonical.

4. Ensure `generateBlogPostSchemas()` receives `requestLocale='pt-BR'` for `/pt-br/blog/<slug>` so Article/BlogPosting JSON-LD emits `inLanguage: 'pt-BR'` or the repo's established canonical schema language value if already normalized there.

5. Ensure `<html lang>` becomes `pt` or `pt-BR` consistently with existing root-layout convention. Current root layout consumes `x-public-lang`; if the project convention is two-letter HTML language tags, require `lang='pt'`. If reviewers require BCP-47, change root-layout/header behavior explicitly and test it. Do not leave it implicit.

Acceptance for Phase D:

For `/pt-br/blog/requisitos-para-viajar-a-colombia-desde-mexico/` with a published PT-BR row:

- HTTP status is 200.
- Body contains the real blog title/content, not the 404 template.
- `<html lang>` is PT-compatible and matches the chosen repo convention.
- `<link rel="canonical">` is absolute and ends in `/pt-br/blog/requisitos-para-viajar-a-colombia-desde-mexico` or the repo's trailing-slash-normalized equivalent.
- `meta[property="og:url"]` equals canonical.
- JSON-LD Article/BlogPosting includes `inLanguage` resolving to PT-BR.

### Phase E — Hreflang completeness and reciprocity

Files likely affected:

- `lib/seo/hreflang.ts`
- `lib/seo/public-metadata.ts`
- `lib/seo/blog-sitemap-groups.ts`
- `lib/seo/sitemap.ts`
- tests under `__tests__/lib/seo/`

Tasks:

1. Ensure page-level hreflang generation uses localized blog slugs per locale where available, not the current request slug repeated across all locales.

2. If `buildLocaleAwareAlternateLanguages()` only receives a single pathname, add a blog-specific path map option or helper that accepts `Record<locale, pathname>` from translation-group rows.

3. Use normalized translated locale set from `getBlogPostTranslationLocales()`.

4. Preserve ADR-020 filtering:

   - include default locale always;
   - include only published translated locales;
   - include `x-default` pointing to default-locale canonical;
   - do not emit unsupported/unpublished locale alternates.

5. Ensure sitemap blog alternates and page-level alternates use the same locale-to-path mapping.

Acceptance for Phase E:

For a complete Villa de Leyva translation group:

- Page-level hreflang includes exactly:
  - `es-CO`
  - `en-US`
  - `de-DE`
  - `fr-FR`
  - `pt-BR`
  - `x-default`
- Each alternate URL points to the correct locale-specific slug/path.
- `pt-BR` alternate uses `/pt-br/blog/...`.
- `x-default` points to the ES/default canonical URL.
- The same emitted set is present when requesting any locale variant in the group.

## 8. Expected URL matrix

Assume:

- Host: `https://colombiatours.travel` for custom-domain examples.
- Default locale: `es-CO`.
- Supported locales: `es-CO`, `en-US`, `de-DE`, `fr-FR`, `pt-BR`.
- All variants are published for the group.

| Locale | Public blog URL | Expected behavior | Hreflang tag |
| --- | --- | --- | --- |
| es-CO | `/blog/<slug-es>` | 200 real ES post, no locale prefix | `es-CO` |
| en-US | `/en/blog/<slug-en>` | 200 real EN post | `en-US` |
| de-DE | `/de/blog/<slug-de>` | 200 real DE post | `de-DE` |
| fr-FR | `/fr/blog/<slug-fr>` | 200 real FR post | `fr-FR` |
| pt-BR | `/pt-br/blog/<slug-pt>` | 200 real PT-BR post | `pt-BR` |
| x-default | `/blog/<slug-es>` | default canonical | `x-default` |
| legacy PT alias | `/pt/blog/<slug-pt>` | 301/308 to `/pt-br/blog/<slug-pt>` when PT-BR supported | none on final page |

Verifier-specific URLs:

| Verifier | Required URL/assertion |
| --- | --- |
| México | `/pt-br/blog/requisitos-para-viajar-a-colombia-desde-mexico/` returns 200 real PT-BR content, not 404 template |
| Panamá | `/pt/` redirects to `/pt-br/`; `/pt-br/blog/<panama-slug>/` renders PT-BR real content |
| Villa de Leyva | PT-BR/ES/EN/DE/FR variants emit complete reciprocal hreflang set plus `x-default` |

## 9. Required tests

Node must be >=22 before running project tests. Current inspected local runtime reported Node v20.19.2, so implementers must switch to Node 22+ first.

Do not run `npm run test:e2e` directly. Use the session pool for E2E, per `AGENTS.md`.

### Unit tests

Add/update tests in `__tests__/lib/seo/locale-routing.test.ts`:

- resolves `/pt-br/blog/foo` as PT-BR and strips to `/blog/foo`.
- builds PT-BR blog localized paths as `/pt-br/blog/foo`.
- preserves EN/FR/DE two-letter paths.
- preserves ES default no-prefix path.
- treats `/pt/blog/foo` as legacy alias where supported.
- does not treat `/pt/...` as supported for a tenant with only `es-CO` and `en-US`.

Add/update tests for blog locale normalization, either in a new `__tests__/lib/supabase/blog-locale-normalization.test.ts` or a suitable existing test:

- `normalizeBlogPublicLocale('pt') === 'pt-BR'`.
- `normalizeBlogPublicLocale('fr') === 'fr-FR'`.
- `normalizeBlogPublicLocale('de') === 'de-DE'`.
- candidate helper returns canonical + short-code variants for `pt-BR`, `fr-FR`, `de-DE`.
- translation locales are normalized/deduped before hreflang generation.

Add/update tests in `__tests__/lib/seo/hreflang-translated-locales.test.ts`:

- complete set emits `es-CO`, `en-US`, `de-DE`, `fr-FR`, `pt-BR`, `x-default`.
- PT-BR href uses `/pt-br/...`.
- filtered set still follows ADR-020 and omits locales without published translations.

Add/update middleware tests in `__tests__/middleware/locale-site-route.test.ts` or a new middleware test:

- internal `/site/colombiatours/pt-br/blog/foo` sets PT-BR locale headers and rewrites to `/site/colombiatours/blog/foo`.
- public `/pt-br/blog/foo` for a subdomain sets PT-BR headers.
- custom-domain path preserves host and sets the same headers.
- `/pt/blog/foo` redirects to `/pt-br/blog/foo` only when tenant supports PT-BR.
- existing unsupported `/pt/` tenant test remains green for es/en-only tenants.

### Metadata/schema tests

Add a focused test around blog metadata generation or an integration-level test that renders head output and asserts:

- `<html lang>` PT-compatible value via root layout/header path.
- canonical is absolute and uses `/pt-br/blog/<slug>`.
- `og:url` equals canonical.
- hreflang includes full expected set for complete translation groups.
- JSON-LD Article/BlogPosting `inLanguage` is PT-BR for PT-BR request.

### E2E tests via session pool

Extend `e2e/tests/pilot/matrix/pilot-matrix-public-blog.spec.ts` or add a focused PT-BR regression spec.

Use session pool only:

```bash
npm run session:run -- --grep "PT-BR blog routing"
```

Do not use port 3000 and do not run `npm run test:e2e` directly.

E2E acceptance:

1. México verifier regression:
   - Visit `/pt-br/blog/requisitos-para-viajar-a-colombia-desde-mexico/`.
   - Assert status 200.
   - Assert no 404 copy/template.
   - Assert real article h1/body exists.
   - Assert canonical, `og:url`, hreflang, JSON-LD `inLanguage`.

2. Panamá verifier regression:
   - Visit `/pt/` and assert 301/308 to `/pt-br/` if this root redirect is part of current behavior.
   - Visit a PT-BR Panamá blog URL and assert 200 real content.

3. Villa de Leyva hreflang regression:
   - Visit each available locale variant or at least default + PT-BR.
   - Assert full reciprocal hreflang set for `es-CO`, `en-US`, `de-DE`, `fr-FR`, `pt-BR`, `x-default`.
   - Assert PT-BR alternate uses `/pt-br/blog/...`.

### Curl/smoke checks

After PR deploy to staging/main via CI/CD, use curl-based verification only; do not manually deploy.

Example checks, with actual host chosen by CI environment:

```bash
curl -I https://colombiatours.travel/pt/blog/requisitos-para-viajar-a-colombia-desde-mexico/
curl -sL https://colombiatours.travel/pt-br/blog/requisitos-para-viajar-a-colombia-desde-mexico/ | grep -E 'canonical|hreflang|og:url|inLanguage'
curl -sL https://colombiatours.travel/pt-br/blog/villa-de-leyva-colombia/ | grep -E 'hreflang="(es-CO|en-US|de-DE|fr-FR|pt-BR|x-default)"'
```

Expected:

- Legacy `/pt/blog/...` returns 301/308 to `/pt-br/blog/...`.
- Final `/pt-br/blog/...` returns 200.
- No 404 body/template on final page.
- Head contains canonical + `og:url` on the same PT-BR URL.
- JSON-LD contains PT-BR language.
- Hreflang count and URLs match the translation group.

## 10. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| ADR-019 currently says two-letter URL path segments | Treat `/pt-br` as an explicit PT-BR public blog compatibility amendment; document in tests and request ADR update if reviewer requires. |
| Custom domain behavior diverges from subdomain behavior | Route verified custom domains through `applyLocaleAwareTenantRewrite()` with `website.subdomain`, as current middleware already prefers. Test both host styles. |
| Unsupported tenants start accepting `/pt` or `/pt-br` accidentally | `resolveLocaleFromPublicPath()` must consult normalized tenant `supportedLocales`; keep es/en-only unsupported tests. |
| Hreflang emits non-existent translations | Keep ADR-020 translated-locale filtering; only include published translation-group rows plus default. |
| Hreflang uses wrong slug for alternates | Build blog alternates from translation-group row slug per locale, not by reusing current slug for all locales. |
| Middleware adds heavy logic at edge | Use small pure mapping helpers and existing cached website locale settings; no new DB calls unless already required by current branch. |
| Node version blocks tests locally | Switch to Node >=22 before running `npm test`, `typecheck`, or E2E. |
| OpenNext/Cloudflare incompatibility | Do not use Node-only APIs, filesystem, or `runtime='edge'`; keep code tree-shakable and pure where possible. |

## 11. Developer handoff checklist

Before coding:

- [ ] Switch local Node to >=22.
- [ ] Confirm worktree is clean except expected untracked `kanban.db`.
- [ ] Read ADR-007, ADR-009, ADR-019, ADR-020.

Implementation order:

1. Add/adjust locale segment mapping and unit tests.
2. Add middleware redirect/rewrite tests for `/pt-br` and `/pt` alias.
3. Fix blog locale normalization/data lookup and tests.
4. Add blog metadata/hreflang path-map support and tests.
5. Add E2E verifier regressions through session pool.
6. Run focused unit tests, typecheck, and session-pool E2E on Node >=22.
7. Open PR; do not manually deploy.

Recommended focused commands after Node >=22 is active:

```bash
npm test -- __tests__/lib/seo/locale-routing.test.ts __tests__/lib/seo/hreflang-translated-locales.test.ts __tests__/lib/seo/public-metadata-locale.test.ts __tests__/middleware/locale-site-route.test.ts
npm run typecheck
npm run session:run -- --grep "PT-BR blog routing|public blog|hreflang"
```

## 12. Acceptance criteria

The implementation is accepted only when all of the following are true:

1. Routing/rendering
   - `/pt-br/blog/requisitos-para-viajar-a-colombia-desde-mexico/` returns 200 real PT-BR post content when the PT-BR row exists.
   - It does not render the 404 template with HTTP 200 and does not fall back to ES content silently.
   - `/pt/blog/<slug>` redirects 301/308 to `/pt-br/blog/<slug>` for PT-BR-supporting tenants.
   - Unsupported tenants do not suddenly accept PT-BR aliases.

2. Tenant/domain safety
   - Bukeer subdomains and verified custom domains share the same behavior.
   - Reserved subdomains, API routes, static assets, dashboard/editor routes, and custom-domain canonicalization remain unaffected.

3. Next.js/OpenNext/Cloudflare compatibility
   - No manual deploy.
   - No Node-only APIs or persistent filesystem in middleware/runtime path.
   - No `runtime='edge'` additions.
   - Middleware remains small and cache-aware.

4. SEO outputs
   - `<html lang>` is correct for PT-BR according to the chosen repo convention.
   - canonical uses the final PT-BR canonical URL.
   - `og:url` equals canonical.
   - JSON-LD Article/BlogPosting `inLanguage` matches PT-BR.
   - Hreflang follows ADR-020 and includes a full reciprocal set for complete translation groups.

5. Verifier coverage
   - México PT-BR blog URL has an automated regression test.
   - Panamá `/pt/` alias and PT-BR blog render have automated regression tests.
   - Villa de Leyva complete hreflang set has an automated regression test.

6. Validation
   - Focused unit tests pass on Node >=22.
   - Typecheck passes.
   - Focused E2E passes through the session pool.
   - PR is ready for normal CI/CD; no manual `wrangler deploy`.
