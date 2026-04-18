import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiUnauthorized, apiForbidden, apiInternalError } from '@/lib/api';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { ContentHealthListSchema } from '@bukeer/website-contract';

const log = createLogger('api.content.health.website');

export async function GET(request: NextRequest, context: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await context.params;

  const auth = await getEditorAuth(request);
  if (!auth) return apiUnauthorized();
  if (!hasEditorRole(auth)) return apiForbidden();

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 100);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);
  const minScore = url.searchParams.get('min_score');
  const maxScore = url.searchParams.get('max_score');

  try {
    const supabase = createSupabaseServiceRoleClient();

    const { data: website } = await supabase
      .from('websites')
      .select('id, account_id')
      .eq('id', websiteId)
      .eq('account_id', auth.accountId)
      .maybeSingle();

    if (!website) return apiInternalError('Website not found or access denied');

    const { data, error } = await supabase.rpc('list_products_content_health', {
      p_website_id: websiteId,
      p_limit: limit,
      p_offset: offset,
      p_min_score: minScore ? Number(minScore) : null,
      p_max_score: maxScore ? Number(maxScore) : null,
    });

    if (error) {
      log.error('rpc_failed', { website_id: websiteId, error: error.message });
      return apiInternalError('Failed to list content health');
    }

    const parsed = ContentHealthListSchema.safeParse(data);
    if (!parsed.success) {
      log.error('rpc_shape_invalid', { website_id: websiteId, issues: parsed.error.issues });
      return apiInternalError('Content health list shape invalid');
    }

    return apiSuccess(parsed.data);
  } catch (err) {
    log.error('unhandled', { website_id: websiteId, error: err instanceof Error ? err.message : String(err) });
    return apiInternalError('Failed to fetch content health list');
  }
}
