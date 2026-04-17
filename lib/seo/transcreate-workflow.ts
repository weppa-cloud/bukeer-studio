import type { SeoDecisionSource } from '@/lib/seo/content-intelligence';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

type TranscreatePageType = 'blog' | 'page' | 'destination' | 'hotel' | 'activity' | 'package' | 'transfer';

type LocaleTuple = {
  sourceLocale: string;
  targetLocale: string;
  country: string;
  language: string;
};

type TranscreateJobRow = {
  id: string;
  website_id: string;
  page_type: TranscreatePageType;
  page_id: string;
  source_locale: string;
  target_locale: string;
  country: string;
  language: string;
  status: 'draft' | 'reviewed' | 'applied' | 'published';
  payload: Record<string, unknown> | null;
  keyword_reresearch: Record<string, unknown> | null;
};

type TranscreateActionError = {
  code: string;
  message: string;
  status: number;
  details?: unknown;
};

type TranscreateActionFailure = {
  ok: false;
  error: TranscreateActionError;
};

type TranscreateActionSuccess = {
  ok: true;
  job: {
    id: string;
    status: 'reviewed' | 'applied';
    updatedAt: string;
  };
  pageType: TranscreatePageType;
  sourceContentId: string;
  sourceLocale: string;
  targetLocale: string;
  country: string;
  language: string;
  targetContentId: string | null;
};

export type TranscreateActionResult = TranscreateActionFailure | TranscreateActionSuccess;

type SharedActionInput = {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  sourceMeta: SeoDecisionSource;
  websiteId: string;
  actorUserId: string;
  jobId: string;
};

type ApplyActionInput = SharedActionInput & {
  accountId: string;
  preferredTargetContentId?: string | null;
};

function failure(error: TranscreateActionError): TranscreateActionFailure {
  return { ok: false, error };
}

function normalizeSlugBase(input: string): string {
  const normalized = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'localized-content';
}

function localeSlugSuffix(locale: string): string {
  return locale
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildContentUpdates(pageType: 'blog' | 'page' | 'destination', payload: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};

  if (pageType === 'destination') {
    if (typeof payload.title === 'string') updates.name = payload.title;
  } else if (typeof payload.title === 'string') {
    updates.title = payload.title;
  }

  if (typeof payload.seoTitle === 'string') updates.seo_title = payload.seoTitle;
  if (typeof payload.seoDescription === 'string') updates.seo_description = payload.seoDescription;

  return updates;
}

function buildProductOverlayPayload(input: {
  websiteId: string;
  targetContentId: string;
  pageType: 'hotel' | 'activity' | 'package';
  targetLocale: string;
  sourceMeta: SeoDecisionSource;
  payload: Record<string, unknown>;
  translationGroupId: string;
}) {
  const row: Record<string, unknown> = {
    website_id: input.websiteId,
    product_id: input.targetContentId,
    product_type: input.pageType,
    locale: input.targetLocale,
    translation_group_id: input.translationGroupId,
    source: input.sourceMeta.source,
    fetched_at: input.sourceMeta.fetchedAt,
    confidence: input.sourceMeta.confidence,
  };

  if (typeof input.payload.seoTitle === 'string') row.custom_seo_title = input.payload.seoTitle;
  if (typeof input.payload.seoDescription === 'string') row.custom_seo_description = input.payload.seoDescription;
  if (typeof input.payload.targetKeyword === 'string') row.target_keyword = input.payload.targetKeyword;
  if (typeof input.payload.seo_intro === 'string') row.seo_intro = input.payload.seo_intro;
  if (Array.isArray(input.payload.seo_highlights)) row.seo_highlights = input.payload.seo_highlights;
  if (Array.isArray(input.payload.seo_faq)) row.seo_faq = input.payload.seo_faq;

  return row;
}

