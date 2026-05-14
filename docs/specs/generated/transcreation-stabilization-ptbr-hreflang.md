# SPEC: Transcreation Stabilization P0 — PT-BR Blog Routing + Hreflang

Status: Draft for PLAN validation
Owner role: Specifier
Pipeline: transcreation-stabilization-ptbr-20260514
Repo/worktree: `/opt/data/home/worktrees/transcreation-stabilization`
Target branch: `feat/transcreation-stabilization`
Created: 2026-05-14

## 1. Goal

Fix the public ColombiaTours blog locale routing bug that makes published PT-BR blog rows render as Spanish 404/noindex, and complete reciprocal hreflang generation for localized blog posts.

This is the P0 unblocker for the transcreation pipeline: verifiers are currently failing many otherwise valid DE/FR/PT-BR/EN tasks because one shared public routing/SEO layer is broken.

## 2. Architectural references

- [[ADR-001]] Server-first rendering: public metadata, canonical URLs, robots and JSON-LD are generated server-side.
- [[ADR-007]] Edge-first delivery: routing must remain compatible with Cloudflare Workers/OpenNext and middleware constraints.
- [[ADR-009]] Multi-tenant subdomain routing: locale routing runs after host/subdomain resolution and must remain tenant-safe.
- [[ADR-011]] Middleware cache: middleware lookup changes must keep cache keys stable and avoid unbounded remote calls.
- [[ADR-019]] Multi-locale URL Routing: path-prefix locale routing is the accepted strategy. This spec adds a narrow PT-BR amendment for blog URLs because existing 2-letter-only parsing cannot represent `/pt-br`.
- [[ADR-020]] hreflang Emission Policy: emit default locale plus translated/published locales only; reciprocal alternates are required; `x-default` points to the default-locale canonical.
- [[ADR-021]] Translation Memory + AI Transcreation Pipeline: no transcreation task may mutate canonical product/content truth outside approved overlay/publish flows.

## 3. Current bug reproduction

Production evidence captured with read-only curl on 2026-05-14:

### 3.1 `/pt-br/blog/viajar-a-colombia-desde-panama`

Command:

```bash
curl -sI https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama
curl -sL https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama \
  | grep -Eio '<html[^>]*>|<title[^>]*>[^<]*|noindex|Página no encontrada|404|hreflang="[^"]+"|canonical' \
  | head -40
```

Observed:

- HTTP status is `200`, but the page is a Spanish soft 404.
- Response headers include `x-public-default-locale: es`, `x-public-lang: es`, `x-public-locale: es`.
- HTML includes `<html lang="es" ...>`.
- HTML includes `Página no encontrada`, repeated `404`, and `noindex`.
- `<title>` is `Página no encontrada | ColombiaTours.Travel`.

Interpretation:

- The middleware does not recognize `pt-br` as a locale segment.
- The request falls back to default Spanish locale and a wrong internal path rather than resolving `pt-BR`.
- A real published `pt-BR` row cannot render at its expected public URL, so verifiers correctly treat this as a blocking technical SEO defect.

### 3.2 `/pt/blog/viajar-a-colombia-desde-panama`

Command:

```bash
curl -sI https://colombiatours.travel/pt/blog/viajar-a-colombia-desde-panama
```

Observed:

- HTTP status is `404`.
- Header `x-robots-tag: noindex, nofollow` is present.

Interpretation:

- `/pt` is currently neither a reliable canonical URL nor a reliable redirect/alias.
- Crawlers can hit two Portuguese-looking surfaces, one soft-404 (`/pt-br`) and one hard 404/noindex (`/pt`).

## 4. Root-cause hypothesis from code inspection

The likely root causes are in the public locale/routing and blog data-access boundary:

1. `lib/seo/locale-routing.ts::resolveLocaleFromPublicPath()` only detects first path segments matching `^[a-z]{2}$`. It cannot detect `pt-br`.
2. `lib/seo/locale-routing.ts::buildPublicLocalizedPath()` emits 2-letter language prefixes for every non-default locale. For `pt-BR`, it currently produces `/pt/...`, not `/pt-br/...`.
3. `middleware.ts::normalizeBlogPublicLocale()` maps short `pt` to `pt-PT`, while ColombiaTours transcreation data and supported locales use `pt-BR`.
4. `lib/supabase/get-website.ts::getBlogPostBySlug()` locale fallback covers legacy `es/en`, but does not cover `pt-BR <-> pt` symmetry. Direct lookup of a canonical `pt-BR` row can work, but fallback and mismatch redirects are incomplete.
5. `lib/supabase/get-website.ts::normalizeBlogPublicLocale()` only maps `es -> es-CO` and `en -> en-US`, not `pt -> pt-BR`, `fr -> fr-FR`, `de -> de-DE`.
6. Blog metadata uses `getBlogPostTranslationLocales()` and `buildLocaleAwareAlternateLanguages()`, but hreflang completeness depends on normalized locale rows and canonical public path generation. Legacy short codes and the `/pt` vs `/pt-br` mismatch can omit or mispoint alternates.

