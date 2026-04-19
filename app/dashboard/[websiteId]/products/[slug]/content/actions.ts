'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { getDashboardUserContext } from '@/lib/admin/user-context';
import { createLogger } from '@/lib/logger';
import {
  CustomSectionsArraySchema,
  VideoUrlSchema,
  type CustomSection,
} from '@bukeer/website-contract';
import type { HeroOverrideValue } from '@/components/admin/page-customization/hero-override-editor';
import { z } from 'zod';
import type { ProductEditorType } from '@/lib/admin/product-resolver';
import { publicPathPrefix, pageProductTypeValue } from '@/lib/admin/product-resolver';

const log = createLogger('actions.product-page-customization');

const EDITOR_ROLES = new Set(['super_admin', 'admin', 'agent']);

const HeroOverrideSchema = z
  .object({
    title: z.string().max(120).nullable(),
    subtitle: z.string().max(200).nullable(),
    backgroundImage: z.string().url().nullable(),
  })
  .nullable();

const HiddenSectionsSchema = z.array(z.string().min(1).max(64)).max(50);
const SectionsOrderSchema = z.array(z.string().min(1).max(64)).max(50);

interface AuthorizedContext {
  accountId: string;
  userId: string;
  role: string;
}

async function authorize(websiteId: string): Promise<AuthorizedContext> {
  const supabase = await createSupabaseServerClient();
  const ctx = await getDashboardUserContext(supabase);

  if (ctx.status !== 'authenticated') {
    throw new Error('UNAUTHORIZED');
  }
  if (!EDITOR_ROLES.has(ctx.role)) {
    throw new Error('FORBIDDEN');
  }

  const { data: website } = await supabase
    .from('websites')
    .select('id, account_id')
    .eq('id', websiteId)
    .eq('account_id', ctx.accountId)
    .maybeSingle();

  if (!website) {
    throw new Error('NOT_FOUND');
  }

  return { accountId: ctx.accountId, userId: ctx.userId, role: ctx.role };
}

/**
 * Generalized product tenancy check — replaces `ensurePackageTenancy`.
 * Routes to `package_kits` or `activities` based on `productType`.
 */
async function ensureTenancy(
  productType: ProductEditorType,
  productId: string,
  accountId: string,
): Promise<{ slug: string }> {
  const supabase = createSupabaseServiceRoleClient();
  const table = productType === 'package' ? 'package_kits' : 'activities';
  const { data } = await supabase
    .from(table)
    .select('id, slug')
    .eq('id', productId)
    .eq('account_id', accountId)
    .maybeSingle<{ id: string; slug: string | null }>();
  if (!data || !data.slug) throw new Error('NOT_FOUND');
  return { slug: data.slug };
}

