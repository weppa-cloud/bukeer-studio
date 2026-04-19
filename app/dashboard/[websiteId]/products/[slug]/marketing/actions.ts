'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { getDashboardUserContext } from '@/lib/admin/user-context';
import { resolveStudioEditorV2Flag, isStudioFieldEnabled } from '@/lib/features/studio-editor-v2';
import { createLogger } from '@/lib/logger';
import {
  MarketingFieldPatchSchema,
  type MarketingFieldPatch,
  type MarketingFieldName,
} from '@bukeer/website-contract';
import type { ProductEditorType } from '@/lib/admin/product-resolver';
import { publicPathPrefix } from '@/lib/admin/product-resolver';

const log = createLogger('actions.marketing-field');

const EDITOR_ROLES = new Set(['super_admin', 'admin', 'agent']);

const FIELD_TO_COLUMN: Record<MarketingFieldName, string> = {
  description: 'description',
  program_highlights: 'program_highlights',
  program_inclusions: 'program_inclusions',
  program_exclusions: 'program_exclusions',
  program_notes: 'program_notes',
  program_meeting_info: 'program_meeting_info',
  program_gallery: 'program_gallery',
  social_image: 'cover_image_url',
  cover_image_url: 'cover_image_url',
};

const AI_FLAG_COLUMN: Partial<Record<MarketingFieldName, string>> = {
  description: 'description_ai_generated',
  program_highlights: 'highlights_ai_generated',
};

interface AuthorizedContext {
  accountId: string;
  userId: string;
  role: string;
}

async function authorize(websiteId: string): Promise<AuthorizedContext> {
  const supabase = await createSupabaseServerClient();
  const ctx = await getDashboardUserContext(supabase);

  if (ctx.status !== 'authenticated') throw new Error('UNAUTHORIZED');
  if (!EDITOR_ROLES.has(ctx.role)) throw new Error('FORBIDDEN');

  const { data: website } = await supabase
    .from('websites')
    .select('id, account_id')
    .eq('id', websiteId)
    .eq('account_id', ctx.accountId)
    .maybeSingle<{ id: string; account_id: string }>();

  if (!website) throw new Error('NOT_FOUND');

  return { accountId: ctx.accountId, userId: ctx.userId, role: ctx.role };
}

/**
 * Generalized tenancy check — replaces the prior `ensurePackageTenancy` helper.
 * Returns the row's public slug (for revalidatePath) by querying the product
 * table matching `productType`.
 */
async function ensureTenancy(
  productType: ProductEditorType,
  productId: string,
  accountId: string,
): Promise<{ slug: string; id: string }> {
  const supabase = createSupabaseServiceRoleClient();
  const table = productType === 'package' ? 'package_kits' : 'activities';
  const { data } = await supabase
    .from(table)
    .select('id, slug')
    .eq('id', productId)
    .eq('account_id', accountId)
    .maybeSingle<{ id: string; slug: string | null }>();

  if (!data || !data.slug) throw new Error('NOT_FOUND');
  return { id: data.id, slug: data.slug };
}

async function ensureFieldIsStudioOwned(
  websiteId: string,
  accountId: string,
  field: MarketingFieldName,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const resolution = await resolveStudioEditorV2Flag(supabase, accountId, websiteId);

  if (!isStudioFieldEnabled(resolution, field)) {
    log.warn('field_not_studio_owned', {
      account_id: accountId,
      website_id: websiteId,
      field,
      resolution_scope: resolution.scope,
    });
    throw new Error('FIELD_NOT_STUDIO_OWNED');
  }
}

function rpcNameFor(productType: ProductEditorType): string {
  return productType === 'package'
    ? 'update_package_kit_marketing_field'
    : 'update_activity_marketing_field';
}

export async function saveMarketingField(input: {
  websiteId: string;
  productId: string;
  productType: ProductEditorType;
  patch: MarketingFieldPatch;
}): Promise<void> {
  const parsed = MarketingFieldPatchSchema.safeParse(input.patch);
  if (!parsed.success) {
    log.warn('validation_failed', { issues: parsed.error.issues });
    throw new Error('VALIDATION_ERROR');
  }

  const auth = await authorize(input.websiteId);
  const { slug } = await ensureTenancy(input.productType, input.productId, auth.accountId);
  await ensureFieldIsStudioOwned(input.websiteId, auth.accountId, parsed.data.field);

  const column = FIELD_TO_COLUMN[parsed.data.field];
  const aiFlagColumn = AI_FLAG_COLUMN[parsed.data.field] ?? null;

  const supabase = createSupabaseServiceRoleClient();

  // Single-transaction RPC per product type: sets app.edit_surface='studio'
  // (audit trigger reads this) + performs UPDATE + resets AI flag when
  // applicable — all atomic.
  const { error } = await supabase.rpc(rpcNameFor(input.productType), {
    p_product_id: input.productId,
    p_account_id: auth.accountId,
    p_column: column,
    p_value: parsed.data.value as unknown as object,
    p_ai_flag_column: aiFlagColumn,
  });

  if (error) {
    log.error('marketing_update_failed', {
      website_id: input.websiteId,
      product_id: input.productId,
      product_type: input.productType,
      field: parsed.data.field,
      error: error.message,
    });
    throw new Error('PERSIST_FAILED');
  }

  log.info('marketing_field_saved', {
    website_id: input.websiteId,
    product_id: input.productId,
    product_type: input.productType,
    user_id: auth.userId,
    field: parsed.data.field,
  });

  revalidatePath(`${publicPathPrefix(input.productType)}/${slug}`);
}
