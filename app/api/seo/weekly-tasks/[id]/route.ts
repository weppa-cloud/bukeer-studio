import { NextRequest } from 'next/server';
import { z } from 'zod';
import { WeeklyTaskSchema } from '@bukeer/website-contract';
import { apiError, apiNotFound, apiSuccess, apiValidationError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { SeoApiError } from '@/lib/seo/errors';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UuidSchema = z.string().uuid();
const TaskTypeSchema = z.enum(['striking_distance', 'low_ctr', 'drift', 'cannibalization', 'custom']);
const PrioritySchema = z.enum(['P1', 'P2', 'P3']);
const StatusSchema = z.enum(['todo', 'in_progress', 'done', 'skipped']);

const WeeklyTaskPatchSchema = z
  .object({
    weekOf: z.string().date().optional(),
    taskType: TaskTypeSchema.optional(),
    priority: PrioritySchema.optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(4000).nullable().optional(),
    sourceData: z.record(z.string(), z.unknown()).optional(),
    relatedEntityType: z.string().max(64).nullable().optional(),
    relatedEntityId: z.string().uuid().nullable().optional(),
    assigneeUserId: z.string().uuid().nullable().optional(),
    status: StatusSchema.optional(),
    dueAt: z.string().datetime().nullable().optional(),
    completedAt: z.string().datetime().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
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

function startOfIsoWeek(input: string): string {
  const base = new Date(`${input}T00:00:00.000Z`);
  const utcDate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const weekday = utcDate.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  utcDate.setUTCDate(utcDate.getUTCDate() + diff);
  return utcDate.toISOString().slice(0, 10);
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
    apiError('INTERNAL_ERROR', 'Unable to process weekly task request', 500, error instanceof Error ? error.message : String(error)),
  );
}

async function loadWebsiteId(id: string): Promise<string | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('seo_weekly_tasks')
    .select('website_id')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data.website_id as string;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idParsed = UuidSchema.safeParse(id);
  if (!idParsed.success) {
    return withNoStoreHeaders(apiValidationError(idParsed.error));
  }

  const bodyRaw = await request.json().catch(() => null);
  const bodyParsed = WeeklyTaskPatchSchema.safeParse(bodyRaw);
  if (!bodyParsed.success) {
    return withNoStoreHeaders(apiValidationError(bodyParsed.error));
  }

  try {
    const websiteId = await loadWebsiteId(idParsed.data);
    if (!websiteId) {
      return withNoStoreHeaders(apiNotFound('Weekly task not found'));
    }

    await requireWebsiteAccess(websiteId);
    const admin = createSupabaseServiceRoleClient();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (bodyParsed.data.weekOf !== undefined) payload.week_of = startOfIsoWeek(bodyParsed.data.weekOf);
    if (bodyParsed.data.taskType !== undefined) payload.task_type = bodyParsed.data.taskType;
    if (bodyParsed.data.priority !== undefined) payload.priority = bodyParsed.data.priority;
    if (bodyParsed.data.title !== undefined) payload.title = bodyParsed.data.title;
    if (bodyParsed.data.description !== undefined) payload.description = bodyParsed.data.description;
    if (bodyParsed.data.sourceData !== undefined) payload.source_data = bodyParsed.data.sourceData;
    if (bodyParsed.data.relatedEntityType !== undefined) payload.related_entity_type = bodyParsed.data.relatedEntityType;
    if (bodyParsed.data.relatedEntityId !== undefined) payload.related_entity_id = bodyParsed.data.relatedEntityId;
    if (bodyParsed.data.assigneeUserId !== undefined) payload.assignee_user_id = bodyParsed.data.assigneeUserId;
    if (bodyParsed.data.dueAt !== undefined) payload.due_at = bodyParsed.data.dueAt;

    if (bodyParsed.data.status !== undefined) {
      payload.status = bodyParsed.data.status;
      if (bodyParsed.data.completedAt !== undefined) {
        payload.completed_at = bodyParsed.data.completedAt;
      } else {
        payload.completed_at = bodyParsed.data.status === 'done' ? new Date().toISOString() : null;
      }
    } else if (bodyParsed.data.completedAt !== undefined) {
      payload.completed_at = bodyParsed.data.completedAt;
    }

    const { data, error } = await admin
      .from('seo_weekly_tasks')
      .update(payload)
      .eq('id', idParsed.data)
      .select('id,website_id,week_of,task_type,priority,title,description,source_data,related_entity_type,related_entity_id,assignee_user_id,status,due_at,completed_at,created_at,updated_at')
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        return withNoStoreHeaders(apiError('DUPLICATE_TASK', 'Task already exists for this week/entity tuple', 409));
      }
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to update weekly task', 500, error?.message));
    }

    return withNoStoreHeaders(apiSuccess({ row: mapWeeklyTaskRow(data as WeeklyTaskDbRow) }));
  } catch (error) {
    return mapSeoError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idParsed = UuidSchema.safeParse(id);
  if (!idParsed.success) {
    return withNoStoreHeaders(apiValidationError(idParsed.error));
  }

  try {
    const websiteId = await loadWebsiteId(idParsed.data);
    if (!websiteId) {
      return withNoStoreHeaders(apiNotFound('Weekly task not found'));
    }

    await requireWebsiteAccess(websiteId);
    const admin = createSupabaseServiceRoleClient();

    const { error } = await admin
      .from('seo_weekly_tasks')
      .delete()
      .eq('id', idParsed.data);

    if (error) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to delete weekly task', 500, error.message));
    }

    return withNoStoreHeaders(apiSuccess({ id: idParsed.data }));
  } catch (error) {
    return mapSeoError(error);
  }
}
