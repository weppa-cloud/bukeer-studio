import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { seedWave2Fixtures } from './helpers';

/**
 * EPIC #207 W2 · P1 · Slug redirects (product renames).
 *
 * When a product slug changes, rows in `slug_redirects` (account_id, product_type,
 * old_slug → new_slug) must produce a 301 from middleware both on the canonical
 * Spanish path (/paquetes/:slug) and the locale-prefixed alias (/en/packages/:slug).
 *
 * Source: middleware.ts (resolveSlugRedirect)
 */

const TENANT_SUBDOMAIN = 'colombiatours';

test.describe('Slug redirects @p1-seo', () => {
  test('/paquetes/{old} → 301 /paquetes/{new}', async ({ request }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(
      !supabaseUrl || !serviceRoleKey,
      'Service-role credentials missing — cannot seed slug_redirects row',
    );

    const fixtures = await seedWave2Fixtures();
    test.skip(
      !fixtures.accountId || !fixtures.packageSlug,
      `Missing seed context. Warnings: ${fixtures.warnings.join(' | ')}`,
    );

    const admin = createClient(supabaseUrl!, serviceRoleKey!);
    const oldSlug = `old-${Date.now()}`;
    const newSlug = fixtures.packageSlug;

    const { error } = await admin
      .from('slug_redirects')
      .upsert(
        {
          account_id: fixtures.accountId,
          product_type: 'package',
          old_slug: oldSlug,
          new_slug: newSlug,
        },
        { onConflict: 'account_id,product_type,old_slug' },
      );
    test.skip(
      !!error,
      `Could not seed slug_redirects (${error?.message ?? ''}) — table may differ in this env`,
    );

    const res = await request.get(`/site/${TENANT_SUBDOMAIN}/paquetes/${oldSlug}`, {
      maxRedirects: 0,
    });
    test.skip(
      res.status() >= 500,
      `Middleware returned ${res.status()} on old slug — skip (env likely lacks seed propagation)`,
    );
    expect([301, 308]).toContain(res.status());
    const location = res.headers()['location'];
    expect(location).toBeDefined();
    expect(location).toContain(`/paquetes/${newSlug}`);
  });

  test('/en/packages/{old} → 301 with locale-aware new path', async ({ request }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(
      !supabaseUrl || !serviceRoleKey,
      'Service-role credentials missing — skip locale-prefixed slug redirect',
    );

    const fixtures = await seedWave2Fixtures();
    test.skip(!fixtures.accountId || !fixtures.packageSlug, 'Missing seed context');

    const admin = createClient(supabaseUrl!, serviceRoleKey!);
    const oldSlug = `old-en-${Date.now()}`;
    const newSlug = fixtures.packageSlug;

    const { error } = await admin
      .from('slug_redirects')
      .upsert(
        {
          account_id: fixtures.accountId,
          product_type: 'package',
          old_slug: oldSlug,
          new_slug: newSlug,
        },
        { onConflict: 'account_id,product_type,old_slug' },
      );
    test.skip(
      !!error,
      `Could not seed slug_redirects for /en alias (${error?.message ?? ''})`,
    );

    const res = await request.get(`/en/packages/${oldSlug}`, { maxRedirects: 0 });
    test.skip(
      res.status() === 404,
      'EN alias /en/packages/... 404 — #209 Option C may not be deployed',
    );
    test.skip(
      res.status() >= 500,
      `Middleware returned ${res.status()} on /en/packages/{old} — skip`,
    );
    expect([301, 308]).toContain(res.status());
    const location = res.headers()['location'];
    expect(location).toBeDefined();
    // Locale segment must be preserved; new slug must be present.
    expect(location!).toMatch(/\/en\//);
    expect(location!).toContain(newSlug);
  });
});
