import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiNotFound, apiSuccess, apiValidationError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { SeoApiError } from '@/lib/seo/errors';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const UuidSchema = z.string().uuid();
const LocaleSchema = z.string().min(2).max(16);

const GlossaryPatchSchema = z
  .object({
    locale: LocaleSchema.optional(),
    term: z.string().min(1).max(500).optional(),
    translation: z.string().min(1).max(1000).optional(),
    notes: z.string().max(2000).nullable().optional(),
    // Forward-compat flags — accepted but not persisted until migration adds columns
    isBrand: z.boolean().optional(),
    isDestinationName: z.boolean().optional(),
    caseSensitive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type GlossaryDbRow = {
  id: string;
  website_id: string;
  locale: string;
  term: string;
  translation: string;
  notes: string | null;
  source: string | null;
  fetched_at: string | null;
  confidence: string | null;
  created_at: string;
  updated_at: string;
};

function mapGlossaryRow(row: GlossaryDbRow) {
  return {
    id: row.id,
    websiteId: row.website_id,
    locale: row.locale,
    term: row.term,
    translation: row.translation,
    notes: row.notes,
    source: row.source,
    fetchedAt: row.fetched_at,
    confidence: row.confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSeoError(error: unknown): Response {
  if (error instanceof SeoApiError) {
    return withNoStoreHeaders(apiError(error.code, error.message, error.status, error.details));
  }
  return withNoStoreHeaders(
    apiError(
      'INTERNAL_ERROR',
      'Unable to process glossary request',
      500,
      error instanceof Error ? error.message : String(error),
    ),
  );
}

function logCall(entry: {
  route: string;
  method: string;
  websiteId?: string;
  durationMs: number;
  success: boolean;
  code?: string;
}) {
  try {
    process.stderr.write(`${JSON.stringify(entry)}\n`);
  } catch {
    // ignore stderr failures
  }
}

function isUniqueViolation(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '23505') return true;
  const msg = (error.message ?? '').toLowerCase();
  return msg.includes('duplicate key') || msg.includes('unique constraint');
}

async function loadWebsiteId(id: string): Promise<string | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('seo_translation_glossary')
    .select('website_id')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data.website_id as string;
}

// ---------------------------------------------------------------------------
// PATCH — partial update
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();
  const { id } = await params;

  const idParsed = UuidSchema.safeParse(id);
  if (!idParsed.success) {
    logCall({
      route: '/api/seo/glossary/[id]',
      method: 'PATCH',
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'VALIDATION_ERROR',
    });
    return withNoStoreHeaders(apiValidationError(idParsed.error));
  }

  const bodyRaw = await request.json().catch(() => null);
  const bodyParsed = GlossaryPatchSchema.safeParse(bodyRaw);
  if (!bodyParsed.success) {
    logCall({
      route: '/api/seo/glossary/[id]',
      method: 'PATCH',
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'VALIDATION_ERROR',
    });
    return withNoStoreHeaders(apiValidationError(bodyParsed.error));
  }

  try {
    const websiteId = await loadWebsiteId(idParsed.data);
    if (!websiteId) {
      logCall({
        route: '/api/seo/glossary/[id]',
        method: 'PATCH',
        durationMs: Date.now() - startedAt,
        success: false,
        code: 'NOT_FOUND',
      });
      return withNoStoreHeaders(apiNotFound('Glossary entry not found'));
    }

    await requireWebsiteAccess(websiteId);
    const admin = createSupabaseServiceRoleClient();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (bodyParsed.data.locale !== undefined) payload.locale = bodyParsed.data.locale;
    if (bodyParsed.data.term !== undefined) payload.term = bodyParsed.data.term;
    if (bodyParsed.data.translation !== undefined) payload.translation = bodyParsed.data.translation;
    if (bodyParsed.data.notes !== undefined) payload.notes = bodyParsed.data.notes;

    const { data, error } = await admin
      .from('seo_translation_glossary')
      .update(payload)
      .eq('id', idParsed.data)
      .select('id,website_id,locale,term,translation,notes,source,fetched_at,confidence,created_at,updated_at')
      .single();

    if (error || !data) {
      if (isUniqueViolation(error)) {
        logCall({
          route: '/api/seo/glossary/[id]',
          method: 'PATCH',
          websiteId,
          durationMs: Date.now() - startedAt,
          success: false,
          code: 'GLOSSARY_DUPLICATE_TERM',
        });
        return withNoStoreHeaders(
          apiError(
            'GLOSSARY_DUPLICATE_TERM',
            'A glossary entry with the same term and locale already exists for this website',
            409,
            { id: idParsed.data },
          ),
        );
      }

      logCall({
        route: '/api/seo/glossary/[id]',
        method: 'PATCH',
        websiteId,
        durationMs: Date.now() - startedAt,
        success: false,
        code: 'INTERNAL_ERROR',
      });
      return withNoStoreHeaders(
        apiError('INTERNAL_ERROR', 'Unable to update glossary entry', 500, error?.message),
      );
    }

    logCall({
      route: '/api/seo/glossary/[id]',
      method: 'PATCH',
      websiteId,
      durationMs: Date.now() - startedAt,
      success: true,
    });

    return withNoStoreHeaders(apiSuccess({ row: mapGlossaryRow(data as GlossaryDbRow) }));
  } catch (error) {
    logCall({
      route: '/api/seo/glossary/[id]',
      method: 'PATCH',
      durationMs: Date.now() - startedAt,
      success: false,
      code: error instanceof SeoApiError ? error.code : 'INTERNAL_ERROR',
    });
    return mapSeoError(error);
  }
}

// ---------------------------------------------------------------------------
// DELETE — remove by id
// ---------------------------------------------------------------------------

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();
  const { id } = await params;

  const idParsed = UuidSchema.safeParse(id);
  if (!idParsed.success) {
    logCall({
      route: '/api/seo/glossary/[id]',
      method: 'DELETE',
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'VALIDATION_ERROR',
    });
    return withNoStoreHeaders(apiValidationError(idParsed.error));
  }

  try {
    const websiteId = await loadWebsiteId(idParsed.data);
    if (!websiteId) {
      logCall({
        route: '/api/seo/glossary/[id]',
        method: 'DELETE',
        durationMs: Date.now() - startedAt,
        success: false,
        code: 'NOT_FOUND',
      });
      return withNoStoreHeaders(apiNotFound('Glossary entry not found'));
    }

    await requireWebsiteAccess(websiteId);
    const admin = createSupabaseServiceRoleClient();

    const { error } = await admin
      .from('seo_translation_glossary')
      .delete()
      .eq('id', idParsed.data);

    if (error) {
      logCall({
        route: '/api/seo/glossary/[id]',
        method: 'DELETE',
        websiteId,
        durationMs: Date.now() - startedAt,
        success: false,
        code: 'INTERNAL_ERROR',
      });
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to delete glossary entry', 500, error.message));
    }

    logCall({
      route: '/api/seo/glossary/[id]',
      method: 'DELETE',
      websiteId,
      durationMs: Date.now() - startedAt,
      success: true,
    });

    return withNoStoreHeaders(apiSuccess({ deletedId: idParsed.data }));
  } catch (error) {
    logCall({
      route: '/api/seo/glossary/[id]',
      method: 'DELETE',
      durationMs: Date.now() - startedAt,
      success: false,
      code: error instanceof SeoApiError ? error.code : 'INTERNAL_ERROR',
    });
    return mapSeoError(error);
  }
}
