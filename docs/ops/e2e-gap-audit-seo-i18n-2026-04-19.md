# E2E Production-Readiness Audit — SEO + i18n (2026-04-19)

**Branch audited:** `codex/wave2-close-199-202` · HEAD `1a1a774`
**Auditor:** Claude Code (Opus 4.7 · 1M) · read-only static analysis
**Source of truth:** GitHub open issues (57 total) + `git log` since 2025-10-01 (511 commits) + codebase inventory + `e2e/tests/**`

---

## Executive Summary

| Metric | Value |
|---|---|
| Open issues audited | 57 |
| Relevant (SEO/i18n) | 38 |
| SEO/i18n source files mapped | 88 (30 `lib/seo` + 45 API routes + 29 admin components + 3 `lib/site` + 12 metadata-bearing pages + middleware + sitemap + robots) |
| SEO/i18n migrations shipped | 5 (transcreate v2/v21/rate-limit + multi-locale + overlay) |
| E2E spec files (all) | 35 |
| E2E specs touching SEO/i18n surface | 11 |
| Critical public-facing flows covered by E2E (HTML output) | 1 / 13 |
| **P0 gaps** | **13** |
| **P1 gaps** | **9** |
| **P2 gaps** | **7** |

### Recommended next sprint test scope (ship order)

1. **[P0-1]** Public SEO HTML assertion suite (`e2e/tests/public-seo.spec.ts`) — title, meta description, canonical, OG, Twitter, JSON-LD on all 9 route types under `/site/[subdomain]`.
2. **[P0-2]** Sitemap + robots route integration (`e2e/tests/public-sitemap.spec.ts`) — `/sitemap.xml`, `/site/[subdomain]/sitemap.xml`, `/robots.txt` XML schema + URL counts + noindex filter.
3. **[P0-3]** Hreflang alternates rendered in `<head>` (`e2e/tests/public-hreflang.spec.ts`) — translated-locales filter, self-reference, x-default.
4. **[P0-4]** Middleware locale routing (`e2e/tests/middleware-locale-routing.spec.ts`) — `/en/paquetes/...` rewrite, fallback to default, legacy redirect 301, slug redirect 301.
5. **[P0-5]** Revalidate end-to-end (`e2e/tests/revalidate-flow.spec.ts`) — POST `/api/revalidate` with valid secret → public page HTML updates.
6. **[P0-6]** Transcreate publish → public render (extend `seo-transcreate-v2-lifecycle.spec.ts`) — after `applied`, public URL serves translated strings.
7. **[P1]** Public-UI i18n strings (wave2 `lib/site/public-ui-messages.ts`) — header, footer, 404, error copy per locale.
8. **[P1]** AI crawler header override — User-Agent spoof → `X-Robots-Tag: index, follow`.

---

## Methodology

### Phase A — GitHub + git inventory

```bash
gh issue list --state open --limit 500 --json number,title,labels,body,createdAt,updatedAt > /tmp/gh-issues-open.json
# 57 issues
git log --all --since="2025-10-01" --pretty=format:'%H|%s|%an|%ad' --date=short > /tmp/git-log-since-oct.txt
# 511 commits
```

Filter regex: `/seo|sitemap|robots|metadata|og:|jsonld|json-ld|structured|canonical|hreflang|locale|i18n|transcreate|translat|idioma/i` → 38 relevant issues.

Commit/issue correlation via `#NNN`, `closes #`, `fixes #` in subject.

### Phase B — Codebase map

