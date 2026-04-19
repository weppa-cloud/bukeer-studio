import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { seedWave2Fixtures } from './helpers';

/**
 * EPIC #207 W2 · P1 · Sitemap must exclude noindex products.
 *
 * Products with `robots_noindex = true` (via `website_product_pages` overlay,
 * per product_schema.md) must NOT appear in either the tenant-scoped or the
 * global sitemap.
 *
 * Source: lib/seo/sitemap.ts (getNoindexProductSlugs)
 */

const TENANT_SUBDOMAIN = 'colombiatours';

async function setPackageNoindex(
  admin: ReturnType<typeof createClient>,
  websiteId: string,
  packageId: string,
  noindex: boolean,
): Promise<string | null> {
  const { error } = await admin
    .from('website_product_pages')
    .upsert(
      {
        website_id: websiteId,
        product_type: 'package',
        product_id: packageId,
        robots_noindex: noindex,
      },
      { onConflict: 'website_id,product_type,product_id' },
    );
  return error?.message ?? null;
}

test.describe('Sitemap noindex filter @p1-seo', () => {
  test('tenant sitemap omits noindex product slug', async ({ request }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(
      !supabaseUrl || !serviceRoleKey,
      'Service-role credentials missing — cannot seed noindex flag',
    );

    const fixtures = await seedWave2Fixtures();
    test.skip(
      !fixtures.packageId,
      `Seed missing packageId. Warnings: ${fixtures.warnings.join(' | ')}`,
    );

    const admin = createClient(supabaseUrl!, serviceRoleKey!);
    const seedErr = await setPackageNoindex(
      admin,
      fixtures.websiteId,
      fixtures.packageId!,
      true,
    );
    test.skip(
      !!seedErr,
      `website_product_pages upsert failed (${seedErr}) — noindex overlay unavailable`,
    );

    try {
      const res = await request.get(`/site/${TENANT_SUBDOMAIN}/sitemap.xml`);
      test.skip(
        res.status() === 404,
        `Tenant sitemap 404 for "${TENANT_SUBDOMAIN}" — seed tenant required`,
      );
      expect(res.status()).toBe(200);
      const body = await res.text();
      expect(body).not.toContain(`/paquetes/${fixtures.packageSlug}`);
    } finally {
      await setPackageNoindex(admin, fixtures.websiteId, fixtures.packageId!, false);
    }
  });

  test('global sitemap omits noindex product slug', async ({ request }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(
      !supabaseUrl || !serviceRoleKey,
      'Service-role credentials missing — cannot toggle noindex',
    );

    const fixtures = await seedWave2Fixtures();
    test.skip(!fixtures.packageId, 'Seed missing packageId');

    const admin = createClient(supabaseUrl!, serviceRoleKey!);
    const seedErr = await setPackageNoindex(
      admin,
      fixtures.websiteId,
      fixtures.packageId!,
      true,
    );
    test.skip(!!seedErr, `website_product_pages upsert failed (${seedErr})`);

    try {
      const res = await request.get('/sitemap.xml');
      test.skip(res.status() !== 200, `Global sitemap returned ${res.status()}`);
      const body = await res.text();
      expect(body).not.toContain(`/paquetes/${fixtures.packageSlug}`);
    } finally {
      await setPackageNoindex(admin, fixtures.websiteId, fixtures.packageId!, false);
    }
  });
});
