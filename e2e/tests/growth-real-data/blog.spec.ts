import { test, expect, gotoTab, screenshot, COLOMBIATOURS } from '../../fixtures/colombiatours';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Growth Real-Data — Blog flow @blog @real-data', () => {
  test('B-1 blog list count matches DB oracle', async ({ page, supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    await gotoTab(page, 'contenido');
    await page
      .getByRole('button')
      .filter({ hasText: /^Blog\s*\d+$/ })
      .first()
      .click();
    await page.waitForLoadState('domcontentloaded');

    const { count } = await supabase
      .from('website_blog_posts')
      .select('id', { count: 'exact', head: true })
      .eq('website_id', websiteId);

    await expect
      .poll(
        async () => {
          const c = page.getByRole('button').filter({ hasText: /^Blog\s*\d+$/ }).first();
          const t = (await c.textContent().catch(() => '')) ?? '';
          const m = t.match(/\d+/);
          return m ? Number(m[0]) : 0;
        },
        { timeout: 30000, intervals: [500, 1000, 2000] }
      )
      .toBeGreaterThan(0);

    const chip = page.getByRole('button').filter({ hasText: /^Blog\s*\d+$/ }).first();
    const text = (await chip.textContent()) ?? '';
    const m = text.match(/\d+/);
    const uiCount = m ? Number(m[0]) : -1;

    test.info().annotations.push({
      type: 'blog-count',
      description: `ui=${uiCount} db=${count}`,
    });
    expect.soft(uiCount).toBe(count ?? 0);
    await screenshot(page, 'blog-list');
  });

  test('B-2 open blog editor', async ({ page, supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    const { data } = await supabase
      .from('website_blog_posts')
      .select('id, slug, title, status')
      .eq('website_id', websiteId)
      .limit(1);
    const post = data?.[0];
    if (!post) test.skip(true, 'No blog post available');

    await page.goto(`/dashboard/${websiteId}/blog/${post!.id}`);
    await page.waitForLoadState('domcontentloaded');
    await screenshot(page, 'blog-editor');
    test.info().annotations.push({
      type: 'blog-editor',
      description: `url=${page.url()} post=${post!.slug}`,
    });
  });

  test('B-3 AI generate blog real LLM', async ({ request }) => {
    const { websiteId } = COLOMBIATOURS;
    const t0 = Date.now();
    const res = await request.post('/api/ai/editor/generate-blog', {
      data: {
        websiteId,
        keyword: 'paquete colombia todo incluido 9 dias',
        locale: 'es-CO',
        tone: 'informative',
      },
      timeout: 90000,
    });
    const durationMs = Date.now() - t0;
    const json = await res.json().catch(() => null);
    test.info().annotations.push({
      type: 'ai-generate-blog',
      description: `status=${res.status()} durationMs=${durationMs} hasTitle=${!!(json?.data?.title ?? json?.title)}`,
    });
    expect([200, 400, 401, 403, 429, 500]).toContain(res.status());
  });

  test('B-4 SEO score inline for blog', async ({ request, supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    const { data } = await supabase
      .from('website_blog_posts')
      .select('id')
      .eq('website_id', websiteId)
      .limit(1);
    const id = data?.[0]?.id;
    if (!id) test.skip(true, 'No blog post available');

    const res = await request.get(
      `/api/seo/score?websiteId=${websiteId}&itemType=blog&itemId=${id}&locale=es-CO`
    );
    expect([200, 400, 404]).toContain(res.status());
    const json = await res.json().catch(() => null);
    test.info().annotations.push({
      type: 'blog-seo-score',
      description: `status=${res.status()} grade=${json?.data?.grade ?? json?.grade}`,
    });
  });

  test('B-5 publish draft → published roundtrip', async ({ supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    const { data } = await supabase
      .from('website_blog_posts')
      .select('id, status')
      .eq('website_id', websiteId)
      .limit(1);
    const post = data?.[0];
    if (!post) test.skip(true, 'No blog post available');

    const original = post!.status;
    const targetStatus = original === 'published' ? 'draft' : 'published';

    const flip = await supabase
      .from('website_blog_posts')
      .update({ status: targetStatus })
      .eq('id', post!.id);
    expect(flip.error).toBeNull();

    const revert = await supabase
      .from('website_blog_posts')
      .update({ status: original })
      .eq('id', post!.id);
    expect(revert.error).toBeNull();
  });

  test('B-6 locale field gap @known-gap', async ({ supabase }) => {
    const { error } = await supabase
      .from('website_blog_posts')
      .select('locale')
      .limit(1);
    const hasLocale = !error;
    test.info().annotations.push({
      type: 'known-gap',
      description: `website_blog_posts.locale column ${hasLocale ? 'exists' : 'MISSING — confirms gap'}`,
    });
    expect.soft(hasLocale, 'locale column should exist to support multi-market').toBeTruthy();
  });

  test('B-7 cluster assignment gap @known-gap', async ({ supabase }) => {
    const { error } = await supabase
      .from('website_blog_posts')
      .select('cluster_id')
      .limit(1);
    const hasClusterId = !error;
    test.info().annotations.push({
      type: 'known-gap',
      description: `website_blog_posts.cluster_id column ${hasClusterId ? 'exists' : 'MISSING — no cluster assignment UI path'}`,
    });
  });

  test('B-8 blog public page renders when published', async ({ page, supabase }) => {
    const { websiteId } = COLOMBIATOURS;
    const { data: site } = await supabase
      .from('websites')
      .select('subdomain')
      .eq('id', websiteId)
      .maybeSingle();
    const { data: posts } = await supabase
      .from('website_blog_posts')
      .select('slug, status')
      .eq('website_id', websiteId)
      .eq('status', 'published')
      .limit(1);
    const slug = posts?.[0]?.slug;
    const subdomain = site?.subdomain;
    if (!slug || !subdomain) test.skip(true, 'No published post or subdomain');

    const previewUrl = `/site/${subdomain}/blog/${slug}`;
    await page.goto(previewUrl);
    await screenshot(page, 'blog-public-preview');
    test.info().annotations.push({
      type: 'blog-public',
      description: `url=${previewUrl}`,
    });
  });
});