- **SEO sources**: `app/sitemap.ts`, `app/robots.ts`, `app/site/[subdomain]/sitemap.xml/route.ts`, `lib/seo/**` (30 files), 45 routes under `app/api/seo/**`, 29 admin components (`components/admin/seo-*.tsx`).
- **i18n sources**: `middleware.ts`, `lib/seo/locale-routing.ts`, `lib/seo/hreflang.ts`, `lib/seo/slug-locale.ts`, `lib/seo/transcreate-*.ts` (4 files), `lib/seo/translation-memory.ts`, `lib/site/public-ui-messages.ts`, `lib/site/public-ui-extra-text.ts`, `components/site/language-switcher.tsx`, `components/site/website-locale-provider.tsx`, `components/admin/translations-dashboard.tsx`, `components/admin/translation-bulk-bar.tsx`, `components/admin/translation-row.tsx`.
- **Metadata-bearing pages** (12): `app/site/[subdomain]/{page,layout,[...slug],paquetes/[slug],blog/page,blog/[slug],planners/[slug],buscar,terms,privacy,cancellation}.tsx` + `app/domain/[host]/[[...slug]]/page.tsx`.
- **Migrations**: `20260418000000_multi_locale_content.sql`, `20260423000100_transcreate_ai_rate_limit.sql`, `20260501000000_transcreate_payload_v2_and_body_content.sql`, `20260502000000_transcreate_v21_canary_and_overlay.sql`, `20260502020000_website_product_pages_locale_overlay.sql`.

### Phase C — Test coverage inventory

- **E2E specs** touching SEO/i18n: `seo-playbook-e2e.spec.ts` (21), `seo-analytics-impl.spec.ts` (3), `seo-gsc-badge.spec.ts` (3), `seo-content-intelligence-epic86.spec.ts` (7), `seo-flows-interactive.spec.ts` (16), `seo-item-detail-matrix.spec.ts` (4), `seo-transcreate-v2-lifecycle.spec.ts` (2), `transcreate-stream.spec.ts` (2), `translations-dashboard.spec.ts` (3), `security-api-auth-contract.spec.ts` (5), `glossary.spec.ts` (3), `public-runtime.smoke.spec.ts` (4).
- **Unit / CT coverage**: `__tests__/lib/seo/{slug-locale,hreflang-translated-locales,transcreate-rate-limit,transcreate-client,blog-workflow-status,content-intelligence}.test.ts`, `__tests__/lib/site/public-ui-messages.test.ts`, `__tests__/lib/ai/locale-adaptation-prompt.test.ts`, `__tests__/api/seo-transcreate-{route-ai,stream-route}.test.ts`, `__tests__/api/seo-translations-bulk-route.test.ts`, `__tests__/schema/{homepage,blog,booking,places-cache,trust-content}*`, `__tests__/ct/studio-editor/translations/{drift-banner,translation-bulk-bar}.spec.tsx`.
- **Observation**: **ZERO** E2E greps for `sitemap.xml`, `robots.txt`, or `canonical`. Only `hreflang` appears via issue titles/descriptions, not asserted in public HTML. Public HTML output is tested ONLY for `status < 500` (`public-runtime.smoke.spec.ts`).

---

## Gap Matrix

Legend: **E2E ok** = test asserts public HTML or API output · **Partial** = test reaches route but skips assertions under conditions · **Unit-only** = logic tested but HTML/API not validated · **None** = no automated coverage.

### Public-facing SEO flows (SSR HTML output)

