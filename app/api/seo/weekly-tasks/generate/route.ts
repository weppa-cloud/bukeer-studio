import { NextRequest } from 'next/server';
import { z } from 'zod';
import { WeeklyTaskSchema } from '@bukeer/website-contract';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { SeoApiError } from '@/lib/seo/errors';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GenerateWeeklyTasksSchema = z.object({
  websiteId: z.string().uuid(),
  weekOf: z.string().date().optional(),
  maxPerSource: z.coerce.number().int().min(1).max(15).default(4),
});

type Priority = 'P1' | 'P2' | 'P3';
type TaskType = 'striking_distance' | 'low_ctr' | 'drift';

type TaskSeed = {
  week_of: string;
  task_type: TaskType;
  priority: Priority;
  title: string;
  description: string | null;
  source_data: Record<string, unknown>;
  related_entity_type: string | null;
  related_entity_id: string | null;
  due_at: string;
};

type WeeklyTaskDbRow = {
  id: string;
  website_id: string;
  week_of: string;
  task_type: 'striking_distance' | 'low_ctr' | 'drift' | 'cannibalization' | 'custom';
  priority: 'P1' | 'P2' | 'P3';
  title: string;
  description: string | null;
  source_data: Record<string, unknown> | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  assignee_user_id: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'skipped';
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type KeywordRow = {
  id: string;
  keyword: string;
  target_url: string | null;
  locale: string | null;
};

type SnapshotRow = {
  keyword_id: string;
  snapshot_date: string;
  position: number | null;
  search_volume: number | null;
};

type PageMetricRow = {
  metric_date: string;
  page_type: string;
  page_id: string;
  url: string;
  impressions: number | null;
  clicks: number | null;
  avg_position: number | null;
};

type DriftFindingRow = {
  id: string;
  page_type: string;
  page_id: string;
  public_url: string;
  decay_signal: 'high' | 'medium' | 'low' | 'none' | null;
  decay_delta_pct: number | null;
  priority_score: number | null;
  captured_at: string;
};

function startOfIsoWeek(input?: string | null): string {
  const base = input ? new Date(`${input}T00:00:00.000Z`) : new Date();
  const utcDate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const weekday = utcDate.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  utcDate.setUTCDate(utcDate.getUTCDate() + diff);
  return utcDate.toISOString().slice(0, 10);
}

function weekDueAtIso(weekOf: string): string {
  const base = new Date(`${weekOf}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + 6);
  base.setUTCHours(17, 0, 0, 0);
  return base.toISOString();
}

function mapWeeklyTaskRow(row: WeeklyTaskDbRow) {
  return WeeklyTaskSchema.parse({
    id: row.id,
    websiteId: row.website_id,
    weekOf: row.week_of,
    taskType: row.task_type,
    priority: row.priority,
    title: row.title,
    description: row.description,
    sourceData: row.source_data ?? {},
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    assigneeUserId: row.assignee_user_id,
    status: row.status,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapSeoError(error: unknown): Response {
  if (error instanceof SeoApiError) {
    return withNoStoreHeaders(apiError(error.code, error.message, error.status, error.details));
  }

  return withNoStoreHeaders(
    apiError('INTERNAL_ERROR', 'Unable to generate weekly tasks', 500, error instanceof Error ? error.message : String(error)),
  );
}

function normalizeUrlPath(value: string | null | undefined): string {
  if (!value) return '/';
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch {
    return value.startsWith('/') ? value : `/${value}`;
  }
}

function normalizeTaskKey(seed: TaskSeed): string {
  const ref = seed.related_entity_id ?? seed.title.trim().toLowerCase();
  return `${seed.task_type}:${ref}`;
}

function resolveStrikingPriority(position: number): Priority {
  if (position <= 10) return 'P1';
  if (position <= 15) return 'P2';
  return 'P3';
}

async function buildStrikingDistanceSeeds(input: {
  websiteId: string;
  weekOf: string;
  maxPerSource: number;
}): Promise<TaskSeed[]> {
  const admin = createSupabaseServiceRoleClient();
  const { data: keywords, error: keywordsError } = await admin
    .from('seo_keywords')
    .select('id,keyword,target_url,locale')
    .eq('website_id', input.websiteId)
    .order('created_at', { ascending: false })
    .limit(300);

  if (keywordsError || !keywords?.length) {
    return [];
  }

  const keywordRows = keywords as KeywordRow[];
  const keywordIds = keywordRows.map((row) => row.id);
  const snapshots: SnapshotRow[] = [];

  for (let cursor = 0; cursor < keywordIds.length; cursor += 100) {
    const batch = keywordIds.slice(cursor, cursor + 100);
    const { data: batchRows, error } = await admin
      .from('seo_keyword_snapshots')
      .select('keyword_id,snapshot_date,position,search_volume')
      .in('keyword_id', batch)
      .order('snapshot_date', { ascending: false });

    if (error) continue;
    snapshots.push(...((batchRows ?? []) as SnapshotRow[]));
  }

  const latestSnapshotByKeyword = new Map<string, SnapshotRow>();
  for (const row of snapshots) {
    if (!latestSnapshotByKeyword.has(row.keyword_id)) {
      latestSnapshotByKeyword.set(row.keyword_id, row);
    }
  }

  const seeds = keywordRows
    .map((keyword) => {
      const latest = latestSnapshotByKeyword.get(keyword.id);
      if (!latest) return null;
      const position = latest.position ?? null;
      const volume = latest.search_volume ?? 0;
      if (position == null || position < 8 || position > 20) return null;
      if (volume < 100) return null;

      const url = normalizeUrlPath(keyword.target_url ?? null);
      const priority = resolveStrikingPriority(position);
      return {
        week_of: input.weekOf,
        task_type: 'striking_distance' as const,
        priority,
        title: `Subir \"${keyword.keyword}\" a top 10`,
        description: `URL ${url} · posición ${position} · volumen ${volume}`,
        source_data: {
          source: 'striking_distance',
          keywordId: keyword.id,
          keyword: keyword.keyword,
          locale: keyword.locale,
          position,
          searchVolume: volume,
          url,
          snapshotDate: latest.snapshot_date,
        },
        related_entity_type: 'seo_keyword',
        related_entity_id: keyword.id,
        due_at: weekDueAtIso(input.weekOf),
      } satisfies TaskSeed;
    })
    .filter((row): row is TaskSeed => Boolean(row))
    .sort((a, b) => {
      const priorityOrder: Record<Priority, number> = { P1: 0, P2: 1, P3: 2 };
      if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
      const aVolume = Number(a.source_data.searchVolume ?? 0);
      const bVolume = Number(b.source_data.searchVolume ?? 0);
      return bVolume - aVolume;
    })
    .slice(0, input.maxPerSource);

  return seeds;
}

