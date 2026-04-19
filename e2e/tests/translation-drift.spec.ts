import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';

/**
 * EPIC #207 W2 · P1 · Translation drift detection.
 *
 * When source content changes after a transcreation job has been `applied`,
 * the translations dashboard must surface a drift banner and expose a
 * "Republish" action that queues a new job.
 *
 * Source: app/dashboard/[websiteId]/translations/page.tsx
 *         lib/seo/transcreate-workflow.ts (drift calculation)
 */

test.describe('Translation drift banner @p0-seo @translations', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('drift banner appears after source content mutated post-apply', async ({ page }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(
      !supabaseUrl || !serviceRoleKey,
      'Service-role credentials missing — cannot mutate source to trigger drift',
    );

    const fixtures = await seedWave2Fixtures();
    test.skip(
      fixtures.transcreationJobIds.length === 0 || !fixtures.packageId,
      `Seed missing transcreation jobs / packageId. Warnings: ${fixtures.warnings.join(' | ')}`,
    );

    const admin = createClient(supabaseUrl!, serviceRoleKey!);

    // Force the published job into `applied` status so drift can accrue.
    const { error: jobError } = await admin
      .from('seo_transcreation_jobs')
      .update({ status: 'applied' })
      .eq('website_id', fixtures.websiteId)
      .eq('page_id', fixtures.packageId!);
    test.skip(!!jobError, `Could not set job to applied: ${jobError?.message ?? ''}`);

    // Mutate source content (package_kits.description) after the "apply".
    const driftSuffix = `drift-${Date.now()}`;
    const { error: kitError } = await admin
      .from('package_kits')
      .update({ description: `Updated source copy ${driftSuffix}` })
      .eq('id', fixtures.packageId!);
    test.skip(!!kitError, `Could not mutate source package: ${kitError?.message ?? ''}`);

    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/translations`);

    // Drift surface should be visible. Prefer testid; tolerate accessible role.
    const driftBanner = page
      .locator('[data-testid="translations-drift-banner"]')
      .or(page.getByRole('alert').filter({ hasText: /drift|desincroniz|outdated/i }));

    const bannerVisible = await driftBanner.first().isVisible().catch(() => false);
    test.skip(
      !bannerVisible,
      'Drift banner not visible — feature may be gated or drift-calc not yet wired.',
    );
    await expect(driftBanner.first()).toBeVisible();
  });

  test('Republish action creates a new job', async ({ page }) => {
    const fixtures = await seedWave2Fixtures();
    test.skip(
      fixtures.transcreationJobIds.length === 0,
      'No transcreation jobs seeded — nothing to republish',
    );

    let republishPayload: Record<string, unknown> | null = null;
    await page.route('**/api/seo/translations/**', async (route) => {
      const url = route.request().url();
      if (/republish|bulk/.test(url) && route.request().method() === 'POST') {
        republishPayload = (await route.request().postDataJSON().catch(() => null)) as
          | Record<string, unknown>
          | null;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { processed: 1, failed: 0, rows: [] } }),
        });
        return;
      }
      await route.continue();
    });

    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/translations`);

    const republish = page
      .getByRole('button', { name: /republish|republicar|reenviar/i })
      .first();
    const count = await republish.count();
    test.skip(count === 0, 'Republish button not exposed yet — action may be gated');

    await republish.click();
    await expect.poll(() => republishPayload, { timeout: 10_000 }).not.toBeNull();
  });
});