async function readJob(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  websiteId: string;
  jobId: string;
}): Promise<TranscreateJobRow | null> {
  const { data, error } = await input.admin
    .from('seo_transcreation_jobs')
    .select(
      'id,website_id,page_type,page_id,source_locale,target_locale,country,language,status,payload,keyword_reresearch',
    )
    .eq('website_id', input.websiteId)
    .eq('id', input.jobId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as TranscreateJobRow;
}

async function upsertVariantState(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  websiteId: string;
  pageType: TranscreatePageType;
  sourceContentId: string;
  targetContentId?: string | null;
  sourceLocale: string;
  targetLocale: string;
  country: string;
  language: string;
  status: 'reviewed' | 'applied';
  jobId: string;
  sourceMeta: SeoDecisionSource;
}) {
  const payload: Record<string, unknown> = {
      website_id: input.websiteId,
      page_type: input.pageType,
      source_entity_id: input.sourceContentId,
      source_locale: input.sourceLocale,
      target_locale: input.targetLocale,
      country: input.country,
      language: input.language,
      status: input.status,
      last_job_id: input.jobId,
      updated_at: new Date().toISOString(),
      source: input.sourceMeta.source,
      fetched_at: input.sourceMeta.fetchedAt,
      confidence: input.sourceMeta.confidence,
  };
  if (input.targetContentId !== undefined) {
    payload.target_entity_id = input.targetContentId;
  }

  await input.admin
    .from('seo_localized_variants')
    .upsert(payload, { onConflict: 'website_id,page_type,source_entity_id,target_locale' });
}

async function reserveUniqueSlug(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  table: 'website_blog_posts' | 'website_pages' | 'destinations';
  keyColumn: 'website_id' | 'account_id';
  keyValue: string;
  locale: string;
  baseSlug: string;
}) {
  let candidate = baseSlug;
  for (let i = 0; i < 10; i += 1) {
    let query = input.admin
      .from(input.table)
      .select('id')
      .eq(input.keyColumn, input.keyValue)
      .eq('locale', input.locale)
      .eq('slug', candidate)
      .limit(1);

    if (input.table === 'destinations') {
      query = query.is('deleted_at', null);
    }

    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${baseSlug}-${i + 2}`;
  }

  return `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
}

async function ensureTargetBlog(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  websiteId: string;
  sourceContentId: string;
  targetLocale: string;
  payload: Record<string, unknown>;
}): Promise<string | null> {
  const { data: source } = await input.admin
    .from('website_blog_posts')
    .select('*')
    .eq('website_id', input.websiteId)
    .eq('id', input.sourceContentId)
    .maybeSingle();

  if (!source || !isRecord(source)) return null;
  const translationGroupId = typeof source.translation_group_id === 'string' ? source.translation_group_id : input.sourceContentId;

  const { data: existing } = await input.admin
    .from('website_blog_posts')
    .select('id')
    .eq('website_id', input.websiteId)
    .eq('translation_group_id', translationGroupId)
    .eq('locale', input.targetLocale)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const now = new Date().toISOString();
  const row: Record<string, unknown> = { ...source };
  const newId = crypto.randomUUID();
  row.id = newId;
  row.locale = input.targetLocale;
  row.translation_group_id = translationGroupId;
  row.updated_at = now;
  if ('created_at' in row) row.created_at = now;
  if ('published_at' in row) row.published_at = null;
  if ('status' in row) row.status = 'draft';
  if (typeof input.payload.title === 'string') row.title = input.payload.title;
  if (typeof input.payload.seoTitle === 'string') row.seo_title = input.payload.seoTitle;
  if (typeof input.payload.seoDescription === 'string') row.seo_description = input.payload.seoDescription;

  const baseTitle = typeof row.title === 'string' ? row.title : String(row.slug ?? row.id);
  const baseSlug = normalizeSlugBase(`${baseTitle}-${localeSlugSuffix(input.targetLocale)}`);
  row.slug = await reserveUniqueSlug({
    admin: input.admin,
    table: 'website_blog_posts',
    keyColumn: 'website_id',
    keyValue: input.websiteId,
    locale: input.targetLocale,
    baseSlug,
  });

  const { data: inserted, error } = await input.admin
    .from('website_blog_posts')
    .insert(row)
    .select('id')
    .single();

  if (error || !inserted?.id) return null;
  return String(inserted.id);
}

