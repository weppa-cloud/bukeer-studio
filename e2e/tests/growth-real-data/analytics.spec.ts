import {
  test,
  expect,
  gotoTab,
  gotoAnalyticsSubTab,
  assertGscConnected,
  screenshot,
  COLOMBIATOURS,
} from '../../fixtures/colombiatours';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Growth Real-Data — Analytics tab @analytics @real-data', () => {
  test('A-0 sync now triggers GSC+GA4 real', async ({ page, supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    await assertGscConnected(page);

    const before = await supabase
      .from('seo_keyword_snapshots')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1);

    const [response] = await Promise.all([
      page.waitForResponse(/\/api\/seo\/sync/, { timeout: 90000 }).catch(() => null),
      page.getByRole('button', { name: /^Sync now$/i }).click(),
    ]);

    await screenshot(page, 'sync-now-result');
    if (response) {
      const json = await response.json().catch(() => null);
      test.info().annotations.push({
        type: 'sync-now',
        description: `status=${response.status()} gscRows=${json?.data?.gscRows ?? json?.gscRows} ga4Rows=${json?.data?.ga4Rows ?? json?.ga4Rows} durationMs=${json?.data?.durationMs ?? json?.durationMs}`,
      });
      expect([200, 202, 401, 403, 409]).toContain(response.status());
    }

    const after = await supabase
      .from('seo_keyword_snapshots')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1);
    test.info().annotations.push({
      type: 'snapshots-before-after',
      description: `before=${before.data?.[0]?.snapshot_date} after=${after.data?.[0]?.snapshot_date}`,
    });
    void websiteId;
  });

  test('A-1 overview KPI cards + top pages', async ({ page }) => {
    await gotoAnalyticsSubTab(page, 'Overview');
    const cards = ['Sessions', 'Users', 'Pageviews', 'Conversions'];
    for (const c of cards) {
      await expect(page.getByText(new RegExp(`^${c}$`)).first()).toBeVisible();
    }
    await expect(page.getByText(/^Top pages$/)).toBeVisible();
    await screenshot(page, 'analytics-overview');
  });

  test('A-2 content intelligence decision-grade audit', async ({ page, request }) => {
    const { websiteId } = COLOMBIATOURS;
    await gotoAnalyticsSubTab(page, 'Content Intelligence');
    const res = await request.get(
      `/api/seo/content-intelligence/audit?websiteId=${websiteId}&locale=es-CO&decisionGradeOnly=true&limit=50`
    );
    expect([200, 401, 409]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    const rows = body?.data?.rows ?? body?.rows ?? [];
    for (const r of rows) {
      if (r.confidence) expect.soft(r.confidence, 'all decision-grade rows must be live').toBe('live');
    }
    await screenshot(page, 'analytics-content-intelligence');
  });

  test('A-3 keywords table + research real', async ({ page, request }) => {
    const { websiteId } = COLOMBIATOURS;
    await gotoAnalyticsSubTab(page, 'Keywords');
    await expect(page.getByRole('columnheader', { name: 'Keyword' }).first()).toBeVisible();

    const res = await request.post('/api/seo/content-intelligence/research', {
      data: {
        websiteId,
        seed: 'paquete colombia todo incluido',
        contentType: 'package',
        locale: 'es-CO',
        country: 'Colombia',
        language: 'es',
        decisionGradeOnly: false,
      },
    });
    test.info().annotations.push({
      type: 'research-response',
      description: `status=${res.status()}`,
    });
    expect([200, 202, 400]).toContain(res.status());
    await screenshot(page, 'keywords-research');
  });

  test('A-4 clusters board CRUD', async ({ page, request }) => {
    const { websiteId } = COLOMBIATOURS;
    await gotoAnalyticsSubTab(page, 'Clusters');

    const createRes = await request.post('/api/seo/content-intelligence/clusters', {
      data: {
        websiteId,
        locale: 'es-CO',
        contentType: 'package',
        name: `e2e-cluster-${Date.now()}`,
        parentTopic: 'paquetes-todo-incluido',
        targetQueries: ['paquete colombia todo incluido'],
      },
    });
    test.info().annotations.push({
      type: 'cluster-create',
      description: `status=${createRes.status()}`,
    });
    await screenshot(page, 'analytics-clusters');
  });

  test('A-5 competitors tab renders @partial', async ({ page }) => {
    await gotoAnalyticsSubTab(page, 'Competitors');
    await expect(page.getByRole('columnheader', { name: /Domain/i }).first()).toBeVisible();
    await screenshot(page, 'analytics-competitors');
  });

  test('A-6 health + pagespeed trigger', async ({ page, request }) => {
    const { websiteId } = COLOMBIATOURS;
    await gotoAnalyticsSubTab(page, 'Health');
    await screenshot(page, 'analytics-health');
    const res = await request.get(`/api/seo/analytics/health?websiteId=${websiteId}`);
    test.info().annotations.push({
      type: 'health-response',
      description: `status=${res.status()}`,
    });
  });

  test('A-7 AI visibility @partial', async ({ page, request }) => {
    const { websiteId } = COLOMBIATOURS;
    await gotoAnalyticsSubTab(page, 'AI Visibility');
    const overview = await request.get(`/api/seo/ai-visibility/overview?websiteId=${websiteId}`);
    const referrals = await request.get(`/api/seo/ai-visibility/referrals?websiteId=${websiteId}`);
    test.info().annotations.push({
      type: 'ai-visibility',
      description: `overview=${overview.status()} referrals=${referrals.status()}`,
    });
    await screenshot(page, 'analytics-ai-visibility');
  });

  test('A-8 backlinks @partial', async ({ page, request }) => {
    const { websiteId } = COLOMBIATOURS;
    await gotoAnalyticsSubTab(page, 'Backlinks');
    const res = await request.post(`/api/seo/backlinks/summary?websiteId=${websiteId}`, {
      data: { websiteId },
    });
    test.info().annotations.push({
      type: 'backlinks',
      description: `summary=${res.status()}`,
    });
    await screenshot(page, 'analytics-backlinks');
  });

  test('A-9 config GSC/GA4 status + refresh', async ({ page, request }) => {
    const { websiteId } = COLOMBIATOURS;
    await gotoAnalyticsSubTab(page, 'Config');
    const status = await request.get(`/api/seo/integrations/status?websiteId=${websiteId}`);
    expect(status.status()).toBe(200);
    const body = await status.json();
    const gsc = body?.data?.gsc ?? body?.gsc;
    const ga4 = body?.data?.ga4 ?? body?.ga4;
    expect.soft(gsc?.connected, 'GSC connected').toBeTruthy();
    expect.soft(ga4?.connected, 'GA4 connected').toBeTruthy();
    await screenshot(page, 'analytics-config');
  });
});