async function buildLowCtrSeeds(input: {
  websiteId: string;
  weekOf: string;
  maxPerSource: number;
}): Promise<TaskSeed[]> {
  const admin = createSupabaseServiceRoleClient();
  const until = new Date();
  const from = new Date(until);
  from.setUTCDate(until.getUTCDate() - 28);

  const { data, error } = await admin
    .from('seo_page_metrics_daily')
    .select('metric_date,page_type,page_id,url,impressions,clicks,avg_position')
    .eq('website_id', input.websiteId)
    .gte('metric_date', from.toISOString().slice(0, 10))
    .lte('metric_date', until.toISOString().slice(0, 10))
    .order('metric_date', { ascending: false })
    .limit(4000);

  if (error || !data?.length) {
    return [];
  }

  const grouped = new Map<string, {
    pageType: string;
    pageId: string;
    url: string;
    impressions: number;
    clicks: number;
    avgPositionWeighted: number;
    samples: number;
    latestDate: string;
  }>();

  for (const row of data as PageMetricRow[]) {
    const key = `${row.page_type}:${row.page_id}`;
    const bucket = grouped.get(key) ?? {
      pageType: row.page_type,
      pageId: row.page_id,
      url: row.url,
      impressions: 0,
      clicks: 0,
      avgPositionWeighted: 0,
      samples: 0,
      latestDate: row.metric_date,
    };

    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);
    const avgPosition = Number(row.avg_position ?? 0);

    bucket.impressions += impressions;
    bucket.clicks += clicks;
    bucket.avgPositionWeighted += avgPosition > 0 ? avgPosition * Math.max(impressions, 1) : 0;
    bucket.samples += Math.max(impressions, 1);
    if (row.metric_date > bucket.latestDate) {
      bucket.latestDate = row.metric_date;
    }

    grouped.set(key, bucket);
  }

  const seeds = Array.from(grouped.values())
    .map((group) => {
      if (group.impressions < 600) return null;
      const ctr = group.impressions > 0 ? group.clicks / group.impressions : 0;
      if (ctr >= 0.02) return null;
      const avgPosition = group.samples > 0 ? group.avgPositionWeighted / group.samples : null;
      if (avgPosition != null && avgPosition > 25) return null;

      const priority: Priority = ctr < 0.01 && group.impressions >= 2000 ? 'P1' : 'P2';
      return {
        week_of: input.weekOf,
        task_type: 'low_ctr' as const,
        priority,
        title: `Mejorar CTR de ${group.url}`,
        description: `Impresiones 28d ${group.impressions} · CTR ${(ctr * 100).toFixed(2)}%`,
        source_data: {
          source: 'low_ctr',
          url: group.url,
          pageType: group.pageType,
          pageId: group.pageId,
          impressions28d: group.impressions,
          clicks28d: group.clicks,
          ctr28d: Number(ctr.toFixed(6)),
          avgPosition28d: avgPosition == null ? null : Number(avgPosition.toFixed(2)),
          latestMetricDate: group.latestDate,
        },
        related_entity_type: group.pageType,
        related_entity_id: group.pageId,
        due_at: weekDueAtIso(input.weekOf),
      } satisfies TaskSeed;
    })
    .filter((row): row is TaskSeed => Boolean(row))
    .sort((a, b) => {
      const aImpressions = Number(a.source_data.impressions28d ?? 0);
      const bImpressions = Number(b.source_data.impressions28d ?? 0);
      return bImpressions - aImpressions;
    })
    .slice(0, input.maxPerSource);

  return seeds;
}

