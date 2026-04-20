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
    .select('id, source_itinerary_id')
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

  // EPIC #226.B: also clean the itinerary+overlay rows we created. We only
  // touch rows narrowly scoped to the E2E namespace — never global truncation.
  const itineraryIds = new Set<string>();
  if (pkg?.source_itinerary_id) itineraryIds.add(String(pkg.source_itinerary_id));

  const companionName = `E2E QA Package ${SUFFIX_SOURCE} Noindex`;
  const primaryName = `E2E QA Package ${SUFFIX_SOURCE}`;
  const { data: ownedItineraries } = await supabase
    .from('itineraries')
    .select('id')
    .eq('account_id', accountId)
    .in('name', [primaryName, companionName]);
  for (const row of (ownedItineraries ?? []) as Array<{ id: string }>) {
    if (row.id) itineraryIds.add(String(row.id));
  }

  if (itineraryIds.size > 0) {
    const ids = Array.from(itineraryIds);
    await supabase
      .from('website_product_pages')
      .delete()
      .eq('website_id', websiteId)
      .eq('product_type', 'package')
      .in('product_id', ids);
    await supabase
      .from('seo_transcreation_jobs')
      .delete()
      .eq('website_id', websiteId)
      .in('page_id', ids);
    await supabase.from('itineraries').delete().eq('account_id', accountId).in('id', ids);
  }

  await supabase
    .from('seo_translation_glossary')
    .delete()
    .eq('website_id', websiteId)
    .eq('locale', 'en-US')
    .in('term', [...E2E_GLOSSARY_TERMS, 'hotel']);

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
   * EPIC #226.B — Itinerary id linked to the seeded package_kit. Required for
   * `get_website_product_page` RPC to resolve `/site/<sub>/paquetes/<slug>`.
   * Without it the route 404s and JSON-LD specs skip.
   */
  packageItineraryId: string | null;
  /**
   * EPIC #226.B — `website_product_pages` overlay (is_published=true) for the
   * seeded package. Required by the RPC's overlay lookup.
   */
  packageProductPageId: string | null;
  /**
   * EPIC #226.B — `seo_transcreation_jobs.id` with `status='published'`. Used
   * by the translations-dashboard `?status=published` bulk-apply spec.
   */
  publishedTranscreationJobId: string | null;
  /**
   * EPIC #226.B — `seo_transcreation_jobs.id` targeting a locale that is NOT
   * covered by the primary en-US job, so the coverage matrix exposes a cell
   * with status='missing' → "Translate with AI" button (`transcreate-stream`).
   */
  missingLocaleTranscreationJobId: string | null;
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
 *
 * Exported so sibling seed modules (e.g. `pilot-seed.ts`) reuse the exact same
 * safety contract without duplicating the check.
 */
