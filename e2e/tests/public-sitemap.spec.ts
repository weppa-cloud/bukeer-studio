import { test, expect } from '@playwright/test';

/**
 * EPIC #207 W1 · P0-2 · Sitemap + robots.txt route integration.
 *
 * Audit: docs/ops/e2e-gap-audit-seo-i18n-2026-04-19.md (flows #1, #2, #3, #37)
 * Source: app/sitemap.ts, app/robots.ts, app/site/[subdomain]/sitemap.xml/route.ts,
 *         lib/seo/sitemap.ts, lib/seo/robots-txt.ts
 */

test.describe('Public sitemap & robots @p0-seo', () => {
  test('/sitemap.xml serves valid XML with >=1 <url>', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/xml/i);
    const body = await res.text();
    expect(body).toMatch(/<urlset[\s>]/);
    const urlCount = body.match(/<url>/g)?.length ?? 0;
    expect(urlCount).toBeGreaterThan(0);
  });

  test('/site/colombiatours/sitemap.xml serves tenant-scoped URLs', async ({ request }) => {
    const res = await request.get('/site/colombiatours/sitemap.xml');
    test.skip(
      res.status() === 404,
      'Tenant "colombiatours" not seeded in this environment — skip per-tenant sitemap check',
    );
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/xml/i);
    const body = await res.text();
    expect(body).toMatch(/<urlset[\s>]/);
    // Tenant-scoped sitemap URLs should include the subdomain in <loc>.
    expect(body).toMatch(/colombiatours/);
  });

  test('/robots.txt references sitemap line and sets crawl policy', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Sitemap:\s+https?:\/\//i);
    // User-agent should be present (default all or per-bot policy).
    expect(body).toMatch(/User-agent:/i);
  });
});
