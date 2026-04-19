import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WEBSITE_OVERRIDE_ID = (process.env.E2E_WEBSITE_ID ?? '').trim();
const WEBSITE_FALLBACK_SUBDOMAIN = (process.env.E2E_PUBLIC_SUBDOMAIN ?? 'colombiatours')
  .trim()
  .toLowerCase();
const SUFFIX_SOURCE = (UUID_RE.test(WEBSITE_OVERRIDE_ID)
  ? WEBSITE_OVERRIDE_ID.slice(0, 8)
  : WEBSITE_FALLBACK_SUBDOMAIN.replace(/[^a-z0-9]/g, '').slice(0, 8)) || 'seed';

const E2E_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const E2E_WEBSITE_ID = UUID_RE.test(WEBSITE_OVERRIDE_ID)
  ? WEBSITE_OVERRIDE_ID
  : '22222222-2222-4222-8222-222222222222';
const E2E_PACKAGE_SLUG = `e2e-qa-package-${SUFFIX_SOURCE}`;
const E2E_PAGE_SLUG = `e2e-qa-landing-${SUFFIX_SOURCE}`;
const E2E_BLOG_SLUG = `e2e-qa-blog-${SUFFIX_SOURCE}`;
const E2E_GLOSSARY_TERMS = ['Andes', 'Colombia', 'Cartagena'] as const;

export const E2E_FIXTURE_IDS = {
  accountId: E2E_ACCOUNT_ID,
  websiteId: E2E_WEBSITE_ID,
  packageSlug: E2E_PACKAGE_SLUG,
  pageSlug: E2E_PAGE_SLUG,
  blogSlug: E2E_BLOG_SLUG,
} as const;

type SeedAccount = { id: string; name: string | null };
type SeedWebsite = { id: string; account_id: string; subdomain: string };

let seedContextPromise: Promise<{ account: SeedAccount; website: SeedWebsite }> | null = null;
let wave2SeedPromise: Promise<SeedWave2Result> | null = null;

function errorMessage(error: unknown): string {
  if (!error) return 'unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return JSON.stringify(error);
}

async function resolveWebsiteForSeed(admin: SupabaseClient): Promise<SeedWebsite> {
  const byId = UUID_RE.test(WEBSITE_OVERRIDE_ID) ? WEBSITE_OVERRIDE_ID : null;

  if (byId) {
    const { data, error } = await admin
      .from('websites')
      .select('id, account_id, subdomain')
      .eq('id', byId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!error && data?.id && data.account_id) {
      return {
        id: String(data.id),
        account_id: String(data.account_id),
        subdomain: String(data.subdomain ?? WEBSITE_FALLBACK_SUBDOMAIN),
      };
    }
  }

  if (WEBSITE_FALLBACK_SUBDOMAIN) {
    const { data, error } = await admin
      .from('websites')
      .select('id, account_id, subdomain')
      .eq('subdomain', WEBSITE_FALLBACK_SUBDOMAIN)
      .is('deleted_at', null)
      .maybeSingle();

    if (!error && data?.id && data.account_id) {
      return {
        id: String(data.id),
        account_id: String(data.account_id),
        subdomain: String(data.subdomain ?? WEBSITE_FALLBACK_SUBDOMAIN),
      };
    }
  }

  const { data: fallback, error: fallbackError } = await admin
    .from('websites')
    .select('id, account_id, subdomain, created_at')
    .not('account_id', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackError || !fallback?.id || !fallback.account_id) {
    throw new Error(
      `Could not resolve seed website. Configure E2E_WEBSITE_ID in .env.local. Details: ${errorMessage(
        fallbackError,
      )}`,
    );
  }

  return {
    id: String(fallback.id),
    account_id: String(fallback.account_id),
    subdomain: String((fallback.subdomain ?? WEBSITE_FALLBACK_SUBDOMAIN) || 'site'),
  };
}

export async function seedTestData() {
  if (seedContextPromise) return seedContextPromise;

  seedContextPromise = (async () => {
    const website = await resolveWebsiteForSeed(supabase);
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', website.account_id)
      .maybeSingle();

    if (error || !account?.id) {
      throw new Error(`Could not resolve seed account ${website.account_id}: ${errorMessage(error)}`);
    }

    return {
      account: {
        id: String(account.id),
        name: typeof account.name === 'string' ? account.name : null,
      },
      website,
    };
  })().catch((error) => {
    seedContextPromise = null;
    throw error;
  });

  return seedContextPromise;
}

