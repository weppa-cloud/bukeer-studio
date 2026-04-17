import type { z } from 'zod';
import { BlogPostUpsertSchema } from '../schemas.js';
import { getSupabaseAdmin } from '../supabase.js';
import { assertNoTruthFields } from '../safety.js';

export const InputSchema = BlogPostUpsertSchema;

export async function handler(
  input: z.infer<typeof InputSchema>,
): Promise<{ action: 'insert' | 'update'; post: Record<string, unknown> }> {
  // Safety guardrail: reject any truth-table columns that might have been
  // injected as extra keys. Runtime Zod strips unknowns by default, but this
  // guards the flattened row we build below.
  assertNoTruthFields(input as unknown as Record<string, unknown>);

  const admin = getSupabaseAdmin();
  const row: Record<string, unknown> = {
    website_id: input.websiteId,
    slug: input.slug,
    title: input.title,
    content: input.body,
  };
  if (input.excerpt !== undefined) row.excerpt = input.excerpt;
  if (input.cover !== undefined) row.main_image = input.cover;
  if (input.seoTitle !== undefined) row.seo_title = input.seoTitle;
  if (input.seoDescription !== undefined) row.seo_description = input.seoDescription;
  if (input.faqs !== undefined) row.faq_items = input.faqs;
  if (input.status !== undefined) row.status = input.status;
  if (input.locale !== undefined) row.locale = input.locale;
  if (input.translationGroupId !== undefined) row.translation_group_id = input.translationGroupId;

  // Defence-in-depth: re-scan the row we are about to write.
  assertNoTruthFields(row);

  if (input.id) {
    const { data, error } = await admin
      .from('website_blog_posts')
      .update(row)
      .eq('id', input.id)
      .eq('website_id', input.websiteId)
      .select()
      .single();
    if (error) throw new Error(`Supabase update failed: ${error.message}`);
    return { action: 'update', post: data as Record<string, unknown> };
  }

  const { data, error } = await admin
    .from('website_blog_posts')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  return { action: 'insert', post: data as Record<string, unknown> };
}