async function ensureTargetPage(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  websiteId: string;
  sourceContentId: string;
  targetLocale: string;
  payload: Record<string, unknown>;
}): Promise<string | null> {
  const { data: source } = await input.admin
    .from('website_pages')
    .select('*')
    .eq('website_id', input.websiteId)
    .eq('id', input.sourceContentId)
    .maybeSingle();

  if (!source || !isRecord(source)) return null;
  const translationGroupId = typeof source.translation_group_id === 'string' ? source.translation_group_id : input.sourceContentId;

  const { data: existing } = await input.admin
    .from('website_pages')
    .select('id')
    .eq('website_id', input.websiteId)
    .eq('translation_group_id', translationGroupId)
    .eq('locale', input.targetLocale)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const now = new Date().toISOString();
  const row: Record<string, unknown> = { ...source };
  const newId = crypto.randomUUID();
  row.id = newId;
  row.locale = input.targetLocale;
  row.translation_group_id = translationGroupId;
  row.updated_at = now;
  if ('created_at' in row) row.created_at = now;
  if ('is_published' in row) row.is_published = false;
  if (typeof input.payload.title === 'string') row.title = input.payload.title;
  if (typeof input.payload.seoTitle === 'string') row.seo_title = input.payload.seoTitle;
  if (typeof input.payload.seoDescription === 'string') row.seo_description = input.payload.seoDescription;

  const baseTitle = typeof row.title === 'string' ? row.title : String(row.slug ?? row.id);
  const baseSlug = normalizeSlugBase(`${baseTitle}-${localeSlugSuffix(input.targetLocale)}`);
  row.slug = await reserveUniqueSlug({
    admin: input.admin,
    table: 'website_pages',
    keyColumn: 'website_id',
    keyValue: input.websiteId,
    locale: input.targetLocale,
    baseSlug,
  });

  const { data: inserted, error } = await input.admin
    .from('website_pages')
    .insert(row)
    .select('id')
    .single();

  if (error || !inserted?.id) return null;
  return String(inserted.id);
}

async function ensureTargetDestination(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  accountId: string;
  sourceContentId: string;
  targetLocale: string;
  payload: Record<string, unknown>;
}): Promise<string | null> {
  const { data: source } = await input.admin
    .from('destinations')
    .select('*')
    .eq('account_id', input.accountId)
    .eq('id', input.sourceContentId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!source || !isRecord(source)) return null;
  const translationGroupId = typeof source.translation_group_id === 'string' ? source.translation_group_id : input.sourceContentId;

  const { data: existing } = await input.admin
    .from('destinations')
    .select('id')
    .eq('account_id', input.accountId)
    .eq('translation_group_id', translationGroupId)
    .eq('locale', input.targetLocale)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const now = new Date().toISOString();
  const row: Record<string, unknown> = { ...source };
  const newId = crypto.randomUUID();
  row.id = newId;
  row.locale = input.targetLocale;
  row.translation_group_id = translationGroupId;
  row.updated_at = now;
  if ('created_at' in row) row.created_at = now;
  if ('is_published' in row) row.is_published = false;
  if ('deleted_at' in row) row.deleted_at = null;
  if (typeof input.payload.title === 'string') row.name = input.payload.title;
  if (typeof input.payload.seoTitle === 'string') row.seo_title = input.payload.seoTitle;
  if (typeof input.payload.seoDescription === 'string') row.seo_description = input.payload.seoDescription;

  const baseTitle = typeof row.name === 'string' ? row.name : String(row.slug ?? row.id);
  const baseSlug = normalizeSlugBase(`${baseTitle}-${localeSlugSuffix(input.targetLocale)}`);
  row.slug = await reserveUniqueSlug({
    admin: input.admin,
    table: 'destinations',
    keyColumn: 'account_id',
    keyValue: input.accountId,
    locale: input.targetLocale,
    baseSlug,
  });

  const { data: inserted, error } = await input.admin
    .from('destinations')
    .insert(row)
    .select('id')
    .single();

  if (error || !inserted?.id) return null;
  return String(inserted.id);
}

async function ensureOrphanTargetEntity(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  accountId: string;
  websiteId: string;
  pageType: 'blog' | 'page' | 'destination';
  sourceContentId: string;
  targetLocale: string;
  payload: Record<string, unknown>;
}): Promise<string | null> {
  if (input.pageType === 'blog') {
    return ensureTargetBlog(input);
  }
  if (input.pageType === 'page') {
    return ensureTargetPage(input);
  }
  return ensureTargetDestination(input);
}

async function resolveProductTranslationGroup(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  websiteId: string;
  pageType: 'hotel' | 'activity' | 'package';
  sourceContentId: string;
  sourceLocale: string;
}) {
  const { data: exact } = await input.admin
    .from('website_product_pages')
    .select('translation_group_id')
    .eq('website_id', input.websiteId)
    .eq('product_type', input.pageType)
    .eq('product_id', input.sourceContentId)
    .eq('locale', input.sourceLocale)
    .limit(1)
    .maybeSingle();

  if (exact?.translation_group_id) return String(exact.translation_group_id);

  const { data: fallback } = await input.admin
    .from('website_product_pages')
    .select('translation_group_id')
    .eq('website_id', input.websiteId)
    .eq('product_type', input.pageType)
    .eq('product_id', input.sourceContentId)
    .limit(1)
    .maybeSingle();

  if (fallback?.translation_group_id) return String(fallback.translation_group_id);
  return input.sourceContentId;
}