export function assertSeedEnvAllowsMutation(): void {
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
  // EPIC #226.B: DB has a BEFORE-INSERT trigger (`set_package_kit_slug`) that
  // rewrites `slug` to append `-2`, `-3`, ... whenever the base slug already
  // exists. That means `onConflict: 'slug'` with the canonical slug creates a
  // fresh duplicate on every run (the trigger fires BEFORE the conflict
  // check). We therefore select-first-then-update so the returned row is
  // always the canonical `E2E_PACKAGE_SLUG` → the helper `getSeededPackageSlug`
  // and the RPC `get_website_product_page` converge on the same package.
  const patch = {
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
  };

  const { data: existing, error: readError } = await admin
    .from('package_kits')
    .select('id')
    .eq('slug', E2E_PACKAGE_SLUG)
    .maybeSingle();

  if (readError) {
    warnings.push(`package_kits read failed: ${errorMessage(readError)}`);
    return null;
  }

  if (existing?.id) {
    const { data: updated, error: updateError } = await admin
      .from('package_kits')
      .update(patch)
      .eq('id', existing.id)
      .select('id')
      .maybeSingle();
    if (updateError) {
      warnings.push(`package_kits update failed: ${errorMessage(updateError)}`);
      return String(existing.id);
    }
    return updated?.id ? String(updated.id) : String(existing.id);
  }

  const { data: inserted, error: insertError } = await admin
    .from('package_kits')
    .insert(patch)
    .select('id')
    .maybeSingle();

  if (insertError) {
    warnings.push(`package_kits insert failed: ${errorMessage(insertError)}`);
    return null;
  }
  return inserted?.id ? String(inserted.id) : null;
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
  // EPIC #226.B: seed the package public route BEFORE other mutations — JSON-LD
  // specs (`public-structured-data`) + noindex sitemap spec both depend on
  // `/site/*/paquetes/{slug}` rendering with an overlay row.
  const { itineraryId, productPageId } = await ensurePackagePublicRoute(ctx);
  // EPIC #226.B: leave exactly one transcreation job in `status='published'`
  // so `translations-dashboard.spec.ts::bulk apply` (which filters by
  // `?status=published`) finds a checkbox.
  const publishedTranscreationJobId = await ensurePublishedTranscreationJob(ctx);
  // EPIC #226.B: insert one job targeting pt-BR so the coverage matrix has at
  // least one 'missing' cell → `transcreate-stream.spec.ts` finds the
  // "Translate with AI" button.
  const missingLocaleTranscreationJobId = await ensureMissingLocaleCoverageCell(ctx);
  // EPIC #226.B: deterministic glossary row + reinforced payload_v2 for the
  // glossary-enforcement assertion (hotel → hotel boutique).
  await ensureGlossaryEnforcementFixtures(ctx);

  const appliedTranscreationJobIds = await markTranscreationJobsApplied(ctx, {
    excludeJobIds: [publishedTranscreationJobId, missingLocaleTranscreationJobId].filter(
      (id): id is string => Boolean(id),
    ),
  });
  const noindexProductId = await ensureNoindexProductOverlay(ctx, itineraryId);
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
    packageItineraryId: itineraryId,
    packageProductPageId: productPageId,
    publishedTranscreationJobId,
    missingLocaleTranscreationJobId,
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

async function markTranscreationJobsApplied(
  ctx: SeedSeoContext,
  options: { excludeJobIds?: string[] } = {},
): Promise<string[]> {
  const { admin, websiteId, pageId, packageId, warnings } = ctx;
  const candidatePageIds = [pageId, packageId].filter(Boolean) as string[];
  if (candidatePageIds.length === 0) {
    warnings.push('seo: no page or package id to mark as applied transcreation');
    return [];
  }

  // EPIC #226.B: preserve jobs that other seeders intentionally set to a
  // different status (e.g. `published` for bulk-apply, other target locale for
  // the missing-locale coverage cell). Without this carve-out the subsequent
  // `applied` sweep would erase those fixtures.
  const excludeIds = (options.excludeJobIds ?? []).filter((id): id is string => Boolean(id));
  let query = admin
    .from('seo_transcreation_jobs')
    .update({ status: 'applied' })
    .eq('website_id', websiteId)
    .eq('source_locale', 'es-CO')
    .eq('target_locale', 'en-US')
    .in('page_id', candidatePageIds);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await query.select('id');

  if (error) {
    warnings.push(`seo: could not mark transcreation jobs as applied: ${errorMessage(error)}`);
    return [];
  }

  const appliedIds = (data ?? []).map((row) => String(row.id));
  // ADR-020 hreflang: callers rely on this array to prove at least one
  // public-eligible en-US variant exists. `published` rows are also eligible,
  // so we include the excluded-but-public-eligible ids.
  for (const id of excludeIds) {
    if (!appliedIds.includes(id)) appliedIds.push(id);
  }
  return appliedIds;
}

async function ensureNoindexProductOverlay(
  ctx: SeedSeoContext,
  primaryItineraryId: string | null,
): Promise<string | null> {
  const { admin, websiteId, warnings } = ctx;
  // EPIC #226.B: the noindex overlay must point at a DIFFERENT itinerary than
  // the primary package route — the primary overlay has `robots_noindex=false`
  // (so `TouristTrip + BreadcrumbList` passes). We seed a dedicated "noindex
  // companion" itinerary so the sitemap exclusion check has a real target
  // without affecting the primary package route rendering.
  const companionItineraryId = primaryItineraryId
    ? await ensureNoindexCompanionItinerary(ctx, primaryItineraryId)
    : null;
  const productId = companionItineraryId ?? primaryItineraryId;
  if (!productId) {
    warnings.push('seo: no itinerary id available for noindex overlay');
    return null;
  }

  // `website_product_pages` has NO `slug` column — the table is keyed by
  // (website_id, locale, product_type, product_id) per
  // `uq_website_product_pages_locale_product`. The sitemap filter uses
  // `lib/supabase/get-pages.ts#getNoindexProductSlugs`; NOT NULL defaults
  // are populated in the row below.
  const overlay = {
    website_id: websiteId,
    product_type: 'package' as const,
    product_id: productId,
    robots_noindex: true,
    is_published: true,
    locale: 'es-CO',
    translation_group_id: productId,
    seo_highlights: [] as unknown[],
    seo_faq: [] as unknown[],
    custom_faq: [] as unknown[],
    custom_highlights: [] as unknown[],
    source: 'e2e-seed-noindex',
    confidence: 'live',
  };

  const { data, error } = await admin
    .from('website_product_pages')
    .upsert(overlay, { onConflict: 'website_id,locale,product_type,product_id' })
    .select('product_id')
    .maybeSingle();

  if (error) {
    // Schema mismatch or RLS — record and degrade gracefully.
    warnings.push(`seo: website_product_pages upsert (noindex) failed: ${errorMessage(error)}`);
    return null;
  }
  return data?.product_id ? String(data.product_id) : productId;
}

async function ensureNoindexCompanionItinerary(
  ctx: SeedSeoContext,
  primaryItineraryId: string,
): Promise<string | null> {
  const { admin, accountId, warnings } = ctx;
  const companionName = `E2E QA Package ${SUFFIX_SOURCE} Noindex`;

  const { data: existing } = await admin
    .from('itineraries')
    .select('id')
    .eq('account_id', accountId)
    .eq('name', companionName)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const today = new Date();
  const oneMonthLater = new Date(today.getTime() + 30 * 24 * 3600 * 1000);
  const toDate = (d: Date) => d.toISOString().slice(0, 10);

  const { data: inserted, error } = await admin
    .from('itineraries')
    .insert({
      account_id: accountId,
      name: companionName,
      start_date: toDate(today),
      end_date: toDate(oneMonthLater),
      passenger_count: 1,
      status: 'draft',
      itinerary_visibility: false,
    })
    .select('id')
    .maybeSingle();

  if (error || !inserted?.id) {
    warnings.push(
      `seo: noindex companion itinerary insert failed (fallback=primary): ${errorMessage(error)}`,
    );
    return primaryItineraryId;
  }
  return String(inserted.id);
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

// ============================================================================
// EPIC #226.B · seed extension for 9 P0 seed-coupled skips
// ============================================================================
// Adds fixtures needed to convert the seed-coupled `test.skip()` branches in
// the P0 Recovery Gate run to pass:
//   (a) JSON-LD coverage on homepage + package page (public-structured-data)
//   (b) `website_product_pages.robots_noindex=true` overlay (public-sitemap)
//   (c) payload_v2 envelope with glossary-mapped term (glossary-enforcement)
//   (d) missing-locale cell in the coverage matrix (transcreate-stream)
//   (e) at least one transcreation job in `status='published'`
//       (translations-dashboard::bulk apply)
//
// Idempotent — narrow to `E2E_PACKAGE_SLUG` / account namespace. No global
// truncation, no cross-tenant writes.
// ============================================================================

const E2E_MISSING_LOCALE_TARGET = 'pt-BR' as const;

interface PackageRouteFixtures {
  itineraryId: string | null;
  productPageId: string | null;
}

/**
 * Seed: link the primary `package_kits` row to an `itineraries` row (required
 * by `get_website_product_page` RPC) + publish a `website_product_pages`
 * overlay row (required by the RPC's final SELECT). Without both,
 * `/site/colombiatours/paquetes/{E2E_PACKAGE_SLUG}` returns 404 and the
 * JSON-LD specs skip.
 */
async function ensurePackagePublicRoute(ctx: SeedSeoContext): Promise<PackageRouteFixtures> {
  const { admin, websiteId, accountId, packageId, warnings } = ctx;
  if (!packageId) {
    warnings.push('seo (#226.B): package public route skipped — no packageId');
    return { itineraryId: null, productPageId: null };
  }

  // 1. Resolve-or-create an itinerary row linking back to the kit.
  let itineraryId: string | null = null;

  const { data: kitRow } = await admin
    .from('package_kits')
    .select('source_itinerary_id')
    .eq('id', packageId)
    .maybeSingle();
  if (kitRow?.source_itinerary_id) {
    itineraryId = String(kitRow.source_itinerary_id);
  }

  if (!itineraryId) {
    const { data: byKit } = await admin
      .from('itineraries')
      .select('id')
      .eq('source_package_id', packageId)
      .is('deleted_at', null)
      .maybeSingle();
    if (byKit?.id) itineraryId = String(byKit.id);
  }

  if (!itineraryId) {
    const itineraryName = `E2E QA Package ${SUFFIX_SOURCE}`;
    const today = new Date();
    const oneMonthLater = new Date(today.getTime() + 30 * 24 * 3600 * 1000);
    const toDate = (d: Date) => d.toISOString().slice(0, 10);

    const { data: inserted, error: insertError } = await admin
      .from('itineraries')
      .insert({
        account_id: accountId,
        name: itineraryName,
        start_date: toDate(today),
        end_date: toDate(oneMonthLater),
        passenger_count: 1,
        status: 'draft',
        source_package_id: packageId,
        itinerary_visibility: true,
      })
      .select('id')
      .maybeSingle();

    if (insertError || !inserted?.id) {
      warnings.push(
        `seo (#226.B): itineraries insert for package route failed: ${errorMessage(insertError)}`,
      );
      return { itineraryId: null, productPageId: null };
    }
    itineraryId = String(inserted.id);
  }

  // Backfill kit → itinerary pointer for future idempotent runs.
  if (itineraryId && !kitRow?.source_itinerary_id) {
    await admin
      .from('package_kits')
      .update({ source_itinerary_id: itineraryId })
      .eq('id', packageId);
  }

  // 2. Upsert a `website_product_pages` overlay with `is_published=true`. The
  // RPC keys overlays on (website_id, product_type, product_id). For packages
  // `v_product_id = i.id` so we use the itinerary id here.
  const overlayProductId = itineraryId;
  const overlayRow = {
    website_id: websiteId,
    product_type: 'package' as const,
    product_id: overlayProductId,
    locale: 'es-CO',
    is_published: true,
    robots_noindex: false,
    translation_group_id: overlayProductId,
    seo_highlights: [] as unknown[],
    seo_faq: [] as unknown[],
    custom_faq: [] as unknown[],
    custom_highlights: [] as unknown[],
    source: 'e2e-seed-public',
    confidence: 'live',
  };

  const { data: overlay, error: overlayError } = await admin
    .from('website_product_pages')
    .upsert(overlayRow, { onConflict: 'website_id,locale,product_type,product_id' })
    .select('id')
    .maybeSingle();

  if (overlayError) {
    warnings.push(
      `seo (#226.B): website_product_pages upsert (published) failed: ${errorMessage(overlayError)}`,
    );
    return { itineraryId, productPageId: null };
  }

  return {
    itineraryId,
    productPageId: overlay?.id ? String(overlay.id) : null,
  };
}

/**
 * Seed: leave at least one transcreation job in `status='published'` so the
 * `translations-dashboard ?status=published` filter has a non-empty row set
 * (and therefore a checkbox for `bulk apply`).
 */
async function ensurePublishedTranscreationJob(ctx: SeedSeoContext): Promise<string | null> {
  const { admin, websiteId, pageId, packageId, warnings } = ctx;
  const candidate = packageId ?? pageId;
  if (!candidate) {
    warnings.push('seo (#226.B): no candidate id for published transcreation job');
    return null;
  }

  const { data, error } = await admin
    .from('seo_transcreation_jobs')
    .select('id,status')
    .eq('website_id', websiteId)
    .eq('page_id', candidate)
    .eq('source_locale', 'es-CO')
    .eq('target_locale', 'en-US')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    warnings.push(
      `seo (#226.B): published transcreation job lookup failed: ${errorMessage(error)}`,
    );
    return null;
  }

  if (data.status !== 'published') {
    const { error: upError } = await admin
      .from('seo_transcreation_jobs')
      .update({ status: 'published' })
      .eq('id', data.id);
    if (upError) {
      warnings.push(`seo (#226.B): could not promote job to published: ${errorMessage(upError)}`);
    }
  }

  return String(data.id);
}

/**
 * Seed: insert a job for a different `page_id` + different `target_locale`
 * than the primary (en-US) pair. The resulting coverage matrix exposes at
 * least one cell with status='missing' → `transcreate-stream.spec.ts` finds
 * the "Translate with AI" button.
 */
async function ensureMissingLocaleCoverageCell(ctx: SeedSeoContext): Promise<string | null> {
  const { admin, websiteId, pageId, packageId, warnings } = ctx;
  // Use the page (not the package) as the carrier so the matrix ends up
  // asymmetric: package has (en-US) coverage, page has (pt-BR) coverage —
  // each row shows a `missing` cell under the locale it does not cover.
  const rowPageId = pageId ?? packageId;
  if (!rowPageId) {
    warnings.push('seo (#226.B): no page id for missing-locale job');
    return null;
  }
  const pageType = rowPageId === pageId ? 'page' : 'package';

  const { data: existing } = await admin
    .from('seo_transcreation_jobs')
    .select('id')
    .eq('website_id', websiteId)
    .eq('page_type', pageType)
    .eq('page_id', rowPageId)
    .eq('source_locale', 'es-CO')
    .eq('target_locale', E2E_MISSING_LOCALE_TARGET)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const { data, error } = await admin
    .from('seo_transcreation_jobs')
    .insert({
      website_id: websiteId,
      page_type: pageType,
      page_id: rowPageId,
      source_locale: 'es-CO',
      target_locale: E2E_MISSING_LOCALE_TARGET,
      country: 'BR',
      language: 'pt',
      status: 'applied',
      source_keyword: 'paquete colombia',
      target_keyword: 'pacote colombia',
      schema_version: '2.1',
      payload: {
        schema_version: '2.1',
        title: 'QA Package (PT-BR)',
      },
      payload_v2: {
        schema_version: '2.1',
        title: 'QA Package (PT-BR)',
        body_content: {
          summary: 'Conteúdo determinístico para cobertura pt-BR (E2E).',
          highlights: ['Destaque A', 'Destaque B'],
        },
      },
      source: 'e2e-seed-missing-locale',
      confidence: 'live',
    })
    .select('id')
    .maybeSingle();

  if (error || !data?.id) {
    warnings.push(`seo (#226.B): missing-locale job insert failed: ${errorMessage(error)}`);
    return null;
  }
  return String(data.id);
}

/**
 * Seed: deterministic glossary term ("hotel" → "hotel boutique") + reinforce
 * payload_v2 on the primary en-US package job so the serialised envelope
 * contains the mapped value that `glossary-enforcement.spec.ts` asserts on.
 */
async function ensureGlossaryEnforcementFixtures(ctx: SeedSeoContext): Promise<void> {
  const { admin, websiteId, packageId, warnings } = ctx;

  const { error: glossaryError } = await admin.from('seo_translation_glossary').upsert(
    {
      website_id: websiteId,
      locale: 'en-US',
      term: 'hotel',
      translation: 'hotel boutique',
      notes: 'E2E #226.B glossary enforcement seed.',
    },
    { onConflict: 'website_id,locale,term' },
  );
  if (glossaryError) {
    warnings.push(`seo (#226.B): glossary upsert failed: ${errorMessage(glossaryError)}`);
  }

  if (!packageId) return;

  const { data: job } = await admin
    .from('seo_transcreation_jobs')
    .select('id,payload_v2')
    .eq('website_id', websiteId)
    .eq('page_id', packageId)
    .eq('source_locale', 'es-CO')
    .eq('target_locale', 'en-US')
    .maybeSingle();

  if (!job?.id) return;

  const current =
    job.payload_v2 && typeof job.payload_v2 === 'object' && !Array.isArray(job.payload_v2)
      ? (job.payload_v2 as Record<string, unknown>)
      : {};
  const reinforced: Record<string, unknown> = {
    ...current,
    schema_version: '2.1',
    meta_title: 'QA Package featuring hotel boutique',
    meta_desc: 'Experience our hotel boutique for a curated stay.',
    slug: 'qa-package-en',
    h1: 'QA Package — hotel boutique',
    keywords: ['qa', 'hotel boutique'],
    body_content:
      current.body_content && typeof current.body_content === 'object'
        ? current.body_content
        : {
            summary: 'Deterministic QA transcreate payload featuring hotel boutique.',
            highlights: ['Hotel boutique stay', 'Highlight B'],
          },
  };

  const { error: upError } = await admin
    .from('seo_transcreation_jobs')
    .update({ payload_v2: reinforced, schema_version: '2.1' })
    .eq('id', job.id);
  if (upError) {
    warnings.push(`seo (#226.B): payload_v2 reinforcement failed: ${errorMessage(upError)}`);
  }
}