export async function cleanupTestData() {
  const base = await seedTestData().catch(() => null);
  if (!base) return;

  const websiteId = String(base.website.id);
  const accountId = String(base.account.id);

  const { data: page } = await supabase
    .from('website_pages')
    .select('id')
    .eq('website_id', websiteId)
    .eq('slug', E2E_PAGE_SLUG)
    .maybeSingle();
  const { data: pkg } = await supabase
    .from('package_kits')
    .select('id')
    .eq('slug', E2E_PACKAGE_SLUG)
    .maybeSingle();

  const pageIds = [page?.id, pkg?.id].filter(Boolean) as string[];
  if (pageIds.length > 0) {
    await supabase
      .from('seo_transcreation_jobs')
      .delete()
      .eq('website_id', websiteId)
      .in('page_id', pageIds);
  }

  await supabase
    .from('seo_translation_glossary')
    .delete()
    .eq('website_id', websiteId)
    .eq('locale', 'en-US')
    .in('term', [...E2E_GLOSSARY_TERMS]);

  await supabase
    .from('website_blog_posts')
    .delete()
    .eq('website_id', websiteId)
    .eq('slug', E2E_BLOG_SLUG)
    .eq('locale', 'es-CO');

  await supabase
    .from('website_pages')
    .delete()
    .eq('website_id', websiteId)
    .eq('slug', E2E_PAGE_SLUG);

  await supabase
    .from('package_kits')
    .delete()
    .eq('account_id', accountId)
    .eq('slug', E2E_PACKAGE_SLUG);
}

/**
 * SEO-specific fixtures seeded for EPIC #207 W1 P0 specs (@p0-seo tag).
 * See `seedSeoFixtures` below and `docs/ops/e2e-gap-audit-seo-i18n-2026-04-19.md`.
 */
export interface SeoFixtures {
  /** Product id (package) whose `website_product_pages.robots_noindex = true` — expected absent from sitemap. */
  noindexProductId: string | null;
  /** old_path seeded into `website_legacy_redirects` — expected to 301 to `/redirect-target`. */
  legacyRedirectPath: string | null;
  /** old_slug seeded into `slug_redirects` for product_type='package'. */
  slugRedirectOldSlug: string | null;
  /** package_kit id with `video_url` set — expected to emit VideoObject JSON-LD. */
  videoPackageId: string | null;
  /** seo_transcreation_jobs.id values whose status='applied' (required for ADR-020 hreflang). */
  appliedTranscreationJobIds: string[];
  /** Resolved `websites.supported_locales` (may include locales added by this seeder). */
  supportedLocales: string[];
  /**
   * Resolved tenant subdomain (`websites.subdomain`). Required by specs that
   * exercise the middleware host pipeline in local dev (see `middleware.ts`
   * line ~498 — localhost uses `x-subdomain` header or `?subdomain=` query to
   * scope requests to a tenant). Without it, middleware short-circuits to
   * `NextResponse.next()` and legacy/slug redirects never fire.
   */
  subdomain: string;
}

interface SeedWave2Result {
  accountId: string;
  websiteId: string;
  packageId: string | null;
  packageSlug: string;
  pageId: string | null;
  pageSlug: string;
  blogId: string | null;
  blogSlug: string;
  transcreationJobIds: string[];
  glossaryTermIds: string[];
  warnings: string[];
  seo: SeoFixtures;
}

/**
 * Extends the base e2e fixtures with wave2 entities needed for full-regression
 * Studio editor tests: package_kit (marketing editors), website_page with
 * sections (page editor), blog_post, SEO glossary terms, two transcreation
 * jobs (draft + published).
 *
 * Idempotent — safe to call from multiple specs. Each section soft-fails and
 * records a warning rather than throwing, so partial schemas (e.g. missing
 * blog_posts table in a fresh branch) don't block the rest of the suite.
 */