| # | Flow | Issue(s) | Related commits | Source | Existing E2E | Unit/CT | Gap | Severity |
|---|---|---|---|---|---|---|---|---|
| 1 | Global sitemap `/sitemap.xml` | #23, #52 | b821cc0, 9ff6a49, fff9a8a | `app/sitemap.ts`, `lib/seo/sitemap.ts` | None | None | **No E2E asserts XML, URL count, or noindex filter** | **P0** |
| 2 | Per-tenant sitemap `/site/[subdomain]/sitemap.xml` | #23, #52 | b821cc0 | `app/site/[subdomain]/sitemap.xml/route.ts` | None | None | **No E2E asserts per-tenant URLs, alternates, noindex filtering** | **P0** |
| 3 | `robots.txt` | #23 | — | `app/robots.ts`, `lib/seo/robots-txt.ts` | None | None | **No E2E asserts Sitemap: line, user-agent policies** | **P0** |
| 4 | `llms.txt` (AI crawlers) | #77 | — | `lib/seo/llms-txt.ts` | None | None | **No E2E asserts llms.txt served** | P2 |
| 5 | Root `generateMetadata` (homepage `/site/[subdomain]/page.tsx`) | #23, #182 | e8473d6, fff9a8a, c82fda6 | `app/site/[subdomain]/page.tsx`, `lib/seo/public-metadata.ts` | `public-runtime.smoke` — **status only** | `__tests__/schema/homepage-schemas.test.ts` (contract only) | **No E2E asserts `<title>`, `<meta>`, OG, Twitter** | **P0** |
| 6 | Product page metadata `/paquetes/[slug]` | cross-repo flutter SEO gap #2, #71 | 2fa0eece (#78), ae2c06d, 877b194 | `app/site/[subdomain]/paquetes/[slug]/page.tsx` | None | None | **No E2E for package metadata** | **P0** |
| 7 | Blog metadata `/blog`, `/blog/[slug]` | #73, #28 | e1c00b6, — | `app/site/[subdomain]/blog/**` | None | `__tests__/schema/blog-schemas.test.ts` | Unit-only, **no E2E for blog SEO HTML** | **P0** |
| 8 | Generic slug `/[...slug]` metadata | #59, #67 | c353c61 | `app/site/[subdomain]/[...slug]/page.tsx` | None | None | **No E2E** | **P0** |
| 9 | Legal pages metadata (terms/privacy/cancellation) | #22 | c353c61 | `app/site/[subdomain]/{terms,privacy,cancellation}/page.tsx` | None | None | No E2E | P1 |
| 10 | Buscar `/buscar` metadata + noindex | #59 | — | `app/site/[subdomain]/buscar/page.tsx` | None | None | No E2E asserting `noindex` on search | P1 |
| 11 | Hreflang alternates in `<head>` | #198, #146, #146 (hreflang-audit cron), #199 | e8473d6, 92aed9b, 7762b37 | `lib/seo/hreflang.ts`, consumed by all `generateMetadata` | None | `__tests__/lib/seo/hreflang-translated-locales.test.ts` | **Unit covers filter logic, NO E2E asserts rendered `<link rel=alternate hreflang>`** | **P0** |
| 12 | Canonical URL `<link rel=canonical>` | #60, #198 | c82fda6 | `lib/seo/public-metadata.ts` | None | None | **No E2E asserts canonical on any page** | **P0** |
| 13 | JSON-LD structured data (TravelAgency, TouristTrip, VideoObject, FAQ, Breadcrumb) | #79 (Schema.org per-template), #165 (VideoObject), #73, #67 | 84438bb, ae2c06d | `components/site/**`, `components/admin/seo-schema-manager.tsx` | None | `__tests__/schema/*` (contract shape only) | **Unit covers contract, NO E2E asserts JSON-LD script tag in HTML** | **P0** |
| 14 | OpenGraph + Twitter meta | #29 (image sitemap) | — | `lib/seo/og-helpers.ts` | None | None | **No E2E asserts og:image, og:title, twitter:card** | **P0** |
| 15 | AI crawler header override (`X-Robots-Tag: index, follow`) | #77 | — | `middleware.ts:473-481` | None | None | **No E2E simulates GPTBot/ClaudeBot UA** | P1 |

### Middleware / routing flows

| # | Flow | Issue(s) | Related commits | Source | Existing E2E | Unit/CT | Gap | Severity |
|---|---|---|---|---|---|---|---|---|
| 16 | Locale-aware tenant rewrite (`/en/paquetes/*` → `/site/[sub]/paquetes/*`) | #198, #199 | c82fda6, 6d61bc3, 7762b37 | `middleware.ts:335-385`, `lib/seo/locale-routing.ts` | None | None | **No E2E asserts rewrite target or x-locale headers** | **P0** |
| 17 | Locale fallback chain (requested → base → default) | #198, #199 | c82fda6 | `lib/seo/locale-routing.ts` | None | None | No E2E asserts fallback when locale not in `supported_locales` | P2 |
| 18 | Legacy redirect 301 (`website_legacy_redirects`) | #22, #24, #26 | 6954e20, — | `middleware.ts:271-333` | None | None | **No E2E hits legacy path → asserts 301 + target** | P1 |
| 19 | Slug redirect 301 (`slug_redirects`) | #26 | — | `middleware.ts:208-238` | None | None | No E2E | P1 |
| 20 | www → apex canonicalization 301 | #22 | — | `middleware.ts:613-623` | None | None | No E2E | P2 |
| 21 | Custom domain + locale combined | #22 | — | `middleware.ts:656-669`, `app/domain/[host]/[[...slug]]/page.tsx` | None | `__tests__/domain-routing.test.ts` (unit) | Unit-only, **no E2E for custom-domain + `/en/` path** | P2 |
| 22 | Reserved subdomain bypass (`www`, `app`, `api`, ...) | — | — | `middleware.ts:10-18, 564` | None | None | No E2E | P2 |

