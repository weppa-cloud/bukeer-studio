import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createLogger } from '@/lib/logger';
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiValidationError,
  apiInternalError,
} from '@/lib/api';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { VideoUpdateRequestSchema } from '@bukeer/website-contract';

const log = createLogger('api.products.video');

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const auth = await getEditorAuth(request);
  if (!auth) return apiUnauthorized();
  if (!hasEditorRole(auth)) return apiForbidden();

  const raw = await request.json().catch(() => null);
  if (!raw) {
    return apiValidationError({ issues: [{ path: [], message: 'Invalid JSON body', code: 'custom' }] } as never);
  }

  const parsed = VideoUpdateRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  try {
    const supabase = createSupabaseServiceRoleClient();

    const { data: existing, error: selectError } = await supabase
      .from('products')
      .select('id, account_id, slug, type')
      .eq('id', id)
      .eq('account_id', auth.accountId)
      .maybeSingle();

    if (selectError) {
      log.error('video_update_select_failed', { product_id: id, error: selectError.message });
      return apiInternalError('Failed to verify product');
    }
    if (!existing) return apiNotFound();

    const { error: updateError } = await supabase
      .from('products')
      .update({
        video_url: parsed.data.video_url,
        video_caption: parsed.data.video_caption,
      })
      .eq('id', id)
      .eq('account_id', auth.accountId);

    if (updateError) {
      log.error('video_update_failed', { product_id: id, error: updateError.message });
      return apiInternalError('Failed to update product video');
    }

    log.info('video_url_updated', {
      product_id: id,
      user_id: auth.userId,
      has_url: Boolean(parsed.data.video_url),
    });

    const typeSlug = typeSlugFor(existing.type);
    if (typeSlug && existing.slug) {
      revalidatePath(`/${typeSlug}/${existing.slug}`);
    }

    return apiSuccess({ id, video_url: parsed.data.video_url, video_caption: parsed.data.video_caption });
  } catch (err) {
    log.error('video_update_unhandled', {
      product_id: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return apiInternalError('Failed to update product video');
  }
}

function typeSlugFor(productType: string): string | null {
  switch (productType) {
    case 'activity':
      return 'actividades';
    case 'hotel':
      return 'hoteles';
    case 'package':
      return 'paquetes';
    case 'transfer':
      return 'traslados';
    case 'destination':
      return 'destinos';
    default:
      return null;
  }
}
