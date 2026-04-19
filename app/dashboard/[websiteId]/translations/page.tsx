import { TranslationsListQuerySchema } from '@bukeer/website-contract';
import type { TranslationJobItem } from '@bukeer/website-contract';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { StudioPage, StudioSectionHeader } from '@/components/studio/ui/primitives';
import { TranslationsDashboard } from '@/components/admin/translations-dashboard';
import type {
  TranslationCoverageRowVM,
  TranslationRowVM,
  TranslationsFilterValues,
} from '@/components/admin/translations-dashboard';
import { normalizeWebsiteLocales } from '@/lib/seo/locale-routing';

// Rendering must stay dynamic — filters come from searchParams.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TranslationsPageProps {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<{
    sourceLocale?: string;
    targetLocale?: string;
    pageType?: string;
    status?: string;
    search?: string;
    drift?: string;
  }>;
}

interface TranslationsDataPayload {
  rows: TranslationRowVM[];
  coverageRows: TranslationCoverageRowVM[];
  coverageLocales: string[];
  total: number;
  kpis: {
    total: number;
    translated: number;
    inDraft: number;
    inReview: number;
    pending: number;
  };
  costSummary: {
    totalUsd: number;
    todayUsd: number;
    byLocaleToday: Array<{ locale: string; costUsd: number }>;
    daily: Array<{ date: string; costUsd: number }>;
  };
  driftCount: number;
  filters: TranslationsFilterValues;
  error: string | null;
}

function normalizeFilters(
  input: Awaited<TranslationsPageProps['searchParams']>,
): TranslationsFilterValues {
  return {
    sourceLocale: input.sourceLocale?.trim() || '',
    targetLocale: input.targetLocale?.trim() || '',
    pageType: input.pageType?.trim() || '',
    status: input.status?.trim() || '',
    search: input.search?.trim() || '',
    drift: input.drift === 'true',
  };
}

