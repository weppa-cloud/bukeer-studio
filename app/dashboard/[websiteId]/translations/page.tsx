import { TranslationsListQuerySchema } from '@bukeer/website-contract';
import type { TranslationJobItem } from '@bukeer/website-contract';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { StudioPage, StudioSectionHeader } from '@/components/studio/ui/primitives';
import { TranslationsDashboard } from '@/components/admin/translations-dashboard';
import type {
  TranslationRowVM,
  TranslationsFilterValues,
} from '@/components/admin/translations-dashboard';

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
  total: number;
  kpis: {
    total: number;
    translated: number;
    inDraft: number;
    inReview: number;
    pending: number;
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
  const empty: TranslationsDataPayload = {
    rows: [],
    total: 0,
    kpis: fallbackKpis,
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

  try {
    let query = admin
      .from('seo_transcreation_jobs')
      .select(
        'id,website_id,page_type,page_id,source_locale,target_locale,status,source_keyword,target_keyword,created_at,updated_at',
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
        qaFindingCount: pageIdKey ? qaCountByPageId.get(pageIdKey) ?? 0 : 0,
        drift: pageIdKey ? driftPageIdSet.has(pageIdKey) : false,
      };
    });

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

    return {
      rows: filteredRows,
      total: filteredRows.length,
      kpis,
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
        kpis={payload.kpis}
        driftCount={payload.driftCount}
        filters={payload.filters}
      />
    </StudioPage>
  );
}