export async function seedWave2Fixtures(): Promise<SeedWave2Result> {
  if (wave2SeedPromise) return wave2SeedPromise;

  wave2SeedPromise = (async () => {
  assertSeedEnvAllowsMutation();
  const warnings: string[] = [];
  const base = await seedTestData();
  const accountId = String(base.account?.id ?? E2E_ACCOUNT_ID);
  const websiteId = String(base.website?.id ?? E2E_WEBSITE_ID);
  const subdomain = String(base.website?.subdomain ?? WEBSITE_FALLBACK_SUBDOMAIN);

  const packageId = await upsertPackageKit(supabase, accountId, warnings);
  const pageId = await upsertWebsitePage(supabase, websiteId, warnings);
  const blogId = await upsertBlogPost(supabase, websiteId, accountId, warnings);
  const glossaryTermIds = await upsertGlossaryTerms(supabase, websiteId, accountId, warnings);
  const transcreationJobIds = await upsertTranscreationJobs(
    supabase,
    websiteId,
    pageId,
    packageId,
    warnings,
  );

  const seo = await seedSeoFixtures({
    admin: supabase,
    websiteId,
    accountId,
    subdomain,
    packageId,
    pageId,
    warnings,
  });

  return {
    accountId,
    websiteId,
    packageId,
    packageSlug: E2E_PACKAGE_SLUG,
    pageId,
    pageSlug: E2E_PAGE_SLUG,
    blogId,
    blogSlug: E2E_BLOG_SLUG,
    transcreationJobIds,
    glossaryTermIds,
    warnings,
    seo,
  };
  })().catch((error) => {
    wave2SeedPromise = null;
    throw error;
  });

  return wave2SeedPromise;
}

/**
 * Returns the `seo` branch of the Wave 2 fixtures. Thin wrapper for specs that
 * only need SEO fixtures — `seedWave2Fixtures` is idempotent so calling either
 * entry point is safe.
 */
export async function getSeededSeoFixtures(): Promise<SeoFixtures> {
  const fixtures = await seedWave2Fixtures();
  return fixtures.seo;
}

/**
 * Guardrail: the seeder mutates rows on the target Supabase project. CI pipelines
 * and developer workstations are OK; production environments must never run it.
 */
function assertSeedEnvAllowsMutation(): void {
  if (process.env.ALLOW_SEED === '1') return;
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== '1') {
    throw new Error(
      'seedWave2Fixtures refused to run with NODE_ENV=production. Set ALLOW_SEED=1 to override.',
    );
  }
}