async function upsertPage(
  websiteId: string,
  productType: ProductEditorType,
  productId: string,
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();

  const { data: existing } = await supabase
    .from('website_product_pages')
    .select('id')
    .eq('website_id', websiteId)
    .eq('product_id', productId)
    .eq('product_type', pageProductTypeValue(productType))
    .maybeSingle<{ id: string }>();

  if (existing) {
    const { error } = await supabase
      .from('website_product_pages')
      .update({ ...patch, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) {
      log.error('update_failed', {
        website_id: websiteId,
        product_id: productId,
        product_type: productType,
        error: error.message,
      });
      throw new Error('PERSIST_FAILED');
    }
    return;
  }

  const { error } = await supabase.from('website_product_pages').insert({
    website_id: websiteId,
    product_id: productId,
    product_type: pageProductTypeValue(productType),
    custom_highlights: [],
    custom_faq: [],
    seo_highlights: [],
    seo_faq: [],
    source: 'studio',
    fetched_at: new Date().toISOString(),
    confidence: 'manual',
    created_by: userId,
    updated_by: userId,
    ...patch,
  });

  if (error) {
    log.error('insert_failed', {
      website_id: websiteId,
      product_id: productId,
      product_type: productType,
      error: error.message,
    });
    throw new Error('PERSIST_FAILED');
  }
}

export async function saveHeroOverride(input: {
  websiteId: string;
  productId: string;
  productType: ProductEditorType;
  value: HeroOverrideValue | null;
}): Promise<void> {
  const parsed = HeroOverrideSchema.safeParse(input.value);
  if (!parsed.success) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensureTenancy(input.productType, input.productId, auth.accountId);

  await upsertPage(input.websiteId, input.productType, input.productId, auth.userId, {
    custom_hero: parsed.data,
  });

  log.info('hero_override_saved', {
    website_id: input.websiteId,
    product_id: input.productId,
    product_type: input.productType,
    user_id: auth.userId,
    cleared: parsed.data === null,
  });

  revalidatePath(`${publicPathPrefix(input.productType)}/${slug}`);
}

export async function saveVisibility(input: {
  websiteId: string;
  productId: string;
  productType: ProductEditorType;
  hidden: string[];
}): Promise<void> {
  const parsed = HiddenSectionsSchema.safeParse(input.hidden);
  if (!parsed.success) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensureTenancy(input.productType, input.productId, auth.accountId);

  await upsertPage(input.websiteId, input.productType, input.productId, auth.userId, {
    hidden_sections: parsed.data,
  });

  log.info('visibility_saved', {
    website_id: input.websiteId,
    product_id: input.productId,
    product_type: input.productType,
    user_id: auth.userId,
    hidden_count: parsed.data.length,
  });

  revalidatePath(`${publicPathPrefix(input.productType)}/${slug}`);
}

export async function saveOrder(input: {
  websiteId: string;
  productId: string;
  productType: ProductEditorType;
  order: string[];
}): Promise<void> {
  const parsed = SectionsOrderSchema.safeParse(input.order);
  if (!parsed.success) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensureTenancy(input.productType, input.productId, auth.accountId);

  await upsertPage(input.websiteId, input.productType, input.productId, auth.userId, {
    sections_order: parsed.data,
  });

  log.info('order_saved', {
    website_id: input.websiteId,
    product_id: input.productId,
    product_type: input.productType,
    user_id: auth.userId,
    count: parsed.data.length,
  });

  revalidatePath(`${publicPathPrefix(input.productType)}/${slug}`);
}

const VideoActionInput = z.object({
  video_url: VideoUrlSchema.nullable(),
  video_caption: z.string().max(200).nullable(),
});

function rpcNameFor(productType: ProductEditorType): string {
  return productType === 'package'
    ? 'update_package_kit_marketing_field'
    : 'update_activity_marketing_field';
}

/**
 * W2 #216 AC-W2-6 — video URL + caption updates route through the single-tx
 * RPC (Option A) so `app.edit_surface='studio'` is set, the audit trigger
 * stamps `surface='studio'`, and `last_edited_by_surface='studio'` lands on
 * the row. The RPC accepts one column per call; we issue two calls in
 * sequence (both inside independent txs) — both must succeed or the UI treats
 * the save as failed.
 */
export async function saveVideoUrl(input: {
  websiteId: string;
  productId: string;
  productType: ProductEditorType;
  value: { video_url: string | null; video_caption: string | null };
}): Promise<void> {
  const parsed = VideoActionInput.safeParse(input.value);
  if (!parsed.success) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensureTenancy(input.productType, input.productId, auth.accountId);

  const supabase = createSupabaseServiceRoleClient();
  const rpc = rpcNameFor(input.productType);

  const { error: urlError } = await supabase.rpc(rpc, {
    p_product_id: input.productId,
    p_account_id: auth.accountId,
    p_column: 'video_url',
    p_value: parsed.data.video_url as unknown as object,
    p_ai_flag_column: null,
  });
  if (urlError) {
    log.error('video_url_update_failed', {
      product_id: input.productId,
      product_type: input.productType,
      error: urlError.message,
    });
    throw new Error('PERSIST_FAILED');
  }

  const { error: captionError } = await supabase.rpc(rpc, {
    p_product_id: input.productId,
    p_account_id: auth.accountId,
    p_column: 'video_caption',
    p_value: parsed.data.video_caption as unknown as object,
    p_ai_flag_column: null,
  });
  if (captionError) {
    log.error('video_caption_update_failed', {
      product_id: input.productId,
      product_type: input.productType,
      error: captionError.message,
    });
    throw new Error('PERSIST_FAILED');
  }

  log.info('video_url_updated', {
    website_id: input.websiteId,
    product_id: input.productId,
    product_type: input.productType,
    user_id: auth.userId,
    has_url: Boolean(parsed.data.video_url),
  });

  revalidatePath(`${publicPathPrefix(input.productType)}/${slug}`);
}

const AI_FLAG_COLUMNS: Record<string, string> = {
  description: 'description_ai_generated',
  highlights: 'highlights_ai_generated',
};

/**
 * W2 #216 AC-W2-6 — AI-flag toggle routes through the same RPC so the audit
 * trigger stamps `surface='studio'` + `last_edited_by_surface='studio'`.
 */
export async function toggleAiFlag(input: {
  websiteId: string;
  productId: string;
  productType: ProductEditorType;
  field: string;
  locked: boolean;
}): Promise<void> {
  const column = AI_FLAG_COLUMNS[input.field];
  if (!column) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensureTenancy(input.productType, input.productId, auth.accountId);

  const supabase = createSupabaseServiceRoleClient();
  // `locked=true` means user declared the field non-AI → flip stored flag to false.
  // `locked=false` means user declared the field AI-generated → flip stored flag to true.
  const nextValue = !input.locked;

  const { error } = await supabase.rpc(rpcNameFor(input.productType), {
    p_product_id: input.productId,
    p_account_id: auth.accountId,
    p_column: column,
    p_value: nextValue as unknown as object,
    p_ai_flag_column: null,
  });

  if (error) {
    log.error('ai_flag_update_failed', {
      product_id: input.productId,
      product_type: input.productType,
      field: input.field,
      error: error.message,
    });
    throw new Error('PERSIST_FAILED');
  }

  log.info('ai_flag_toggled', {
    website_id: input.websiteId,
    product_id: input.productId,
    product_type: input.productType,
    user_id: auth.userId,
    field: input.field,
    locked: input.locked,
  });

  revalidatePath(`${publicPathPrefix(input.productType)}/${slug}`);
}

export async function saveCustomSections(input: {
  websiteId: string;
  productId: string;
  productType: ProductEditorType;
  sections: CustomSection[];
}): Promise<void> {
  const parsed = CustomSectionsArraySchema.safeParse(input.sections);
  if (!parsed.success) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensureTenancy(input.productType, input.productId, auth.accountId);

  await upsertPage(input.websiteId, input.productType, input.productId, auth.userId, {
    custom_sections: parsed.data,
  });

  log.info('custom_sections_saved', {
    website_id: input.websiteId,
    product_id: input.productId,
    product_type: input.productType,
    user_id: auth.userId,
    count: parsed.data.length,
  });

  revalidatePath(`${publicPathPrefix(input.productType)}/${slug}`);
}
