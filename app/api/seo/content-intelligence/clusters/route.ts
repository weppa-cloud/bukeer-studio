import { NextRequest } from 'next/server';
import { SeoClustersPostSchema, SeoClustersQuerySchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { buildSourceMeta, withNoStoreHeaders, withSharedCacheHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensureClusterOwnership(clusterId: string, websiteId: string) {
  const admin = createSupabaseServiceRoleClient();
  const { data: cluster, error } = await admin
    .from('seo_clusters')
    .select('id, website_id, locale, status, activated_at')
    .eq('id', clusterId)
    .single();
  if (error || !cluster || cluster.website_id !== websiteId) return null;
  return cluster;
}

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const parsed = SeoClustersPostSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid cluster payload', 400, parsed.error.flatten()));
  }

  await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();
  const sourceMeta = buildSourceMeta('seo-content-intelligence/clusters', 'live');

  if (parsed.data.action === 'create') {
    const { data, error } = await admin
      .from('seo_clusters')
      .insert({
        website_id: parsed.data.websiteId,
        locale: parsed.data.locale,
        content_type: parsed.data.contentType,
        name: parsed.data.name,
        primary_topic: parsed.data.primaryTopic,
        target_country: parsed.data.targetCountry,
        target_language: parsed.data.targetLanguage,
        source: sourceMeta.source,
        fetched_at: sourceMeta.fetchedAt,
        confidence: sourceMeta.confidence,
      })
      .select('id, status, locale, name, content_type')
      .single();

    if (error || !data) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to create cluster', 500, error?.message));
    }

    return withNoStoreHeaders(apiSuccess({ cluster: data, sourceMeta }));
  }

  if (parsed.data.action === 'assign_keyword') {
    const cluster = await ensureClusterOwnership(parsed.data.clusterId, parsed.data.websiteId);
    if (!cluster) {
      return withNoStoreHeaders(apiError('NOT_FOUND', 'Cluster not found for this website', 404));
    }

    const { data: conflicts } = await admin
      .from('seo_cluster_keywords')
      .select('keyword, cluster_id, seo_clusters!inner(id, locale)')
      .eq('keyword', parsed.data.keyword)
      .neq('cluster_id', parsed.data.clusterId);

    const sameLocaleConflicts = (conflicts ?? []).filter((conflict) => {
      const locale = (conflict.seo_clusters as unknown as { locale?: string })?.locale;
      return locale === cluster.locale;
    });

    const { data, error } = await admin
      .from('seo_cluster_keywords')
      .upsert(
        {
          cluster_id: parsed.data.clusterId,
          keyword: parsed.data.keyword,
          intent: parsed.data.intent,
          source: sourceMeta.source,
          fetched_at: sourceMeta.fetchedAt,
          confidence: sourceMeta.confidence,
        },
        { onConflict: 'cluster_id,keyword' },
      )
      .select('id, cluster_id, keyword, intent')
      .single();

    if (error || !data) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to assign keyword', 500, error?.message));
    }

    return withNoStoreHeaders(apiSuccess({ assignment: data, conflicts: sameLocaleConflicts, sourceMeta }));
  }

  if (parsed.data.action === 'assign_page') {
    const cluster = await ensureClusterOwnership(parsed.data.clusterId, parsed.data.websiteId);
    if (!cluster) {
      return withNoStoreHeaders(apiError('NOT_FOUND', 'Cluster not found for this website', 404));
    }

    if (parsed.data.pageType === 'page') {
      const { data: pageExists } = await admin
        .from('website_pages')
        .select('id')
        .eq('website_id', parsed.data.websiteId)
        .eq('id', parsed.data.pageId)
        .maybeSingle();
      if (!pageExists) {
        return withNoStoreHeaders(apiError('INVALID_PAGE_REFERENCE', 'Page does not belong to this website', 422));
      }
    }

    if (parsed.data.pageType === 'blog') {
      const { data: blogExists } = await admin
        .from('website_blog_posts')
        .select('id')
        .eq('website_id', parsed.data.websiteId)
        .eq('id', parsed.data.pageId)
        .maybeSingle();
      if (!blogExists) {
        return withNoStoreHeaders(apiError('INVALID_PAGE_REFERENCE', 'Blog post does not belong to this website', 422));
      }
    }

    if (parsed.data.pageType === 'destination') {
      const { data: website } = await admin
        .from('websites')
        .select('account_id')
        .eq('id', parsed.data.websiteId)
        .maybeSingle();
      const accountId = website?.account_id;
      if (!accountId) {
        return withNoStoreHeaders(apiError('NOT_FOUND', 'Website context missing for destination assignment', 404));
      }
      const { data: destinationExists } = await admin
        .from('destinations')
        .select('id')
        .eq('account_id', accountId)
        .eq('id', parsed.data.pageId)
        .is('deleted_at', null)
        .maybeSingle();
      if (!destinationExists) {
        return withNoStoreHeaders(apiError('INVALID_PAGE_REFERENCE', 'Destination does not belong to this website account', 422));
      }
    }

    const { data, error } = await admin
      .from('seo_cluster_pages')
      .upsert(
        {
          cluster_id: parsed.data.clusterId,
          page_type: parsed.data.pageType,
          page_id: parsed.data.pageId,
          role: parsed.data.role,
          target_keyword: parsed.data.targetKeyword ?? null,
          source: sourceMeta.source,
          fetched_at: sourceMeta.fetchedAt,
          confidence: sourceMeta.confidence,
        },
        { onConflict: 'cluster_id,page_type,page_id' },
      )
      .select('id, cluster_id, page_type, page_id, role, status')
      .single();

    if (error || !data) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to assign page', 500, error?.message));
    }

    return withNoStoreHeaders(apiSuccess({ assignment: data, sourceMeta }));
  }

  const cluster = await ensureClusterOwnership(parsed.data.clusterId, parsed.data.websiteId);
  if (!cluster) {
    return withNoStoreHeaders(apiError('NOT_FOUND', 'Cluster not found for this website', 404));
  }

  const nextStatus = parsed.data.status ?? cluster.status;
  const payload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
    source: sourceMeta.source,
    fetched_at: sourceMeta.fetchedAt,
    confidence: sourceMeta.confidence,
  };
  if (parsed.data.name) payload.name = parsed.data.name;
  if (nextStatus === 'active' && !cluster.activated_at) payload.activated_at = new Date().toISOString();

  const { data, error } = await admin
    .from('seo_clusters')
    .update(payload)
    .eq('id', parsed.data.clusterId)
    .select('id, locale, status, name, updated_at')
    .single();
  if (error || !data) {
    return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to update cluster', 500, error?.message));
  }

  return withNoStoreHeaders(apiSuccess({ cluster: data, sourceMeta }));
}

