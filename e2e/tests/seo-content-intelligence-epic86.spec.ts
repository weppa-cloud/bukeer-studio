import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { test, expect, type Page } from '@playwright/test';
import { getFirstWebsiteId, gotoWebsiteSection, seedWave2Fixtures } from './helpers';

test.beforeAll(async () => {
  // Wave2 seed — ensures package_kit + SEO items + Contenido rows exist so
  // the conditional `test.skip(true, 'No rows ...')` branches stop firing.
  await seedWave2Fixtures().catch(() => undefined);
});

type PackageSnapshot = {
  id: string;
  name: string | null;
  description: string | null;
  cover_image_url: string | null;
  destination: string | null;
  duration_days: number | null;
  duration_nights: number | null;
  program_highlights: unknown;
  program_inclusions: unknown;
  program_exclusions: unknown;
  program_gallery: unknown;
};

type OverlaySnapshot = {
  website_id: string;
  product_id: string;
  product_type: string;
  custom_seo_title: string | null;
  custom_seo_description: string | null;
  target_keyword: string | null;
  robots_noindex: boolean | null;
  seo_intro: string | null;
  seo_highlights: unknown;
  seo_faq: unknown;
};

type BriefSnapshot = {
  id: string;
  status: 'draft' | 'approved' | 'archived';
  locale: string;
  page_type: string;
  page_id: string;
  primary_keyword: string;
};

function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role credentials for E2E evidence test');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function snapshotPackage(row: {
  id: string;
  name: string | null;
  description: string | null;
  cover_image_url: string | null;
  destination: string | null;
  duration_days: number | null;
  duration_nights: number | null;
  program_highlights: unknown;
  program_inclusions: unknown;
  program_exclusions: unknown;
  program_gallery: unknown;
}): PackageSnapshot {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cover_image_url: row.cover_image_url,
    destination: row.destination,
    duration_days: row.duration_days,
    duration_nights: row.duration_nights,
    program_highlights: row.program_highlights,
    program_inclusions: row.program_inclusions,
    program_exclusions: row.program_exclusions,
    program_gallery: row.program_gallery,
  };
}

function snapshotOverlay(row: Record<string, unknown> | null): OverlaySnapshot | null {
  if (!row) return null;
  return {
    website_id: String(row.website_id ?? ''),
    product_id: String(row.product_id ?? ''),
    product_type: String(row.product_type ?? ''),
    custom_seo_title: (row.custom_seo_title as string | null) ?? null,
    custom_seo_description: (row.custom_seo_description as string | null) ?? null,
    target_keyword: (row.target_keyword as string | null) ?? null,
    robots_noindex: (row.robots_noindex as boolean | null) ?? null,
    seo_intro: (row.seo_intro as string | null) ?? null,
    seo_highlights: row.seo_highlights ?? null,
    seo_faq: row.seo_faq ?? null,
  };
}

async function getWebsiteAccountId(admin: SupabaseClient, websiteId: string): Promise<string> {
  const { data, error } = await admin
    .from('websites')
    .select('account_id')
    .eq('id', websiteId)
    .single();

  if (error || !data?.account_id) {
    throw new Error(`Could not resolve account_id for website ${websiteId}: ${error?.message ?? 'no data'}`);
  }

  return String(data.account_id);
}

async function pickPackageFixture(admin: SupabaseClient, websiteId: string) {
  const accountId = await getWebsiteAccountId(admin, websiteId);
  const { data, error } = await admin
    .from('package_kits')
    .select('id, name, description, cover_image_url, destination, duration_days, duration_nights, program_highlights, program_inclusions, program_exclusions, program_gallery')
    .eq('account_id', accountId)
    .limit(1);

  if (error) {
    throw new Error(`Could not load package fixture: ${error.message}`);
  }

  const row = data?.[0];
  if (!row?.id) {
    return null;
  }

  return snapshotPackage(row);
}