## 5. Canonical strategy for PT-BR

### Decision: public canonical prefix is `/pt-br`, not `/pt`

PT-BR public blog canonicals must use:

```text
/pt-br/blog/<slug>
```

Justification:

1. The transcreation pipeline and DB locale contract use `pt-BR`, not generic `pt` and not `pt-PT`.
2. Brazil is the target market; `pt` is ambiguous and can be interpreted as generic Portuguese or Portugal Portuguese.
3. Google hreflang accepts `pt-BR`; the public path should make the regional target obvious and stable.
4. Production verifier examples and expected PT-BR surface already use `/pt-br`.
5. This is a narrow amendment to [[ADR-019]] and [[ADR-020]] for regional locale prefixes where a 2-letter prefix is insufficient. Existing `en`, `de`, `fr` short prefixes remain unchanged.

### Redirect/alias behavior

For published PT-BR blog posts:

- `/pt-br/blog/<slug>` is canonical and must render the `pt-BR` row.
- `/pt/blog/<slug>` is a legacy/generic alias and must 301 or 308 redirect to `/pt-br/blog/<slug>` when a published `pt-BR` row exists for the slug.
- `/pt/blog/<slug>` must not render an independent page with canonical `/pt/...`.
- `/pt/blog/<slug>` must not return 404/noindex when the corresponding `pt-BR` row exists.
- Hreflang for Portuguese must point only to `/pt-br/blog/<slug>`.

For non-blog routes in this P0 scope:

- Do not broaden the behavioral change unless required by shared helper tests.
- If shared helpers need a generic locale prefix map, implement it in a way that preserves existing `en`, `de`, `fr` and default `es` behavior and only changes `pt-BR` path emission to `/pt-br` where canonical generation is invoked.

## 6. Locale mapping contract

The implementation must expose one deterministic mapping at the routing/data/SEO boundary.

| Public route prefix | Alias? | DB locale for blog rows | Hreflang tag | HTML `lang` / request locale | Notes |
|---|---:|---|---|---|---|
| none | canonical default | `es` and `es-CO` accepted at read boundary | `es-CO` (or existing default if tenant default is `es`) | `es`/`es-CO` normalized by existing site settings | Default locale has no prefix per [[ADR-019]]. ColombiaTours production currently emits `es`; do not force a DB migration. |
| `/en` | canonical | `en-US` and legacy `en` accepted | `en-US` | `en-US` | Existing behavior preserved. |
| `/de` | canonical | `de-DE` and legacy `de` accepted | `de-DE` | `de-DE` | Existing behavior preserved/covered. |
| `/fr` | canonical | `fr-FR` and legacy `fr` accepted | `fr-FR` | `fr-FR` | Existing behavior preserved/covered. |
| `/pt-br` | canonical | `pt-BR` and legacy `pt` accepted | `pt-BR` | `pt-BR` | New canonical Portuguese Brazil public prefix. |
| `/pt` | alias only | resolve to `pt-BR` for alias detection | never emit as canonical/hreflang | redirect target locale `pt-BR` | 301/308 to `/pt-br/...` when published row exists. |

Implementation notes:

- Use BCP-47 normalization internally for SEO signals: `es-CO`, `en-US`, `de-DE`, `fr-FR`, `pt-BR`.
- Keep legacy short-code reads because production contains migrated blog rows with `es`/`en` and may contain short rows for other locales.
- Do not update `website_blog_posts.locale` directly. Read-time normalization only.
- HTML `lang` should be driven by the resolved request locale for the rendered page. A `/pt-br/blog/...` response must not emit `<html lang="es">`.

## 7. Files likely to change

Primary code paths:

- `lib/seo/locale-routing.ts`
  - Add a canonical public locale segment helper, e.g. `localeToPublicSegment(locale)` returning `pt-br` for `pt-BR`, `en` for `en-US`, `de` for `de-DE`, `fr` for `fr-FR`, and `null`/empty for default.
  - Update `resolveLocaleFromPublicPath()` to recognize BCP-47-like first segments such as `pt-br` in addition to 2-letter segments.
  - Update `buildPublicLocalizedPath()` so `pt-BR` emits `/pt-br/...`, not `/pt/...`.
  - Preserve existing category/legal localization behavior.

