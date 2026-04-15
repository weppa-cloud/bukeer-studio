import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { SeoApiError } from '@/lib/seo/errors';
import { apiError, apiSuccess } from '@/lib/api/response';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';

const itemTypeSchema = z.enum(['hotel', 'activity', 'package', 'destination', 'blog', 'page']);

const querySchema = z.object({
  websiteId: z.string().uuid(),
  itemType: itemTypeSchema,
  itemId: z.string().uuid(),
  locale: z.string().min(1).default('es-CO'),
});

const bodySchema = z.object({
  websiteId: z.string().uuid(),
  itemType: itemTypeSchema,
  itemId: z.string().uuid(),
  url: z.string().min(1).max(2048),
  locale: z.string().min(1).default('es-CO'),
  position: z.coerce.number().positive(),
  timestamp: z.string().datetime().optional(),
});

interface BaselineRow {
  website_id: string;
  item_type: z.infer<typeof itemTypeSchema>;
  item_id: string;
  url: string;
  locale: string;
  position: number | string;
  recorded_at: string;
}

function mapBaseline(row: BaselineRow | null) {
  if (!row) return null;
  return {
    websiteId: row.website_id,
    itemType: row.item_type,
    itemId: row.item_id,
    url: row.url,
    locale: row.locale,
    position: Number(row.position),
    recordedAt: row.recorded_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      websiteId: params.get('websiteId'),
      itemType: params.get('itemType'),
      itemId: params.get('itemId'),
      locale: params.get('locale') ?? 'es-CO',
    });

    if (!parsed.success) {
      throw new SeoApiError('VALIDATION_ERROR', 'Invalid query parameters', 400, parsed.error.flatten());
    }

    const { websiteId, itemType, itemId, locale } = parsed.data;
    await requireWebsiteAccess(websiteId);

    const adminClient = createSupabaseServiceRoleClient();
    const { data, error } = await adminClient
      .from('seo_workflow_baselines')
      .select('website_id, item_type, item_id, url, locale, position, recorded_at')
      .eq('website_id', websiteId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .eq('locale', locale)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle<BaselineRow>();

    if (error) {
      throw new SeoApiError('VALIDATION_ERROR', 'Failed to load baseline', 400, error.message);
    }

    return withNoStoreHeaders(apiSuccess({ baseline: mapBaseline(data ?? null) }));
  } catch (error) {
    if (error instanceof SeoApiError) {
      return withNoStoreHeaders(apiError(error.code, error.message, error.status, error.details));
    }
    return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Internal server error', 500));
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new SeoApiError('VALIDATION_ERROR', 'Invalid payload', 400, parsed.error.flatten());
    }

    const { websiteId, itemType, itemId, url, locale, position, timestamp } = parsed.data;
    await requireWebsiteAccess(websiteId);

    const adminClient = createSupabaseServiceRoleClient();
    const recordedAt = timestamp ?? new Date().toISOString();
    const { data, error } = await adminClient
      .from('seo_workflow_baselines')
      .insert({
        website_id: websiteId,
        item_type: itemType,
        item_id: itemId,
        url,
        locale,
        position,
        recorded_at: recordedAt,
      })
      .select('website_id, item_type, item_id, url, locale, position, recorded_at')
      .single<BaselineRow>();

    if (error || !data) {
      throw new SeoApiError('VALIDATION_ERROR', 'Failed to save baseline', 400, error?.message);
    }

    return withNoStoreHeaders(apiSuccess({ baseline: mapBaseline(data) }));
  } catch (error) {
    if (error instanceof SeoApiError) {
      return withNoStoreHeaders(apiError(error.code, error.message, error.status, error.details));
    }
    return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Internal server error', 500));
  }
}
