import { NextRequest } from 'next/server';
import {
  SeoAuditQuerySchema,
  SeoAuditRequestSchema,
  SeoPageTypeSchema,
} from '@bukeer/website-contract';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import {
  AUTHORITATIVE_SOURCE_REQUIRED_CODE,
  DECISION_GRADE_ERROR_CODE,
  buildDecisionGradeBlockDetails,
  buildSeoContentIntelligenceCacheTags,
  buildSourceMeta,
  computePriorityScore,
  withNoStoreHeaders,
  withSharedCacheHeaders,
  type SeoConfidence,
} from '@/lib/seo/content-intelligence';
import { enqueueDecisionGradeSync } from '@/lib/seo/decision-grade-sync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageType = z.infer<typeof SeoPageTypeSchema>;

type ContentItem = {
  pageType: PageType;
  pageId: string;
  locale: string;
  publicUrl: string;
  title: string;
  metaDescription: string;
  headingCandidates: string[];
  schemaTypes: string[];
  internalLinks: string[];
  targetKeyword: string | null;
  confidence: SeoConfidence;
};

function safeSlug(input: string | null | undefined): string {
  if (!input) return '';
  return input.trim().replace(/^\/+/, '');
}

function buildFindingFromSnapshot(item: ContentItem, clicksCurrent: number, clicksPrevious: number) {
  const issues: Array<{
    findingType: string;
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
    confidence: SeoConfidence;
  }> = [];

  if (!item.title) {
    issues.push({
      findingType: 'missing_title',
      title: 'Title faltante',
      description: 'La URL no tiene title utilizable para decisión SEO.',
      severity: 'critical',
      confidence: 'partial',
    });
  }
  if (!item.metaDescription) {
    issues.push({
      findingType: 'missing_meta_description',
      title: 'Meta description faltante',
      description: 'La URL no tiene meta description optimizada.',
      severity: 'warning',
      confidence: 'partial',
    });
  }
  if (item.headingCandidates.length === 0) {
    issues.push({
      findingType: 'missing_heading_context',
      title: 'Contexto de headings insuficiente',
      description: 'No se detectaron headings para soportar estructura semántica.',
      severity: 'warning',
      confidence: item.confidence,
    });
  }
  if (item.internalLinks.length === 0) {
    issues.push({
      findingType: 'internal_link_gap',
      title: 'Sin enlaces internos',
      description: 'La página no reporta enlaces internos en snapshot.',
      severity: 'info',
      confidence: item.confidence,
    });
  }
  if (item.schemaTypes.length === 0) {
    issues.push({
      findingType: 'schema_gap',
      title: 'Sin schema detectado',
      description: 'No se detectaron schema types en el snapshot.',
      severity: 'info',
      confidence: item.confidence,
    });
  }

  if (issues.length === 0) {
    issues.push({
      findingType: 'healthy',
      title: 'Snapshot sin brechas críticas',
      description: 'La página cumple checks básicos de estructura SEO.',
      severity: 'info',
      confidence: item.confidence,
    });
  }

  const decayDeltaPct =
    clicksPrevious <= 0 ? 0 : Number((((clicksCurrent - clicksPrevious) / clicksPrevious) * 100).toFixed(2));
  const decaySignal =
    decayDeltaPct <= -20 ? 'high' : decayDeltaPct <= -10 ? 'medium' : decayDeltaPct < 0 ? 'low' : 'none';

  return issues.map((issue) => {
    const searchVolume = Math.max(10, clicksCurrent * 3 + item.headingCandidates.length * 20);
    return {
      ...issue,
      decayDeltaPct,
      decaySignal,
      clicksCurrent,
      clicksPrevious,
      priorityScore: computePriorityScore({
        contentType: item.pageType,
        searchVolume,
        locale: item.locale,
      }),
    };
  });
}

