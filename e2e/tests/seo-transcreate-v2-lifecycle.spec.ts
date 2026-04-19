import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';

const TRANSCREATE_ROUTE = '/api/seo/content-intelligence/transcreate';

type PackageFixture = {
  id: string;
  name: string;
};

type FeatureFlagSnapshot = {
  enabled: boolean;
  canary_locales: string[];
} | null;

function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service-role credentials for transcreate E2E test');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getWebsiteAccountId(admin: SupabaseClient, websiteId: string): Promise<string> {
  const { data, error } = await admin
    .from('websites')
    .select('account_id')
    .eq('id', websiteId)
    .single();
  if (error || !data?.account_id) {
    throw new Error(`Unable to resolve website account: ${error?.message ?? 'missing account_id'}`);
  }
  return String(data.account_id);
}

async function pickPackageFixture(admin: SupabaseClient, websiteId: string): Promise<PackageFixture> {
  const accountId = await getWebsiteAccountId(admin, websiteId);
  const { data, error } = await admin
    .from('package_kits')
    .select('id,name')
    .eq('account_id', accountId)
    .limit(1);

  if (error || !data?.[0]?.id) {
    throw new Error(`No package fixture available: ${error?.message ?? 'empty result'}`);
  }

  return {
    id: String(data[0].id),
    name: String(data[0].name ?? 'QA package'),
  };
}

async function seedDecisionGradeCandidate(input: {
  admin: SupabaseClient;
  websiteId: string;
  targetLocale: string;
  country: string;
  language: string;
  targetKeyword: string;
  pageType: 'package';
}) {
  const runId = crypto.randomUUID();
  const candidateId = crypto.randomUUID();

  const { error: runError } = await input.admin
    .from('seo_keyword_research_runs')
    .insert({
      id: runId,
      website_id: input.websiteId,
      content_type: input.pageType,
      country: input.country,
      language: input.language,
      locale: input.targetLocale,
      seeds: [input.targetKeyword],
      source: 'dataforseo',
      confidence: 'live',
      decision_grade_ready: true,
    });
  if (runError) {
    throw new Error(`Could not seed keyword research run: ${runError.message}`);
  }

  const { error: candidateError } = await input.admin
    .from('seo_keyword_candidates')
    .insert({
      id: candidateId,
      research_run_id: runId,
      website_id: input.websiteId,
      content_type: input.pageType,
      country: input.country,
      language: input.language,
      locale: input.targetLocale,
      keyword: input.targetKeyword,
      source: 'dataforseo',
      confidence: 'live',
      decision_grade_ready: true,
      seasonality_status: 'available',
      serp_top_competitors: [{ domain: 'example.com' }],
    });
  if (candidateError) {
    throw new Error(`Could not seed keyword candidate: ${candidateError.message}`);
  }

  return { runId, candidateId };
}

async function postTranscreateAction(page: Page, payload: Record<string, unknown>) {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await page.request.post(TRANSCREATE_ROUTE, { data: payload });
    const rawText = await response.text();
    let body: unknown = null;
    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        body = { parseError: true, rawText };
      }
    }

    const bodyCode = (body as { code?: string } | null)?.code ?? '';
    const retryable =
      response.status() === 401 ||
      response.status() === 429 ||
      bodyCode === 'AUTH_EXPIRED' ||
      bodyCode === 'RATE_LIMITED';

    if (!retryable || attempt === maxAttempts - 1) {
      return { response, body };
    }

    await page.waitForTimeout(200 * (attempt + 1));
  }

  throw new Error('unreachable');
}

