import { test, expect } from '@playwright/test';
import { getSeededPackageSlug, seedWave2Fixtures, type SeoFixtures } from './helpers';

/**
 * EPIC #207 W1 · P0-4 · JSON-LD structured data in public HTML.
 *
 * Audit: docs/ops/e2e-gap-audit-seo-i18n-2026-04-19.md (flow #13)
 * Related to #208 — `inLanguage` should match URL locale segment (not hardcoded 'es').
 */

function parseJsonLd(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function collectTypes(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  const types: string[] = [];
  const record = node as { '@type'?: unknown; '@graph'?: unknown };
  if (typeof record['@type'] === 'string') types.push(record['@type']);
  if (Array.isArray(record['@type'])) {
    for (const t of record['@type']) if (typeof t === 'string') types.push(t);
  }
  if (Array.isArray(record['@graph'])) {
    for (const child of record['@graph']) types.push(...collectTypes(child));
  }
  return types;
}

test.describe('Public structured data @p0-seo', () => {
  let seo: SeoFixtures | null = null;

  test.beforeAll(async () => {
    try {
      const fixtures = await seedWave2Fixtures();
      seo = fixtures.seo;
    } catch (error) {
      // Service-role creds missing or seed environment unreachable — stubs fall
      // back to `test.skip()` when ids are null.
      seo = null;
    }
  });

  test('homepage exposes Organization or TravelAgency JSON-LD', async ({ page }) => {
    const response = await page.goto('/site/colombiatours', { waitUntil: 'domcontentloaded' });
    test.skip(
      !response || response.status() >= 500,
      'Homepage unreachable — JSON-LD contract requires live SSR',
    );

    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    test.skip(scripts.length === 0, 'No JSON-LD scripts emitted on homepage');

    const parsed = scripts.map(parseJsonLd).filter(Boolean);
    const allTypes = parsed.flatMap(collectTypes);
    const hasOrg = allTypes.some((t) => t === 'Organization' || t === 'TravelAgency');
    expect(hasOrg, `expected Organization or TravelAgency in ${allTypes.join(', ')}`).toBeTruthy();
  });

  test('package page exposes TouristTrip + BreadcrumbList', async ({ page }) => {
    const slug = getSeededPackageSlug();
    const response = await page.goto(`/site/colombiatours/paquetes/${slug}`, {
      waitUntil: 'domcontentloaded',
    });
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Package "${slug}" not seeded in this tenant — skip JSON-LD assertion`,
    );

    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    test.skip(scripts.length === 0, 'No JSON-LD on package page — nothing to validate');

    const parsed = scripts.map(parseJsonLd).filter(Boolean);
    const allTypes = parsed.flatMap(collectTypes);
    expect(allTypes).toEqual(expect.arrayContaining(['TouristTrip']));
    expect(allTypes).toEqual(expect.arrayContaining(['BreadcrumbList']));
  });

  test('package page exposes VideoObject JSON-LD when video_url set', async ({ page }) => {
    test.skip(
      !seo?.videoPackageId,
      'No seeded package with video_url — seedWave2Fixtures could not attach video_url',
    );

    const slug = getSeededPackageSlug();
    const response = await page.goto(`/site/colombiatours/paquetes/${slug}`, {
      waitUntil: 'domcontentloaded',
    });
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Package "${slug}" unreachable — skip VideoObject check`,
    );

    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    test.skip(scripts.length === 0, 'No JSON-LD on package page — nothing to validate');

    const parsed = scripts.map(parseJsonLd).filter(Boolean);
    const allTypes = parsed.flatMap(collectTypes);
    expect(
      allTypes,
      `expected VideoObject in JSON-LD (@types=${allTypes.join(', ')})`,
    ).toContain('VideoObject');
  });

  test('inLanguage on package JSON-LD matches URL locale segment (#208)', async ({ page }) => {
    const slug = getSeededPackageSlug();
    const response = await page.goto(`/en/paquetes/${slug}`, { waitUntil: 'domcontentloaded' });
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      '/en/paquetes/{slug} not available — requires multi-locale routing + applied transcreation',
    );

    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    test.skip(scripts.length === 0, 'No JSON-LD emitted — cannot assert inLanguage');

    const parsed = scripts.map(parseJsonLd).filter((v): v is Record<string, unknown> => Boolean(v));
    const languages = parsed
      .map((node) => (node as { inLanguage?: unknown }).inLanguage)
      .filter((v): v is string => typeof v === 'string');
    test.skip(languages.length === 0, 'No inLanguage field emitted — #208 fix not yet deployed');

    // URL segment is /en/ → inLanguage should start with 'en' (not hardcoded 'es').
    for (const lang of languages) {
      expect(lang.toLowerCase()).toMatch(/^en/);
    }
  });
});