### Translation / transcreate flows

| # | Flow | Issue(s) | Related commits | Source | Existing E2E | Unit/CT | Gap | Severity |
|---|---|---|---|---|---|---|---|---|
| 23 | Transcreate v2 lifecycle: draft → reviewed → applied (dashboard) | #198, #199 | 1c2e3b4, 9923b3c | `app/api/seo/content-intelligence/transcreate/route.ts` | `seo-transcreate-v2-lifecycle.spec.ts` (2 tests) | `__tests__/api/seo-transcreate-route-ai.test.ts` | **E2E ok** (dashboard-only — does NOT verify public HTML reflects new locale) | covered |
| 24 | Transcreate `applied` → **public URL renders new locale** | #198, #199 | 1c2e3b4 | (downstream of #23) | None | None | **No E2E closes loop: applied transcreate → GET `/en/...` returns translated copy** | **P0** |
| 25 | Transcreate streaming endpoint | #198 | 9089cf2, 3412324 | `app/api/seo/content-intelligence/transcreate/stream/route.ts` | `transcreate-stream.spec.ts` (2 tests) | `__tests__/api/seo-transcreate-stream-route.test.ts` | **E2E ok** | covered |
| 26 | Transcreate v21 extended 15-field schema | #202 | dba7dbf | `supabase/migrations/20260502000000_transcreate_payload_v2_and_body_content.sql` | None | `seo-transcreate-v2-lifecycle.spec.ts` (test 2 — schema 2.1) | Partial — no end-to-end verify body content rendered | P1 |
| 27 | Bulk publish translations API | #198 | f2fadb4 | `app/api/seo/translations/bulk/route.ts` | `security-api-auth-contract` (auth reject only) | `__tests__/api/seo-translations-bulk-route.test.ts`, `__tests__/ct/.../translation-bulk-bar.spec.tsx` | **No E2E for happy path bulk publish → public render** | P1 |
| 28 | Translations dashboard KPIs + coverage matrix | #198 | 8dd2dca, a2df645 | `components/admin/translations-dashboard.tsx` | `translations-dashboard.spec.ts` (3 tests) | CT: `translations/drift-banner.spec.tsx`, `translation-bulk-bar.spec.tsx` | **E2E ok** | covered |
| 29 | Drift banner (source changed post-publish) | #198 | — | `components/admin/translation-row.tsx` | None | CT `drift-banner.spec.tsx` | CT-only, **no E2E triggers drift → sees banner** | P1 |
| 30 | Glossary enforcement on transcreate output | #198 | fbbadfe, 9657a3e | `app/api/seo/glossary/route.ts`, `lib/seo/transcreate-workflow.ts` | `glossary.spec.ts` (3 tests — locale filter ok) | None | **E2E covers glossary CRUD but not enforcement during transcreate** | P1 |
| 31 | Translation memory reuse | #198 | e65b139 | `lib/seo/translation-memory.ts` | None | None | No E2E, no unit | P2 |
| 32 | AI rate-limit on transcreate | #195 | 9089cf2 | `lib/seo/transcreate-rate-limit.ts`, migration `20260423000100` | None | `__tests__/lib/seo/transcreate-rate-limit.test.ts` | Unit-only, no E2E | P2 |

### Public UI i18n (wave2 — #199 foundation)