async function upsertPackageKit(
  admin: SupabaseClient,
  accountId: string,
  warnings: string[],
): Promise<string | null> {
  const { data, error } = await admin
    .from('package_kits')
    .upsert(
      {
        account_id: accountId,
        slug: E2E_PACKAGE_SLUG,
        name: 'E2E QA Package',
        description: 'Deterministic QA package for Studio editor regression suite.',
        description_ai_generated: false,
        program_highlights: ['Highlight A', 'Highlight B', 'Highlight C'],
        highlights_ai_generated: false,
        program_inclusions: ['Included item 1', 'Included item 2'],
        program_exclusions: ['Excluded item 1'],
        program_notes: 'QA notes.',
        program_meeting_info: 'QA meeting info.',
        program_gallery: [],
        cover_image_url: null,
        last_edited_by_surface: 'studio',
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    warnings.push(`package_kits upsert failed: ${errorMessage(error)}`);
    return null;
  }
  return data?.id ? String(data.id) : null;
}

async function upsertWebsitePage(
  admin: SupabaseClient,
  websiteId: string,
  warnings: string[],
): Promise<string | null> {
  const sections = [
    { id: 'sec-hero', type: 'hero', props: { title: 'QA Hero' } },
    { id: 'sec-about', type: 'about', props: { title: 'QA About' } },
    { id: 'sec-gallery', type: 'gallery', props: { items: [] } },
    { id: 'sec-cta', type: 'cta_banner', props: { title: 'QA CTA' } },
    { id: 'sec-faq', type: 'faq_accordion', props: { items: [] } },
  ];

  const { data, error } = await admin
    .from('website_pages')
    .upsert(
      {
        website_id: websiteId,
        slug: E2E_PAGE_SLUG,
        title: 'E2E QA Landing',
        page_type: 'custom',
        is_published: false,
        display_order: 0,
        nav_order: 0,
        hero_config: { title: 'QA Hero' },
        intro_content: { body: 'QA intro.' },
        cta_config: { label: 'QA CTA', href: '#' },
        sections,
      },
      { onConflict: 'website_id,slug' },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    warnings.push(`website_pages upsert failed: ${errorMessage(error)}`);
    return null;
  }
  return data?.id ? String(data.id) : null;
}

async function upsertBlogPost(
  admin: SupabaseClient,
  websiteId: string,
  accountId: string,
  warnings: string[],
): Promise<string | null> {
  const { data, error } = await admin
    .from('website_blog_posts')
    .upsert(
      {
        website_id: websiteId,
        slug: E2E_BLOG_SLUG,
        title: 'E2E QA Blog',
        status: 'draft',
        locale: 'es-CO',
        excerpt: 'Deterministic QA excerpt.',
        content: '# QA blog\n\nDeterministic content.',
      },
      { onConflict: 'website_id,slug,locale' },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    warnings.push(`website_blog_posts upsert failed: ${errorMessage(error)}`);
    return null;
  }

  return data?.id ? String(data.id) : null;
}

async function upsertGlossaryTerms(
  admin: SupabaseClient,
  websiteId: string,
  accountId: string,
  warnings: string[],
): Promise<string[]> {
  const rows = E2E_GLOSSARY_TERMS.map((term) => ({
    website_id: websiteId,
    locale: 'en-US',
    term,
    translation: term,
    notes: `QA term: ${term}`,
  }));

  const { data, error } = await admin
    .from('seo_translation_glossary')
    .upsert(rows, { onConflict: 'website_id,locale,term' })
    .select('id');

  if (error) {
    warnings.push(`seo_translation_glossary upsert failed: ${errorMessage(error)}`);
    return [];
  }
  return (data ?? []).map((row) => String(row.id));
}

async function upsertTranscreationJobs(
  admin: SupabaseClient,
  websiteId: string,
  pageId: string | null,
  packageId: string | null,
  warnings: string[],
): Promise<string[]> {
  const pageIds = [pageId, packageId].filter(Boolean) as string[];
  if (pageIds.length > 0) {
    const { error: cleanupError } = await admin
      .from('seo_transcreation_jobs')
      .delete()
      .eq('website_id', websiteId)
      .eq('source_locale', 'es-CO')
      .eq('target_locale', 'en-US')
      .in('page_id', pageIds);

    if (cleanupError) {
      warnings.push(`seo_transcreation_jobs cleanup failed: ${errorMessage(cleanupError)}`);
    }
  }

  const jobs: Array<Record<string, unknown>> = [];

  if (pageId) {
    jobs.push({
      website_id: websiteId,
      page_type: 'page',
      page_id: pageId,
      source_locale: 'es-CO',
      target_locale: 'en-US',
      country: 'US',
      language: 'en',
      status: 'draft',
      source_keyword: 'colombia tours',
      target_keyword: 'colombia tours',
      schema_version: '2.0',
      payload: {
        schema_version: '2.0',
        title: 'E2E QA Landing (EN)',
      },
      payload_v2: null,
    });
  }

  if (packageId) {
    jobs.push({
      website_id: websiteId,
      page_type: 'package',
      page_id: packageId,
      source_locale: 'es-CO',
      target_locale: 'en-US',
      country: 'US',
      language: 'en',
      status: 'published',
      source_keyword: 'e2e qa package',
      target_keyword: 'e2e qa package',
      schema_version: '2.1',
      payload: {
        schema_version: '2.1',
        title: 'E2E QA Package (EN)',
      },
      payload_v2: {
        schema_version: '2.1',
        title: 'E2E QA Package (EN)',
        body_content: {
          summary: 'Deterministic QA transcreate payload.',
          highlights: ['Highlight A', 'Highlight B'],
        },
      },
    });
  }

  if (jobs.length === 0) {
    warnings.push('seo_transcreation_jobs skipped — no page or package id available');
    return [];
  }

  const { data, error } = await admin
    .from('seo_transcreation_jobs')
    .insert(jobs)
    .select('id');

  if (error) {
    warnings.push(`seo_transcreation_jobs upsert failed: ${errorMessage(error)}`);
    return [];
  }
  return (data ?? []).map((row) => String(row.id));
}

// ============================================================================
// EPIC #207 W1 · SEO fixtures
// ============================================================================

const E2E_LEGACY_REDIRECT_OLD_PATH = `/legacy-e2e-${SUFFIX_SOURCE}`;
const E2E_LEGACY_REDIRECT_NEW_PATH = `/paquetes/${E2E_PACKAGE_SLUG}`;
const E2E_SLUG_REDIRECT_OLD_SLUG = `e2e-legacy-package-${SUFFIX_SOURCE}`;
const E2E_VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const E2E_TARGET_LOCALES = ['es-CO', 'en-US'] as const;

interface SeedSeoContext {
  admin: SupabaseClient;
  websiteId: string;
  accountId: string;
  subdomain: string;
  packageId: string | null;
  pageId: string | null;
  warnings: string[];
}

async function seedSeoFixtures(ctx: SeedSeoContext): Promise<SeoFixtures> {
  const supportedLocales = await ensureWebsiteLocales(ctx);
  const appliedTranscreationJobIds = await markTranscreationJobsApplied(ctx);
  const noindexProductId = await ensureNoindexProductOverlay(ctx);
  const legacyRedirectPath = await ensureLegacyRedirect(ctx);
  const slugRedirectOldSlug = await ensureSlugRedirect(ctx);
  const videoPackageId = await ensurePackageVideoUrl(ctx);

  return {
    noindexProductId,
    legacyRedirectPath,
    slugRedirectOldSlug,
    videoPackageId,
    appliedTranscreationJobIds,
    supportedLocales,
    subdomain: ctx.subdomain,
  };
}

async function ensureWebsiteLocales(ctx: SeedSeoContext): Promise<string[]> {
  const { admin, websiteId, warnings } = ctx;
  const { data, error } = await admin
    .from('websites')
    .select('default_locale, supported_locales')
    .eq('id', websiteId)
    .maybeSingle();

  if (error || !data) {
    warnings.push(`seo: could not read websites row for locale check: ${errorMessage(error)}`);
    return [...E2E_TARGET_LOCALES];
  }

  const defaultLocale = typeof data.default_locale === 'string' && data.default_locale
    ? data.default_locale
    : 'es-CO';
  const existing = Array.isArray(data.supported_locales)
    ? data.supported_locales.filter((l): l is string => typeof l === 'string' && l.length > 0)
    : [];

  const desired = Array.from(new Set([...existing, ...E2E_TARGET_LOCALES]));
  const mustWrite =
    data.default_locale !== defaultLocale ||
    desired.length !== existing.length ||
    desired.some((l) => !existing.includes(l));

  if (!mustWrite) {
    return existing.length > 0 ? existing : [...E2E_TARGET_LOCALES];
  }

  const { error: updateError } = await admin
    .from('websites')
    .update({
      default_locale: defaultLocale,
      supported_locales: desired,
    })
    .eq('id', websiteId);

  if (updateError) {
    warnings.push(
      `seo: could not update websites.supported_locales (read-only?): ${errorMessage(updateError)}`,
    );
    return existing.length > 0 ? existing : [...E2E_TARGET_LOCALES];
  }

  return desired;
}

async function markTranscreationJobsApplied(ctx: SeedSeoContext): Promise<string[]> {
  const { admin, websiteId, pageId, packageId, warnings } = ctx;
  const candidatePageIds = [pageId, packageId].filter(Boolean) as string[];
  if (candidatePageIds.length === 0) {
    warnings.push('seo: no page or package id to mark as applied transcreation');
    return [];
  }

  const { data, error } = await admin
    .from('seo_transcreation_jobs')
    .update({ status: 'applied' })
    .eq('website_id', websiteId)
    .eq('source_locale', 'es-CO')
    .eq('target_locale', 'en-US')
    .in('page_id', candidatePageIds)
    .select('id');

  if (error) {
    warnings.push(`seo: could not mark transcreation jobs as applied: ${errorMessage(error)}`);
    return [];
  }
  return (data ?? []).map((row) => String(row.id));
}

async function ensureNoindexProductOverlay(ctx: SeedSeoContext): Promise<string | null> {
  const { admin, websiteId, packageId, warnings } = ctx;
  if (!packageId) {
    warnings.push('seo: no packageId available for noindex overlay');
    return null;
  }

  // `website_product_pages` is the overlay queried by `lib/supabase/get-pages.ts#getNoindexProductSlugs`.
  // The table is Flutter-owned; columns used: website_id, product_type, product_id, slug,
  // robots_noindex, translation_group_id (may be NOT NULL), locale (default 'es-CO').
  const overlay = {
    website_id: websiteId,
    product_type: 'package' as const,
    product_id: packageId,
    slug: `${E2E_PACKAGE_SLUG}-noindex`,
    robots_noindex: true,
    locale: 'es-CO',
    translation_group_id: packageId,
  };

  const { data, error } = await admin
    .from('website_product_pages')
    .upsert(overlay, { onConflict: 'website_id,locale,product_type,product_id' })
    .select('product_id')
    .maybeSingle();

  if (error) {
    // Schema mismatch or RLS — record and degrade gracefully.
    warnings.push(`seo: website_product_pages upsert failed: ${errorMessage(error)}`);
    return null;
  }
  return data?.product_id ? String(data.product_id) : packageId;
}

async function ensureLegacyRedirect(ctx: SeedSeoContext): Promise<string | null> {
  const { admin, websiteId, warnings } = ctx;

  const row = {
    website_id: websiteId,
    old_path: E2E_LEGACY_REDIRECT_OLD_PATH,
    new_path: E2E_LEGACY_REDIRECT_NEW_PATH,
    status_code: 301,
  };

  // Flutter-managed table — we don't know the unique-constraint name, so fall
  // back to existence check + insert-if-missing. Idempotent either way.
  const { data: existing, error: readError } = await admin
    .from('website_legacy_redirects')
    .select('old_path')
    .eq('website_id', websiteId)
    .eq('old_path', E2E_LEGACY_REDIRECT_OLD_PATH)
    .maybeSingle();

  if (readError) {
    warnings.push(`seo: website_legacy_redirects unreadable: ${errorMessage(readError)}`);
    return null;
  }
  if (existing?.old_path) return E2E_LEGACY_REDIRECT_OLD_PATH;

  const { error: insertError } = await admin.from('website_legacy_redirects').insert(row);
  if (insertError) {
    warnings.push(`seo: website_legacy_redirects insert failed: ${errorMessage(insertError)}`);
    return null;
  }
  return E2E_LEGACY_REDIRECT_OLD_PATH;
}

async function ensureSlugRedirect(ctx: SeedSeoContext): Promise<string | null> {
  const { admin, accountId, warnings } = ctx;

  const row = {
    account_id: accountId,
    product_type: 'package' as const,
    old_slug: E2E_SLUG_REDIRECT_OLD_SLUG,
    new_slug: E2E_PACKAGE_SLUG,
  };

  const { data: existing, error: readError } = await admin
    .from('slug_redirects')
    .select('old_slug')
    .eq('account_id', accountId)
    .eq('product_type', 'package')
    .eq('old_slug', E2E_SLUG_REDIRECT_OLD_SLUG)
    .maybeSingle();

  if (readError) {
    warnings.push(`seo: slug_redirects unreadable: ${errorMessage(readError)}`);
    return null;
  }
  if (existing?.old_slug) return E2E_SLUG_REDIRECT_OLD_SLUG;

  const { error: insertError } = await admin.from('slug_redirects').insert(row);
  if (insertError) {
    warnings.push(`seo: slug_redirects insert failed: ${errorMessage(insertError)}`);
    return null;
  }
  return E2E_SLUG_REDIRECT_OLD_SLUG;
}

async function ensurePackageVideoUrl(ctx: SeedSeoContext): Promise<string | null> {
  const { admin, packageId, warnings } = ctx;
  if (!packageId) {
    warnings.push('seo: no packageId to attach video_url');
    return null;
  }

  const { data: current, error: readError } = await admin
    .from('package_kits')
    .select('video_url')
    .eq('id', packageId)
    .maybeSingle();

  if (readError) {
    warnings.push(`seo: package_kits.video_url read failed: ${errorMessage(readError)}`);
    return null;
  }

  if (current?.video_url === E2E_VIDEO_URL) {
    return packageId;
  }

  const { error: updateError } = await admin
    .from('package_kits')
    .update({ video_url: E2E_VIDEO_URL })
    .eq('id', packageId);

  if (updateError) {
    warnings.push(`seo: package_kits.video_url update failed: ${errorMessage(updateError)}`);
    return null;
  }
  return packageId;
}