export function hasValidTargetReresearch(input: {
  payload: Record<string, unknown> | null;
  localeTuple: LocaleTuple;
}): boolean {
  const payload = input.payload;
  if (!payload) return false;

  return (
    payload.required === true &&
    payload.authoritative === true &&
    payload.decision_grade_ready === true &&
    payload.confidence === 'live' &&
    payload.target_locale === input.localeTuple.targetLocale &&
    payload.country === input.localeTuple.country &&
    payload.language === input.localeTuple.language &&
    typeof payload.fetched_at === 'string' &&
    payload.fetched_at.length > 0 &&
    typeof payload.candidate_id === 'string' &&
    payload.candidate_id.length > 0
  );
}

export async function reviewTranscreateJob(input: SharedActionInput): Promise<TranscreateActionResult> {
  const job = await readJob({
    admin: input.admin,
    websiteId: input.websiteId,
    jobId: input.jobId,
  });

  if (!job) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Transcreation job not found',
      status: 404,
    });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await input.admin
    .from('seo_transcreation_jobs')
    .update({
      status: 'reviewed',
      reviewed_by: input.actorUserId,
      updated_at: now,
      source: input.sourceMeta.source,
      fetched_at: input.sourceMeta.fetchedAt,
      confidence: input.sourceMeta.confidence,
    })
    .eq('id', job.id)
    .eq('website_id', input.websiteId)
    .select('id,status,updated_at')
    .single();

  if (error || !updated) {
    return failure({
      code: 'INTERNAL_ERROR',
      message: 'Unable to transition transcreation job to reviewed',
      status: 500,
      details: error?.message,
    });
  }

  await upsertVariantState({
    admin: input.admin,
    websiteId: input.websiteId,
    pageType: job.page_type,
    sourceContentId: job.page_id,
    sourceLocale: job.source_locale,
    targetLocale: job.target_locale,
    country: job.country,
    language: job.language,
    status: 'reviewed',
    jobId: job.id,
    sourceMeta: input.sourceMeta,
  });

  return {
    ok: true,
    job: {
      id: String(updated.id),
      status: 'reviewed',
      updatedAt: String(updated.updated_at ?? now),
    },
    pageType: job.page_type,
    sourceContentId: job.page_id,
    sourceLocale: job.source_locale,
    targetLocale: job.target_locale,
    country: job.country,
    language: job.language,
    targetContentId: null,
  };
}

