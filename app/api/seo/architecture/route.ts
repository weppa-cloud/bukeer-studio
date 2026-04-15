import { NextRequest, NextResponse } from 'next/server';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { buildInternalLinkGraph, type LinkGraphItem } from '@/lib/seo/internal-link-graph';
import { calculateClickDepth } from '@/lib/seo/click-depth';
import { toErrorResponse, SeoApiError } from '@/lib/seo/errors';

interface NavNode {
  slug?: string | null;
  children?: NavNode[] | null;
}

interface WebsiteRow {
  id: string;
  account_id: string | null;
  subdomain: string;
  custom_domain: string | null;
  content: {
    siteName?: string;
    account?: { name?: string };
  } | null;
  featured_products: Record<string, unknown> | null;
  sections: Array<{ section_type?: string; is_enabled?: boolean }> | null;
}

interface AccountRow {
  id: string;
  name: string | null;
}

type ArchitectureCategoryKey =
  | 'pages'
  | 'blogs'
  | 'destinations'
  | 'hotels'
  | 'activities'
  | 'transfers'
  | 'packages'
  | 'listings';

type ArchitectureItemType =
  | 'page'
  | 'blog'
  | 'destination'
  | 'hotel'
  | 'activity'
  | 'transfer'
  | 'package'
  | 'blog-index'
  | 'destination-index';

interface ArchitectureItem extends LinkGraphItem {
  type: ArchitectureItemType;
  category: ArchitectureCategoryKey;
  path: string;
}

interface ArchitectureCategorySummary {
  key: ArchitectureCategoryKey;
  label: string;
  count: number;
  linkedCount: number;
  orphanCount: number;
}

interface ArchitectureClickDepthRow {
  id: string;
  type: ArchitectureItemType;
  category: ArchitectureCategoryKey;
  name: string;
  slug: string;
  path: string;
  depth: number | null;
  inboundCount: number;
  isOrphan: boolean;
}

interface ArchitectureClickDepthBucket {
  depth: 1 | 2 | 3 | 4 | 'unreachable';
  label: string;
  count: number;
  percentage: number;
}

