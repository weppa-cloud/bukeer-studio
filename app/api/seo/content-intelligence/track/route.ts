import { NextRequest } from 'next/server';
import { SeoTrackQuerySchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { buildSourceMeta, withNoStoreHeaders, withSharedCacheHeaders } from '@/lib/seo/content-intelligence';

export async function GET(request: NextRequest) {
  const parsed = SeoTrackQuerySchema.safeParse({
    websiteId: request.nextUrl.searchParams.get('websiteId'),
    from: request.nextUrl.searchParams.get('from'),
    to: request.nextUrl.searchParams.get('to'),
    locale: request.nextUrl.searchParams.get('locale') ?? undefined,
    contentType: request.nextUrl.searchParams.get('contentType') ?? undefined,
    clusterId: request.nextUrl.searchParams.get('clusterId') ?? undefined,
  });
  if (!parsed.success) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid tracking query', 400, parsed.error.flatten()));
  }

  await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();

  let pageMetricsQuery = admin
    .from('seo_page_metrics_daily')
    .select(
      'metric_date,locale,page_type,page_id,url,clicks,impressions,ctr,avg_position,sessions,conversions,source,fetched_at,confidence',
    )
    .eq('website_id', parsed.data.websiteId)
    .gte('metric_date', parsed.data.from)
    .lte('metric_date', parsed.data.to)
    .order('metric_date', { ascending: true });

  if (parsed.data.locale) pageMetricsQuery = pageMetricsQuery.eq('locale', parsed.data.locale);
  if (parsed.data.contentType) pageMetricsQuery = pageMetricsQuery.eq('page_type', parsed.data.contentType);

  let clusterMetricsQuery = admin
    .from('seo_cluster_metrics_daily')
    .select('metric_date,locale,cluster_id,clicks,impressions,ctr,avg_position,pages_tracked,source,fetched_at,confidence')
    .eq('website_id', parsed.data.websiteId)
    .gte('metric_date', parsed.data.from)
    .lte('metric_date', parsed.data.to)
    .order('metric_date', { ascending: true });

  if (parsed.data.locale) clusterMetricsQuery = clusterMetricsQuery.eq('locale', parsed.data.locale);
  if (parsed.data.clusterId) clusterMetricsQuery = clusterMetricsQuery.eq('cluster_id', parsed.data.clusterId);

  const [{ data: pageMetrics, error: pageError }, { data: clusterMetrics, error: clusterError }] = await Promise.all([
    pageMetricsQuery,
    clusterMetricsQuery,
  ]);

  if (pageError || clusterError) {
    return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to load tracking metrics', 500, pageError?.message ?? clusterError?.message));
  }

  const hasData = (pageMetrics?.length ?? 0) > 0 || (clusterMetrics?.length ?? 0) > 0;
  const sourceMeta = hasData
    ? {
        source: (pageMetrics?.[0]?.source ?? clusterMetrics?.[0]?.source ?? 'database') as string,
        fetchedAt: (pageMetrics?.[0]?.fetched_at ?? clusterMetrics?.[0]?.fetched_at ?? new Date().toISOString()) as string,
        confidence: (pageMetrics?.[0]?.confidence ?? clusterMetrics?.[0]?.confidence ?? 'partial') as
          | 'live'
          | 'partial'
          | 'exploratory',
      }
    : buildSourceMeta('database-empty', 'exploratory');

  const warning = hasData
    ? null
    : {
        code: 'TRACK_DATA_UNAVAILABLE',
        message: 'No authoritative tracking metrics found for requested filters.',
      };

  return withSharedCacheHeaders(
    apiSuccess({
      websiteId: parsed.data.websiteId,
      from: parsed.data.from,
      to: parsed.data.to,
      pageMetrics: pageMetrics ?? [],
      clusterMetrics: clusterMetrics ?? [],
      sourceMeta,
      warning,
    }),
    300,
  );
}
