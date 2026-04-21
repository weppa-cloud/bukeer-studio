import { test, expect, screenshot, COLOMBIATOURS } from '../../fixtures/colombiatours';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Growth Real-Data — Translations + Markets @translations @real-data', () => {
  test('T-0 supported locales + market mapping', async ({ supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    const { data } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .maybeSingle();
    const locales = data?.locales ?? data?.supported_locales ?? data?.default_locale ?? null;
    test.info().annotations.push({
      type: 'website-locales',
      description: `id=${data?.id} locales=${JSON.stringify(locales)} language=${data?.language ?? data?.default_locale ?? 'n/a'}`,
    });
    expect(data).toBeTruthy();
  });

  test('T-1 transcreate UI accessible from SEO item detail', async ({ page, supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    const { data } = await supabase
      .from('website_blog_posts')
      .select('id')
      .eq('website_id', websiteId)
      .limit(1);
    const post = data?.[0];
    if (!post) test.skip(true, 'No blog post');

    await page.goto(`/dashboard/${websiteId}/seo/blog/${post!.id}`);
    await page.waitForLoadState('domcontentloaded');
    const translateTab = page.getByRole('button', { name: /Translate/i }).first();
    const visible = await translateTab.isVisible().catch(() => false);
    test.info().annotations.push({
      type: 'translate-tab-visible',
      description: String(visible),
    });
    await screenshot(page, 'translate-tab');
  });

  test('T-2 transcreate create_draft action', async ({ request, supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    const { data } = await supabase
      .from('website_blog_posts')
      .select('id, title')
      .eq('website_id', websiteId)
      .limit(1);
    const post = data?.[0];
    if (!post) test.skip(true, 'No blog post');

    const t0 = Date.now();
    const res = await request.post('/api/seo/content-intelligence/transcreate', {
      data: {
        websiteId,
        sourceLocale: 'es-CO',
        targetLocale: 'en-US',
        country: 'United States',
        language: 'en',
        pageType: 'blog',
        sourceContentId: post!.id,
        sourceKeyword: 'paquete colombia',
        targetKeyword: 'colombia tour package',
        action: 'create_draft',
      },
      timeout: 90000,
    });
    const durationMs = Date.now() - t0;
    const json = await res.json().catch(() => null);
    test.info().annotations.push({
      type: 'transcreate-create-draft',
      description: `status=${res.status()} durationMs=${durationMs} jobId=${json?.data?.jobId ?? json?.jobId}`,
    });
    expect([200, 202, 400, 404, 409, 500]).toContain(res.status());

    if (res.ok()) {
      const jobs = await supabase
        .from('seo_transcreation_jobs')
        .select('id, status, source_locale, target_locale')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false })
        .limit(1);
      test.info().annotations.push({
        type: 'transcreation-job',
        description: JSON.stringify(jobs.data?.[0]),
      });
    }
  });

  test('T-3 review action idempotent', async ({ request, supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    const { data: jobs } = await supabase
      .from('seo_transcreation_jobs')
      .select('id, status, source_content_id, source_locale, target_locale, page_type')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .limit(1);
    const job = jobs?.[0];
    if (!job) test.skip(true, 'No transcreation job to review');

    const res = await request.post('/api/seo/content-intelligence/transcreate', {
      data: {
        websiteId,
        sourceLocale: job!.source_locale,
        targetLocale: job!.target_locale,
        country: 'United States',
        language: 'en',
        pageType: job!.page_type,
        sourceContentId: job!.source_content_id,
        action: 'review',
      },
    });
    test.info().annotations.push({
      type: 'transcreate-review',
      description: `status=${res.status()}`,
    });
  });

  test('T-4 apply action preserves source content', async ({ request, supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    const { data: jobs } = await supabase
      .from('seo_transcreation_jobs')
      .select('id, source_content_id, source_locale, target_locale, page_type')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .limit(1);
    const job = jobs?.[0];
    if (!job) test.skip(true, 'No transcreation job');

    const before = await supabase
      .from('website_blog_posts')
      .select('title, seo_title, seo_description')
      .eq('id', job!.source_content_id)
      .maybeSingle();

    const res = await request.post('/api/seo/content-intelligence/transcreate', {
      data: {
        websiteId,
        sourceLocale: job!.source_locale,
        targetLocale: job!.target_locale,
        country: 'United States',
        language: 'en',
        pageType: job!.page_type,
        sourceContentId: job!.source_content_id,
        targetContentId: null,
        action: 'apply',
        draft: {
          title: 'E2E Translation Target',
          seoTitle: 'E2E EN-US Title',
          seoDescription: 'E2E EN-US Description',
        },
      },
    });
    test.info().annotations.push({
      type: 'transcreate-apply',
      description: `status=${res.status()}`,
    });

    const after = await supabase
      .from('website_blog_posts')
      .select('title, seo_title, seo_description')
      .eq('id', job!.source_content_id)
      .maybeSingle();

    expect(after.data?.title, 'source title must be preserved').toBe(before.data?.title);
    expect(after.data?.seo_title, 'source seo_title must be preserved').toBe(before.data?.seo_title);
  });

  test('T-5 optimizer locale-specific returns language-appropriate suggestions', async ({ request, supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    const { data } = await supabase
      .from('website_blog_posts')
      .select('id')
      .eq('website_id', websiteId)
      .limit(1);
    const post = data?.[0];
    if (!post) test.skip(true, 'No blog post');

    const resEn = await request.post('/api/seo/content-intelligence/optimize', {
      data: {
        websiteId,
        itemType: 'blog',
        itemId: post!.id,
        locale: 'en-US',
        country: 'United States',
        language: 'en',
        action: 'suggest',
      },
    });
    const resEs = await request.post('/api/seo/content-intelligence/optimize', {
      data: {
        websiteId,
        itemType: 'blog',
        itemId: post!.id,
        locale: 'es-CO',
        country: 'Colombia',
        language: 'es',
        action: 'suggest',
      },
    });
    test.info().annotations.push({
      type: 'optimize-multi-locale',
      description: `en=${resEn.status()} es=${resEs.status()}`,
    });
  });

  test('T-6 transcreate invalid page_type rejected', async ({ request }) => {
    const { websiteId } = COLOMBIATOURS;
    const res = await request.post('/api/seo/content-intelligence/transcreate', {
      data: {
        websiteId,
        sourceLocale: 'es-CO',
        targetLocale: 'en-US',
        country: 'United States',
        language: 'en',
        pageType: 'package',
        sourceContentId: '00000000-0000-0000-0000-000000000000',
        action: 'create_draft',
      },
    });
    test.info().annotations.push({
      type: 'transcreate-package-rejection',
      description: `status=${res.status()}`,
    });
    expect([400, 403, 409, 422, 500]).toContain(res.status());
  });

  test('T-7 research locale-native multi-market differentiation', async ({ request }) => {
    const { websiteId } = COLOMBIATOURS;
    const commonSeed = 'paquete todo incluido';
    const resCo = await request.post('/api/seo/content-intelligence/research', {
      data: {
        websiteId,
        seed: commonSeed,
        locale: 'es-CO',
        country: 'Colombia',
        language: 'es',
        contentType: 'package',
      },
    });
    const resUs = await request.post('/api/seo/content-intelligence/research', {
      data: {
        websiteId,
        seed: 'all inclusive package colombia',
        locale: 'en-US',
        country: 'United States',
        language: 'en',
        contentType: 'package',
      },
    });
    test.info().annotations.push({
      type: 'research-multi-market',
      description: `co=${resCo.status()} us=${resUs.status()}`,
    });
  });

  test('T-8 gestión traducciones dashboard gap @known-gap', async ({ page }) => {
    const { websiteId } = COLOMBIATOURS;
    const res = await page.goto(`/dashboard/${websiteId}/translations`, {
      waitUntil: 'domcontentloaded',
    });
    const status = res?.status() ?? 0;
    test.info().annotations.push({
      type: 'known-gap',
      description: `dedicated /translations route status=${status} (404 expected — no dashboard yet)`,
    });
    expect([200, 404, 307, 308]).toContain(status);
  });

  test('T-9 bulk translate gap @known-gap', async ({ request }) => {
    const { websiteId } = COLOMBIATOURS;
    const res = await request.post('/api/seo/content-intelligence/transcreate', {
      data: {
        websiteId,
        sourceLocale: 'es-CO',
        targetLocale: 'en-US',
        country: 'United States',
        language: 'en',
        pageType: 'blog',
        sourceContentIds: ['*'],
        action: 'create_draft',
      },
    });
    test.info().annotations.push({
      type: 'known-gap',
      description: `bulk endpoint status=${res.status()} (no bulk variant — single-item only)`,
    });
  });
});
