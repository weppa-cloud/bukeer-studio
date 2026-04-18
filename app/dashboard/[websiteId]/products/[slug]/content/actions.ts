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

async function ensurePackageTenancy(productId: string, accountId: string): Promise<{ slug: string }> {
  const supabase = createSupabaseServiceRoleClient();
  const { data } = await supabase
    .from('package_kits')
    .select('id, slug')
    .eq('id', productId)
    .eq('account_id', accountId)
    .maybeSingle<{ id: string; slug: string }>();
  if (!data) throw new Error('NOT_FOUND');
  return { slug: data.slug };
}

async function upsertPage(
  websiteId: string,
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
    .eq('product_type', 'package')
    .maybeSingle<{ id: string }>();

  if (existing) {
    const { error } = await supabase
      .from('website_product_pages')
      .update({ ...patch, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) {
      log.error('update_failed', { website_id: websiteId, product_id: productId, error: error.message });
      throw new Error('PERSIST_FAILED');
    }
    return;
  }

  const { error } = await supabase.from('website_product_pages').insert({
    website_id: websiteId,
    product_id: productId,
    product_type: 'package',
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
    log.error('insert_failed', { website_id: websiteId, product_id: productId, error: error.message });
    throw new Error('PERSIST_FAILED');
  }
}

export async function saveHeroOverride(input: {
  websiteId: string;
  productId: string;
  value: HeroOverrideValue | null;
}): Promise<void> {
  const parsed = HeroOverrideSchema.safeParse(input.value);
  if (!parsed.success) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensurePackageTenancy(input.productId, auth.accountId);

  await upsertPage(input.websiteId, input.productId, auth.userId, {
    custom_hero: parsed.data,
  });

  log.info('hero_override_saved', {
    website_id: input.websiteId,
    product_id: input.productId,
    user_id: auth.userId,
    cleared: parsed.data === null,
  });

  revalidatePath(`/paquetes/${slug}`);
}

export async function saveVisibility(input: {
  websiteId: string;
  productId: string;
  hidden: string[];
}): Promise<void> {
  const parsed = HiddenSectionsSchema.safeParse(input.hidden);
  if (!parsed.success) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensurePackageTenancy(input.productId, auth.accountId);

  await upsertPage(input.websiteId, input.productId, auth.userId, {
    hidden_sections: parsed.data,
  });

  log.info('visibility_saved', {
    website_id: input.websiteId,
    product_id: input.productId,
    user_id: auth.userId,
    hidden_count: parsed.data.length,
  });

  revalidatePath(`/paquetes/${slug}`);
}

export async function saveOrder(input: {
  websiteId: string;
  productId: string;
  order: string[];
}): Promise<void> {
  const parsed = SectionsOrderSchema.safeParse(input.order);
  if (!parsed.success) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensurePackageTenancy(input.productId, auth.accountId);

  await upsertPage(input.websiteId, input.productId, auth.userId, {
    sections_order: parsed.data,
  });

  log.info('order_saved', {
    website_id: input.websiteId,
    product_id: input.productId,
    user_id: auth.userId,
    count: parsed.data.length,
  });

  revalidatePath(`/paquetes/${slug}`);
}

const VideoActionInput = z.object({
  video_url: VideoUrlSchema.nullable(),
  video_caption: z.string().max(200).nullable(),
});

export async function saveVideoUrl(input: {
  websiteId: string;
  productId: string;
  value: { video_url: string | null; video_caption: string | null };
}): Promise<void> {
  const parsed = VideoActionInput.safeParse(input.value);
  if (!parsed.success) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensurePackageTenancy(input.productId, auth.accountId);

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from('package_kits')
    .update({
      video_url: parsed.data.video_url,
      video_caption: parsed.data.video_caption,
    })
    .eq('id', input.productId)
    .eq('account_id', auth.accountId);

  if (error) {
    log.error('video_update_failed', { product_id: input.productId, error: error.message });
    throw new Error('PERSIST_FAILED');
  }

  log.info('video_url_updated', {
    website_id: input.websiteId,
    product_id: input.productId,
    user_id: auth.userId,
    has_url: Boolean(parsed.data.video_url),
  });

  revalidatePath(`/paquetes/${slug}`);
}

const AI_FLAG_COLUMNS: Record<string, string> = {
  description: 'description_ai_generated',
  highlights: 'highlights_ai_generated',
};

export async function toggleAiFlag(input: {
  websiteId: string;
  productId: string;
  field: string;
  locked: boolean;
}): Promise<void> {
  const column = AI_FLAG_COLUMNS[input.field];
  if (!column) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensurePackageTenancy(input.productId, auth.accountId);

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from('package_kits')
    .update({ [column]: !input.locked })
    .eq('id', input.productId)
    .eq('account_id', auth.accountId);

  if (error) {
    log.error('ai_flag_update_failed', { product_id: input.productId, field: input.field, error: error.message });
    throw new Error('PERSIST_FAILED');
  }

  log.info('ai_flag_toggled', {
    website_id: input.websiteId,
    product_id: input.productId,
    user_id: auth.userId,
    field: input.field,
    locked: input.locked,
  });

  revalidatePath(`/paquetes/${slug}`);
}

export async function saveCustomSections(input: {
  websiteId: string;
  productId: string;
  sections: CustomSection[];
}): Promise<void> {
  const parsed = CustomSectionsArraySchema.safeParse(input.sections);
  if (!parsed.success) throw new Error('VALIDATION_ERROR');

  const auth = await authorize(input.websiteId);
  const { slug } = await ensurePackageTenancy(input.productId, auth.accountId);

  await upsertPage(input.websiteId, input.productId, auth.userId, {
    custom_sections: parsed.data,
  });

  log.info('custom_sections_saved', {
    website_id: input.websiteId,
    product_id: input.productId,
    user_id: auth.userId,
    count: parsed.data.length,
  });

  revalidatePath(`/paquetes/${slug}`);
}