interface ArchitectureResponse {
  fetchedAt: string;
  website: {
    id: string;
    accountId: string | null;
    accountName: string;
    subdomain: string;
    customDomain: string | null;
    siteName: string;
    baseUrl: string;
  };
  summary: {
    totalNodes: number;
    linkedNodes: number;
    orphanPages: number;
    navLinks: number;
    homepageFeatured: number;
    destinationEdges: number;
    maxDepth: number;
  };
  categories: ArchitectureCategorySummary[];
  clickDepthBuckets: ArchitectureClickDepthBucket[];
  clickDepthRows: ArchitectureClickDepthRow[];
  orphanPages: ArchitectureClickDepthRow[];
}

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[/#]+/, '')
    .replace(/\/+$/g, '');
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function aliasVariants(slug: string): string[] {
  const normalized = normalizeSlug(slug);
  const aliases: Record<string, string[]> = {
    destinos: ['destinations'],
    destinations: ['destinos'],
    hoteles: ['hotels'],
    hotels: ['hoteles'],
    actividades: ['activities'],
    activities: ['actividades'],
    traslados: ['transfers'],
    transfers: ['traslados'],
    paquetes: ['packages'],
    packages: ['paquetes'],
  };

  return [normalized, ...(aliases[normalized] ?? [])].filter(Boolean);
}

function flattenNavNodes(items: NavNode[]): NavNode[] {
  const flat: NavNode[] = [];

  for (const item of items) {
    flat.push(item);
    if (Array.isArray(item.children) && item.children.length > 0) {
      flat.push(...flattenNavNodes(item.children));
    }
  }

  return flat;
}

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function getBaseUrl(website: WebsiteRow): string {
  return website.custom_domain ? `https://${website.custom_domain}` : `https://${website.subdomain}.bukeer.com`;
}

function buildPathForItem(type: ArchitectureItemType, slug: string): string {
  switch (type) {
    case 'blog-index':
      return '/blog';
    case 'destination-index':
      return '/destinos';
    case 'destination':
      return `/destinos/${slug}`;
    case 'hotel':
      return `/hoteles/${slug}`;
    case 'activity':
      return `/actividades/${slug}`;
    case 'transfer':
      return `/traslados/${slug}`;
    case 'package':
      return `/paquetes/${slug}`;
    case 'blog':
    case 'page':
    default:
      return `/${slug}`;
  }
}

function buildItem(category: ArchitectureCategoryKey, type: ArchitectureItemType, id: string, name: string, slug: string): ArchitectureItem {
  return {
    id,
    type,
    category,
    name,
    slug,
    path: buildPathForItem(type, slug),
  };
}

function resolveItemBySlug(slug: string, itemsBySlug: Map<string, ArchitectureItem>): ArchitectureItem | null {
  const normalized = normalizeSlug(slug);
  for (const variant of aliasVariants(normalized)) {
    const item = itemsBySlug.get(variant);
    if (item) return item;
  }
  return itemsBySlug.get(normalized) ?? null;
}

function resolveIdsFromValues(values: string[], itemsById: Map<string, ArchitectureItem>, itemsBySlug: Map<string, ArchitectureItem>): string[] {
  const resolved = new Set<string>();

  for (const raw of values) {
    if (itemsById.has(raw)) {
      resolved.add(raw);
      continue;
    }

    const item = resolveItemBySlug(raw, itemsBySlug);
    if (item) {
      resolved.add(item.id);
    }
  }

  return [...resolved];
}

function resolveNavData(rawNav: NavNode[], itemsBySlug: Map<string, ArchitectureItem>) {
  const flatNav = flattenNavNodes(rawNav);
  const navSlugs: string[] = [];
  const navLinkedIds = new Set<string>();

  for (const entry of flatNav) {
    if (!entry.slug) continue;
    const item = resolveItemBySlug(entry.slug, itemsBySlug);
    if (!item) continue;
    navSlugs.push(item.slug);
    navLinkedIds.add(item.id);
  }

  return {
    navSlugs,
    navLinkedIds: [...navLinkedIds],
  };
}

function resolveFeaturedIds(website: WebsiteRow, itemsById: Map<string, ArchitectureItem>, itemsBySlug: Map<string, ArchitectureItem>): string[] {
  const featured = website.featured_products ?? {};
  const rawValues = [
    ...extractStringArray(featured.destinations),
    ...extractStringArray(featured.hotels),
    ...extractStringArray(featured.activities),
    ...extractStringArray(featured.transfers),
    ...extractStringArray(featured.packages),
  ];

  return resolveIdsFromValues(rawValues, itemsById, itemsBySlug);
}

function buildCategorySummary(items: ArchitectureItem[], graph: ReturnType<typeof buildInternalLinkGraph>): ArchitectureCategorySummary[] {
  const labelMap: Record<ArchitectureCategoryKey, string> = {
    pages: 'Páginas',
    blogs: 'Blog',
    destinations: 'Destinos',
    hotels: 'Hoteles',
    activities: 'Actividades',
    transfers: 'Traslados',
    packages: 'Paquetes',
    listings: 'Listados',
  };

  const categories: ArchitectureCategoryKey[] = ['pages', 'blogs', 'destinations', 'hotels', 'activities', 'transfers', 'packages', 'listings'];

  return categories.map((key) => {
    const categoryItems = items.filter((item) => item.category === key);
    const orphanCount = categoryItems.filter((item) => graph.orphans.includes(item.id)).length;
    return {
      key,
      label: labelMap[key],
      count: categoryItems.length,
      linkedCount: categoryItems.length - orphanCount,
      orphanCount,
    };
  });
}

function buildClickDepthRows(
  items: ArchitectureItem[],
  graph: ReturnType<typeof buildInternalLinkGraph>,
  depthMap: Map<string, number>
): ArchitectureClickDepthRow[] {
  return items
    .map((item) => ({
      id: item.id,
      type: item.type,
      category: item.category,
      name: item.name,
      slug: item.slug,
      path: item.path,
      depth: depthMap.get(item.id) ?? null,
      inboundCount: graph.inboundCount.get(item.id) ?? 0,
      isOrphan: graph.orphans.includes(item.id),
    }))
    .sort((a, b) => {
      const depthA = a.depth ?? 999;
      const depthB = b.depth ?? 999;
      if (depthA !== depthB) return depthA - depthB;
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name, 'es');
    });
}

function countDepthBuckets(rows: ArchitectureClickDepthRow[]): ArchitectureClickDepthBucket[] {
  const counts: Record<1 | 2 | 3 | 4 | 'unreachable', number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    unreachable: 0,
  };

  for (const row of rows) {
    if (row.depth == null) {
      counts.unreachable += 1;
      continue;
    }

    if (row.depth >= 4) {
      counts[4] += 1;
      continue;
    }

    counts[row.depth as 1 | 2 | 3] += 1;
  }

  const total = rows.length || 1;

  const bucketMeta: Array<{ depth: 1 | 2 | 3 | 4 | 'unreachable'; label: string }> = [
    { depth: 1, label: '1 click' },
    { depth: 2, label: '2 clicks' },
    { depth: 3, label: '3 clicks' },
    { depth: 4, label: '4+ clicks' },
    { depth: 'unreachable', label: 'Sin enlace' },
  ];

  return bucketMeta.map((bucket) => ({
    depth: bucket.depth,
    label: bucket.label,
    count: counts[bucket.depth],
    percentage: (counts[bucket.depth] / total) * 100,
  }));
}