async function loadTranslations(
  websiteId: string,
  filters: TranslationsFilterValues,
): Promise<TranslationsDataPayload> {
  const fallbackKpis = { total: 0, translated: 0, inDraft: 0, inReview: 0, pending: 0 };
  const emptyCostSummary = {
    totalUsd: 0,
    todayUsd: 0,
    byLocaleToday: [] as Array<{ locale: string; costUsd: number }>,
    daily: [] as Array<{ date: string; costUsd: number }>,
  };
  const empty: TranslationsDataPayload = {
    rows: [],
    coverageRows: [],
    coverageLocales: [],
    total: 0,
    kpis: fallbackKpis,
    costSummary: emptyCostSummary,
    driftCount: 0,
    filters,
    error: null,
  };

  // Validate query shape — same source of truth as the API route.
  const parsed = TranslationsListQuerySchema.safeParse({
    websiteId,
    sourceLocale: filters.sourceLocale || undefined,
    targetLocale: filters.targetLocale || undefined,
    pageType: filters.pageType || undefined,
    status: filters.status || undefined,
    search: filters.search || undefined,
    limit: 250,
    offset: 0,
  });

  if (!parsed.success) {
    return { ...empty, error: 'Invalid filter values for translations.' };
  }

  try {
    await requireWebsiteAccess(websiteId);
  } catch {
    return { ...empty, error: 'No tienes acceso a este website.' };
  }

  const admin = createSupabaseServiceRoleClient();
  let coverageLocales: string[] = [];
  try {
    const { data: websiteLocales } = await admin
      .from('websites')
      .select('supported_locales,default_locale')
      .eq('id', websiteId)
      .single();

    const normalized = normalizeWebsiteLocales({
      defaultLocale:
        typeof websiteLocales?.default_locale === 'string'
          ? websiteLocales.default_locale
          : undefined,
      supportedLocales: Array.isArray(websiteLocales?.supported_locales)
        ? websiteLocales.supported_locales
        : undefined,
    });
    coverageLocales = normalized.supportedLocales;
  } catch {
    coverageLocales = [];
  }

  try {
    let query = admin
      .from('seo_transcreation_jobs')
      .select(
        'id,website_id,page_type,page_id,source_locale,target_locale,status,source_keyword,target_keyword,payload_v2,created_at,updated_at',
      )
      .eq('website_id', websiteId)
      .order('updated_at', { ascending: false })
      .limit(250);

    if (parsed.data.sourceLocale) query = query.eq('source_locale', parsed.data.sourceLocale);
    if (parsed.data.targetLocale) query = query.eq('target_locale', parsed.data.targetLocale);
    if (parsed.data.pageType) query = query.eq('page_type', parsed.data.pageType);
    if (parsed.data.status) query = query.eq('status', parsed.data.status);

    if (parsed.data.search) {
      const needle = parsed.data.search.replace(/[%_,]/g, '');
      if (needle) {
        query = query.or(
          `source_keyword.ilike.%${needle}%,target_keyword.ilike.%${needle}%`,
        );
      }
    }

    const { data: jobsData, error: jobsError } = await query;
    if (jobsError) {
      return { ...empty, error: 'No se pudieron cargar las traducciones.' };
    }

    const jobs = (jobsData ?? []) as Array<{
      id: string;
      website_id: string;
      page_type: string;
      page_id: string | null;
      source_locale: string;
      target_locale: string;
      status: string;
      source_keyword: string | null;
      target_keyword: string | null;
      payload_v2: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
    }>;

    // Drift lookup — use localized_variants where a published variant exists but
    // its last_job_id has been superseded by a newer draft (proxy heuristic).
    const driftPageIdSet = new Set<string>();
    if (jobs.length > 0) {
      const pageIds = Array.from(new Set(jobs.map((job) => job.page_id).filter(Boolean))) as string[];
      if (pageIds.length > 0) {
        const { data: variants } = await admin
          .from('seo_localized_variants')
          .select('source_entity_id,status,updated_at')
          .eq('website_id', websiteId)
          .in('source_entity_id', pageIds)
          .in('status', ['applied', 'published']);

        const now = Date.now();
        const STALE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
        for (const variant of (variants ?? []) as Array<{
          source_entity_id: string;
          updated_at: string;
        }>) {
          const updatedAt = new Date(variant.updated_at).getTime();
          if (Number.isFinite(updatedAt) && now - updatedAt > STALE_MS) {
            driftPageIdSet.add(variant.source_entity_id);
          }
        }
      }
    }

    // QA findings count per job (best-effort — falls back to 0 on error).
    const qaCountByPageId = new Map<string, number>();
    if (jobs.length > 0) {
      const pageIds = Array.from(new Set(jobs.map((job) => job.page_id).filter(Boolean))) as string[];
      if (pageIds.length > 0) {
        const { data: findings } = await admin
          .from('seo_translation_qa_findings')
          .select('page_id,resolved')
          .eq('website_id', websiteId)
          .eq('resolved', false)
          .in('page_id', pageIds);

        for (const finding of (findings ?? []) as Array<{ page_id: string }>) {
          qaCountByPageId.set(finding.page_id, (qaCountByPageId.get(finding.page_id) ?? 0) + 1);
        }
      }
    }

    // Turn DB rows into the canonical JobItem shape and wrap with UI metadata.
    const rows: TranslationRowVM[] = jobs.map((row) => {
      const job: TranslationJobItem = {
        id: String(row.id),
        websiteId: String(row.website_id),
        pageType: row.page_type as TranslationJobItem['pageType'],
        pageId: row.page_id ? String(row.page_id) : null,
        sourceLocale: String(row.source_locale),
        targetLocale: String(row.target_locale),
        status: row.status as TranslationJobItem['status'],
        sourceKeyword: row.source_keyword ? String(row.source_keyword) : null,
        targetKeyword: row.target_keyword ? String(row.target_keyword) : null,
        createdAt: new Date(String(row.created_at)).toISOString(),
        updatedAt: new Date(String(row.updated_at)).toISOString(),
      };

      const pageIdKey = job.pageId ?? '';
      return {
        job,
        payloadV2:
          row.payload_v2 && typeof row.payload_v2 === 'object' && !Array.isArray(row.payload_v2)
            ? row.payload_v2
            : null,
        qaFindingCount: pageIdKey ? qaCountByPageId.get(pageIdKey) ?? 0 : 0,
        drift: pageIdKey ? driftPageIdSet.has(pageIdKey) : false,
      };
    });

    const coverageGroup = new Map<
      string,
      {
        pageType: TranslationRowVM['job']['pageType'];
        pageId: string;
        sourceLocale: string;
        sourceKeyword: string | null;
        targetKeyword: string | null;
        updatedAt: string;
        byLocale: Map<string, TranslationRowVM['job']>;
      }
    >();

    for (const row of rows) {
      if (!row.job.pageId) continue;
      const key = `${row.job.pageType}:${row.job.pageId}`;
      const existing = coverageGroup.get(key);
      if (!existing) {
        coverageGroup.set(key, {
          pageType: row.job.pageType,
          pageId: row.job.pageId,
          sourceLocale: row.job.sourceLocale,
          sourceKeyword: row.job.sourceKeyword,
          targetKeyword: row.job.targetKeyword,
          updatedAt: row.job.updatedAt,
          byLocale: new Map([[row.job.targetLocale, row.job]]),
        });
        continue;
      }

      const current = existing.byLocale.get(row.job.targetLocale);
      if (
        !current ||
        new Date(row.job.updatedAt).getTime() > new Date(current.updatedAt).getTime()
      ) {
        existing.byLocale.set(row.job.targetLocale, row.job);
      }

      if (new Date(row.job.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        existing.updatedAt = row.job.updatedAt;
      }

      if (!existing.sourceKeyword && row.job.sourceKeyword) {
        existing.sourceKeyword = row.job.sourceKeyword;
      }
      if (!existing.targetKeyword && row.job.targetKeyword) {
        existing.targetKeyword = row.job.targetKeyword;
      }
    }

    const fallbackLocaleSet = new Set<string>(coverageLocales);
    for (const row of rows) {
      fallbackLocaleSet.add(row.job.sourceLocale);
      fallbackLocaleSet.add(row.job.targetLocale);
    }
    const effectiveCoverageLocales = Array.from(fallbackLocaleSet);

    const coverageRows: TranslationCoverageRowVM[] = Array.from(coverageGroup.entries())
      .map(([key, group]) => {
        const cells = effectiveCoverageLocales.map((locale) => {
          if (locale === group.sourceLocale) {
            return {
              targetLocale: locale,
              status: 'source' as const,
              jobId: null,
            };
          }

          const job = group.byLocale.get(locale);
          if (!job) {
            return {
              targetLocale: locale,
              status: 'missing' as const,
              jobId: null,
            };
          }

          const status =
            job.status === 'applied' || job.status === 'published'
              ? ('translated' as const)
              : ('in_progress' as const);

          return {
            targetLocale: locale,
            status,
            jobId: job.id,
          };
        });

        return {
          key,
          pageType: group.pageType,
          pageId: group.pageId,
          sourceLocale: group.sourceLocale,
          sourceKeyword: group.sourceKeyword ?? null,
          targetKeyword: group.targetKeyword ?? null,
          updatedAt: group.updatedAt,
          cells,
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const filteredRows = filters.drift ? rows.filter((row) => row.drift) : rows;

    const kpis = {
      total: filteredRows.length,
      translated: filteredRows.filter(
        (row) => row.job.status === 'applied' || row.job.status === 'published',
      ).length,
      inDraft: filteredRows.filter((row) => row.job.status === 'draft').length,
      inReview: filteredRows.filter((row) => row.job.status === 'reviewed').length,
      pending: 0, // Set below.
    };
    // "Pending" = page ids targeted by filters that have NO open job at all.
    // Without the source content inventory at this level, we approximate
    // pending as jobs in draft without any reviewed/applied sibling.
    kpis.pending = filteredRows.filter(
      (row) => row.job.status === 'draft' && row.qaFindingCount === 0,
    ).length;

    const costSince = new Date();
    costSince.setUTCDate(costSince.getUTCDate() - 30);
    const { data: costRows } = await admin
      .from('ai_cost_events')
      .select('cost_usd,created_at,metadata')
      .eq('website_id', websiteId)
      .eq('feature', 'seo-transcreate')
      .gte('created_at', costSince.toISOString())
      .order('created_at', { ascending: false })
      .limit(5000);

    const nowIsoDay = new Date().toISOString().slice(0, 10);
    const dailyMap = new Map<string, number>();
    const localeTodayMap = new Map<string, number>();
    let totalUsd = 0;
    let todayUsd = 0;

    for (const row of (costRows ?? []) as Array<{
      cost_usd: number | string | null;
      created_at: string;
      metadata: Record<string, unknown> | null;
    }>) {
      const parsedCost = Number(row.cost_usd ?? 0);
      if (!Number.isFinite(parsedCost) || parsedCost <= 0) continue;

      const day = typeof row.created_at === 'string'
        ? row.created_at.slice(0, 10)
        : nowIsoDay;

      totalUsd += parsedCost;
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + parsedCost);

      if (day === nowIsoDay) {
        todayUsd += parsedCost;
        const localeRaw = row.metadata?.target_locale;
        const locale = typeof localeRaw === 'string' && localeRaw.trim().length > 0
          ? localeRaw
          : 'unknown';
        localeTodayMap.set(locale, (localeTodayMap.get(locale) ?? 0) + parsedCost);
      }
    }

    const round = (value: number) => Number(value.toFixed(4));
    const costSummary = {
      totalUsd: round(totalUsd),
      todayUsd: round(todayUsd),
      byLocaleToday: Array.from(localeTodayMap.entries())
        .map(([locale, costUsd]) => ({ locale, costUsd: round(costUsd) }))
        .sort((a, b) => b.costUsd - a.costUsd),
      daily: Array.from(dailyMap.entries())
        .map(([date, costUsd]) => ({ date, costUsd: round(costUsd) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };

    return {
      rows: filteredRows,
      coverageRows,
      coverageLocales: effectiveCoverageLocales,
      total: filteredRows.length,
      kpis,
      costSummary,
      driftCount: rows.filter((row) => row.drift).length,
      filters,
      error: null,
    };
  } catch {
    return { ...empty, error: 'Error inesperado al leer las traducciones.' };
  }
}

export default async function TranslationsPage({
  params,
  searchParams,
}: TranslationsPageProps) {
  const { websiteId } = await params;
  const resolvedSearch = await searchParams;
  const filters = normalizeFilters(resolvedSearch);

  const payload = await loadTranslations(websiteId, filters);

  return (
    <StudioPage className="max-w-6xl">
      <StudioSectionHeader
        title="Traducciones"
        subtitle="Flujo de transcreación multi-locale: traducidos, borradores, revisión y pendientes."
      />
      {payload.error ? (
        <div className="studio-panel mb-4 border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-3 text-sm rounded-lg">
          {payload.error}
        </div>
      ) : null}
      <TranslationsDashboard
        websiteId={websiteId}
        rows={payload.rows}
        coverageRows={payload.coverageRows}
        coverageLocales={payload.coverageLocales}
        kpis={payload.kpis}
        costSummary={payload.costSummary}
        driftCount={payload.driftCount}
        filters={payload.filters}
      />
    </StudioPage>
  );
}