- `middleware.ts`
  - Ensure the middleware recognizes `/pt-br` as a locale segment and sets `x-public-locale: pt-BR`, `x-public-lang: pt`, and `x-public-locale-segment: pt-br` (or equivalent stable segment value) before rewriting.
  - Fix blog read/redirect helpers that currently map `pt -> pt-PT`; for ColombiaTours public blog, `pt` must resolve to `pt-BR`.
  - Add alias redirect handling for `/pt/blog/<slug>` to canonical `/pt-br/blog/<slug>` when a published PT-BR row exists.

- `lib/supabase/get-website.ts`
  - Extend blog locale candidate normalization for `pt-BR`, `fr-FR`, and `de-DE`, matching existing middleware candidate logic.
  - Extend `normalizeBlogPublicLocale()` to map `pt -> pt-BR`, `fr -> fr-FR`, `de -> de-DE`.
  - Ensure `getBlogPostTranslationLocales()` returns normalized unique BCP-47 locales so hreflang generation sees `pt-BR`, `en-US`, `de-DE`, `fr-FR`, and default.

- `lib/seo/public-metadata.ts`
  - Confirm no extra changes are required after `buildPublicLocalizedPath()` and normalized translated locales are fixed. If changes are needed, keep them limited to canonical/hreflang generation.

- `app/site/[subdomain]/blog/[slug]/page.tsx`
  - Confirm metadata and render paths use the canonical `blogPath` and localized context consistently for PT-BR.
  - Ensure JSON-LD `inLanguage` receives `pt-BR` on `/pt-br/...`.

Tests:

- `__tests__/lib/seo/locale-routing.test.ts`
- `__tests__/lib/seo/hreflang-translated-locales.test.ts`
- `__tests__/middleware/locale-site-route.test.ts`
- Add a focused blog locale test if no current unit seam covers `getBlogPostBySlug()` locale candidates.

Optional evidence doc:

- `docs/qa/transcreation/ptbr-routing-repro.md` for before/after curl evidence if the implementer captures production/local smoke output.

## 8. Acceptance criteria

### Routing/rendering

1. `https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama` renders the published PT-BR post, not a Spanish 404 page.
2. The PT-BR response does not include `Página no encontrada` for a published row.
3. The PT-BR response does not include `noindex` unless the specific row has an explicit row-level noindex flag. The known published PT-BR post must be indexable.
4. The PT-BR response emits an HTML language signal consistent with PT-BR (`pt-BR` preferred; `pt` acceptable only if Next/html constraints require short language code and JSON-LD/hreflang are BCP-47).
5. JSON-LD for the PT-BR post has `inLanguage: pt-BR`.
6. `/pt/blog/viajar-a-colombia-desde-panama` redirects permanently to `/pt-br/blog/viajar-a-colombia-desde-panama` when the PT-BR row exists.
7. `/pt/blog/...` does not become a separate indexable canonical URL.
8. Existing `/en`, `/de`, `/fr`, and default Spanish blog routes keep their current canonical shape.

### Hreflang/canonical

9. For a translation group with published ES, EN, DE, FR, and PT-BR rows, every localized blog page emits reciprocal alternates for the same set:
   - `es-CO` or tenant default Spanish tag as already accepted by the repo,
   - `en-US`,
   - `de-DE`,
   - `fr-FR`,
   - `pt-BR`,
   - `x-default` pointing to the default Spanish canonical.
10. The `pt-BR` alternate href points to `/pt-br/blog/<pt-br-slug>`.
11. No hreflang alternate points to `/pt/blog/<slug>`.
12. Do not emit alternates for locales without a published row in the translation group, except the default locale required by [[ADR-020]].
13. Canonical for PT-BR is `/pt-br/blog/<slug>`.
14. Canonical for default Spanish remains unprefixed.

### Safety/scope

15. No destructive DB writes or migrations are introduced.
16. No content rewriting/transcreation copy changes are introduced.
17. No Growth OS, Kanban verifier, cultural-validator, feedback-loop, GSC, or GA4 refactor is included in this implementation.
18. The change remains Cloudflare Worker compatible: no Node-only APIs in middleware or public routing helpers.
19. Existing middleware cache behavior remains bounded and tenant-scoped.

## 9. Test plan

### Unit tests

Run with Node 22:

```bash
npm test -- --runTestsByPath \
  __tests__/lib/seo/locale-routing.test.ts \
  __tests__/lib/seo/hreflang-translated-locales.test.ts \
  __tests__/middleware/locale-site-route.test.ts
```

Required new/updated assertions:

```ts
expect(resolveLocaleFromPublicPath('/pt-br/blog/foo', settings)).toMatchObject({
  hasLanguageSegment: true,
  languageSegment: 'pt-br',
  resolvedLocale: 'pt-BR',
  resolvedLanguage: 'pt',
  pathnameWithoutLang: '/blog/foo',
});

expect(buildPublicLocalizedPath('/blog/foo', 'pt-BR', 'es-CO')).toBe('/pt-br/blog/foo');
expect(buildPublicLocalizedPath('/blog/foo', 'en-US', 'es-CO')).toBe('/en/blog/foo');
expect(buildPublicLocalizedPath('/blog/foo', 'de-DE', 'es-CO')).toBe('/de/blog/foo');
expect(buildPublicLocalizedPath('/blog/foo', 'fr-FR', 'es-CO')).toBe('/fr/blog/foo');
expect(buildPublicLocalizedPath('/blog/foo', 'es-CO', 'es-CO')).toBe('/blog/foo');
```

Hreflang assertions:

```ts
const links = generateHreflangLinksForLocales(
  'https://colombiatours.travel',
  '/blog/viajar-a-colombia-desde-panama',
  {
    defaultLocale: 'es-CO',
    supportedLocales: ['es-CO', 'en-US', 'de-DE', 'fr-FR', 'pt-BR'],
  },
  ['en-US', 'de-DE', 'fr-FR', 'pt-BR'],
);
const map = Object.fromEntries(links.map((link) => [link.hreflang, link.href]));
expect(map['pt-BR']).toBe('https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama');
expect(map['en-US']).toBe('https://colombiatours.travel/en/blog/viajar-a-colombia-desde-panama');
expect(map['x-default']).toBe('https://colombiatours.travel/blog/viajar-a-colombia-desde-panama');
expect(Object.values(map).some((href) => href.includes('/pt/blog/'))).toBe(false);
```

Blog locale normalization assertions:

```ts
expect(normalizeBlogPublicLocale('pt')).toBe('pt-BR');
expect(normalizeBlogPublicLocale('pt-BR')).toBe('pt-BR');
expect(normalizeBlogPublicLocale('fr')).toBe('fr-FR');
expect(normalizeBlogPublicLocale('de')).toBe('de-DE');
```

### Static checks

```bash
npm run typecheck
npm run lint
```

### Worker build

```bash
npm run build:worker
```

### Local/public smoke

Use the session pool if starting a local server; never use port 3000 directly from an agent.

Suggested post-deploy production smoke:

```bash
curl -sI https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama
curl -sL https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama \
  | grep -E '<html lang=|rel="canonical"|hreflang="pt-BR"|hreflang="en-US"|noindex|Página no encontrada|inLanguage'

curl -sI https://colombiatours.travel/pt/blog/viajar-a-colombia-desde-panama
```

Expected smoke result:

- `/pt-br/...` returns a successful page with PT-BR metadata and no not-found/noindex markers for published content.
- `/pt/...` returns a permanent redirect to the matching `/pt-br/...` URL.
- DE/FR/EN pages in the same translation group include `hreflang="pt-BR"` pointing to `/pt-br/...`.

## 10. Implementation sequencing guidance

1. Add failing unit tests for `/pt-br` route parsing and `/pt-BR` public path generation.
2. Add failing unit tests for hreflang `pt-BR -> /pt-br` and absence of `/pt/blog` alternates.
3. Patch `lib/seo/locale-routing.ts` to support region-specific public segments.
4. Patch middleware blog locale normalization and alias redirect behavior.
5. Patch blog data-access locale normalization/candidates in `lib/supabase/get-website.ts`.
6. Re-run focused Jest tests until green.
7. Run `npm run typecheck`, `npm run lint`, and `npm run build:worker`.
8. Capture before/after smoke evidence in `docs/qa/transcreation/ptbr-routing-repro.md` if production/local evidence is available.

## 11. Non-goals

- No content rewriting, translation editing, or transcreation copy changes.
- No destructive DB mutation or migration of `website_blog_posts.locale`.
- No Growth OS refactor.
- No Kanban verifier incident-system changes in this P0 implementation.
- No cultural-validator split or feedback-learning loop changes.
- No sitemap-wide redesign beyond keeping page-level hreflang/canonical consistent with existing helpers.
- No broad URL strategy rewrite for all regional locales beyond the necessary PT-BR public prefix support.

## 12. Open validation questions for Tech Validator

1. Should this be recorded as a formal amendment to [[ADR-019]] after implementation, or is this generated SPEC enough for Sprint 1 P0?
2. For redirect status from `/pt/blog/...` to `/pt-br/blog/...`, prefer 301 for canonical SEO migration or 308 to match existing not-found/mismatch redirect style? This spec accepts either permanent status, with 301 preferred for SEO clarity.
3. ColombiaTours production currently exposes `x-public-default-locale: es`; should acceptance allow `es` while canonical hreflang uses `es-CO`, or should the implementation normalize the tenant default locale to `es-CO` at the public metadata boundary only? This spec avoids forcing a tenant data change.