export async function applyTranscreateJob(input: ApplyActionInput): Promise<TranscreateActionResult> {
  const job = await readJob({
    admin: input.admin,
    websiteId: input.websiteId,
    jobId: input.jobId,
  });

  if (!job) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Transcreation job not found',
      status: 404,
    });
  }

  if (job.status !== 'reviewed') {
    return failure({
      code: 'TRANSCREATE_REVIEW_REQUIRED',
      message: 'Apply is blocked unless job is reviewed',
      status: 409,
    });
  }

  const localeTuple: LocaleTuple = {
    sourceLocale: job.source_locale,
    targetLocale: job.target_locale,
    country: job.country,
    language: job.language,
  };
  const keywordReresearch = (job.keyword_reresearch ?? null) as Record<string, unknown> | null;
  if (!hasValidTargetReresearch({ payload: keywordReresearch, localeTuple })) {
    return failure({
      code: 'TARGET_RERESEARCH_REQUIRED',
      message: 'Target-market re-research is required before apply',
      status: 409,
      details: {
        required: {
          source_locale: localeTuple.sourceLocale,
          target_locale: localeTuple.targetLocale,
          country: localeTuple.country,
          language: localeTuple.language,
        },
        current: keywordReresearch,
      },
    });
  }

  const payload = isRecord(job.payload) ? job.payload : {};

  const { data: currentVariant } = await input.admin
    .from('seo_localized_variants')
    .select('target_entity_id')
    .eq('website_id', input.websiteId)
    .eq('page_type', job.page_type)
    .eq('source_entity_id', job.page_id)
    .eq('target_locale', job.target_locale)
    .limit(1)
    .maybeSingle();

  let targetContentId =
    input.preferredTargetContentId ?? (currentVariant?.target_entity_id ? String(currentVariant.target_entity_id) : null);

  if ((job.page_type === 'blog' || job.page_type === 'page' || job.page_type === 'destination') && !targetContentId) {
    targetContentId = await ensureOrphanTargetEntity({
      admin: input.admin,
      accountId: input.accountId,
      websiteId: input.websiteId,
      pageType: job.page_type,
      sourceContentId: job.page_id,
      targetLocale: job.target_locale,
      payload,
    });

    if (!targetContentId) {
      return failure({
        code: 'INTERNAL_ERROR',
        message: 'Unable to create localized target content',
        status: 500,
      });
    }
  }

  if (job.page_type === 'blog' && targetContentId) {
    const updates = buildContentUpdates('blog', payload);
    if (Object.keys(updates).length > 0) {
      const { error } = await input.admin
        .from('website_blog_posts')
        .update(updates)
        .eq('website_id', input.websiteId)
        .eq('id', targetContentId);
      if (error) {
        return failure({
          code: 'INTERNAL_ERROR',
          message: 'Unable to apply localized blog content',
          status: 500,
          details: error.message,
        });
      }
    }
  } else if (job.page_type === 'page' && targetContentId) {
    const updates = buildContentUpdates('page', payload);
    if (Object.keys(updates).length > 0) {
      const { error } = await input.admin
        .from('website_pages')
        .update(updates)
        .eq('website_id', input.websiteId)
        .eq('id', targetContentId);
      if (error) {
        return failure({
          code: 'INTERNAL_ERROR',
          message: 'Unable to apply localized page content',
          status: 500,
          details: error.message,
        });
      }
    }
  } else if (job.page_type === 'destination' && targetContentId) {
    const updates = buildContentUpdates('destination', payload);
    if (Object.keys(updates).length > 0) {
      const { error } = await input.admin.from('destinations').update(updates).eq('id', targetContentId);
      if (error) {
        return failure({
          code: 'INTERNAL_ERROR',
          message: 'Unable to apply localized destination content',
          status: 500,
          details: error.message,
        });
      }
    }
  } else if (job.page_type === 'hotel' || job.page_type === 'activity' || job.page_type === 'package') {
    const overlayTargetId = targetContentId ?? job.page_id;
    const translationGroupId = await resolveProductTranslationGroup({
      admin: input.admin,
      websiteId: input.websiteId,
      pageType: job.page_type,
      sourceContentId: job.page_id,
      sourceLocale: job.source_locale,
    });
    const overlayPayload = buildProductOverlayPayload({
      websiteId: input.websiteId,
      targetContentId: overlayTargetId,
      pageType: job.page_type,
      targetLocale: job.target_locale,
      sourceMeta: input.sourceMeta,
      payload,
      translationGroupId,
    });
    const { error } = await input.admin
      .from('website_product_pages')
      .upsert(overlayPayload, { onConflict: 'website_id,locale,product_type,product_id' });
    if (error) {
      return failure({
        code: 'INTERNAL_ERROR',
        message: 'Unable to apply product SEO overlay',
        status: 500,
        details: error.message,
      });
    }
    targetContentId = overlayTargetId;
  }

  const now = new Date().toISOString();
  const { data: updated, error: applyError } = await input.admin
    .from('seo_transcreation_jobs')
    .update({
      status: 'applied',
      applied_by: input.actorUserId,
      updated_at: now,
      source: input.sourceMeta.source,
      fetched_at: input.sourceMeta.fetchedAt,
      confidence: input.sourceMeta.confidence,
    })
    .eq('id', job.id)
    .eq('website_id', input.websiteId)
    .select('id,status,updated_at')
    .single();

  if (applyError || !updated) {
    return failure({
      code: 'INTERNAL_ERROR',
      message: 'Unable to apply transcreation job',
      status: 500,
      details: applyError?.message,
    });
  }

  await upsertVariantState({
    admin: input.admin,
    websiteId: input.websiteId,
    pageType: job.page_type,
    sourceContentId: job.page_id,
    targetContentId,
    sourceLocale: job.source_locale,
    targetLocale: job.target_locale,
    country: job.country,
    language: job.language,
    status: 'applied',
    jobId: job.id,
    sourceMeta: input.sourceMeta,
  });

  return {
    ok: true,
    job: {
      id: String(updated.id),
      status: 'applied',
      updatedAt: String(updated.updated_at ?? now),
    },
    pageType: job.page_type,
    sourceContentId: job.page_id,
    sourceLocale: job.source_locale,
    targetLocale: job.target_locale,
    country: job.country,
    language: job.language,
    targetContentId,
  };
}
