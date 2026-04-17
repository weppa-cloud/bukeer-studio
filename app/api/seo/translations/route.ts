import { NextRequest } from 'next/server';
import { TranslationsListQuerySchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { buildSourceMeta, withNoStoreHeaders } from '@/lib/seo/content-intelligence';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeSearchNeedle(value?: string): string | null {
  const text = value?.trim();
  if (!text) return null;
  return text.replace(/[%_,]/g, '');
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request: NextRequest) {
  const parsed = TranslationsListQuerySchema.safeParse({
    websiteId: request.nextUrl.searchParams.get('websiteId'),
    sourceLocale: request.nextUrl.searchParams.get('sourceLocale') ?? undefined,
    targetLocale: request.nextUrl.searchParams.get('targetLocale') ?? undefined,
    pageType: request.nextUrl.searchParams.get('pageType') ?? undefined,
    status: request.nextUrl.searchParams.get('status') ?? undefined,
    search: request.nextUrl.searchParams.get('search') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit') ?? 50,
    offset: request.nextUrl.searchParams.get('offset') ?? 0,
  });
  if (!parsed.success) {
    return withNoStoreHeaders(
      apiError('VALIDATION_ERROR', 'Invalid translations query', 400, parsed.error.flatten()),
    );
  }

  await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();
  const sourceMeta = buildSourceMeta('seo/translations', 'live');

  const from = parsed.data.offset;
  const to = parsed.data.offset + parsed.data.limit - 1;
  let query = admin
    .from('seo_transcreation_jobs')
    .select(
      'id,website_id,page_type,page_id,source_locale,target_locale,status,source_keyword,target_keyword,created_at,updated_at',
      { count: 'exact' },
    )
    .eq('website_id', parsed.data.websiteId)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (parsed.data.sourceLocale) query = query.eq('source_locale', parsed.data.sourceLocale);
  if (parsed.data.targetLocale) query = query.eq('target_locale', parsed.data.targetLocale);
  if (parsed.data.pageType) query = query.eq('page_type', parsed.data.pageType);
  if (parsed.data.status) query = query.eq('status', parsed.data.status);

  const needle = normalizeSearchNeedle(parsed.data.search);
  if (needle) {
    const clauses = [`source_keyword.ilike.%${needle}%`, `target_keyword.ilike.%${needle}%`];
    if (isUuid(needle)) clauses.push(`page_id.eq.${needle}`);
    query = query.or(clauses.join(','));
  }

  const { data, error, count } = await query;
  if (error) {
    return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read transcreation jobs', 500, error.message));
  }

  const rows = (data ?? []).map((row) => ({
    id: String(row.id),
    websiteId: String(row.website_id),
    pageType: String(row.page_type),
    pageId: row.page_id ? String(row.page_id) : null,
    sourceLocale: String(row.source_locale),
    targetLocale: String(row.target_locale),
    status: String(row.status),
    sourceKeyword: row.source_keyword ? String(row.source_keyword) : null,
    targetKeyword: row.target_keyword ? String(row.target_keyword) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }));

  return withNoStoreHeaders(
    apiSuccess({
      websiteId: parsed.data.websiteId,
      total: Number(count ?? 0),
      rows,
      sourceMeta,
    }),
  );
}