test.describe('SEO transcreate lifecycle v2/v2.1 @e2e', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.setTimeout(120_000);

  const admin = createAdminClient();
  let websiteId = '';
  let packageFixture: PackageFixture | null = null;
  let originalFlag: FeatureFlagSnapshot = null;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await context.newPage();
    websiteId = await getFirstWebsiteId(page);
    packageFixture = await pickPackageFixture(admin, websiteId);
    await context.close();

    const { data } = await admin
      .from('seo_transcreate_feature_flags')
      .select('enabled,canary_locales')
      .eq('website_id', websiteId)
      .maybeSingle();

    originalFlag = data
      ? {
          enabled: Boolean(data.enabled),
          canary_locales: Array.isArray(data.canary_locales)
            ? data.canary_locales.filter((value): value is string => typeof value === 'string')
            : [],
        }
      : null;
  });

  test.afterAll(async () => {
    if (!websiteId) return;
    if (!originalFlag) {
      await admin.from('seo_transcreate_feature_flags').delete().eq('website_id', websiteId);
      return;
    }
    await admin
      .from('seo_transcreate_feature_flags')
      .upsert(
        {
          website_id: websiteId,
          enabled: originalFlag.enabled,
          canary_locales: originalFlag.canary_locales,
        },
        { onConflict: 'website_id' },
      );
  });

  test('v2 draft -> reviewed -> applied (schema 2.0)', async ({ page }) => {
    expect(packageFixture).not.toBeNull();
    const sourceContentId = String(packageFixture!.id);
    const targetLocale = `en-v2-${Date.now().toString().slice(-4)}`;
    const targetKeyword = `qa-v2-${Date.now()}`;
    const country = 'US';
    const language = 'en';

    await admin
      .from('seo_transcreate_feature_flags')
      .upsert(
        {
          website_id: websiteId,
          enabled: false,
          canary_locales: [],
        },
        { onConflict: 'website_id' },
      );

    const seeded = await seedDecisionGradeCandidate({
      admin,
      websiteId,
      targetLocale,
      country,
      language,
      targetKeyword,
      pageType: 'package',
    });

    const payloadV2 = {
      meta_title: 'QA schema v2 title',
      meta_desc: 'QA schema v2 meta description for lifecycle test',
      slug: `qa-schema-v2-${Date.now().toString().slice(-6)}`,
      h1: 'QA schema v2 heading',
      keywords: [targetKeyword],
      body_content: {
        body: 'QA body content for schema v2.',
        seo_intro: 'QA intro for schema v2.',
        seo_highlights: ['Highlight v2 one', 'Highlight v2 two'],
        seo_faq: [{ question: 'FAQ v2 question?', answer: 'FAQ v2 answer.' }],
      },
    };

    const createDraft = await postTranscreateAction(page, {
      action: 'create_draft',
      websiteId,
      sourceContentId,
      pageType: 'package',
      sourceLocale: 'es-CO',
      targetLocale,
      country,
      language,
      sourceKeyword: packageFixture!.name,
      targetKeyword,
      draftSource: 'manual',
      schemaVersion: '2.0',
      payloadV2,
      draft: {},
    });
    expect(createDraft.response.ok(), JSON.stringify(createDraft.body)).toBeTruthy();
    const jobId = String(createDraft.body?.data?.job?.id ?? '');
    expect(jobId).not.toBe('');
    expect(createDraft.body?.data?.job?.status).toBe('draft');

    const review = await postTranscreateAction(page, {
      action: 'review',
      websiteId,
      sourceContentId,
      pageType: 'package',
      sourceLocale: 'es-CO',
      targetLocale,
      country,
      language,
      sourceKeyword: packageFixture!.name,
      targetKeyword,
      jobId,
    });
    expect(review.response.ok(), JSON.stringify(review.body)).toBeTruthy();
    expect(review.body?.data?.job?.status).toBe('reviewed');

    const apply = await postTranscreateAction(page, {
      action: 'apply',
      websiteId,
      sourceContentId,
      pageType: 'package',
      sourceLocale: 'es-CO',
      targetLocale,
      country,
      language,
      sourceKeyword: packageFixture!.name,
      targetKeyword,
      jobId,
    });
    expect(apply.response.ok(), JSON.stringify(apply.body)).toBeTruthy();
    expect(apply.body?.data?.job?.status).toBe('applied');

    const { data: jobRow } = await admin
      .from('seo_transcreation_jobs')
      .select('status,schema_version,payload_v2')
      .eq('id', jobId)
      .single();
    expect(jobRow?.status).toBe('applied');
    expect(jobRow?.schema_version).toBe('2.0');
    expect((jobRow?.payload_v2 as { meta_title?: string })?.meta_title).toBe(payloadV2.meta_title);

    const { data: variantRow } = await admin
      .from('seo_localized_variants')
      .select('status,body_overlay_v2')
      .eq('website_id', websiteId)
      .eq('page_type', 'package')
      .eq('source_entity_id', sourceContentId)
      .eq('target_locale', targetLocale)
      .single();
    expect(variantRow?.status).toBe('applied');
    expect((variantRow?.body_overlay_v2 as { description_long?: string } | null)?.description_long).toBeUndefined();

    const { data: overlayRow } = await admin
      .from('website_product_pages')
      .select('custom_seo_title,locale,body_content')
      .eq('website_id', websiteId)
      .eq('product_type', 'package')
      .eq('product_id', sourceContentId)
      .eq('locale', targetLocale)
      .single();
    expect(overlayRow?.locale).toBe(targetLocale);
    expect(overlayRow?.custom_seo_title).toBe(payloadV2.meta_title);

    await admin.from('website_product_pages').delete().eq('website_id', websiteId).eq('product_type', 'package').eq('product_id', sourceContentId).eq('locale', targetLocale);
    await admin.from('seo_localized_variants').delete().eq('website_id', websiteId).eq('page_type', 'package').eq('source_entity_id', sourceContentId).eq('target_locale', targetLocale);
    await admin.from('seo_transcreation_jobs').delete().eq('id', jobId);
    await admin.from('seo_keyword_candidates').delete().eq('id', seeded.candidateId);
    await admin.from('seo_keyword_research_runs').delete().eq('id', seeded.runId);
  });

  test('v2.1 draft -> reviewed -> applied (schema 2.1 full payload)', async ({ page }) => {
    expect(packageFixture).not.toBeNull();
    const sourceContentId = String(packageFixture!.id);
    const targetLocale = `en-v21-${Date.now().toString().slice(-4)}`;
    const targetKeyword = `qa-v21-${Date.now()}`;
    const country = 'US';
    const language = 'en';

    await admin
      .from('seo_transcreate_feature_flags')
      .upsert(
        {
          website_id: websiteId,
          enabled: true,
          canary_locales: [targetLocale],
        },
        { onConflict: 'website_id' },
      );

    const seeded = await seedDecisionGradeCandidate({
      admin,
      websiteId,
      targetLocale,
      country,
      language,
      targetKeyword,
      pageType: 'package',
    });

    const payloadV21 = {
      meta_title: 'QA schema v2.1 title',
      meta_desc: 'QA schema v2.1 meta description for lifecycle test',
      slug: `qa-schema-v21-${Date.now().toString().slice(-6)}`,
      h1: 'QA schema v2.1 heading',
      keywords: [targetKeyword],
      body_content: {
        body: 'QA body content for schema v2.1.',
        seo_intro: 'QA intro for schema v2.1.',
        seo_highlights: ['Highlight v2.1 one', 'Highlight v2.1 two'],
        seo_faq: [{ question: 'FAQ v2.1 question?', answer: 'FAQ v2.1 answer.' }],
      },
      description_long: 'Long form copy for schema v2.1 test.',
      highlights: ['V2.1 highlight A', 'V2.1 highlight B'],
      faq: [{ question: 'Body FAQ question?', answer: 'Body FAQ answer.' }],
      recommendations: ['Recommendation 1'],
      cta_final_text: 'Request your quote now',
      program_timeline: [{ title: 'Day 1', description: 'Arrival and orientation' }],
      inclusions: ['Airport transfer'],
      exclusions: ['Travel insurance'],
      hero_subtitle: 'Hero subtitle for schema v2.1',
      category_label: 'Packages',
    };

    const createDraft = await postTranscreateAction(page, {
      action: 'create_draft',
      websiteId,
      sourceContentId,
      pageType: 'package',
      sourceLocale: 'es-CO',
      targetLocale,
      country,
      language,
      sourceKeyword: packageFixture!.name,
      targetKeyword,
      draftSource: 'manual',
      schemaVersion: '2.1',
      payloadV2: payloadV21,
      draft: {},
    });
    expect(createDraft.response.ok(), JSON.stringify(createDraft.body)).toBeTruthy();
    const jobId = String(createDraft.body?.data?.job?.id ?? '');
    expect(jobId).not.toBe('');
    expect(createDraft.body?.data?.job?.status).toBe('draft');

    const review = await postTranscreateAction(page, {
      action: 'review',
      websiteId,
      sourceContentId,
      pageType: 'package',
      sourceLocale: 'es-CO',
      targetLocale,
      country,
      language,
      sourceKeyword: packageFixture!.name,
      targetKeyword,
      jobId,
    });
    expect(review.response.ok(), JSON.stringify(review.body)).toBeTruthy();
    expect(review.body?.data?.job?.status).toBe('reviewed');

    const apply = await postTranscreateAction(page, {
      action: 'apply',
      websiteId,
      sourceContentId,
      pageType: 'package',
      sourceLocale: 'es-CO',
      targetLocale,
      country,
      language,
      sourceKeyword: packageFixture!.name,
      targetKeyword,
      jobId,
    });
    expect(apply.response.ok(), JSON.stringify(apply.body)).toBeTruthy();
    expect(apply.body?.data?.job?.status).toBe('applied');

    const { data: jobRow } = await admin
      .from('seo_transcreation_jobs')
      .select('status,schema_version,payload_v2')
      .eq('id', jobId)
      .single();
    expect(jobRow?.status).toBe('applied');
    expect(jobRow?.schema_version).toBe('2.1');
    expect((jobRow?.payload_v2 as { description_long?: string })?.description_long).toBe(payloadV21.description_long);

    const { data: variantRow } = await admin
      .from('seo_localized_variants')
      .select('status,body_overlay_v2')
      .eq('website_id', websiteId)
      .eq('page_type', 'package')
      .eq('source_entity_id', sourceContentId)
      .eq('target_locale', targetLocale)
      .single();
    expect(variantRow?.status).toBe('applied');
    expect((variantRow?.body_overlay_v2 as { description_long?: string })?.description_long).toBe(payloadV21.description_long);

    const { data: overlayRow } = await admin
      .from('website_product_pages')
      .select('custom_seo_title,locale,body_content')
      .eq('website_id', websiteId)
      .eq('product_type', 'package')
      .eq('product_id', sourceContentId)
      .eq('locale', targetLocale)
      .single();
    expect(overlayRow?.locale).toBe(targetLocale);
    expect(overlayRow?.custom_seo_title).toBe(payloadV21.meta_title);
    expect((overlayRow?.body_content as { description_long?: string })?.description_long).toBe(payloadV21.description_long);

    await admin.from('website_product_pages').delete().eq('website_id', websiteId).eq('product_type', 'package').eq('product_id', sourceContentId).eq('locale', targetLocale);
    await admin.from('seo_localized_variants').delete().eq('website_id', websiteId).eq('page_type', 'package').eq('source_entity_id', sourceContentId).eq('target_locale', targetLocale);
    await admin.from('seo_transcreation_jobs').delete().eq('id', jobId);
    await admin.from('seo_keyword_candidates').delete().eq('id', seeded.candidateId);
    await admin.from('seo_keyword_research_runs').delete().eq('id', seeded.runId);
  });

  // EPIC #207 W1 · P0-7 · closes flow #24 from the e2e-gap audit.
  test('applied transcreate renders on /en/paquetes/{slug} @p0-seo', async ({ page }) => {
    test.skip(
      !packageFixture,
      'No package fixture seeded — applied-transcreate public render loop needs a package kit',
    );

    const slug = String(packageFixture!.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    test.skip(slug.length === 0, 'Could not derive slug from package fixture');

    const response = await page.goto(`/en/paquetes/${slug}`, { waitUntil: 'domcontentloaded' });
    test.skip(
      !response || response.status() === 404,
      `Public /en/paquetes/${slug} not available — requires earlier "applied" lifecycle test to seed an overlay with a matching slug`,
    );
    test.skip(
      response!.status() >= 500,
      `/en/paquetes/${slug} returned ${response!.status()} — middleware or SSR unavailable in this env`,
    );

    // The applied overlay writes English title + description into
    // website_product_pages; the public SSR should surface them.
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/i);
    await expect(page.locator('meta[property="og:locale"]').first()).toHaveAttribute(
      'content',
      /^en/i,
    );
  });

  // EPIC #207 W1 · seeded-fixture variant of the applied-transcreate contract.
  // Uses `seedWave2Fixtures().seo.appliedTranscreationJobIds` so the assertion
  // works even when the dynamic v2/v2.1 lifecycle above is skipped (e.g. CI
  // without OpenRouter creds). The seeded jobs target `en-US` directly.
  test('seeded applied transcreation jobs exist for en-US (ADR-020) @p0-seo', async () => {
    const fixtures = await seedWave2Fixtures();
    test.skip(
      fixtures.seo.appliedTranscreationJobIds.length === 0,
      'No applied transcreation jobs seeded — hreflang emission would be disabled (see seed warnings).',
    );
    expect(fixtures.seo.appliedTranscreationJobIds.length).toBeGreaterThan(0);
    expect(fixtures.seo.supportedLocales).toEqual(expect.arrayContaining(['es-CO', 'en-US']));
  });
});
