import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, apiValidationError, apiInternalError } from '@/lib/api';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { AiFlagsUpdateRequestSchema } from '@bukeer/website-contract';

const log = createLogger('api.products.ai-flags');

const FIELD_TO_COLUMN: Record<string, string> = {
  description: 'description_ai_generated',
  highlights: 'highlights_ai_generated',
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const auth = await getEditorAuth(request);
  if (!auth) return apiUnauthorized();
  if (!hasEditorRole(auth)) return apiForbidden();

  const raw = await request.json().catch(() => null);
  if (!raw) {
    return apiValidationError({ issues: [{ path: [], message: 'Invalid JSON body', code: 'custom' }] } as never);
  }

  const parsed = AiFlagsUpdateRequestSchema.safeParse(raw);
  if (!parsed.success) return apiValidationError(parsed.error);

  const { field, locked } = parsed.data;
  const column = FIELD_TO_COLUMN[field];
  if (!column) {
    return apiValidationError({
      issues: [{ path: ['field'], message: `Unknown AI field: ${field}`, code: 'custom' }],
    } as never);
  }

  try {
    const supabase = createSupabaseServiceRoleClient();

    const { data: product } = await supabase
      .from('package_kits')
      .select('id, account_id')
      .eq('id', id)
      .eq('account_id', auth.accountId)
      .maybeSingle();

    if (!product) return apiNotFound();

    // "locked" means operator took control → ai_generated = false (AI won't regenerate)
    // "unlocked" means AI can regenerate → ai_generated = true
    const aiGeneratedValue = !locked;

    const { error } = await supabase
      .from('package_kits')
      .update({ [column]: aiGeneratedValue })
      .eq('id', id)
      .eq('account_id', auth.accountId);

    if (error) {
      log.error('ai_flag_update_failed', { product_id: id, field, error: error.message });
      return apiInternalError('Failed to update AI flag');
    }

    log.info('ai_flag_updated', { product_id: id, user_id: auth.userId, field, locked });

    return apiSuccess({ id, field, locked });
  } catch (err) {
    log.error('unhandled', { product_id: id, field, error: err instanceof Error ? err.message : String(err) });
    return apiInternalError('Failed to update AI flag');
  }
}