| # | Flow | Issue(s) | Related commits | Source | Existing E2E | Unit/CT | Gap | Severity |
|---|---|---|---|---|---|---|---|---|
| 33 | Public UI messages rendered in locale (header, footer, CTAs, 404) | #199 | 1a1a774, 18c466d, 0bad716 | `lib/site/public-ui-messages.ts`, `lib/site/public-ui-extra-text.ts`, `components/site/{site-header,site-footer,language-switcher,website-locale-provider}.tsx` | None | `__tests__/lib/site/public-ui-messages.test.ts` | **Unit covers dictionary lookup, NO E2E renders `/en/` and asserts English copy in header/footer/404** | **P1** |
| 34 | Language switcher navigates to path-based URL | #199 | 7762b37 | `components/site/language-switcher.tsx` | None | None | **No E2E clicks switcher → verifies URL + copy change** | P1 |
| 35 | Market switcher (currency + locale combined) | #182 | b7939ca (visibility check only) | `components/site/site-header.tsx` | `public-runtime.smoke` — visibility only | None | **No E2E exercises full switch flow** | P1 |

### Infrastructure / publishing

| # | Flow | Issue(s) | Related commits | Source | Existing E2E | Unit/CT | Gap | Severity |
|---|---|---|---|---|---|---|---|---|
| 36 | `POST /api/revalidate` with valid secret | #22, #121 | 1a535c1 | `app/api/revalidate/route.ts` | `security-api-auth-contract` (rejects invalid secret) | None | **No E2E: valid secret → GET public page reflects change** | **P0** |
| 37 | SEO noindex toggle filters sitemap | #52 | 9ff6a49, b821cc0 | `app/sitemap.ts`, `lib/seo/sitemap.ts` | None | None | No E2E asserts noindex URLs excluded | P1 |
| 38 | Image sitemap (media library) | #29, #47 | — | `lib/seo/sitemap.ts` | None | None | No E2E | P2 |
| 39 | ISR cache hit/miss on locale path | #22 | — | All `generateMetadata` pages use ISR | None | None | No E2E measures ISR behavior per-locale | P2 |

---

## Critical Gaps (P0) — Proposed Playwright Tests

### P0-1 · `e2e/tests/public-seo-metadata.spec.ts`

**Flows covered:** #5, #6, #7, #8, #12, #14

```ts
test.describe('Public SEO metadata — <head> assertions', () => {
  for (const route of ['/site/colombiatours', '/site/colombiatours/paquetes/X', '/site/colombiatours/blog/Y', '/site/colombiatours/destinos/cartagena']) {
    test(`${route} renders complete <head>`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveTitle(/\S+/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S+/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:/);
      await expect(page.locator('meta[property="og:title"]')).toBeAttached();
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https?:.+\.(jpg|png|webp)/i);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', /summary|summary_large_image/);
    });
  }
});
```

### P0-2 · `e2e/tests/public-sitemap.spec.ts`

**Flows covered:** #1, #2, #3, #37

```ts
test('global sitemap serves valid XML with ≥1 <url>', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/xml/);
  const body = await res.text();
  expect(body).toMatch(/<urlset/);
  expect(body.match(/<url>/g)?.length).toBeGreaterThan(0);
});
test('per-tenant sitemap lists only published + not-noindex', async ({ request }) => {
  const res = await request.get('/site/colombiatours/sitemap.xml');
  expect(res.status()).toBe(200);
  const body = await res.text();
  // Seed a noindex product, assert absent
});
test('robots.txt references sitemap + sets crawl policy', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  expect(await res.text()).toMatch(/Sitemap:\s+https?:/);
});
```

### P0-3 · `e2e/tests/public-hreflang.spec.ts`

**Flows covered:** #11

```ts
test('hreflang alternates rendered only for translated locales', async ({ page }) => {
  await page.goto('/site/colombiatours');
  const links = page.locator('link[rel="alternate"][hreflang]');
  const hreflangs = await links.evaluateAll(els => els.map(e => e.getAttribute('hreflang')));
  // Assert self + translated locales present; hreflang="x-default" present; untranslated locales absent
  expect(hreflangs).toContain('es-CO');
  expect(hreflangs).toContain('x-default');
});
```

### P0-4 · `e2e/tests/public-structured-data.spec.ts`

**Flows covered:** #13