async function pickTranslatableFixture(admin: SupabaseClient, websiteId: string) {
  const pageResult = await admin
    .from('website_pages')
    .select('id, title, slug')
    .eq('website_id', websiteId)
    .limit(1);
  if (pageResult.error) {
    throw new Error(`Could not load page translation fixture: ${pageResult.error.message}`);
  }
  const pageRow = pageResult.data?.[0];
  if (pageRow?.id) {
    return {
      id: String(pageRow.id),
      type: 'page' as const,
      label: String(pageRow.title ?? pageRow.slug ?? pageRow.id),
    };
  }

  const blogResult = await admin
    .from('website_blog_posts')
    .select('id, title, slug')
    .eq('website_id', websiteId)
    .limit(1);
  if (blogResult.error) {
    throw new Error(`Could not load blog translation fixture: ${blogResult.error.message}`);
  }
  const blogRow = blogResult.data?.[0];
  if (blogRow?.id) {
    return {
      id: String(blogRow.id),
      type: 'blog' as const,
      label: String(blogRow.title ?? blogRow.slug ?? blogRow.id),
    };
  }

  const destinationResult = await admin.from('destinations').select('id, name, slug').limit(1);
  if (destinationResult.error) {
    throw new Error(`Could not load destination translation fixture: ${destinationResult.error.message}`);
  }
  const destinationRow = destinationResult.data?.[0];
  if (destinationRow?.id) {
    return {
      id: String(destinationRow.id),
      type: 'destination' as const,
      label: String(destinationRow.name ?? destinationRow.slug ?? destinationRow.id),
    };
  }

  return null;
}

