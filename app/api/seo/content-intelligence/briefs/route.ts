import { NextRequest } from 'next/server';
import { SeoBriefPostSchema, SeoBriefQuerySchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { buildSourceMeta, withNoStoreHeaders, withSharedCacheHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function nextVersion(admin: ReturnType<typeof createSupabaseServiceRoleClient>, briefId: string) {
  const { data } = await admin
    .from('seo_brief_versions')
    .select('version')
    .eq('brief_id', briefId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return Number(data?.version ?? 0) + 1;
}

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const parsed = SeoBriefPostSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid brief payload', 400, parsed.error.flatten()));
  }

  const access = await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();
  const sourceMeta = buildSourceMeta('seo-content-intelligence/briefs', 'live');

  switch (parsed.data.action) {
    case 'create': {
      const { data: brief, error: briefError } = await admin
        .from('seo_briefs')
        .insert({
          website_id: parsed.data.websiteId,
          locale: parsed.data.locale,
          content_type: parsed.data.contentType,
          page_type: parsed.data.pageType,
          page_id: parsed.data.pageId,
          cluster_id: parsed.data.clusterId ?? null,
          primary_keyword: parsed.data.primaryKeyword,
          secondary_keywords: parsed.data.secondaryKeywords,
          brief: parsed.data.brief,
          status: 'draft',
          source: sourceMeta.source,
          fetched_at: sourceMeta.fetchedAt,
          confidence: sourceMeta.confidence,
          created_by: access.userId,
        })
        .select('id, status, locale, page_type, page_id, primary_keyword, updated_at')
        .single();
      if (briefError || !brief) {
        return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to create brief', 500, briefError?.message));
      }

      await admin.from('seo_brief_versions').insert({
        brief_id: brief.id,
        version: 1,
        brief: parsed.data.brief,
        change_reason: parsed.data.changeReason ?? 'initial',
        source: sourceMeta.source,
        fetched_at: sourceMeta.fetchedAt,
        confidence: sourceMeta.confidence,
        created_by: access.userId,
      });

      return withNoStoreHeaders(apiSuccess({ brief, sourceMeta }));
    }

    case 'approve':
    case 'archive': {
      const status = parsed.data.action === 'approve' ? 'approved' : 'archived';
      const payload: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
        source: sourceMeta.source,
        fetched_at: sourceMeta.fetchedAt,
        confidence: sourceMeta.confidence,
      };
      if (status === 'approved') payload.approved_by = access.userId;

      const { data: brief, error: updateError } = await admin
        .from('seo_briefs')
        .update(payload)
        .eq('id', parsed.data.briefId)
        .eq('website_id', parsed.data.websiteId)
        .select('id, status, locale, page_type, page_id, updated_at')
        .single();
      if (updateError || !brief) {
        return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to transition brief', 500, updateError?.message));
      }

      const { data: current } = await admin
        .from('seo_briefs')
        .select('brief')
        .eq('id', parsed.data.briefId)
        .maybeSingle();
      const version = await nextVersion(admin, parsed.data.briefId);
      await admin.from('seo_brief_versions').insert({
        brief_id: parsed.data.briefId,
        version,
        brief: current?.brief ?? {},
        change_reason: status,
        source: sourceMeta.source,
        fetched_at: sourceMeta.fetchedAt,
        confidence: sourceMeta.confidence,
        created_by: access.userId,
      });

      return withNoStoreHeaders(apiSuccess({ brief, sourceMeta }));
    }

    case 'rollback': {
      const { data: versionRow, error: versionError } = await admin
        .from('seo_brief_versions')
        .select('brief')
        .eq('brief_id', parsed.data.briefId)
        .eq('version', parsed.data.version)
        .maybeSingle();
      if (versionError || !versionRow) {
        return withNoStoreHeaders(apiError('NOT_FOUND', 'Requested brief version was not found', 404));
      }

      const { data: updatedBrief, error: rollbackError } = await admin
        .from('seo_briefs')
        .update({
          brief: versionRow.brief,
          status: 'draft',
          updated_at: new Date().toISOString(),
          source: sourceMeta.source,
          fetched_at: sourceMeta.fetchedAt,
          confidence: sourceMeta.confidence,
        })
        .eq('id', parsed.data.briefId)
        .eq('website_id', parsed.data.websiteId)
        .select('id, status, locale, page_type, page_id, updated_at')
        .single();
      if (rollbackError || !updatedBrief) {
        return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to rollback brief', 500, rollbackError?.message));
      }

      const version = await nextVersion(admin, parsed.data.briefId);
      await admin.from('seo_brief_versions').insert({
        brief_id: parsed.data.briefId,
        version,
        brief: versionRow.brief,
        change_reason: parsed.data.changeReason ?? `rollback:v${parsed.data.version}`,
        source: sourceMeta.source,
        fetched_at: sourceMeta.fetchedAt,
        confidence: sourceMeta.confidence,
        created_by: access.userId,
      });

      return withNoStoreHeaders(apiSuccess({ brief: updatedBrief, sourceMeta }));
    }
  }

  return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Unsupported brief action', 400));
}

export async function GET(request: NextRequest) {
  const parsed = SeoBriefQuerySchema.safeParse({
    websiteId: request.nextUrl.searchParams.get('websiteId'),
    pageType: request.nextUrl.searchParams.get('pageType') ?? undefined,
    pageId: request.nextUrl.searchParams.get('pageId') ?? undefined,
    locale: request.nextUrl.searchParams.get('locale') ?? undefined,
  });
  if (!parsed.success) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid briefs query', 400, parsed.error.flatten()));
  }

  await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();

  let query = admin
    .from('seo_briefs')
    .select(
      'id, locale, content_type, page_type, page_id, cluster_id, primary_keyword, secondary_keywords, brief, status, source, fetched_at, confidence, updated_at',
    )
    .eq('website_id', parsed.data.websiteId)
    .order('updated_at', { ascending: false });

  if (parsed.data.locale) query = query.eq('locale', parsed.data.locale);
  if (parsed.data.pageType) query = query.eq('page_type', parsed.data.pageType);
  if (parsed.data.pageId) query = query.eq('page_id', parsed.data.pageId);

  const { data: briefs, error } = await query;
  if (error) {
    return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read briefs', 500, error.message));
  }

  const rows = await Promise.all(
    (briefs ?? []).map(async (brief) => {
      const { data: versions } = await admin
        .from('seo_brief_versions')
        .select('version, change_reason, created_at')
        .eq('brief_id', brief.id)
        .order('version', { ascending: false })
        .limit(20);
      return {
        id: brief.id,
        locale: brief.locale,
        contentType: brief.content_type,
        pageType: brief.page_type,
        pageId: brief.page_id,
        clusterId: brief.cluster_id,
        primaryKeyword: brief.primary_keyword,
        secondaryKeywords: brief.secondary_keywords ?? [],
        brief: brief.brief ?? {},
        status: brief.status,
        versions: versions ?? [],
        source: brief.source,
        fetchedAt: brief.fetched_at,
        confidence: brief.confidence,
      };
    }),
  );

  const latest = rows[0];
  return withSharedCacheHeaders(
    apiSuccess({
      websiteId: parsed.data.websiteId,
      rows,
      sourceMeta: {
        source: latest?.source ?? 'database-empty',
        fetchedAt: latest?.fetchedAt ?? new Date().toISOString(),
        confidence: latest?.confidence ?? 'partial',
      },
    }),
    60,
  );
}