```ts
test('homepage exposes Organization / TravelAgency JSON-LD', async ({ page }) => {
  await page.goto('/site/colombiatours');
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  const parsed = JSON.parse(jsonLd!);
  expect(parsed['@context']).toBe('https://schema.org');
  expect(['Organization', 'TravelAgency']).toContain(parsed['@type']);
});
test('package page exposes TouristTrip + BreadcrumbList', async ({ page }) => {
  await page.goto('/site/colombiatours/paquetes/X');
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = scripts.map(s => JSON.parse(s)['@type']);
  expect(types).toEqual(expect.arrayContaining(['TouristTrip', 'BreadcrumbList']));
});
test('package with video exposes VideoObject JSON-LD (#165)', async ({ page }) => { /* ... */ });
```

### P0-5 · `e2e/tests/middleware-locale-routing.spec.ts`

**Flows covered:** #16

```ts
test('GET /paquetes/X on a multi-locale tenant serves default locale', async ({ request }) => {
  const res = await request.get('https://colombiatours.bukeer.com/paquetes/X', { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  expect(res.headers()['x-public-resolved-locale']).toBe('es-CO');
});
test('GET /en/paquetes/X serves English variant', async ({ page }) => {
  await page.goto('/en/paquetes/X');
  await expect(page.locator('html')).toHaveAttribute('lang', /^en/);
  await expect(page).toHaveTitle(/\b(Tours|Package|Trip)\b/i);
});
test('unsupported locale falls back to default (no 404)', async ({ request }) => { /* ... */ });
```

### P0-6 · `e2e/tests/revalidate-flow.spec.ts`

**Flows covered:** #36

```ts
test('valid REVALIDATE_SECRET invalidates ISR cache', async ({ request, page }) => {
  const firstFetch = await page.goto('/site/colombiatours/paquetes/X');
  const etag1 = firstFetch?.headers()['etag'];
  // Mutate DB via service-role admin
  // POST /api/revalidate with valid secret
  const res = await request.post('/api/revalidate', { data: { path: '/site/colombiatours/paquetes/X' }, headers: { 'x-revalidate-secret': process.env.REVALIDATE_SECRET! } });
  expect(res.status()).toBe(200);
  // Refetch and assert body reflects mutation (or etag changed)
});
```

### P0-7 · extend `seo-transcreate-v2-lifecycle.spec.ts`

**Flows covered:** #24

```ts
test('v2 applied transcreate renders on /en/paquetes/{slug}', async ({ page }) => {
  // Existing: draft → reviewed → applied
  // Add: page.goto(`/en/paquetes/${slug}`) and assert translated title/description in <head> + body
});
```

---

## Proposed Test Stubs (file list)

```
e2e/tests/
  public-seo-metadata.spec.ts         (P0-1) — 6 route types × 5 head tags
  public-sitemap.spec.ts              (P0-2) — global + per-tenant sitemap + robots
  public-hreflang.spec.ts             (P0-3) — translated-locales filter + x-default
  public-structured-data.spec.ts      (P0-4) — JSON-LD per template
  middleware-locale-routing.spec.ts   (P0-5) — rewrite, fallback, redirects
  revalidate-flow.spec.ts             (P0-6) — ISR end-to-end
  public-ui-i18n.spec.ts              (P1)   — header/footer/404 per locale
  ai-crawler-headers.spec.ts          (P1)   — UA spoof → X-Robots-Tag
  translation-drift.spec.ts           (P1)   — source change → banner + republish
  glossary-enforcement.spec.ts        (P1)   — transcreate respects glossary
  legacy-redirects.spec.ts            (P1)   — website_legacy_redirects 301
  slug-redirects.spec.ts              (P1)   — slug_redirects 301
  www-canonical.spec.ts               (P2)   — www → apex 301
  custom-domain-locale.spec.ts        (P2)   — custom domain + /en/
  locale-fallback-chain.spec.ts       (P2)   — requested → base → default
  translation-memory-reuse.spec.ts    (P2)
  ai-rate-limit.spec.ts               (P2)
```

---

## Commits Without Tests (last 90 days, touching SEO/i18n)

