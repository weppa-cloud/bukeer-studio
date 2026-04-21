import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  test,
  expect,
  JourneyRecorder,
  gotoTab,
  gotoAnalyticsSubTab,
  COLOMBIATOURS,
} from '../../fixtures/colombiatours';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Growth Real-Data — End-to-End Journey @growth-journey @real-data', () => {
  test.setTimeout(15 * 60 * 1000);

  test('operator journey: setup → audit → research → cluster → brief → optimize → transcreate → track', async ({
    page,
    request,
    supabase,
  }) => {
    const { websiteId } = COLOMBIATOURS;
    const rec = new JourneyRecorder(page, 'growth-journey');

    await rec.step('1. Dashboard home', async () => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /Websites/i })).toBeVisible();
    });

    await rec.step('2. Analytics — integrations connected', async () => {
      await gotoTab(page, 'analytics');
      await expect(page.getByText('GSC: Connected')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('GA4: Connected')).toBeVisible({ timeout: 15000 });
    });

    await rec.step('3. Sync now', async () => {
      const [res] = await Promise.all([
        page.waitForResponse(/\/api\/seo\/sync/, { timeout: 120000 }).catch(() => null),
        page.getByRole('button', { name: /^Sync now$/i }).click(),
      ]);
      test.info().annotations.push({
        type: 'sync-status',
        description: `status=${res?.status() ?? 'n/a'}`,
      });
    });

    await rec.step('4. Contenido — filter Paquetes', async () => {
      await gotoTab(page, 'contenido');
      await page.getByRole('button', { name: /^Paquetes\s+\d+$/ }).first().click();
    });

    let packageId: string | null = null;
    await rec.step('5. Open a package', async () => {
      const { data } = await supabase
        .from('package_kits')
        .select('id')
        .limit(1);
      packageId = data?.[0]?.id ?? null;
    });

    await rec.step('6. Keywords research (es-CO)', async () => {
      const res = await request.post('/api/seo/content-intelligence/research', {
        data: {
          websiteId,
          seed: 'paquete colombia todo incluido 9 dias',
          locale: 'es-CO',
          country: 'Colombia',
          language: 'es',
          contentType: 'package',
        },
      });
      test.info().annotations.push({
        type: 'research',
        description: `status=${res.status()}`,
      });
    });

    await rec.step('7. Cluster create', async () => {
      const res = await request.post('/api/seo/content-intelligence/clusters', {
        data: {
          websiteId,
          locale: 'es-CO',
          contentType: 'package',
          name: `journey-${Date.now()}`,
          parentTopic: 'paquetes-todo-incluido',
          targetQueries: ['paquete colombia todo incluido'],
        },
      });
      test.info().annotations.push({
        type: 'cluster',
        description: `status=${res.status()}`,
      });
    });

    await rec.step('8. Optimize package (SEO layer only)', async () => {
      if (!packageId) return;
      const res = await request.post('/api/seo/content-intelligence/optimize', {
        data: {
          websiteId,
          itemType: 'package',
          itemId: packageId,
          locale: 'es-CO',
          patch: {
            custom_seo_title: 'Paquete Colombia Todo Incluido 9 Días | Journey E2E',
            custom_seo_description: 'Descubre Colombia con nuestro paquete todo incluido de 9 días.',
          },
        },
      });
      test.info().annotations.push({
        type: 'optimize',
        description: `status=${res.status()}`,
      });
    });

    await rec.step('9. Transcreate (es-CO → en-US)', async () => {
      const { data } = await supabase
        .from('website_blog_posts')
        .select('id')
        .eq('website_id', websiteId)
        .limit(1);
      const sourceId = data?.[0]?.id;
      if (!sourceId) return;
      const res = await request.post('/api/seo/content-intelligence/transcreate', {
        data: {
          websiteId,
          sourceLocale: 'es-CO',
          targetLocale: 'en-US',
          country: 'United States',
          language: 'en',
          pageType: 'blog',
          sourceContentId: sourceId,
          sourceKeyword: 'paquete colombia',
          targetKeyword: 'colombia tour package',
          action: 'create_draft',
        },
        timeout: 120000,
      });
      test.info().annotations.push({
        type: 'transcreate',
        description: `status=${res.status()}`,
      });
    });

    await rec.step('10. Track — overview reload', async () => {
      await gotoAnalyticsSubTab(page, 'Overview');
      await expect(page.getByText(/^Sessions$/).first()).toBeVisible();
    });

    const outDir = join(process.cwd(), 'docs/evidence/growth-readiness');
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, `journey-trace.json`),
      JSON.stringify(rec.toJSON(), null, 2)
    );
  });
});
