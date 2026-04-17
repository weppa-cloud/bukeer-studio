import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Objective90dSchema } from '@bukeer/website-contract';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { SeoApiError } from '@/lib/seo/errors';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ObjectiveStatusSchema = z.enum(['active', 'completed', 'paused']);

const ObjectivesQuerySchema = z.object({
  websiteId: z.string().uuid(),
  quarter: z.string().min(2).max(16).optional(),
  status: ObjectiveStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const ObjectiveWriteSchema = z.object({
  quarter: z.string().min(2).max(16),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullable().optional(),
  kpis: z.array(z.record(z.string(), z.unknown())).default([]),
  status: ObjectiveStatusSchema.default('active'),
  startsOn: z.string().date().nullable().optional(),
  endsOn: z.string().date().nullable().optional(),
});

const ObjectivesCreateSchema = z.object({
  websiteId: z.string().uuid(),
  rows: z.array(ObjectiveWriteSchema).min(1).max(50),
  upsert: z.coerce.boolean().default(false),
});

type ObjectiveDbRow = {
  id: string;
  website_id: string;
  quarter: string;
  title: string;
  description: string | null;
  kpis: Array<Record<string, unknown>> | null;
  status: 'active' | 'completed' | 'paused';
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
  updated_at: string;
};

function mapObjectiveRow(row: ObjectiveDbRow) {
  return Objective90dSchema.parse({
    id: row.id,
    websiteId: row.website_id,
    quarter: row.quarter,
    title: row.title,
    description: row.description,
    kpis: row.kpis ?? [],
    status: row.status,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapSeoError(error: unknown): Response {
  if (error instanceof SeoApiError) {
    return withNoStoreHeaders(apiError(error.code, error.message, error.status, error.details));
  }

  return withNoStoreHeaders(
    apiError('INTERNAL_ERROR', 'Unable to process objectives request', 500, error instanceof Error ? error.message : String(error)),
  );
}

export async function GET(request: NextRequest) {
  const parsed = ObjectivesQuerySchema.safeParse({
    websiteId: request.nextUrl.searchParams.get('websiteId'),
    quarter: request.nextUrl.searchParams.get('quarter') ?? undefined,
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
      .from('seo_website_objectives_90d')
      .select('id,website_id,quarter,title,description,kpis,status,starts_on,ends_on,created_at,updated_at')
      .eq('website_id', parsed.data.websiteId)
      .order('quarter', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(parsed.data.limit);

    if (parsed.data.quarter) {
      query = query.eq('quarter', parsed.data.quarter);
    }
    if (parsed.data.status) {
      query = query.eq('status', parsed.data.status);
    }

    const { data, error } = await query;
    if (error) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read objectives', 500, error.message));
    }

    const rows = (data ?? []).map((row) => mapObjectiveRow(row as ObjectiveDbRow));
    return withNoStoreHeaders(apiSuccess({ websiteId: parsed.data.websiteId, total: rows.length, rows }));
  } catch (error) {
    return mapSeoError(error);
  }
}

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const parsed = ObjectivesCreateSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return withNoStoreHeaders(apiValidationError(parsed.error));
  }

  try {
    const access = await requireWebsiteAccess(parsed.data.websiteId);
    const admin = createSupabaseServiceRoleClient();

    const payload = parsed.data.rows.map((row) => ({
      website_id: parsed.data.websiteId,
      quarter: row.quarter,
      title: row.title,
      description: row.description ?? null,
      kpis: row.kpis,
      status: row.status,
      starts_on: row.startsOn ?? null,
      ends_on: row.endsOn ?? null,
      created_by: access.userId,
      updated_at: new Date().toISOString(),
    }));

    const mutation = parsed.data.upsert
      ? admin
          .from('seo_website_objectives_90d')
          .upsert(payload, { onConflict: 'website_id,quarter,title' })
      : admin.from('seo_website_objectives_90d').insert(payload);

    const { data, error } = await mutation.select(
      'id,website_id,quarter,title,description,kpis,status,starts_on,ends_on,created_at,updated_at',
    );

    if (error) {
      if (error.code === '23505') {
        return withNoStoreHeaders(apiError('DUPLICATE_OBJECTIVE', 'Objective already exists for this quarter/title', 409));
      }
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to save objectives', 500, error.message));
    }

    const rows = (data ?? []).map((row) => mapObjectiveRow(row as ObjectiveDbRow));
    return withNoStoreHeaders(apiSuccess({ websiteId: parsed.data.websiteId, total: rows.length, rows }, 201));
  } catch (error) {
    return mapSeoError(error);
  }
}