async function buildDriftSeeds(input: {
  websiteId: string;
  weekOf: string;
  maxPerSource: number;
}): Promise<TaskSeed[]> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('seo_audit_findings')
    .select('id,page_type,page_id,public_url,decay_signal,decay_delta_pct,priority_score,captured_at')
    .eq('website_id', input.websiteId)
    .in('decay_signal', ['high', 'medium'])
    .order('priority_score', { ascending: false })
    .order('captured_at', { ascending: false })
    .limit(80);

  if (error || !data?.length) {
    return [];
  }

  const byPage = new Map<string, DriftFindingRow>();
  for (const row of data as DriftFindingRow[]) {
    const key = `${row.page_type}:${row.page_id}`;
    if (!byPage.has(key)) {
      byPage.set(key, row);
    }
  }

  const seeds = Array.from(byPage.values())
    .map((finding) => {
      const decaySignal = finding.decay_signal ?? 'medium';
      const priority: Priority = decaySignal === 'high' ? 'P1' : 'P2';
      const delta = Number(finding.decay_delta_pct ?? 0);
      return {
        week_of: input.weekOf,
        task_type: 'drift' as const,
        priority,
        title: `Recuperar tráfico en ${normalizeUrlPath(finding.public_url)}`,
        description: `Señal ${decaySignal} · delta 90d ${delta.toFixed(2)}%`,
        source_data: {
          source: 'drift',
          findingId: finding.id,
          pageType: finding.page_type,
          pageId: finding.page_id,
          publicUrl: finding.public_url,
          decaySignal,
          decayDeltaPct: delta,
          priorityScore: Number(finding.priority_score ?? 0),
          capturedAt: finding.captured_at,
        },
        related_entity_type: finding.page_type,
        related_entity_id: finding.page_id,
        due_at: weekDueAtIso(input.weekOf),
      } satisfies TaskSeed;
    })
    .slice(0, input.maxPerSource);

  return seeds;
}

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const parsed = GenerateWeeklyTasksSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return withNoStoreHeaders(apiValidationError(parsed.error));
  }

  try {
    const access = await requireWebsiteAccess(parsed.data.websiteId);
    const admin = createSupabaseServiceRoleClient();

    const weekOf = startOfIsoWeek(parsed.data.weekOf);

    const [strikingSeeds, lowCtrSeeds, driftSeeds] = await Promise.all([
      buildStrikingDistanceSeeds({
        websiteId: parsed.data.websiteId,
        weekOf,
        maxPerSource: parsed.data.maxPerSource,
      }),
      buildLowCtrSeeds({
        websiteId: parsed.data.websiteId,
        weekOf,
        maxPerSource: parsed.data.maxPerSource,
      }),
      buildDriftSeeds({
        websiteId: parsed.data.websiteId,
        weekOf,
        maxPerSource: parsed.data.maxPerSource,
      }),
    ]);

    const desiredSeeds = [...strikingSeeds, ...lowCtrSeeds, ...driftSeeds];

    const { data: existingRows } = await admin
      .from('seo_weekly_tasks')
      .select('id,task_type,related_entity_id,title')
      .eq('website_id', parsed.data.websiteId)
      .eq('week_of', weekOf)
      .in('task_type', ['striking_distance', 'low_ctr', 'drift']);

    const existingKeys = new Set(
      (existingRows ?? []).map((row) => {
        const relatedEntityId = (row.related_entity_id as string | null) ?? null;
        const title = (row.title as string | null) ?? '';
        const fallback = title.trim().toLowerCase();
        return `${row.task_type as string}:${relatedEntityId ?? fallback}`;
      }),
    );

    const toInsert = desiredSeeds.filter((seed) => !existingKeys.has(normalizeTaskKey(seed)));

    const insertedRows: WeeklyTaskDbRow[] = [];
    let skippedExisting = desiredSeeds.length - toInsert.length;
    const failed: Array<{ title: string; message: string }> = [];

    for (const seed of toInsert) {
      const { data, error } = await admin
        .from('seo_weekly_tasks')
        .insert({
          website_id: parsed.data.websiteId,
          week_of: seed.week_of,
          task_type: seed.task_type,
          priority: seed.priority,
          title: seed.title,
          description: seed.description,
          source_data: seed.source_data,
          related_entity_type: seed.related_entity_type,
          related_entity_id: seed.related_entity_id,
          status: 'todo',
          due_at: seed.due_at,
          created_by: access.userId,
          updated_at: new Date().toISOString(),
        })
        .select('id,website_id,week_of,task_type,priority,title,description,source_data,related_entity_type,related_entity_id,assignee_user_id,status,due_at,completed_at,created_at,updated_at')
        .single();

      if (error || !data) {
        if (error?.code === '23505') {
          skippedExisting += 1;
          continue;
        }
        failed.push({ title: seed.title, message: error?.message ?? 'unknown error' });
        continue;
      }

      insertedRows.push(data as WeeklyTaskDbRow);
    }

    const rows = insertedRows.map((row) => mapWeeklyTaskRow(row));

    return withNoStoreHeaders(
      apiSuccess({
        websiteId: parsed.data.websiteId,
        weekOf,
        created: rows.length,
        skippedExisting,
        failed,
        sources: {
          strikingDistance: strikingSeeds.length,
          lowCtr: lowCtrSeeds.length,
          drift: driftSeeds.length,
          cannibalization: 0,
        },
        rows,
      }),
    );
  } catch (error) {
    return mapSeoError(error);
  }
}
