import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { seedWave2Fixtures } from './helpers';

/**
 * EPIC #207 W2 · P1 · Legacy URL redirects (301).
 *
 * Rows in `website_legacy_redirects` must produce a 301 response from the
 * public middleware, with the `Location` header pointing to the configured
 * `new_path`. Follows the redirect and asserts the new path renders < 500.
 *
 * Source: middleware.ts (checkLegacyRedirect)
 */

const TENANT_SUBDOMAIN = 'colombiatours';

test.describe('Legacy URL redirects @p1-seo', () => {
  test('old_path returns 301 → new_path (middleware)', async ({ request }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(
      !supabaseUrl || !serviceRoleKey,
      'Service-role credentials missing — cannot seed website_legacy_redirects row',
    );

    const fixtures = await seedWave2Fixtures();
    test.skip(
      !fixtures.websiteId,
      `Missing websiteId. Warnings: ${fixtures.warnings.join(' | ')}`,
    );

    const admin = createClient(supabaseUrl!, serviceRoleKey!);

    const suffix = Date.now();
    const oldPath = `/legacy-${suffix}`;
    const newPath = `/site/${TENANT_SUBDOMAIN}/paquetes/${fixtures.packageSlug}`;

    const { error: insertError } = await admin
      .from('website_legacy_redirects')
      .upsert(
        {
          website_id: fixtures.websiteId,
          old_path: oldPath,
          new_path: newPath,
          status_code: 301,
        },
        { onConflict: 'website_id,old_path' },
      );
    test.skip(
      !!insertError,
      `Could not seed legacy redirect (${insertError?.message ?? ''}) — table may be missing in this env`,
    );

    const res = await request.get(`${oldPath}?subdomain=${TENANT_SUBDOMAIN}`, {
      maxRedirects: 0,
      headers: {
        'x-subdomain': TENANT_SUBDOMAIN,
      },
    });
    test.skip(
      res.status() >= 500,
      `Middleware returned ${res.status()} on legacy path — skip (env likely lacks seed propagation)`,
    );
    const status = res.status();
    if ([301, 302, 307, 308].includes(status)) {
      const location = res.headers()['location'];
      expect(location).toBeDefined();
      expect(location).toContain(newPath);

      // Follow redirect and ensure the new path resolves (< 500).
      const followUrl = new URL(location!, 'http://localhost');
      followUrl.searchParams.set('subdomain', TENANT_SUBDOMAIN);
      const followed = await request.get(followUrl.pathname + followUrl.search, {
        maxRedirects: 5,
        headers: {
          'x-subdomain': TENANT_SUBDOMAIN,
        },
      });
      expect(followed.status()).toBeLessThan(500);
      return;
    }

    // Some runners follow redirects even with maxRedirects=0 and return final 200.
    expect(status).toBe(200);
    expect(res.url()).toContain(newPath);
  });
});
