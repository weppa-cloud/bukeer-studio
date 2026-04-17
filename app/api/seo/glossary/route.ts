import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { SeoApiError } from '@/lib/seo/errors';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const LocaleSchema = z.string().min(2).max(16);

const GlossaryListQuerySchema = z.object({
  websiteId: z.string().uuid(),
  locale: LocaleSchema.optional(),
  isBrand: z.coerce.boolean().optional(),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  offset: z.coerce.number().int().min(0).default(0),
});

const GlossaryCreateSchema = z.object({
  websiteId: z.string().uuid(),
  locale: LocaleSchema,
  term: z.string().min(1).max(500),
  translation: z.string().min(1).max(1000),
  notes: z.string().max(2000).nullable().optional(),
  // Accepted forward-compat flags (not persisted until migration adds columns)
  isBrand: z.boolean().optional(),
  isDestinationName: z.boolean().optional(),
  caseSensitive: z.boolean().optional(),
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

// ---------------------------------------------------------------------------
// GET — list glossary terms with filters
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const parsed = GlossaryListQuerySchema.safeParse({
    websiteId: request.nextUrl.searchParams.get('websiteId'),
    locale: request.nextUrl.searchParams.get('locale') ?? undefined,
    isBrand: request.nextUrl.searchParams.get('isBrand') ?? undefined,
    search: request.nextUrl.searchParams.get('search') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    offset: request.nextUrl.searchParams.get('offset') ?? undefined,
  });

  if (!parsed.success) {
    logCall({
      route: '/api/seo/glossary',
      method: 'GET',
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'VALIDATION_ERROR',
    });
    return withNoStoreHeaders(apiValidationError(parsed.error));
  }

  try {
    await requireWebsiteAccess(parsed.data.websiteId);
    const admin = createSupabaseServiceRoleClient();

    let query = admin
      .from('seo_translation_glossary')
      .select('id,website_id,locale,term,translation,notes,source,fetched_at,confidence,created_at,updated_at')
      .eq('website_id', parsed.data.websiteId)
      .order('term', { ascending: true })
      .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);

    if (parsed.data.locale) query = query.eq('locale', parsed.data.locale);
    if (parsed.data.search) query = query.ilike('term', `%${parsed.data.search}%`);

    const { data, error } = await query;
    if (error) {
      logCall({
        route: '/api/seo/glossary',
        method: 'GET',
        websiteId: parsed.data.websiteId,
        durationMs: Date.now() - startedAt,
        success: false,
        code: 'INTERNAL_ERROR',
      });
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read glossary', 500, error.message));
    }

    const rows = (data ?? []).map((row) => mapGlossaryRow(row as GlossaryDbRow));

    logCall({
      route: '/api/seo/glossary',
      method: 'GET',
      websiteId: parsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: true,
    });

    return withNoStoreHeaders(
      apiSuccess({ websiteId: parsed.data.websiteId, total: rows.length, rows }),
    );
  } catch (error) {
    logCall({
      route: '/api/seo/glossary',
      method: 'GET',
      websiteId: parsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: false,
      code: error instanceof SeoApiError ? error.code : 'INTERNAL_ERROR',
    });
    return mapSeoError(error);
  }
}

// ---------------------------------------------------------------------------
// POST — create glossary term
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const bodyRaw = await request.json().catch(() => null);
  const parsed = GlossaryCreateSchema.safeParse(bodyRaw);

  if (!parsed.success) {
    logCall({
      route: '/api/seo/glossary',
      method: 'POST',
      durationMs: Date.now() - startedAt,
      success: false,
      code: 'VALIDATION_ERROR',
    });
    return withNoStoreHeaders(apiValidationError(parsed.error));
  }

  try {
    const access = await requireWebsiteAccess(parsed.data.websiteId);
    const admin = createSupabaseServiceRoleClient();

    const payload = {
      website_id: parsed.data.websiteId,
      locale: parsed.data.locale,
      term: parsed.data.term,
      translation: parsed.data.translation,
      notes: parsed.data.notes ?? null,
      source: 'manual',
      fetched_at: new Date().toISOString(),
      created_by: access.userId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from('seo_translation_glossary')
      .insert(payload)
      .select('id,website_id,locale,term,translation,notes,source,fetched_at,confidence,created_at,updated_at')
      .single();

    if (error || !data) {
      if (isUniqueViolation(error)) {
        logCall({
          route: '/api/seo/glossary',
          method: 'POST',
          websiteId: parsed.data.websiteId,
          durationMs: Date.now() - startedAt,
          success: false,
          code: 'GLOSSARY_DUPLICATE_TERM',
        });
        return withNoStoreHeaders(
          apiError(
            'GLOSSARY_DUPLICATE_TERM',
            'A glossary entry with the same term and locale already exists for this website',
            409,
            { term: parsed.data.term, locale: parsed.data.locale },
          ),
        );
      }

      logCall({
        route: '/api/seo/glossary',
        method: 'POST',
        websiteId: parsed.data.websiteId,
        durationMs: Date.now() - startedAt,
        success: false,
        code: 'INTERNAL_ERROR',
      });
      return withNoStoreHeaders(
        apiError('INTERNAL_ERROR', 'Unable to create glossary entry', 500, error?.message),
      );
    }

    logCall({
      route: '/api/seo/glossary',
      method: 'POST',
      websiteId: parsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: true,
    });

    return withNoStoreHeaders(apiSuccess({ row: mapGlossaryRow(data as GlossaryDbRow) }, 201));
  } catch (error) {
    logCall({
      route: '/api/seo/glossary',
      method: 'POST',
      websiteId: parsed.data.websiteId,
      durationMs: Date.now() - startedAt,
      success: false,
      code: error instanceof SeoApiError ? error.code : 'INTERNAL_ERROR',
    });
    return mapSeoError(error);
  }
}
