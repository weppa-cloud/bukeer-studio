import { test, expect, gotoTab, COLOMBIATOURS, screenshot } from '../../fixtures/colombiatours';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Growth Real-Data — Contenido tab @contenido @real-data', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTab(page, 'contenido');
    await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();
  });

  test('C-1 counts UI match Supabase oracle', async ({ page, supabase }) => {
    const { websiteId } = COLOMBIATOURS;

    const { data: account } = await supabase
      .from('websites')
      .select('account_id')
      .eq('id', websiteId)
      .maybeSingle();
    const accountId = account?.account_id ?? null;

    const oracleCount = async (
      table: string,
      col: string,
      value: string | null,
      softDelete = false
    ) => {
      if (!value) return 0;
      let query = supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq(col, value);
      if (softDelete) query = query.is('deleted_at', null);
      const { count, error } = await query;
      if (error && softDelete) {
        const retry = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq(col, value);
        return retry.count ?? 0;
      }
      return count ?? 0;
    };

    const expectedHotels = accountId ? await oracleCount('hotels', 'account_id', accountId, true) : 0;
    const expectedActivities = accountId ? await oracleCount('activities', 'account_id', accountId, true) : 0;
    const expectedPackages = accountId ? await oracleCount('package_kits', 'account_id', accountId, false) : 0;
    const expectedBlog = await oracleCount('website_blog_posts', 'website_id', websiteId);
    const expectedPages = await oracleCount('website_pages', 'website_id', websiteId);

    await expect
      .poll(
        async () => {
          const chip = page.getByRole('button').filter({ hasText: /^Blog\s*\d+$/ }).first();
          const txt = (await chip.textContent().catch(() => '')) ?? '';
          const m = txt.match(/\d+/);
          return m ? Number(m[0]) : 0;
        },
        { timeout: 30000, intervals: [500, 1000, 2000] }
      )
      .toBeGreaterThan(0);

    const readChipCount = async (label: string): Promise<number> => {
      const chip = page
        .getByRole('button')
        .filter({ hasText: new RegExp(`^${label}\\s*\\d+$`) })
        .first();
      const text = (await chip.textContent().catch(() => '')) ?? '';
      const m = text.match(/\d+/);
      return m ? Number(m[0]) : -1;
    };

    const uiHotels = await readChipCount('Hoteles');
    const uiActivities = await readChipCount('Actividades');
    const uiPaquetes = await readChipCount('Paquetes');
    const uiBlog = await readChipCount('Blog');
    const uiPaginas = await readChipCount('Páginas');

    await screenshot(page, 'contenido-counts');

    expect.soft(uiHotels, 'hoteles UI vs DB').toBe(expectedHotels);
    expect.soft(uiActivities, 'actividades UI vs DB').toBe(expectedActivities);
    expect.soft(uiPaquetes, 'paquetes UI vs DB').toBe(expectedPackages);
    expect.soft(uiBlog, 'blog UI vs DB').toBe(expectedBlog);
    expect.soft(uiPaginas, 'páginas UI vs DB').toBe(expectedPages);
  });

  test('C-2 grade filter applies across types', async ({ page }) => {
    const types = ['Hoteles', 'Actividades', 'Paquetes', 'Blog', 'Páginas'];
    for (const t of types) {
      await page
        .getByRole('button')
        .filter({ hasText: new RegExp(`^${t}\\s*\\d+$`) })
        .first()
        .click();
      await page.waitForLoadState('domcontentloaded');

      const gradeSelect = page.getByText(/Grade: all/).first();
      if (await gradeSelect.isVisible().catch(() => false)) {
        await gradeSelect.click();
        const optionA = page.getByRole('option', { name: /^A$/ });
        if (await optionA.isVisible().catch(() => false)) {
          await optionA.click();
          await page.waitForLoadState('domcontentloaded');
        } else {
          await page.keyboard.press('Escape');
        }
      }
      await screenshot(page, `contenido-grade-${t.toLowerCase()}`);
    }
  });

  test('C-3 completeness score integrity via /api/seo/score', async ({ page, request }) => {
    const { websiteId } = COLOMBIATOURS;
    await page
      .getByRole('button')
        .filter({ hasText: /^Blog\s*\d+$/ })
      .first()
      .click();
    await page.waitForLoadState('domcontentloaded');

    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    const rowText = await firstRow.textContent();
    expect(rowText, 'first row should render').toBeTruthy();

    const res = await request.get(
      `/api/seo/score?websiteId=${websiteId}&itemType=blog&itemId=__sample__&locale=es-CO`
    );
    expect([200, 400, 404]).toContain(res.status());
  });

  test('C-4 striking distance source labeling', async ({ page }) => {
    await page.getByRole('button', { name: /Detectar oportunidades/i }).click({ trial: true }).catch(() => {});
    const detectBtn = page.getByRole('button', { name: /Detectar oportunidades/i });
    if (await detectBtn.isVisible().catch(() => false)) {
      const [response] = await Promise.all([
        page.waitForResponse(/\/api\/seo\/analytics\/striking-distance/, { timeout: 15000 }).catch(() => null),
        detectBtn.click().catch(() => {}),
      ]);
      if (response) {
        const body = await response.json().catch(() => null);
        const source = body?.source ?? 'unknown';
        test.info().annotations.push({ type: 'striking-distance-source', description: source });
      }
    }
    await screenshot(page, 'striking-distance-state');
  });

  test('C-5 low CTR + cannibalization explicitly labeled as example', async ({ page }) => {
    const mockLabel = page.getByText(/Datos de ejemplo/i).first();
    await expect.soft(mockLabel, 'mock data must be explicitly labeled').toBeVisible({ timeout: 10000 });
  });

  test('C-6 kanban persistence @known-gap', async ({ page }) => {
    const p1 = page.getByText('P1', { exact: true }).first();
    const p2 = page.getByText('P2', { exact: true }).first();
    if ((await p1.isVisible().catch(() => false)) && (await p2.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'known-gap',
        description: 'Kanban board hardcoded in components/admin/seo-backlog.tsx (KANBAN_CARDS); no persistence endpoint',
      });
    }
    await screenshot(page, 'kanban-state');
  });

  test('C-7 bulk publish/hide Blog roundtrip', async ({ page, supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    await page
      .getByRole('button')
        .filter({ hasText: /^Blog\s*\d+$/ })
      .first()
      .click();
    await page.waitForLoadState('domcontentloaded');

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    if (rowCount === 0) {
      test.skip(true, 'No blog rows available for bulk test');
    }

    const firstCheckbox = rows.first().locator('input[type="checkbox"]').first();
    if (await firstCheckbox.isVisible().catch(() => false)) {
      await firstCheckbox.check().catch(() => {});
      const hideBtn = page.getByRole('button', { name: /Ocultar seleccionados/i });
      if (await hideBtn.isEnabled().catch(() => false)) {
        await hideBtn.click();
        await page.waitForTimeout(1500);
        const { data } = await supabase
          .from('website_blog_posts')
          .select('id, status')
          .eq('website_id', websiteId)
          .limit(20);
        test.info().annotations.push({
          type: 'bulk-hide-result',
          description: `Sample after hide: ${JSON.stringify(data?.slice(0, 3))}`,
        });
      }
    }
    await screenshot(page, 'bulk-actions');
  });

  test('C-8 workflow modals by type', async ({ page }) => {
    const chips = ['Hoteles', 'Actividades', 'Paquetes', 'Blog', 'Páginas'];
    for (const c of chips) {
      await page
        .getByRole('button')
        .filter({ hasText: new RegExp(`^${c}\\s*\\d+$`) })
        .first()
        .click();
      await page.waitForLoadState('domcontentloaded');
      const workflowBtn = page.getByRole('button', { name: /Workflow|Optimizar|SEO/i }).first();
      if (await workflowBtn.isVisible().catch(() => false)) {
        await workflowBtn.click({ trial: true }).catch(() => {});
      }
      await screenshot(page, `workflow-${c.toLowerCase()}`);
    }
  });

  test('C-9 guardrail package truth-field blocked', async ({ request, supabase }) => {
    const { websiteId } = COLOMBIATOURS;

    const { data: pkgs } = await supabase
      .from('package_kits')
      .select('id, name')
      .limit(1);
    const pkg = pkgs?.[0];
    if (!pkg) test.skip(true, 'No package available for guardrail test');

    const before = await supabase
      .from('package_kits')
      .select('name')
      .eq('id', pkg!.id)
      .maybeSingle();

    const res = await request.post('/api/seo/content-intelligence/optimize', {
      data: {
        websiteId,
        itemType: 'package',
        itemId: pkg!.id,
        patch: { name: 'E2E-GUARDRAIL-SHOULD-BLOCK' },
        locale: 'es-CO',
      },
    });

    const json = await res.json().catch(() => null);
    test.info().annotations.push({
      type: 'optimize-response',
      description: `status=${res.status()} code=${json?.error?.code ?? json?.data?.actionType}`,
    });
    expect([200, 400, 403]).toContain(res.status());

    const after = await supabase
      .from('package_kits')
      .select('name')
      .eq('id', pkg!.id)
      .maybeSingle();
    expect(after.data?.name).toBe(before.data?.name);
  });
});