export async function GET(request: NextRequest) {
  const parsed = SeoClustersQuerySchema.safeParse({
    websiteId: request.nextUrl.searchParams.get('websiteId'),
    locale: request.nextUrl.searchParams.get('locale') ?? undefined,
    contentType: request.nextUrl.searchParams.get('contentType') ?? undefined,
  });
  if (!parsed.success) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid clusters query', 400, parsed.error.flatten()));
  }

  await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();
  let query = admin
    .from('seo_clusters')
    .select('id, website_id, locale, content_type, name, primary_topic, target_country, target_language, status, source, fetched_at, confidence, updated_at')
    .eq('website_id', parsed.data.websiteId)
    .order('updated_at', { ascending: false });
  if (parsed.data.locale) query = query.eq('locale', parsed.data.locale);
  if (parsed.data.contentType) query = query.eq('content_type', parsed.data.contentType);

  const { data, error } = await query;
  if (error) {
    return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read clusters', 500, error.message));
  }

  const clusters = await Promise.all(
    (data ?? []).map(async (cluster) => {
      const { count: keywordCount } = await admin
        .from('seo_cluster_keywords')
        .select('id', { count: 'exact', head: true })
        .eq('cluster_id', cluster.id);
      const { count: pageCount } = await admin
        .from('seo_cluster_pages')
        .select('id', { count: 'exact', head: true })
        .eq('cluster_id', cluster.id);

      return {
        id: cluster.id,
        locale: cluster.locale,
        contentType: cluster.content_type,
        name: cluster.name,
        primaryTopic: cluster.primary_topic,
        targetCountry: cluster.target_country,
        targetLanguage: cluster.target_language,
        status: cluster.status,
        keywordCount: keywordCount ?? 0,
        pageCount: pageCount ?? 0,
        source: cluster.source,
        fetchedAt: cluster.fetched_at,
        confidence: cluster.confidence,
      };
    }),
  );

  const latest = clusters[0];
  return withSharedCacheHeaders(
    apiSuccess({
      websiteId: parsed.data.websiteId,
      rows: clusters,
      sourceMeta: {
        source: latest?.source ?? 'database-empty',
        fetchedAt: latest?.fetchedAt ?? new Date().toISOString(),
        confidence: latest?.confidence ?? 'partial',
      },
    }),
    60,
  );
}
