import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const E2E_ACCOUNT_ID = 'e2e-test-account';
const E2E_WEBSITE_ID = 'e2e-test-website';
const E2E_PACKAGE_SLUG = 'e2e-qa-package';
const E2E_PAGE_SLUG = 'e2e-qa-landing';
const E2E_BLOG_SLUG = 'e2e-qa-blog';
const E2E_GLOSSARY_TERMS = ['Andes', 'Colombia', 'Cartagena'] as const;

export const E2E_FIXTURE_IDS = {
  accountId: E2E_ACCOUNT_ID,
  websiteId: E2E_WEBSITE_ID,
  packageSlug: E2E_PACKAGE_SLUG,
  pageSlug: E2E_PAGE_SLUG,
  blogSlug: E2E_BLOG_SLUG,
} as const;

export async function seedTestData() {
  const { data: account } = await supabase
    .from('accounts')
    .upsert(
      {
        id: E2E_ACCOUNT_ID,
        name: 'E2E Test Agency',
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  const { data: website } = await supabase
    .from('websites')
    .upsert(
      {
        id: E2E_WEBSITE_ID,
        account_id: account?.id,
        subdomain: 'e2e-test',
        status: 'draft',
        template_id: 'blank',
        default_locale: 'es-CO',
        supported_locales: ['es-CO', 'en-US', 'pt-BR'],
        theme: {
          tokens: { colors: { seedColor: '#1976D2' } },
          profile: { brandMood: 'corporate' },
        },
        content: {
          siteName: 'E2E Test Site',
          tagline: 'Testing made easy',
          seo: { title: 'E2E Test', description: 'Test site', keywords: '' },
          contact: { email: 'test@test.com', phone: '', address: '' },
          social: {},
        },
        featured_products: { destinations: [], hotels: [], activities: [], transfers: [], packages: [] },
        sections: [],
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  return { account, website };
}

export async function cleanupTestData() {
  await supabase.from('websites').delete().eq('id', E2E_WEBSITE_ID);
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
  const warnings: string[] = [];
  const base = await seedTestData();
  const accountId = String(base.account?.id ?? E2E_ACCOUNT_ID);
  const websiteId = String(base.website?.id ?? E2E_WEBSITE_ID);

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
  };
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
      { onConflict: 'account_id,slug' },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    warnings.push(`package_kits upsert failed: ${error.message}`);
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
        page_type: 'landing',
        is_published: false,
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
    warnings.push(`website_pages upsert failed: ${error.message}`);
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
  const candidates: Array<Record<string, unknown>> = [
    {
      website_id: websiteId,
      account_id: accountId,
      slug: E2E_BLOG_SLUG,
      title: 'E2E QA Blog',
      status: 'draft',
      locale: 'es-CO',
      body_markdown: '# QA blog\n\nDeterministic content.',
    },
    {
      website_id: websiteId,
      slug: E2E_BLOG_SLUG,
      title: 'E2E QA Blog',
      status: 'draft',
    },
  ];

  for (const payload of candidates) {
    const { data, error } = await admin
      .from('blog_posts')
      .upsert(payload, { onConflict: 'website_id,slug' })
      .select('id')
      .maybeSingle();

    if (!error && data?.id) return String(data.id);
    if (error && !/column|schema/i.test(error.message)) {
      warnings.push(`blog_posts upsert failed: ${error.message}`);
      return null;
    }
  }
  warnings.push('blog_posts upsert skipped — schema mismatch (all shape attempts rejected)');
  return null;
}

async function upsertGlossaryTerms(
  admin: SupabaseClient,
  websiteId: string,
  accountId: string,
  warnings: string[],
): Promise<string[]> {
  const rows = E2E_GLOSSARY_TERMS.map((term) => ({
    website_id: websiteId,
    account_id: accountId,
    source_term: term,
    source_locale: 'es-CO',
    target_locale: 'en-US',
    target_term: term,
    notes: `QA term: ${term}`,
  }));

  const { data, error } = await admin
    .from('seo_glossary_terms')
    .upsert(rows, { onConflict: 'website_id,source_term,target_locale' })
    .select('id');

  if (error) {
    warnings.push(`seo_glossary_terms upsert failed: ${error.message}`);
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
  const jobs: Array<Record<string, unknown>> = [];

  if (pageId) {
    jobs.push({
      website_id: websiteId,
      page_type: 'page',
      page_id: pageId,
      source_locale: 'es-CO',
      target_locale: 'en-US',
      status: 'draft',
      source_keyword: 'colombia tours',
      target_keyword: 'colombia tours',
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
      status: 'published',
      source_keyword: 'e2e qa package',
      target_keyword: 'e2e qa package',
      payload_v2: {
        schema_version: '2.0',
        title: 'E2E QA Package (EN)',
      },
    });
  }

  if (jobs.length === 0) {
    warnings.push('seo_transcreation_jobs skipped — no page or package id available');
    return [];
  }

  const { data, error } = await admin
    .from('seo_transcreation_jobs')
    .upsert(jobs, { onConflict: 'website_id,page_type,page_id,target_locale' })
    .select('id');

  if (error) {
    warnings.push(`seo_transcreation_jobs upsert failed: ${error.message}`);
    return [];
  }
  return (data ?? []).map((row) => String(row.id));
}
