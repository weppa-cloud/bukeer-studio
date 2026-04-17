import { NextRequest } from 'next/server';
import { z } from 'zod';
import { OkrSchema } from '@bukeer/website-contract';
import { apiError, apiNotFound, apiSuccess, apiValidationError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { SeoApiError } from '@/lib/seo/errors';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UuidSchema = z.string().uuid();

const OkrPatchSchema = z
  .object({
    period: z.enum(['7d', '30d', '90d']).optional(),
    kpiKey: z.string().min(1).max(120).optional(),
    target: z.coerce.number().optional(),
    currentValue: z.coerce.number().nullable().optional(),
    currentSource: z.string().max(120).nullable().optional(),
    periodStart: z.string().date().optional(),
    periodEnd: z.string().date().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

type OkrDbRow = {
  id: string;
  website_id: string;
  period: '7d' | '30d' | '90d';
  kpi_key: string;
  target: number | string;
  current_value: number | string | null;
  current_source: string | null;
  period_start: string;
  period_end: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function mapOkrRow(row: OkrDbRow) {
  return OkrSchema.parse({
    id: row.id,
    websiteId: row.website_id,
    period: row.period,
    kpiKey: row.kpi_key,
    target: toNumber(row.target),
    currentValue: row.current_value == null ? null : toNumber(row.current_value),
    currentSource: row.current_source,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapSeoError(error: unknown): Response {
  if (error instanceof SeoApiError) {
    return withNoStoreHeaders(apiError(error.code, error.message, error.status, error.details));
  }

  return withNoStoreHeaders(
    apiError('INTERNAL_ERROR', 'Unable to process OKR request', 500, error instanceof Error ? error.message : String(error)),
  );
}

async function loadWebsiteId(id: string): Promise<string | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('seo_website_okrs')
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
  const bodyParsed = OkrPatchSchema.safeParse(bodyRaw);
  if (!bodyParsed.success) {
    return withNoStoreHeaders(apiValidationError(bodyParsed.error));
  }

  try {
    const websiteId = await loadWebsiteId(idParsed.data);
    if (!websiteId) {
      return withNoStoreHeaders(apiNotFound('OKR not found'));
    }

    await requireWebsiteAccess(websiteId);
    const admin = createSupabaseServiceRoleClient();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (bodyParsed.data.period !== undefined) payload.period = bodyParsed.data.period;
    if (bodyParsed.data.kpiKey !== undefined) payload.kpi_key = bodyParsed.data.kpiKey;
    if (bodyParsed.data.target !== undefined) payload.target = bodyParsed.data.target;
    if (bodyParsed.data.currentValue !== undefined) payload.current_value = bodyParsed.data.currentValue;
    if (bodyParsed.data.currentSource !== undefined) payload.current_source = bodyParsed.data.currentSource;
    if (bodyParsed.data.periodStart !== undefined) payload.period_start = bodyParsed.data.periodStart;
    if (bodyParsed.data.periodEnd !== undefined) payload.period_end = bodyParsed.data.periodEnd;
    if (bodyParsed.data.notes !== undefined) payload.notes = bodyParsed.data.notes;

    const { data, error } = await admin
      .from('seo_website_okrs')
      .update(payload)
      .eq('id', idParsed.data)
      .select('id,website_id,period,kpi_key,target,current_value,current_source,period_start,period_end,notes,created_at,updated_at')
      .single();

    if (error || !data) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to update OKR', 500, error?.message));
    }

    return withNoStoreHeaders(apiSuccess({ row: mapOkrRow(data as OkrDbRow) }));
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
      return withNoStoreHeaders(apiNotFound('OKR not found'));
    }

    await requireWebsiteAccess(websiteId);
    const admin = createSupabaseServiceRoleClient();

    const { error } = await admin
      .from('seo_website_okrs')
      .delete()
      .eq('id', idParsed.data);

    if (error) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to delete OKR', 500, error.message));
    }

    return withNoStoreHeaders(apiSuccess({ id: idParsed.data }));
  } catch (error) {
    return mapSeoError(error);
  }
}
