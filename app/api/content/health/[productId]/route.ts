import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiUnauthorized, apiForbidden, apiInternalError, apiNotFound } from '@/lib/api';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { ContentHealthSchema } from '@bukeer/website-contract';

const log = createLogger('api.content.health');

export async function GET(_request: NextRequest, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;

  const auth = await getEditorAuth(_request);
  if (!auth) return apiUnauthorized();
  if (!hasEditorRole(auth)) return apiForbidden();

  try {
    const supabase = createSupabaseServiceRoleClient();

    const { data: product } = await supabase
      .from('products')
      .select('id, account_id')
      .eq('id', productId)
      .eq('account_id', auth.accountId)
      .maybeSingle();

    if (!product) return apiNotFound();

    const { data: health, error } = await supabase.rpc('get_product_content_health', {
      p_product_id: productId,
    });

    if (error) {
      log.error('rpc_failed', { product_id: productId, error: error.message });
      return apiInternalError('Failed to compute content health');
    }

    const parsed = ContentHealthSchema.safeParse(health);
    if (!parsed.success) {
      log.error('rpc_shape_invalid', { product_id: productId, issues: parsed.error.issues });
      return apiInternalError('Content health response shape invalid');
    }

    return apiSuccess(parsed.data);
  } catch (err) {
    log.error('unhandled', { product_id: productId, error: err instanceof Error ? err.message : String(err) });
    return apiInternalError('Failed to fetch content health');
  }
}