async function getOverlaySnapshot(admin: SupabaseClient, websiteId: string, productId: string) {
  const { data, error } = await admin
    .from('website_product_pages')
    .select('website_id, product_id, product_type, custom_seo_title, custom_seo_description, target_keyword, robots_noindex, seo_intro, seo_highlights, seo_faq')
    .eq('website_id', websiteId)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load website_product_pages snapshot: ${error.message}`);
  }

  return snapshotOverlay(data);
}

async function ensureApprovedBrief(page: Page, websiteId: string, packageFixture: PackageSnapshot) {
  const locale = 'es-CO';
  const query = new URLSearchParams({
    websiteId,
    pageType: 'package',
    pageId: packageFixture.id,
    locale,
  });

  const existing = await page.request.get(`/api/seo/content-intelligence/briefs?${query.toString()}`);
  const existingBody = await existing.json();
  const approved = (existingBody?.data?.rows ?? []).find((row: BriefSnapshot) => row.status === 'approved') as BriefSnapshot | undefined;
  if (approved?.id) {
    return { briefId: approved.id, createdBriefId: null as string | null };
  }

  const createResponse = await page.request.post('/api/seo/content-intelligence/briefs', {
    data: {
      action: 'create',
      websiteId,
      locale,
      contentType: 'package',
      pageType: 'package',
      pageId: packageFixture.id,
      primaryKeyword: packageFixture.name ?? 'package seo brief',
      secondaryKeywords: ['travel package', 'package seo'],
      brief: {
        summary: 'Evidence brief for package optimize guardrail.',
        scope: 'package truth-field protection',
      },
      changeReason: 'issue-92-evidence',
    },
  });
  const createBody = await createResponse.json();
  expect(createResponse.ok(), 'brief create should succeed').toBeTruthy();
  expect(createBody.success).toBe(true);

  const createdBriefId = String(createBody.data.brief.id);

  const approveResponse = await page.request.post('/api/seo/content-intelligence/briefs', {
    data: {
      action: 'approve',
      websiteId,
      briefId: createdBriefId,
    },
  });
  const approveBody = await approveResponse.json();
  expect(approveResponse.ok(), 'brief approve should succeed').toBeTruthy();
  expect(approveBody.success).toBe(true);

  return { briefId: createdBriefId, createdBriefId };
}

async function runBlockedOptimize(page: Page, payload: Record<string, unknown>) {
  const response = await page.request.post('/api/seo/content-intelligence/optimize', { data: payload });
  const body = await response.json();
  return { response, body };
}

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = message.includes('NS_BINDING_ABORTED');
      if (!retryable || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(500 * attempt);
    }
  }
  throw lastError;
}

test.describe('EPIC #86 - SEO Content Intelligence', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.setTimeout(90_000);

  test('analytics exposes Content Intelligence, Keywords, and Clusters tabs', async ({ page }) => {
    await gotoWebsiteSection(page, 'analytics');

    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Content Intelligence' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keywords' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clusters' })).toBeVisible();
  });

  test('content intelligence tab renders audit controls', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/analytics?tab=content-intelligence`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: 'Content Intelligence' })).toHaveClass(/studio-tab-active/);
    await expect(page.locator('input[value="es-CO"]').first()).toBeVisible();
    await expect(page.getByText('Decision-grade only (live + authoritative)').first()).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Audit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });

  test('keywords tab renders locale-native research form', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/analytics?tab=keywords`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Keyword Research (locale-native)')).toBeVisible();
    await expect(page.locator('input[value="Colombia"]')).toBeVisible();
    await expect(page.locator('input[value="es"]').first()).toBeVisible();
    await expect(page.locator('input[value="es-CO"]').first()).toBeVisible();
    await expect(page.getByText('Decision-grade only (live + authoritative)').first()).toBeVisible();
    await expect(page.getByPlaceholder('cartagena tours, caribbean travel guide, best time cartagena')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Research' })).toBeVisible();
  });

  test('clusters tab renders planner board controls', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/analytics?tab=clusters`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByPlaceholder('Locale (es-CO)')).toBeVisible();
    await expect(page.getByPlaceholder('Country')).toBeVisible();
    await expect(page.getByPlaceholder('Language')).toBeVisible();
    await expect(page.getByPlaceholder('Cluster name')).toBeVisible();
    await expect(page.getByPlaceholder('Primary topic')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create cluster' })).toBeVisible();
  });

  test('SEO item detail exposes Brief -> Optimize -> Translate -> Track loop', async ({ page }) => {
    await gotoWebsiteSection(page, 'contenido');

    await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();
    const openSeoButton = page.getByRole('button', { name: 'Open SEO' }).first();
    const count = await openSeoButton.count();
    if (count === 0) {
      test.skip(true, 'No rows in Contenido table — cannot validate full SEO loop');
      return;
    }

    await openSeoButton.click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Brief' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Optimize' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Translate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Track' })).toBeVisible();

    await page.getByRole('button', { name: 'Translate' }).click();
    await expect(page.getByPlaceholder('Search target content by title or slug')).toBeVisible();
    await expect(page.getByRole('button', { name: /Step 1: Create Draft|Step 2: Mark Reviewed|Step 3: Apply|Completed/i })).toBeVisible();

    await page.getByRole('button', { name: 'Track' }).click();
    await expect(page.getByRole('button', { name: 'Load Track' })).toBeVisible();
    await expect(page.getByText('Decision-grade only (live + authoritative)').first()).toBeVisible();
  });

  test('package optimize blocks truth-field patches and preserves package source data @issue-92', async ({ page }) => {
    const admin = createAdminClient();
    const websiteId = await getFirstWebsiteId(page);
    const packageFixture = await pickPackageFixture(admin, websiteId);

    if (!packageFixture) {
      test.skip(true, 'No package fixtures found in the test website');
      return;
    }

    const { briefId, createdBriefId } = await ensureApprovedBrief(page, websiteId, packageFixture);

    const beforePackage = packageFixture;
    const beforeOverlay = await getOverlaySnapshot(admin, websiteId, packageFixture.id);

    const blockedPatch = {
      websiteId,
      itemType: 'package',
      itemId: packageFixture.id,
      locale: 'es-CO',
      mode: 'apply',
      briefId,
      patch: {
        price: 'USD 1,250',
        availability: 'sold_out',
        itinerary: ['day-1', 'day-2'],
        policies: 'No refund after booking',
      },
    };

    const { response, body } = await runBlockedOptimize(page, blockedPatch);

    expect(response.status(), 'optimize should reject truth-field patch').toBe(409);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('SEO_TRUTH_FIELD_BLOCKED');
    expect(body.error.details).toMatchObject({ blockedFields: expect.arrayContaining(['price', 'availability', 'itinerary', 'policies']) });

    const { data: actionRow, error: actionError } = await admin
      .from('seo_optimizer_actions')
      .select('id, action_type, error_code, blocked_reason, before_payload, after_payload, website_id, item_type, item_id, locale, brief_id')
      .eq('website_id', websiteId)
      .eq('item_type', 'package')
      .eq('item_id', packageFixture.id)
      .eq('locale', 'es-CO')
      .eq('action_type', 'blocked')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(actionError).toBeNull();
    expect(actionRow).toMatchObject({
      action_type: 'blocked',
      error_code: 'SEO_TRUTH_FIELD_BLOCKED',
      brief_id: briefId,
    });

    const afterPackage = await pickPackageFixture(admin, websiteId);
    const afterOverlay = await getOverlaySnapshot(admin, websiteId, packageFixture.id);

    expect(afterPackage).toEqual(beforePackage);
    expect(afterOverlay).toEqual(beforeOverlay);

    if (createdBriefId) {
      const { error: deleteVersionsError } = await admin
        .from('seo_brief_versions')
        .delete()
        .eq('brief_id', createdBriefId);
      expect(deleteVersionsError).toBeNull();

      const { error: deleteBriefError } = await admin
        .from('seo_briefs')
        .delete()
        .eq('id', createdBriefId);
      expect(deleteBriefError).toBeNull();
    }
  });

  test('captures EPIC #86 walkthrough screenshots for the evidence runbook @evidence', async ({ page }) => {
    const admin = createAdminClient();
    const websiteId = await getFirstWebsiteId(page);
    const packageFixture = await pickPackageFixture(admin, websiteId);
    const translatableFixture = await pickTranslatableFixture(admin, websiteId);

    if (!packageFixture || !translatableFixture) {
      test.skip(true, 'Missing package or translatable fixture for evidence screenshots');
      return;
    }

    const { createdBriefId } = await ensureApprovedBrief(page, websiteId, packageFixture);
    const screenshotsDir = path.join(process.cwd(), 'docs', 'evidence', 'epic86', 'screenshots');
    mkdirSync(screenshotsDir, { recursive: true });

    const shot = async (filename: string) => {
      await page.screenshot({
        path: path.join(screenshotsDir, filename),
        fullPage: true,
      });
    };

    await gotoWebsiteSection(page, 'analytics');
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
    await shot('01-analytics-overview.png');

    await page.getByRole('button', { name: 'Content Intelligence' }).click();
    await expect(page.getByText('Decision-grade only (live + authoritative)').first()).toBeVisible();
    await shot('02-content-intelligence-audit.png');

    await page.getByRole('button', { name: 'Keywords' }).click();
    await expect(page.getByText('Keyword Research (locale-native)')).toBeVisible();
    await shot('03-keywords-research.png');

    await page.getByRole('button', { name: 'Clusters' }).click();
    await expect(page.getByPlaceholder('Cluster name')).toBeVisible();
    await shot('04-clusters-board.png');

    await gotoWithRetry(page, `/dashboard/${websiteId}/seo/package/${packageFixture.id}`);
    await expect(page.getByRole('heading', { name: packageFixture.name ?? '' })).toBeVisible();

    await page.getByRole('button', { name: 'Brief' }).click();
    await expect(page.getByRole('button', { name: 'Create Draft' })).toBeVisible();
    await shot('05-package-brief.png');

    await page.getByRole('button', { name: 'Optimize' }).click();
    await expect(page.getByText('Guardrail activo: `package/activity` solo permite SEO layer (title/description/keyword + intro/highlights/faq).')).toBeVisible();
    await shot('06-package-optimize-guardrail.png');

    await gotoWithRetry(page, `/dashboard/${websiteId}/seo/${translatableFixture.type}/${translatableFixture.id}`);
    await expect(page.getByRole('heading', { name: translatableFixture.label })).toBeVisible();

    await page.getByRole('button', { name: 'Translate' }).click();
    await expect(page.getByPlaceholder('Search target content by title or slug')).toBeVisible();
    await shot('07-transcreate-translate.png');

    await page.getByRole('button', { name: 'Track' }).click();
    await expect(page.getByRole('button', { name: 'Load Track' })).toBeVisible();
    await shot('08-transcreate-track.png');

    if (createdBriefId) {
      const { error: deleteVersionsError } = await admin
        .from('seo_brief_versions')
        .delete()
        .eq('brief_id', createdBriefId);
      expect(deleteVersionsError).toBeNull();

      const { error: deleteBriefError } = await admin
        .from('seo_briefs')
        .delete()
        .eq('id', createdBriefId);
      expect(deleteBriefError).toBeNull();
    }
  });
});
