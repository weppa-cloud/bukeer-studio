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

const TaskTypeSchema = z.enum(['striking_distance', 'low_ctr', 'drift', 'cannibalization', 'custom']);
const PrioritySchema = z.enum(['P1', 'P2', 'P3']);
const StatusSchema = z.enum(['todo', 'in_progress', 'done', 'skipped']);

const WeeklyTasksQuerySchema = z.object({
  websiteId: z.string().uuid(),
  weekOf: z.string().date().optional(),
  taskType: TaskTypeSchema.optional(),
  status: StatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(300).default(100),
});

const WeeklyTaskCreateSchema = z.object({
  websiteId: z.string().uuid(),
  weekOf: z.string().date().optional(),
  taskType: TaskTypeSchema,
  priority: PrioritySchema.default('P2'),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullable().optional(),
  sourceData: z.record(z.string(), z.unknown()).default({}),
  relatedEntityType: z.string().max(64).nullable().optional(),
  relatedEntityId: z.string().uuid().nullable().optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  status: StatusSchema.default('todo'),
  dueAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

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

function startOfIsoWeek(input?: string | null): string {
  const base = input ? new Date(`${input}T00:00:00.000Z`) : new Date();
  const utcDate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const weekday = utcDate.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  utcDate.setUTCDate(utcDate.getUTCDate() + diff);
  return utcDate.toISOString().slice(0, 10);
}

function toIsoDateTime(value: string | null): string | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : value;
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
    dueAt: toIsoDateTime(row.due_at),
    completedAt: toIsoDateTime(row.completed_at),
    createdAt: toIsoDateTime(row.created_at) ?? row.created_at,
    updatedAt: toIsoDateTime(row.updated_at) ?? row.updated_at,
  });
}

function mapSeoError(error: unknown): Response {
  if (error instanceof SeoApiError) {
    return withNoStoreHeaders(apiError(error.code, error.message, error.status, error.details));
  }

  return withNoStoreHeaders(
    apiError('INTERNAL_ERROR', 'Unable to process weekly task request', 500, error instanceof Error ? error.message : String(error)),
  );
}

export async function GET(request: NextRequest) {
  const parsed = WeeklyTasksQuerySchema.safeParse({
    websiteId: request.nextUrl.searchParams.get('websiteId'),
    weekOf: request.nextUrl.searchParams.get('weekOf') ?? undefined,
    taskType: request.nextUrl.searchParams.get('taskType') ?? undefined,
    status: request.nextUrl.searchParams.get('status') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return withNoStoreHeaders(apiValidationError(parsed.error));
  }

  try {
    await requireWebsiteAccess(parsed.data.websiteId);
    const admin = createSupabaseServiceRoleClient();

    let query = admin
      .from('seo_weekly_tasks')
      .select('id,website_id,week_of,task_type,priority,title,description,source_data,related_entity_type,related_entity_id,assignee_user_id,status,due_at,completed_at,created_at,updated_at')
      .eq('website_id', parsed.data.websiteId)
      .order('week_of', { ascending: false })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(parsed.data.limit);

    if (parsed.data.weekOf) {
      query = query.eq('week_of', startOfIsoWeek(parsed.data.weekOf));
    }
    if (parsed.data.taskType) {
      query = query.eq('task_type', parsed.data.taskType);
    }
    if (parsed.data.status) {
      query = query.eq('status', parsed.data.status);
    }

    const { data, error } = await query;
    if (error) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read weekly tasks', 500, error.message));
    }

    const rows = (data ?? []).map((row) => mapWeeklyTaskRow(row as WeeklyTaskDbRow));
    return withNoStoreHeaders(apiSuccess({ websiteId: parsed.data.websiteId, total: rows.length, rows }));
  } catch (error) {
    return mapSeoError(error);
  }
}

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const parsed = WeeklyTaskCreateSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return withNoStoreHeaders(apiValidationError(parsed.error));
  }

  try {
    const access = await requireWebsiteAccess(parsed.data.websiteId);
    const admin = createSupabaseServiceRoleClient();

    const normalizedWeekOf = startOfIsoWeek(parsed.data.weekOf);
    const relatedEntityId =
      parsed.data.relatedEntityId ?? (parsed.data.taskType === 'custom' ? crypto.randomUUID() : null);
    const status = parsed.data.status;

    const { data, error } = await admin
      .from('seo_weekly_tasks')
      .insert({
        website_id: parsed.data.websiteId,
        week_of: normalizedWeekOf,
        task_type: parsed.data.taskType,
        priority: parsed.data.priority,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        source_data: parsed.data.sourceData,
        related_entity_type: parsed.data.relatedEntityType ?? null,
        related_entity_id: relatedEntityId,
        assignee_user_id: parsed.data.assigneeUserId ?? null,
        status,
        due_at: parsed.data.dueAt ?? null,
        completed_at:
          parsed.data.completedAt ?? (status === 'done' ? new Date().toISOString() : null),
        created_by: access.userId,
        updated_at: new Date().toISOString(),
      })
      .select('id,website_id,week_of,task_type,priority,title,description,source_data,related_entity_type,related_entity_id,assignee_user_id,status,due_at,completed_at,created_at,updated_at')
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        return withNoStoreHeaders(apiError('DUPLICATE_TASK', 'Task already exists for this week/entity tuple', 409));
      }
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to create weekly task', 500, error?.message));
    }

    return withNoStoreHeaders(apiSuccess({ row: mapWeeklyTaskRow(data as WeeklyTaskDbRow) }, 201));
  } catch (error) {
    return mapSeoError(error);
  }
}
