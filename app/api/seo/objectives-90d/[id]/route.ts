import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Objective90dSchema } from '@bukeer/website-contract';
import { apiError, apiNotFound, apiSuccess, apiValidationError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { SeoApiError } from '@/lib/seo/errors';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UuidSchema = z.string().uuid();
const ObjectiveStatusSchema = z.enum(['active', 'completed', 'paused']);

const ObjectivePatchSchema = z
  .object({
    quarter: z.string().min(2).max(16).optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(4000).nullable().optional(),
    kpis: z.array(z.record(z.string(), z.unknown())).optional(),
    status: ObjectiveStatusSchema.optional(),
    startsOn: z.string().date().nullable().optional(),
    endsOn: z.string().date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
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
    apiError('INTERNAL_ERROR', 'Unable to process objective request', 500, error instanceof Error ? error.message : String(error)),
  );
}

async function loadWebsiteId(id: string): Promise<string | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('seo_website_objectives_90d')
    .select('website_id')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data.website_id as string;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const idParsed = UuidSchema.safeParse(params.id);
  if (!idParsed.success) {
    return withNoStoreHeaders(apiValidationError(idParsed.error));
  }

  const bodyRaw = await request.json().catch(() => null);
  const bodyParsed = ObjectivePatchSchema.safeParse(bodyRaw);
  if (!bodyParsed.success) {
    return withNoStoreHeaders(apiValidationError(bodyParsed.error));
  }

  try {
    const websiteId = await loadWebsiteId(idParsed.data);
    if (!websiteId) {
      return withNoStoreHeaders(apiNotFound('Objective not found'));
    }

    await requireWebsiteAccess(websiteId);
    const admin = createSupabaseServiceRoleClient();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (bodyParsed.data.quarter !== undefined) payload.quarter = bodyParsed.data.quarter;
    if (bodyParsed.data.title !== undefined) payload.title = bodyParsed.data.title;
    if (bodyParsed.data.description !== undefined) payload.description = bodyParsed.data.description;
    if (bodyParsed.data.kpis !== undefined) payload.kpis = bodyParsed.data.kpis;
    if (bodyParsed.data.status !== undefined) payload.status = bodyParsed.data.status;
    if (bodyParsed.data.startsOn !== undefined) payload.starts_on = bodyParsed.data.startsOn;
    if (bodyParsed.data.endsOn !== undefined) payload.ends_on = bodyParsed.data.endsOn;

    const { data, error } = await admin
      .from('seo_website_objectives_90d')
      .update(payload)
      .eq('id', idParsed.data)
      .select('id,website_id,quarter,title,description,kpis,status,starts_on,ends_on,created_at,updated_at')
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        return withNoStoreHeaders(apiError('DUPLICATE_OBJECTIVE', 'Objective already exists for this quarter/title', 409));
      }
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to update objective', 500, error?.message));
    }

    return withNoStoreHeaders(apiSuccess({ row: mapObjectiveRow(data as ObjectiveDbRow) }));
  } catch (error) {
    return mapSeoError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const idParsed = UuidSchema.safeParse(params.id);
  if (!idParsed.success) {
    return withNoStoreHeaders(apiValidationError(idParsed.error));
  }

  try {
    const websiteId = await loadWebsiteId(idParsed.data);
    if (!websiteId) {
      return withNoStoreHeaders(apiNotFound('Objective not found'));
    }

    await requireWebsiteAccess(websiteId);
    const admin = createSupabaseServiceRoleClient();

    const { error } = await admin
      .from('seo_website_objectives_90d')
      .delete()
      .eq('id', idParsed.data);

    if (error) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to delete objective', 500, error.message));
    }

    return withNoStoreHeaders(apiSuccess({ id: idParsed.data }));
  } catch (error) {
    return mapSeoError(error);
  }
}