function buildArchitectureResponse(input: {
  website: WebsiteRow;
  accountName: string;
  items: ArchitectureItem[];
  navSlugs: string[];
  navLinkedIds: string[];
  featuredIds: string[];
  destinationProductMap: Map<string, string[]>;
}): ArchitectureResponse {
  const itemsById = new Map(input.items.map((item) => [item.id, item] as const));
  const itemsBySlug = new Map<string, ArchitectureItem>();

  for (const item of input.items) {
    for (const variant of aliasVariants(item.slug)) {
      if (!itemsBySlug.has(variant)) {
        itemsBySlug.set(variant, item);
      }
    }
  }

  const resolvedNav = input.navSlugs
    .map((slug) => resolveItemBySlug(slug, itemsBySlug))
    .filter((item): item is ArchitectureItem => Boolean(item));

  const navSlugs = [...new Set(resolvedNav.map((item) => item.slug))];
  const navLinkedIds = [...new Set(input.navLinkedIds.filter((id) => itemsById.has(id)))];
  const featuredIds = [...new Set(input.featuredIds.filter((id) => itemsById.has(id)))];

  const graph = buildInternalLinkGraph(input.items, featuredIds, input.destinationProductMap, navSlugs);
  const depthMap = calculateClickDepth(input.items.map((item) => item.id), featuredIds, navLinkedIds, input.destinationProductMap).depths;
  const clickDepthRows = buildClickDepthRows(input.items, graph, depthMap);
  const categories = buildCategorySummary(input.items, graph);
  const orphanPages = clickDepthRows.filter((row) => row.isOrphan);
  const clickDepthBuckets = countDepthBuckets(clickDepthRows);
  const maxDepth = clickDepthRows.reduce((max, row) => {
    if (row.depth == null) return max;
    return Math.max(max, row.depth);
  }, 0);

  return {
    fetchedAt: new Date().toISOString(),
    website: {
      id: input.website.id,
      accountId: input.website.account_id,
      accountName: input.accountName,
      subdomain: input.website.subdomain,
      customDomain: input.website.custom_domain,
      siteName: input.website.content?.siteName || input.accountName || input.website.subdomain,
      baseUrl: getBaseUrl(input.website),
    },
    summary: {
      totalNodes: input.items.length,
      linkedNodes: input.items.length - orphanPages.length,
      orphanPages: orphanPages.length,
      navLinks: navSlugs.length,
      homepageFeatured: featuredIds.length,
      destinationEdges: [...input.destinationProductMap.values()].reduce((sum, value) => sum + value.length, 0),
      maxDepth,
    },
    categories,
    clickDepthBuckets,
    clickDepthRows,
    orphanPages,
  };
}