| Commit | Subject | Test delta |
|---|---|---|
| `1a1a774` | feat(i18n): wave2 docs, config, and extra text files | Unit (`public-ui-messages.test.ts`) — **no E2E** |
| `dba7dbf` | feat(db): wave2 transcreate v21 and locale overlay migrations | Covered by `seo-transcreate-v2-lifecycle` test 2 (dashboard-only) |
| `18c466d` | feat(i18n): wave2 site pages and components localization | **No E2E** for public-ui i18n |
| `a2df645` | feat(translations): wave2 dashboard UI updates | `translations-dashboard.spec.ts` ok |
| `0bad716` | feat(i18n): add public UI localized messages | Unit only |
| `1c2e3b4` | feat(transcreate): wave2 v2 API + locale-aware schemas | `seo-transcreate-v2-lifecycle` (dashboard-only) |
| `8dd2dca` | feat(translations): add coverage matrix to translations dashboard | `translations-dashboard.spec.ts` ok |
| `e8473d6` | feat(transcreate): add translated locales to hreflang alternates | Unit (`hreflang-translated-locales.test.ts`) — **no E2E asserts rendered `<link>`** |
| `92aed9b` | fix(hreflang): filter hreflang links to translated locales only | Unit — **no E2E** |
| `7762b37` | fix(locale): language switch navigate to path-based URL for SEO | **No E2E** asserts URL format post-click |
| `fbbadfe` | feat(transcreate): add glossary enforcement + output normalization | **No E2E** asserts glossary applied |
| `9089cf2` | feat(transcreate): add stream endpoint + AI rate limiting | `transcreate-stream.spec.ts` ok |
| `b821cc0` | fix(seo): sitemap filters noindex products and destinations (#52) | **No E2E** asserts noindex excluded |
| `9ff6a49` | feat(seo): noindex toggle per page (#52) | **No E2E** asserts public noindex rendering |
| `2fa0eece` | feat(seo): #78 product_seo_overrides table + Zod schema + locale URL param | **No E2E** asserts overlay renders on public |
| `84438bb` | feat(video): #165 — video_url + hero lightbox + VideoObject JSON-LD | **No E2E** asserts VideoObject in `<script type=application/ld+json>` |
| `c82fda6` | feat(lib): add locale-routing + nlp-score + public-metadata + serp-snapshot | **No E2E** for middleware locale routing |
| `6d61bc3` | fix(middleware): update locale routing + site pages + sections | **No E2E** |
| `0a41e57` | feat(lib): add slug-locale + backend-service updates + test | Unit `slug-locale.test.ts` — **no E2E** |
| `8aa0de9` | feat(contract): add translations schema + update multi-locale migration | Contract only |

**Net finding**: 20 SEO/i18n-touching commits in last 90 days lack E2E coverage on the public render path. Dashboard/admin E2E is strong; public HTML output E2E is nearly absent.

---

## Cross-Repo SEO Gaps (`.claude/rules/cross-repo-flutter.md`)

These are documented bugs in the flutter rules file, not yet filed as issues:

1. `inLanguage` hardcoded to `'es'` — should read from `websites.default_locale`. **Gap: no E2E asserts `inLanguage` matches locale.**
2. `/packages/[slug]` page missing — only `/paquetes/[slug]` (Spanish). **Gap: English route absent → hreflang alt will 404 for en-US.**
3. `slug` field missing in `package_kits` table — **Gap: no schema contract test enforces presence.**

Recommend filing these as issues before next release.

---

## Appendix A — Commands Used

```bash
# Issue inventory
gh issue list --state open --limit 500 --json number,title,labels,body,createdAt,updatedAt > /tmp/gh-issues-open.json
jq length /tmp/gh-issues-open.json                                             # 57

# Commit inventory
git log --all --since="2025-10-01" --pretty=format:'%H|%s|%an|%ad' --date=short > /tmp/git-log-since-oct.txt
wc -l /tmp/git-log-since-oct.txt                                               # 511

# SEO/i18n commits, last 90d, filtered by path
git log --since="2026-01-19" --pretty=format:'%H|%s' -- \
  app/sitemap.ts app/robots.ts app/site/ lib/seo/ lib/site/ middleware.ts \
  app/api/seo/ 'components/admin/seo-*' 'components/admin/translat*' \
  'components/site/language-*' 'components/site/website-locale*' \
  'supabase/migrations/*transcreate*' 'supabase/migrations/*locale*'

# Filter relevant issues
grep -iE 'seo|sitemap|robots|metadata|og:|jsonld|json-ld|structured|canonical|hreflang|locale|i18n|transcreate|translat|idioma' /tmp/issues-flat.tsv

# Coverage probes
grep -lE 'sitemap\.xml|robots\.txt|hreflang|alternates|canonical' e2e/tests    # 0 files
```

## Appendix B — Relevant Open Issues (38)

Epics & drivers: **#198** (EPIC Multi-Locale Content Parity), **#199** (Phase 1 UI Strings i18n), **#202** (Phase 2 Extended AI Schema), **#60** (EPIC SEO Playbook v2.0), **#22** (EPIC WordPress→Studio migration), **#98** (closeout), **#190** (Unified Editor — touches SEO overlays).

Specs & child issues: #146, #147, #182, #183, #80, #79, #77, #76, #75, #74, #73, #72, #71, #70, #69, #68, #67, #66, #65, #64, #63, #62, #61, #59, #29, #28, #27, #26, #25, #24, #23, #21, #100, #99.

Cross-references: #16 (Phase 3 RPCs), #17 (Phase 4 Template tab), #40 (a11y breadcrumb), #104 (MCP GA4 tooling), #166/#169/#170 (Booking — indirectly affects /buscar and CTAs).

## Appendix C — Source File Inventory

**SEO**: `app/sitemap.ts`, `app/robots.ts`, `app/site/[subdomain]/sitemap.xml/route.ts`, `lib/seo/{robots-txt,internal-link-graph,click-depth,server-auth,api-call-logger,state-token,google-client,errors,dto,unified-scorer,blog-status,scored-item,decision-grade-sync,content-intelligence,llms-txt,og-helpers,backend-service,slug-locale,serp-snapshot,nlp-score,locale-routing,sitemap,content-sanitize,translation-memory,internal-link-scanner,transcreate-rate-limit,hreflang,public-metadata,transcreate-client,transcreate-workflow}.ts` (30 files).

**i18n**: `middleware.ts`, `lib/seo/{locale-routing,hreflang,slug-locale,transcreate-*,translation-memory}.ts`, `lib/site/{currency,public-ui-messages,public-ui-extra-text}.ts`, `components/site/{language-switcher,website-locale-provider,site-header,site-footer}.tsx`, `components/admin/{translations-dashboard,translation-bulk-bar,translation-row}.tsx`.

**SEO API routes (45)**: under `app/api/seo/` — integrations (google/status/connect/callback/configure/options/refresh), analytics (overview/keywords/competitors/health/striking-distance/serp-snapshot), backlinks (summary/intersection), ai-visibility (referrals/overview), architecture, audit/pagespeed, content-intelligence (optimize/page-catalog/audit/briefs/clusters/research/track/nlp-score/internal-links/suggest/transcreate/transcreate/stream), score, okrs (list/[id]), weekly-tasks (list/generate/[id]), objectives-90d (list/[id]), glossary (list/[id]/import), keywords/research, translations (list/bulk), sync, workflow/baseline.

**Metadata-bearing pages (12)**: `app/site/[subdomain]/{page,layout,[...slug]/page,paquetes/[slug]/page,blog/page,blog/[slug]/page,planners/[slug]/page,buscar/page,terms/page,privacy/page,cancellation/page}.tsx`, `app/domain/[host]/[[...slug]]/page.tsx`.

**Migrations (5)**: `20260418000000_multi_locale_content.sql`, `20260423000100_transcreate_ai_rate_limit.sql`, `20260501000000_transcreate_payload_v2_and_body_content.sql`, `20260502000000_transcreate_v21_canary_and_overlay.sql`, `20260502020000_website_product_pages_locale_overlay.sql`.

---

**End of audit.** Next action: triage P0 stubs into 2-sprint plan, file as child issues under #198 or new `[EPIC] Production Certification — SEO + i18n E2E`.