async function loadWebsiteItems(
  websiteId: string,
  locale: string,
  contentTypes: string[],
): Promise<ContentItem[]> {
  const admin = createSupabaseServiceRoleClient();
  const { data: website, error: websiteError } = await admin
    .from('websites')
    .select('id, account_id, subdomain, custom_domain')
    .eq('id', websiteId)
    .single();

  if (websiteError || !website) {
    throw new Error('Website not found');
  }

  const accountId = website.account_id as string;
  const subdomain = website.custom_domain || `${website.subdomain}.bukeer.com`;
  const filters = new Set(contentTypes);
  const includeAll = filters.size === 0;
  const items: ContentItem[] = [];

  if (includeAll || filters.has('page') || filters.has('landing')) {
    const { data: pages } = await admin
      .from('website_pages')
      .select('id, slug, title, seo_title, seo_description, target_keyword')
      .eq('website_id', websiteId)
      .limit(200);
    for (const page of pages ?? []) {
      const slug = safeSlug(page.slug ?? page.id);
      items.push({
        pageType: 'page',
        pageId: page.id as string,
        locale,
        publicUrl: `https://${subdomain}/${slug}`,
        title: String(page.seo_title || page.title || ''),
        metaDescription: String(page.seo_description || ''),
        headingCandidates: [String(page.title || '')].filter(Boolean),
        schemaTypes: ['WebPage'],
        internalLinks: [],
        targetKeyword: (page.target_keyword as string | null) ?? null,
        confidence: 'partial',
      });
    }
  }

  if (includeAll || filters.has('blog')) {
    const { data: posts } = await admin
      .from('website_blog_posts')
      .select('id, slug, title, excerpt, seo_title, seo_description, seo_keywords')
      .eq('website_id', websiteId)
      .limit(200);
    for (const post of posts ?? []) {
      const slug = safeSlug(post.slug ?? post.id);
      const seoKeywords = Array.isArray(post.seo_keywords) ? post.seo_keywords : [];
      items.push({
        pageType: 'blog',
        pageId: post.id as string,
        locale,
        publicUrl: `https://${subdomain}/blog/${slug}`,
        title: String(post.seo_title || post.title || ''),
        metaDescription: String(post.seo_description || post.excerpt || ''),
        headingCandidates: [String(post.title || '')].filter(Boolean),
        schemaTypes: ['Article'],
        internalLinks: [],
        targetKeyword: (seoKeywords[0] as string | undefined) ?? null,
        confidence: 'partial',
      });
    }
  }

  if (includeAll || filters.has('destination')) {
    const { data: destinations } = await admin
      .from('destinations')
      .select('id, slug, name, seo_title, seo_description, target_keyword')
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .limit(200);
    for (const destination of destinations ?? []) {
      const slug = safeSlug(destination.slug ?? destination.id);
      items.push({
        pageType: 'destination',
        pageId: destination.id as string,
        locale,
        publicUrl: `https://${subdomain}/destinos/${slug}`,
        title: String(destination.seo_title || destination.name || ''),
        metaDescription: String(destination.seo_description || ''),
        headingCandidates: [String(destination.name || '')].filter(Boolean),
        schemaTypes: ['TouristDestination'],
        internalLinks: [],
        targetKeyword: (destination.target_keyword as string | null) ?? null,
        confidence: 'partial',
      });
    }
  }

  if (includeAll || filters.has('activity')) {
    const { data: activities } = await admin
      .from('activities')
      .select('id, slug, name')
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .limit(200);
    for (const activity of activities ?? []) {
      const slug = safeSlug(activity.slug ?? activity.id);
      items.push({
        pageType: 'activity',
        pageId: activity.id as string,
        locale,
        publicUrl: `https://${subdomain}/actividades/${slug}`,
        title: String(activity.name || ''),
        metaDescription: '',
        headingCandidates: [String(activity.name || '')].filter(Boolean),
        schemaTypes: ['Product'],
        internalLinks: [],
        targetKeyword: null,
        confidence: 'exploratory',
      });
    }
  }

  if (includeAll || filters.has('package')) {
    const { data: packages } = await admin
      .from('package_kits')
      .select('id, name')
      .eq('account_id', accountId)
      .limit(200);
    for (const pkg of packages ?? []) {
      const slug = safeSlug(pkg.id);
      items.push({
        pageType: 'package',
        pageId: pkg.id as string,
        locale,
        publicUrl: `https://${subdomain}/paquetes/${slug}`,
        title: String(pkg.name || ''),
        metaDescription: '',
        headingCandidates: [String(pkg.name || '')].filter(Boolean),
        schemaTypes: ['Product'],
        internalLinks: [],
        targetKeyword: null,
        confidence: 'exploratory',
      });
    }
  }

  return items;
}

