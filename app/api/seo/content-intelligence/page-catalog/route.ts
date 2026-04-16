import { NextRequest } from 'next/server';
import { SeoPageCatalogQuerySchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { buildSourceMeta, withNoStoreHeaders, withSharedCacheHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CatalogItem = {
  pageType: 'page' | 'blog' | 'destination';
  pageId: string;
  label: string;
  slug: string;
  url: string;
};

function normalize(text: string) {
  return text.toLowerCase().trim();
}

export async function GET(request: NextRequest) {
  const parsed = SeoPageCatalogQuerySchema.safeParse({
    websiteId: request.nextUrl.searchParams.get('websiteId'),
    pageType: request.nextUrl.searchParams.get('pageType') ?? undefined,
    locale: request.nextUrl.searchParams.get('locale') ?? undefined,
    search: request.nextUrl.searchParams.get('search') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit') ?? 100,
  });
  if (!parsed.success) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid page catalog query', 400, parsed.error.flatten()));
  }

  await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();

  const { data: website, error: websiteError } = await admin
    .from('websites')
    .select('id, account_id, subdomain, custom_domain')
    .eq('id', parsed.data.websiteId)
    .single();

  if (websiteError || !website) {
    return withNoStoreHeaders(apiError('NOT_FOUND', 'Website not found', 404));
  }

  const accountId = String(website.account_id);
  const host = (website.custom_domain as string | null) || `${website.subdomain}.bukeer.com`;

  const includeAll = !parsed.data.pageType;
  const rows: CatalogItem[] = [];

  if (includeAll || parsed.data.pageType === 'page') {
    const { data: pages, error } = await admin
      .from('website_pages')
      .select('id,slug,title')
      .eq('website_id', parsed.data.websiteId)
      .order('title', { ascending: true })
      .limit(parsed.data.limit);
    if (error) return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read pages catalog', 500, error.message));

    for (const page of pages ?? []) {
      const slug = String(page.slug ?? page.id ?? '').replace(/^\/+/, '');
      rows.push({
        pageType: 'page',
        pageId: String(page.id),
        label: String(page.title ?? slug ?? page.id),
        slug,
        url: `https://${host}/${slug}`,
      });
    }
  }

  if (includeAll || parsed.data.pageType === 'blog') {
    const { data: posts, error } = await admin
      .from('website_blog_posts')
      .select('id,slug,title')
      .eq('website_id', parsed.data.websiteId)
      .order('title', { ascending: true })
      .limit(parsed.data.limit);
    if (error) return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read blog catalog', 500, error.message));

    for (const post of posts ?? []) {
      const slug = String(post.slug ?? post.id ?? '').replace(/^\/+/, '');
      rows.push({
        pageType: 'blog',
        pageId: String(post.id),
        label: String(post.title ?? slug ?? post.id),
        slug,
        url: `https://${host}/blog/${slug}`,
      });
    }
  }

  if (includeAll || parsed.data.pageType === 'destination') {
    const { data: destinations, error } = await admin
      .from('destinations')
      .select('id,slug,name')
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .limit(parsed.data.limit);
    if (error) return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read destination catalog', 500, error.message));

    for (const destination of destinations ?? []) {
      const slug = String(destination.slug ?? destination.id ?? '').replace(/^\/+/, '');
      rows.push({
        pageType: 'destination',
        pageId: String(destination.id),
        label: String(destination.name ?? slug ?? destination.id),
        slug,
        url: `https://${host}/destinos/${slug}`,
      });
    }
  }

  const search = parsed.data.search ? normalize(parsed.data.search) : null;
  const filtered = search
    ? rows.filter((row) => {
        const bag = `${row.label} ${row.slug} ${row.pageType}`.toLowerCase();
        return bag.includes(search);
      })
    : rows;

  const deduped = Array.from(new Map(filtered.map((row) => [`${row.pageType}:${row.pageId}`, row])).values()).slice(0, parsed.data.limit);
  const sourceMeta = buildSourceMeta('seo-content-intelligence/page-catalog', 'live');

  return withSharedCacheHeaders(
    apiSuccess({
      websiteId: parsed.data.websiteId,
      locale: parsed.data.locale ?? null,
      rows: deduped,
      sourceMeta,
    }),
    60,
  );
}
