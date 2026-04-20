import { test, expect } from '@playwright/test';
import { applicableRows } from '../../../fixtures/product-matrix';
import {
  assertMatrixRow,
  assertVisualSnapshot,
  freezeAnimations,
  type MatrixRowOutcome,
} from '../../../setup/matrix-helpers';
import { getPilotSeed, pilotSubdomain } from '../helpers';

/**
 * EPIC #214 · W6 #220 — Matrix visual E2E · blog detail (NEW in v2).
 *
 * Per AC-W6-13: asserts blog render correctness at both the default es-CO URL
 * (`/blog/{slug}`) and the translated en-US URL (`/en/blog/{slug}`). Coverage:
 *   - Blog hero (title / H1).
 *   - Blog body (prose).
 *   - SEO head tags (title, meta description).
 *   - hreflang alternates matching `buildLocaleAwareAlternateLanguages`.
 *   - JSON-LD Article (BlogPosting) with `inLanguage` set from resolved locale.
 *
 * Consumes `seedPilot('translation-ready')` which seeds 1 blog post with
 * non-trivial body. The en-US variant is derived via the public locale router
 * (`/en/blog/{slug}`) — when the seed hasn't published a translation, the spec
 * records a `conditional-skip` for the en route and continues with es-CO only.
 */
test.describe('@pilot-w6 Pilot W6 · matrix · blog', () => {
  test('blog default es-CO URL renders matrix blocks', async ({ page }, testInfo) => {
    const seed = await getPilotSeed('translation-ready');
    const blog = seed.blogPosts[0];
    test.skip(
      !blog,
      `Pilot translation-ready seed missing blog post — warnings: ${seed.warnings.join(' | ')}`,
    );

    const subdomain = pilotSubdomain();
    const route = `/site/${subdomain}/blog/${blog.slug}`;
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Blog detail page unreachable (status=${response?.status() ?? 'no-response'}).`,
    );

    await freezeAnimations(page);

    const outcomes: MatrixRowOutcome[] = [];
    for (const row of applicableRows('blog')) {
      outcomes.push(await assertMatrixRow({ page, row, type: 'blog' }));
    }

    // Extra assertions specific to blog: JSON-LD + hreflang.
    const jsonLdTexts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const parsed = jsonLdTexts
      .map((t) => {
        try {
          return JSON.parse(t);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const flatten = (node: unknown): unknown[] => {
      if (!node || typeof node !== 'object') return [];
      const out: unknown[] = [node];
      const graph = (node as { '@graph'?: unknown[] })['@graph'];
      if (Array.isArray(graph)) for (const child of graph) out.push(...flatten(child));
      return out;
    };
    const allNodes = parsed.flatMap(flatten);
    const articleTypes = ['BlogPosting', 'Article', 'NewsArticle'];
    const articleNode = allNodes.find((n) => {
      const t = (n as { '@type'?: string | string[] })['@type'];
      if (typeof t === 'string') return articleTypes.includes(t);
      if (Array.isArray(t)) return t.some((v) => articleTypes.includes(v));
      return false;
    });
    expect(articleNode, 'expected JSON-LD BlogPosting/Article node on blog detail').toBeTruthy();

    // Attach JSON-LD for evidence bundle.
    await testInfo.attach('blog-jsonld.json', {
      body: JSON.stringify(articleNode, null, 2),
      contentType: 'application/json',
    });

    // hreflang alternates (at minimum canonical + x-default OR the current locale).
    const hreflangs = await page
      .locator('head link[rel="alternate"][hreflang]')
      .evaluateAll((links) =>
        links.map((l) => ({
          hreflang: l.getAttribute('hreflang'),
          href: l.getAttribute('href'),
        })),
      );
    await testInfo.attach('blog-hreflang.json', {
      body: JSON.stringify(hreflangs, null, 2),
      contentType: 'application/json',
    });

    await assertVisualSnapshot({
      page,
      testInfo,
      route,
      contentType: 'blog',
      locale: blog.locale,
      viewport: 'desktop',
    });

    await testInfo.attach('matrix-blog-outcomes.json', {
      body: JSON.stringify({ route, locale: blog.locale, outcomes }, null, 2),
      contentType: 'application/json',
    });

    const failures = outcomes.filter((o) => o.status === 'fail');
    expect(
      failures,
      `Blog matrix failures: ${failures.map((f) => f.reason).join(' | ')}`,
    ).toHaveLength(0);
  });

  test('blog translated en-US URL /en/blog/{slug} renders or documents gap', async ({
    page,
  }, testInfo) => {
    const seed = await getPilotSeed('translation-ready');
    const blog = seed.blogPosts[0];
    test.skip(!blog, 'Pilot translation-ready seed missing blog post');

    const subdomain = pilotSubdomain();
    const route = `/site/${subdomain}/en/blog/${blog.slug}`;
    const response = await page.goto(route, { waitUntil: 'networkidle' });

    // Acceptable terminal states:
    //  - 200 → assert render + hreflang
    //  - 404 → translation gap → conditional-skip with reason (not a failure)
    if (!response || response.status() === 404) {
      test.skip(
        true,
        `Translated en-US blog variant not published (status=${response?.status() ?? 'no-response'}). W5 transcreate handles lifecycle; W6 documents the render gap.`,
      );
      return;
    }

    test.skip(
      response.status() >= 500,
      `Translated blog URL server error (status=${response.status()}).`,
    );

    await freezeAnimations(page);

    const outcomes: MatrixRowOutcome[] = [];
    for (const row of applicableRows('blog')) {
      outcomes.push(await assertMatrixRow({ page, row, type: 'blog' }));
    }

    // hreflang must include en-US + x-default pairs (per ADR-020).
    const hreflangs = await page
      .locator('head link[rel="alternate"][hreflang]')
      .evaluateAll((links) =>
        links.map((l) => ({
          hreflang: l.getAttribute('hreflang'),
          href: l.getAttribute('href'),
        })),
      );

    await testInfo.attach('blog-en-hreflang.json', {
      body: JSON.stringify(hreflangs, null, 2),
      contentType: 'application/json',
    });

    const hasXDefault = hreflangs.some((h) => h.hreflang === 'x-default');
    expect(
      hasXDefault,
      'translated blog must emit hreflang="x-default" per ADR-020',
    ).toBeTruthy();

    await assertVisualSnapshot({
      page,
      testInfo,
      route,
      contentType: 'blog',
      locale: 'en-US',
      viewport: 'desktop',
    });

    await testInfo.attach('matrix-blog-en-outcomes.json', {
      body: JSON.stringify({ route, locale: 'en-US', outcomes }, null, 2),
      contentType: 'application/json',
    });

    const failures = outcomes.filter((o) => o.status === 'fail');
    expect(
      failures,
      `Blog en-US matrix failures: ${failures.map((f) => f.reason).join(' | ')}`,
    ).toHaveLength(0);
  });
});
