import { NextRequest } from 'next/server';
import { z } from 'zod';
import { OkrSchema } from '@bukeer/website-contract';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { SeoApiError } from '@/lib/seo/errors';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const OkrListQuerySchema = z.object({
  websiteId: z.string().uuid(),
  period: z.enum(['7d', '30d', '90d']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const OkrWriteSchema = z.object({
  period: z.enum(['7d', '30d', '90d']),
  kpiKey: z.string().min(1).max(120),
  target: z.coerce.number(),
  currentValue: z.coerce.number().nullable().optional(),
  currentSource: z.string().max(120).nullable().optional(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  notes: z.string().max(2000).nullable().optional(),
});

const OkrCreateSchema = z.object({
  websiteId: z.string().uuid(),
  rows: z.array(OkrWriteSchema).min(1).max(50),
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

export async function GET(request: NextRequest) {
  const parsed = OkrListQuerySchema.safeParse({
    websiteId: request.nextUrl.searchParams.get('websiteId'),
    period: request.nextUrl.searchParams.get('period') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return withNoStoreHeaders(apiValidationError(parsed.error));
  }

  try {
    await requireWebsiteAccess(parsed.data.websiteId);
    const admin = createSupabaseServiceRoleClient();

    let query = admin
      .from('seo_website_okrs')
      .select('id,website_id,period,kpi_key,target,current_value,current_source,period_start,period_end,notes,created_at,updated_at')
      .eq('website_id', parsed.data.websiteId)
      .order('period_start', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(parsed.data.limit);

    if (parsed.data.period) {
      query = query.eq('period', parsed.data.period);
    }

    const { data, error } = await query;
    if (error) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read OKRs', 500, error.message));
    }

    const rows = (data ?? []).map((row) => mapOkrRow(row as OkrDbRow));
    return withNoStoreHeaders(apiSuccess({ websiteId: parsed.data.websiteId, total: rows.length, rows }));
  } catch (error) {
    return mapSeoError(error);
  }
}

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const parsed = OkrCreateSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return withNoStoreHeaders(apiValidationError(parsed.error));
  }

  try {
    const access = await requireWebsiteAccess(parsed.data.websiteId);
    const admin = createSupabaseServiceRoleClient();

    const payload = parsed.data.rows.map((row) => ({
      website_id: parsed.data.websiteId,
      period: row.period,
      kpi_key: row.kpiKey,
      target: row.target,
      current_value: row.currentValue ?? null,
      current_source: row.currentSource ?? null,
      period_start: row.periodStart,
      period_end: row.periodEnd,
      notes: row.notes ?? null,
      created_by: access.userId,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await admin
      .from('seo_website_okrs')
      .upsert(payload, { onConflict: 'website_id,period,kpi_key,period_start,period_end' })
      .select('id,website_id,period,kpi_key,target,current_value,current_source,period_start,period_end,notes,created_at,updated_at');

    if (error) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to save OKRs', 500, error.message));
    }

    const rows = (data ?? []).map((row) => mapOkrRow(row as OkrDbRow));
    return withNoStoreHeaders(apiSuccess({ websiteId: parsed.data.websiteId, total: rows.length, rows }, 201));
  } catch (error) {
    return mapSeoError(error);
  }
}