async function getRollingClicksByUrl(websiteId: string, urlPath: string) {
  const admin = createSupabaseServiceRoleClient();
  const today = new Date();
  const fromCurrent = new Date(today);
  fromCurrent.setDate(today.getDate() - 90);
  const fromPrevious = new Date(fromCurrent);
  fromPrevious.setDate(fromCurrent.getDate() - 90);

  const { data: currentRows } = await admin
    .from('seo_ga4_page_metrics')
    .select('sessions, metric_date')
    .eq('website_id', websiteId)
    .eq('page_path', urlPath)
    .gte('metric_date', fromCurrent.toISOString().slice(0, 10))
    .lte('metric_date', today.toISOString().slice(0, 10));

  const { data: previousRows } = await admin
    .from('seo_ga4_page_metrics')
    .select('sessions, metric_date')
    .eq('website_id', websiteId)
    .eq('page_path', urlPath)
    .gte('metric_date', fromPrevious.toISOString().slice(0, 10))
    .lt('metric_date', fromCurrent.toISOString().slice(0, 10));

  const current = (currentRows ?? []).reduce((acc, row) => acc + Number(row.sessions ?? 0), 0);
  const previous = (previousRows ?? []).reduce((acc, row) => acc + Number(row.sessions ?? 0), 0);
  return { current, previous };
}

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const body = SeoAuditRequestSchema.safeParse(bodyRaw);
  if (!body.success) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid audit payload', 400, body.error.flatten()));
  }

  try {
    await requireWebsiteAccess(body.data.websiteId);
    const admin = createSupabaseServiceRoleClient();
    const sourceMeta = buildSourceMeta('seo-content-intelligence/audit', 'partial');

    const items = await loadWebsiteItems(body.data.websiteId, body.data.locale, body.data.contentTypes);
    const snapshots: Array<{ id: string; item: ContentItem }> = [];

    for (const item of items) {
      const { data: existing } = await admin
        .from('seo_render_snapshots')
        .select('id, captured_at')
        .eq('website_id', body.data.websiteId)
        .eq('locale', item.locale)
        .eq('page_type', item.pageType)
        .eq('page_id', item.pageId)
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing && Date.now() - new Date(existing.captured_at as string).getTime() < 1000 * 60 * 60) {
        snapshots.push({ id: existing.id as string, item });
        continue;
      }

      const { data: inserted, error: insertError } = await admin
        .from('seo_render_snapshots')
        .insert({
          website_id: body.data.websiteId,
          locale: item.locale,
          page_type: item.pageType,
          page_id: item.pageId,
          public_url: item.publicUrl,
          title: item.title,
          meta_description: item.metaDescription,
          canonical_url: item.publicUrl,
          hreflang: { [item.locale]: item.publicUrl },
          headings: item.headingCandidates,
          visible_text: item.metaDescription || item.title,
          internal_links: item.internalLinks,
          schema_types: item.schemaTypes,
          source: sourceMeta.source,
          fetched_at: sourceMeta.fetchedAt,
          confidence: item.confidence,
          decision_grade_ready: false,
        })
        .select('id')
        .single();

      if (!insertError && inserted?.id) {
        snapshots.push({ id: inserted.id as string, item });
      }
    }

    if (snapshots.length > 0) {
      await admin.from('seo_audit_findings').delete().in('snapshot_id', snapshots.map((s) => s.id));
    }

    const cannibalizationMap = new Map<string, string>();
    const keywordGroups = new Map<string, number>();
    for (const snap of snapshots) {
      const key = `${snap.item.locale}:${snap.item.targetKeyword ?? ''}`;
      if (!snap.item.targetKeyword) continue;
      keywordGroups.set(key, (keywordGroups.get(key) ?? 0) + 1);
    }
    for (const [key, count] of keywordGroups.entries()) {
      if (count > 1) cannibalizationMap.set(key, crypto.randomUUID());
    }

    const findings: Array<Record<string, unknown>> = [];
    for (const snap of snapshots) {
      const path = new URL(snap.item.publicUrl).pathname;
      const clicks = await getRollingClicksByUrl(body.data.websiteId, path);
      const issues = buildFindingFromSnapshot(snap.item, clicks.current, clicks.previous);
      for (const issue of issues) {
        const key = `${snap.item.locale}:${snap.item.targetKeyword ?? ''}`;
        const groupId = cannibalizationMap.get(key) ?? null;
        findings.push({
          website_id: body.data.websiteId,
          snapshot_id: snap.id,
          locale: snap.item.locale,
          page_type: snap.item.pageType,
          page_id: snap.item.pageId,
          public_url: snap.item.publicUrl,
          finding_type: issue.findingType,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          evidence: {
            headings: snap.item.headingCandidates,
            schemaTypes: snap.item.schemaTypes,
            internalLinks: snap.item.internalLinks,
            targetKeyword: snap.item.targetKeyword,
          },
          source: sourceMeta.source,
          fetched_at: sourceMeta.fetchedAt,
          confidence: issue.confidence,
          decision_grade_ready: issue.confidence === 'live',
          decay_signal: issue.decaySignal,
          clicks_90d_current: issue.clicksCurrent,
          clicks_90d_previous: issue.clicksPrevious,
          decay_delta_pct: issue.decayDeltaPct,
          cannibalization_group_id: groupId,
          cannibalization_recommended_action: groupId ? 'differentiate_intent' : 'none',
          priority_score: issue.priorityScore,
          captured_at: sourceMeta.fetchedAt,
        });
      }
    }

    if (findings.length > 0) {
      await admin.from('seo_audit_findings').insert(findings);
    }

    return withNoStoreHeaders(
      apiSuccess({
        websiteId: body.data.websiteId,
        locale: body.data.locale,
        snapshotsStored: snapshots.length,
        findingsCount: findings.length,
        sourceMeta,
      }),
      buildSeoContentIntelligenceCacheTags({
        route: 'audit',
        websiteId: body.data.websiteId,
        locale: body.data.locale,
        contentType: body.data.contentTypes.length > 0 ? body.data.contentTypes.slice().sort().join('+') : null,
        mode: 'exploratory',
      }),
    );
  } catch (error) {
    return withNoStoreHeaders(
      apiError('INTERNAL_ERROR', 'Unable to execute audit', 500, error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function GET(request: NextRequest) {
  const parsed = SeoAuditQuerySchema.safeParse({
    websiteId: request.nextUrl.searchParams.get('websiteId'),
    locale: request.nextUrl.searchParams.get('locale') ?? undefined,
    contentType: request.nextUrl.searchParams.get('contentType') ?? undefined,
    decisionGradeOnly: request.nextUrl.searchParams.get('decisionGradeOnly') ?? true,
    limit: request.nextUrl.searchParams.get('limit') ?? 50,
  });
  if (!parsed.success) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid audit query', 400, parsed.error.flatten()));
  }

  await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();
  let query = admin
    .from('seo_audit_findings')
    .select(
      'id,snapshot_id,locale,page_type,page_id,public_url,finding_type,severity,title,description,evidence,source,fetched_at,confidence,decision_grade_ready,decay_signal,clicks_90d_current,clicks_90d_previous,decay_delta_pct,cannibalization_group_id,cannibalization_recommended_action,priority_score,captured_at',
    )
    .eq('website_id', parsed.data.websiteId)
    .order('priority_score', { ascending: false })
    .limit(parsed.data.limit);

  if (parsed.data.locale) query = query.eq('locale', parsed.data.locale);
  if (parsed.data.contentType) query = query.eq('page_type', parsed.data.contentType);
  if (parsed.data.decisionGradeOnly) {
    query = query.eq('decision_grade_ready', true).eq('confidence', 'live');
  }

  const { data, error } = await query;
  if (error) {
    return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read audit findings', 500, error.message));
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    snapshotId: row.snapshot_id,
    locale: row.locale,
    pageType: row.page_type,
    pageId: row.page_id,
    publicUrl: row.public_url,
    findingType: row.finding_type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    evidence: row.evidence ?? {},
    source: row.source,
    fetchedAt: row.fetched_at,
    confidence: row.confidence,
    decisionGradeReady: row.decision_grade_ready,
    decaySignal: row.decay_signal,
    clicks90dCurrent: row.clicks_90d_current,
    clicks90dPrevious: row.clicks_90d_previous,
    decayDeltaPct: Number(row.decay_delta_pct ?? 0),
    cannibalizationGroupId: row.cannibalization_group_id,
    cannibalizationRecommendedAction: row.cannibalization_recommended_action,
    priorityScore: Number(row.priority_score ?? 0),
    capturedAt: row.captured_at,
  }));

  if (parsed.data.decisionGradeOnly && rows.length === 0) {
    const sync = await enqueueDecisionGradeSync(parsed.data.websiteId);
    return withNoStoreHeaders(
      apiError(
        DECISION_GRADE_ERROR_CODE,
        'Decision-grade audit data is not available yet. Sync has been queued.',
        409,
        buildDecisionGradeBlockDetails({
          route: 'audit',
          websiteId: parsed.data.websiteId,
          locale: parsed.data.locale,
          contentType: parsed.data.contentType,
          missingSources: ['seo_render_snapshots.live', 'seo_audit_findings.live'],
          syncRequestId: sync.requestId,
        }),
      ),
    );
  }

  if (parsed.data.decisionGradeOnly && rows.length > 0) {
    const staleOrNonLive = rows.some((row) => row.confidence !== 'live' || row.decisionGradeReady !== true);
    if (staleOrNonLive) {
      return withNoStoreHeaders(
        apiError(
          AUTHORITATIVE_SOURCE_REQUIRED_CODE,
          'Decision-grade audit requires live and ready rows only.',
          409,
          buildDecisionGradeBlockDetails({
            route: 'audit',
            websiteId: parsed.data.websiteId,
            locale: parsed.data.locale,
            contentType: parsed.data.contentType,
            missingSources: ['seo_audit_findings.live'],
          }),
        ),
      );
    }
  }

  const latestFetchedAt = rows[0]?.fetchedAt ?? new Date().toISOString();
  return withSharedCacheHeaders(
    apiSuccess({
      websiteId: parsed.data.websiteId,
      rows,
      sourceMeta: {
        source: rows[0]?.source ?? 'database-empty',
        fetchedAt: latestFetchedAt,
        confidence: (rows[0]?.confidence ?? 'exploratory') as SeoConfidence,
      },
    }),
    300,
    buildSeoContentIntelligenceCacheTags({
      route: 'audit',
      websiteId: parsed.data.websiteId,
      locale: parsed.data.locale,
      contentType: parsed.data.contentType ?? null,
      mode: parsed.data.decisionGradeOnly ? 'decision-grade' : 'exploratory',
    }),
  );
}
