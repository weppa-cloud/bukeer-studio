import { NextRequest } from 'next/server';
import { SeoOptimizeRequestSchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import {
  buildSourceMeta,
  extractBlockedTransactionalFields,
  TRANSACTIONAL_ITEM_TYPES,
  withNoStoreHeaders,
} from '@/lib/seo/content-intelligence';

type SuggestionCard = {
  id: string;
  field: string;
  before: string;
  after: string;
  rationale: string;
  scoreBefore: number;
  scoreAfter: number;
};

function scoreFromText(text: string): number {
  if (!text) return 25;
  const len = text.trim().length;
  return Math.min(100, 35 + Math.round(len / 3));
}

function normalizePatchFieldName(field: string): string {
  if (field === 'seoTitle') return 'seo_title';
  if (field === 'seoDescription') return 'seo_description';
  if (field === 'targetKeyword') return 'target_keyword';
  return field;
}

async function resolveApprovedBrief(
  admin: ReturnType<typeof createSupabaseServiceRoleClient>,
  websiteId: string,
  itemType: string,
  itemId: string,
  locale: string,
  briefId?: string,
) {
  let query = admin
    .from('seo_briefs')
    .select('id, brief, status')
    .eq('website_id', websiteId)
    .eq('page_type', itemType)
    .eq('page_id', itemId)
    .eq('locale', locale)
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (briefId) query = query.eq('id', briefId);
  const { data } = await query.maybeSingle();
  return data ?? null;
}

async function applyTransactionalPatch(
  admin: ReturnType<typeof createSupabaseServiceRoleClient>,
  websiteId: string,
  itemType: string,
  itemId: string,
  patch: Record<string, unknown>,
  sourceMeta: { source: string; fetchedAt: string; confidence: 'live' | 'partial' | 'exploratory' },
) {
  const payload: Record<string, unknown> = {
    website_id: websiteId,
    product_id: itemId,
    product_type: itemType,
    source: sourceMeta.source,
    fetched_at: sourceMeta.fetchedAt,
    confidence: sourceMeta.confidence,
  };
  if (typeof patch.seoTitle === 'string') payload.custom_seo_title = patch.seoTitle;
  if (typeof patch.seoDescription === 'string') payload.custom_seo_description = patch.seoDescription;
  if (typeof patch.targetKeyword === 'string') payload.target_keyword = patch.targetKeyword;
  if (typeof patch.seo_intro === 'string') payload.seo_intro = patch.seo_intro;
  if (Array.isArray(patch.seo_highlights)) payload.seo_highlights = patch.seo_highlights;
  if (Array.isArray(patch.seo_faq)) payload.seo_faq = patch.seo_faq;

  const { error } = await admin
    .from('website_product_pages')
    .upsert(payload, { onConflict: 'website_id,product_id' });
  return error;
}

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const parsed = SeoOptimizeRequestSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid optimizer payload', 400, parsed.error.flatten()));
  }

  const access = await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();
  const sourceMeta = buildSourceMeta('seo-content-intelligence/optimize', 'partial');
  const approvedBrief = await resolveApprovedBrief(
    admin,
    parsed.data.websiteId,
    parsed.data.itemType,
    parsed.data.itemId,
    parsed.data.locale,
    parsed.data.briefId,
  );

  if (!approvedBrief) {
    return withNoStoreHeaders(
      apiError('BRIEF_APPROVAL_REQUIRED', 'Optimize flow requires an approved brief for this item/locale', 409),
    );
  }

  const patch = parsed.data.patch ?? {};
  const baseBefore = JSON.stringify(patch);
  const scoreBefore = scoreFromText(baseBefore);
  const scoreAfter = Math.min(100, scoreBefore + 12);

  if (parsed.data.mode === 'suggest') {
    const cards: SuggestionCard[] = Object.keys(patch).map((field) => {
      const before = String(patch[field] ?? '');
      return {
        id: crypto.randomUUID(),
        field: normalizePatchFieldName(field),
        before,
        after: before ? `${before} · mejora SEO` : 'Propuesta de mejora SEO',
        rationale: 'Sugerencia derivada de snapshot + brief aprobado.',
        scoreBefore: scoreFromText(before),
        scoreAfter: Math.min(100, scoreFromText(before) + 15),
      };
    });

    const fallbackCards = cards.length
      ? cards
      : [
          {
            id: crypto.randomUUID(),
            field: 'seo_description',
            before: '',
            after: 'Descripción orientada a intención de búsqueda y CTA.',
            rationale: 'Sugerencia base porque no llegó patch explícito.',
            scoreBefore: 25,
            scoreAfter: 45,
          },
        ];

    await admin.from('seo_optimizer_actions').insert({
      website_id: parsed.data.websiteId,
      item_type: parsed.data.itemType,
      item_id: parsed.data.itemId,
      locale: parsed.data.locale,
      brief_id: approvedBrief.id,
      action_type: 'suggest',
      before_payload: patch,
      after_payload: { suggestions: fallbackCards },
      score_before: scoreBefore,
      score_after: scoreAfter,
      source: sourceMeta.source,
      fetched_at: sourceMeta.fetchedAt,
      confidence: sourceMeta.confidence,
      created_by: access.userId,
    });

    return withNoStoreHeaders(apiSuccess({ suggestions: fallbackCards, sourceMeta }));
  }

  if (TRANSACTIONAL_ITEM_TYPES.has(parsed.data.itemType)) {
    const blockedFields = extractBlockedTransactionalFields(patch);
    if (blockedFields.length > 0) {
      await admin.from('seo_optimizer_actions').insert({
        website_id: parsed.data.websiteId,
        item_type: parsed.data.itemType,
        item_id: parsed.data.itemId,
        locale: parsed.data.locale,
        brief_id: approvedBrief.id,
        action_type: 'blocked',
        before_payload: patch,
        after_payload: {},
        score_before: scoreBefore,
        score_after: scoreBefore,
        blocked_reason: `Blocked truth fields: ${blockedFields.join(', ')}`,
        error_code: 'SEO_TRUTH_FIELD_BLOCKED',
        source: sourceMeta.source,
        fetched_at: sourceMeta.fetchedAt,
        confidence: sourceMeta.confidence,
        created_by: access.userId,
      });
      return withNoStoreHeaders(
        apiError(
          'SEO_TRUTH_FIELD_BLOCKED',
          'Transactional guardrail blocked product-truth fields',
          409,
          { blockedFields },
        ),
      );
    }

    const transactionalError = await applyTransactionalPatch(
      admin,
      parsed.data.websiteId,
      parsed.data.itemType,
      parsed.data.itemId,
      patch,
      sourceMeta,
    );
    if (transactionalError) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Failed to persist SEO overlay', 500, transactionalError.message));
    }
  } else if (parsed.data.itemType === 'blog') {
    const updates: Record<string, unknown> = {};
    if (typeof patch.seoTitle === 'string') updates.seo_title = patch.seoTitle;
    if (typeof patch.seoDescription === 'string') updates.seo_description = patch.seoDescription;
    if (typeof patch.targetKeyword === 'string') updates.seo_keywords = [patch.targetKeyword];
    if (Object.keys(updates).length > 0) {
      await admin
        .from('website_blog_posts')
        .update(updates)
        .eq('website_id', parsed.data.websiteId)
        .eq('id', parsed.data.itemId);
    }
  } else if (parsed.data.itemType === 'destination') {
    const updates: Record<string, unknown> = {};
    if (typeof patch.seoTitle === 'string') updates.seo_title = patch.seoTitle;
    if (typeof patch.seoDescription === 'string') updates.seo_description = patch.seoDescription;
    if (typeof patch.targetKeyword === 'string') updates.target_keyword = patch.targetKeyword;
    if (Object.keys(updates).length > 0) {
      await admin.from('destinations').update(updates).eq('id', parsed.data.itemId);
    }
  } else if (parsed.data.itemType === 'page') {
    const updates: Record<string, unknown> = {};
    if (typeof patch.seoTitle === 'string') updates.seo_title = patch.seoTitle;
    if (typeof patch.seoDescription === 'string') updates.seo_description = patch.seoDescription;
    if (typeof patch.targetKeyword === 'string') updates.target_keyword = patch.targetKeyword;
    if (Object.keys(updates).length > 0) {
      await admin
        .from('website_pages')
        .update(updates)
        .eq('website_id', parsed.data.websiteId)
        .eq('id', parsed.data.itemId);
    }
  }

  const { data: action, error: actionError } = await admin
    .from('seo_optimizer_actions')
    .insert({
      website_id: parsed.data.websiteId,
      item_type: parsed.data.itemType,
      item_id: parsed.data.itemId,
      locale: parsed.data.locale,
      brief_id: approvedBrief.id,
      action_type: 'apply',
      before_payload: patch,
      after_payload: patch,
      score_before: scoreBefore,
      score_after: scoreAfter,
      source: sourceMeta.source,
      fetched_at: sourceMeta.fetchedAt,
      confidence: sourceMeta.confidence,
      created_by: access.userId,
    })
    .select('id, score_before, score_after, created_at')
    .single();
  if (actionError || !action) {
    return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to persist optimizer action', 500, actionError?.message));
  }

  return withNoStoreHeaders(
    apiSuccess({
      action,
      itemType: parsed.data.itemType,
      itemId: parsed.data.itemId,
      sourceMeta,
    }),
  );
}