export async function GET(request: NextRequest) {
  try {
    const websiteId = request.nextUrl.searchParams.get('websiteId');
    if (!websiteId) {
      return NextResponse.json({ error: 'websiteId is required', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const access = await requireWebsiteAccess(websiteId);
    const supabase = createSupabaseServiceRoleClient();

    const [websiteRes, accountRes, pagesRes, blogRes, destinationsRes, hotelsRes, activitiesRes, transfersRes, packagesRes] = await Promise.all([
      supabase
        .from('websites')
        .select('id, account_id, subdomain, custom_domain, content, featured_products, sections')
        .eq('id', websiteId)
        .single(),
      supabase
        .from('accounts')
        .select('id, name')
        .eq('id', access.accountId)
        .maybeSingle(),
      supabase
        .from('website_pages')
        .select('id, title, slug, page_type, category_type, is_published, robots_noindex')
        .eq('website_id', websiteId)
        .eq('is_published', true)
        .order('nav_order', { ascending: true }),
      supabase
        .from('website_blog_posts')
        .select('id, title, slug, status')
        .eq('website_id', websiteId)
        .eq('status', 'published')
        .order('published_at', { ascending: false }),
      supabase
        .from('destinations')
        .select('id, name, slug, description')
        .eq('account_id', access.accountId),
      supabase
        .from('hotels')
        .select('id, name, slug')
        .eq('account_id', access.accountId)
        .is('deleted_at', null),
      supabase
        .from('activities')
        .select('id, name, slug')
        .eq('account_id', access.accountId)
        .is('deleted_at', null),
      supabase
        .from('transfers')
        .select('id, name, slug')
        .eq('account_id', access.accountId)
        .is('deleted_at', null),
      supabase
        .from('package_kits')
        .select('id, name')
        .eq('account_id', access.accountId),
    ]);

    if (websiteRes.error || !websiteRes.data) {
      throw new SeoApiError('VALIDATION_ERROR', 'Website not found', 404);
    }

    const website = websiteRes.data as WebsiteRow;
    const account = accountRes.data as AccountRow | null;
    const navRes = await supabase.rpc('get_website_navigation', { p_subdomain: website.subdomain });

    const items: ArchitectureItem[] = [];

    for (const page of pagesRes.data ?? []) {
      if (!page.slug) continue;
      const type: ArchitectureItemType = page.page_type === 'category' ? 'page' : 'page';
      items.push(buildItem('pages', type, page.id, page.title || page.slug, normalizeSlug(page.slug)));
    }

    for (const post of blogRes.data ?? []) {
      if (!post.slug) continue;
      items.push(buildItem('blogs', 'blog', post.id, post.title || post.slug, normalizeSlug(post.slug)));
    }

    for (const destination of destinationsRes.data ?? []) {
      if (!destination.slug) continue;
      items.push(buildItem('destinations', 'destination', destination.id, destination.name || destination.slug, normalizeSlug(destination.slug)));
    }

    for (const hotel of hotelsRes.data ?? []) {
      const slug = normalizeSlug(hotel.slug || slugify(hotel.name || hotel.id));
      items.push(buildItem('hotels', 'hotel', hotel.id, hotel.name || hotel.id, slug));
    }

    for (const activity of activitiesRes.data ?? []) {
      const slug = normalizeSlug(activity.slug || slugify(activity.name || activity.id));
      items.push(buildItem('activities', 'activity', activity.id, activity.name || activity.id, slug));
    }

    for (const transfer of transfersRes.data ?? []) {
      const slug = normalizeSlug(transfer.slug || slugify(transfer.name || transfer.id));
      items.push(buildItem('transfers', 'transfer', transfer.id, transfer.name || transfer.id, slug));
    }

    for (const pkg of packagesRes.data ?? []) {
      const slug = normalizeSlug(slugify(pkg.name || pkg.id));
      items.push(buildItem('packages', 'package', pkg.id, pkg.name || pkg.id, slug));
    }

    if (!items.some((item) => item.slug === 'blog')) {
      items.push(buildItem('listings', 'blog-index', '__blog_index__', 'Blog', 'blog'));
    }

    if (!items.some((item) => item.slug === 'destinos') && !items.some((item) => item.slug === 'destinations')) {
      items.push(buildItem('listings', 'destination-index', '__destination_index__', 'Destinos', 'destinos'));
    }

    const itemsById = new Map(items.map((item) => [item.id, item] as const));
    const itemsBySlug = new Map<string, ArchitectureItem>();
    for (const item of items) {
      for (const variant of aliasVariants(item.slug)) {
        if (!itemsBySlug.has(variant)) {
          itemsBySlug.set(variant, item);
        }
      }
    }

    const rawNav = Array.isArray(navRes.data) ? (navRes.data as NavNode[]) : [];
    const { navSlugs, navLinkedIds } = resolveNavData(rawNav, itemsBySlug);
    const featuredIds = resolveFeaturedIds(website, itemsById, itemsBySlug);

    const destinationProductMap = new Map<string, string[]>();
    const destinationProducts = await Promise.all(
      (destinationsRes.data ?? []).map(async (destination) => {
        if (!destination.id || !destination.name) {
          return { id: destination.id, products: [] as string[] };
        }

        const { data, error } = await supabase.rpc('get_website_destination_products', {
          p_subdomain: website.subdomain,
          p_city_name: destination.name,
        });

        if (error) {
          return { id: destination.id, products: [] as string[] };
        }

        const payload = data as { items?: Array<{ id?: string }> } | null;
        const products = (payload?.items ?? [])
          .map((product) => product.id)
          .filter((value): value is string => Boolean(value));
        return { id: destination.id, products };
      })
    );

    for (const entry of destinationProducts) {
      if (entry.products.length > 0) {
        destinationProductMap.set(entry.id, entry.products);
      }
    }

    const response = buildArchitectureResponse({
      website,
      accountName: account?.name ?? website.content?.account?.name ?? website.content?.siteName ?? website.subdomain,
      items,
      navSlugs,
      navLinkedIds,
      featuredIds,
      destinationProductMap,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const mapped = toErrorResponse(error instanceof SeoApiError ? error : error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
