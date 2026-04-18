import type { SeoDecisionSource } from '@/lib/seo/content-intelligence';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import {
  LOCALE_ADAPTATION_SCHEMA_VERSION_V2,
  type LocaleAdaptationOutputEnvelopeV2,
  normalizeLocaleAdaptationOutputEnvelope,
} from '@/lib/ai/prompts/locale-adaptation';
import {
  buildGlossaryPromptBlock,
  enrichDraftWithTM,
  loadGlossaryForLocales,
  upsertTM,
  type TMHitEntry,
} from '@/lib/seo/translation-memory';

type TranscreatePageType = 'blog' | 'page' | 'destination' | 'hotel' | 'activity' | 'package' | 'transfer';
type ProductPageType = Extract<TranscreatePageType, 'hotel' | 'activity' | 'package' | 'transfer'>;

/**
 * Truth-field denylist — columns owned by truth tables (hotels, activities,
 * package_kits, transfers, destinations). Transcreate may only write SEO
 * overlay columns on `website_product_pages`; attempting to mutate any key in
 * this set via the transcreation payload trips SEO_TRUTH_FIELD_BLOCKED (422).
 *
 * Keep in sync with `.claude/mcp-servers/bukeer-studio/src/safety.ts`.
 */
const TRUTH_FIELD_DENYLIST: ReadonlySet<string> = new Set<string>([
  'name',
  'description',
  'description_main',
  'price',
  'main_image',
  'star_rating',
  'user_rating',
  'amenities',
  'duration_minutes',
  'inclutions',
  'exclutions',
  'recomendations',
  'experience_type',
  'currency',
  'base_price',
  'net_price',
  'total_price',
  'availability',
  'account_id',
  'hotel_id',
  'activity_id',
  'destination_id',
  'package_kit_id',
  'product_id',
  'transfer_id',
]);

function detectTruthFieldsInPayload(payload: Record<string, unknown>): string[] {
  const offending: string[] = [];
  for (const key of Object.keys(payload)) {
    if (TRUTH_FIELD_DENYLIST.has(key)) offending.push(key);
  }
  return offending;
}

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
  schema_version: string | null;
  payload_v2: Record<string, unknown> | null;
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

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function buildBodyContentCandidate(payload: Record<string, unknown>): Record<string, unknown> | undefined {
  if (isRecord(payload.body_content)) return payload.body_content;

  const body = pickString(payload.body);
  const seoIntro = pickString(payload.seo_intro);
  const seoHighlights = Array.isArray(payload.seo_highlights)
    ? payload.seo_highlights
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  const seoFaq = Array.isArray(payload.seo_faq)
    ? payload.seo_faq
        .filter((row): row is Record<string, unknown> => isRecord(row))
        .map((row) => ({
          question: pickString(row.question) ?? '',
          answer: pickString(row.answer) ?? '',
        }))
        .filter((row) => row.question.length > 0 && row.answer.length > 0)
    : [];

  if (!body && !seoIntro && seoHighlights.length === 0 && seoFaq.length === 0) {
    return undefined;
  }

  return {
    ...(body ? { body } : {}),
    ...(seoIntro ? { seo_intro: seoIntro } : {}),
    ...(seoHighlights.length > 0 ? { seo_highlights: seoHighlights } : {}),
    ...(seoFaq.length > 0 ? { seo_faq: seoFaq } : {}),
  };
}

function parseTranscreateEnvelope(job: TranscreateJobRow): LocaleAdaptationOutputEnvelopeV2 | null {
  const payload = isRecord(job.payload) ? job.payload : {};
  const payloadV2FromPayload = isRecord(payload.payload_v2) ? payload.payload_v2 : null;
  const payloadV2FromColumn = isRecord(job.payload_v2) ? job.payload_v2 : null;
  const schemaVersion =
    pickString(job.schema_version) ??
    pickString(payload.schema_version) ??
    undefined;

  const envelopeCandidate = schemaVersion || payloadV2FromPayload || payloadV2FromColumn
    ? {
        schema_version: schemaVersion ?? LOCALE_ADAPTATION_SCHEMA_VERSION_V2,
        payload_v2: payloadV2FromColumn ?? payloadV2FromPayload ?? {},
      }
    : null;

  const legacyCandidate = {
    meta_title: pickString(payload.meta_title) ?? pickString(payload.seoTitle) ?? '',
    meta_desc: pickString(payload.meta_desc) ?? pickString(payload.seoDescription) ?? '',
    slug: pickString(payload.slug) ?? '',
    h1: pickString(payload.h1) ?? pickString(payload.title) ?? '',
    keywords: payload.keywords ?? pickString(payload.targetKeyword) ?? [],
    body_content: buildBodyContentCandidate(payload),
  };

  return normalizeLocaleAdaptationOutputEnvelope(
    envelopeCandidate ?? legacyCandidate,
    pickString(payload.targetKeyword),
  );
}

function buildApplyPayload(job: TranscreateJobRow): Record<string, unknown> | null {
  const envelope = parseTranscreateEnvelope(job);
  if (!envelope) return null;

  const basePayload = isRecord(job.payload) ? job.payload : {};
  const payloadV2 = envelope.payload_v2;
  const nextPayload: Record<string, unknown> = {
    ...basePayload,
    schema_version: envelope.schema_version,
    payload_v2: payloadV2,
    meta_title: payloadV2.meta_title,
    meta_desc: payloadV2.meta_desc,
    slug: payloadV2.slug,
    h1: payloadV2.h1,
    keywords: payloadV2.keywords,
    seoTitle: payloadV2.meta_title,
    seoDescription: payloadV2.meta_desc,
    title: payloadV2.h1,
    targetKeyword: payloadV2.keywords[0] ?? null,
  };

  if (payloadV2.body_content) {
    nextPayload.body_content = payloadV2.body_content;
    if (pickString(payloadV2.body_content.body)) nextPayload.body = payloadV2.body_content.body;
    if (pickString(payloadV2.body_content.seo_intro)) nextPayload.seo_intro = payloadV2.body_content.seo_intro;
    if (Array.isArray(payloadV2.body_content.seo_highlights)) nextPayload.seo_highlights = payloadV2.body_content.seo_highlights;
    if (Array.isArray(payloadV2.body_content.seo_faq)) nextPayload.seo_faq = payloadV2.body_content.seo_faq;
  }

  return nextPayload;
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
  if (pageType === 'blog') {
    const body =
      pickString(payload.body) ??
      (isRecord(payload.body_content) ? pickString(payload.body_content.body) : undefined);
    if (body) updates.content = body;
  }

  return updates;
}

function buildProductOverlayPayload(input: {
  websiteId: string;
  targetContentId: string;
  pageType: ProductPageType;
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
  if (isRecord(input.payload.body_content)) row.body_content = input.payload.body_content;

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
      'id,website_id,page_type,page_id,source_locale,target_locale,country,language,status,payload,schema_version,payload_v2,keyword_reresearch',
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
  let candidate = input.baseSlug;
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
    candidate = `${input.baseSlug}-${i + 2}`;
  }

  return `${input.baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
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
  pageType: ProductPageType;
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

  const payload = buildApplyPayload(job);
  if (!payload) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'Transcreate payload failed schema validation (schema_version + payload_v2 required).',
      status: 422,
    });
  }

  // Truth-field guardrail: SEO transcreate may only write overlay columns.
  // Reject BEFORE any DB write if payload references a truth-table column.
  const offendingTruthFields = detectTruthFieldsInPayload(payload);
  if (offendingTruthFields.length > 0) {
    return failure({
      code: 'SEO_TRUTH_FIELD_BLOCKED',
      message:
        'Transcreate payload contains truth-table columns owned by backend-dev. Only SEO overlay fields may be written.',
      status: 422,
      details: { blockedFields: offendingTruthFields },
    });
  }

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

  // For product types (hotel / activity / package / transfer), `targetContentId`
  // is the source product id itself — the overlay row is in
  // `website_product_pages` keyed by (website_id, locale, product_type, product_id).
  // When no variant exists yet, seed `targetContentId` from `job.page_id` so
  // review/apply stages have a concrete target. Overlay row is upserted below.
  if (
    (job.page_type === 'hotel' ||
      job.page_type === 'activity' ||
      job.page_type === 'package' ||
      job.page_type === 'transfer') &&
    !targetContentId
  ) {
    targetContentId = job.page_id;
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
  } else if (
    job.page_type === 'hotel' ||
    job.page_type === 'activity' ||
    job.page_type === 'package' ||
    job.page_type === 'transfer'
  ) {
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

  // Upsert applied segments into TM so future drafts can reuse them.
  // Best-effort: never fail an apply because TM write errored.
  try {
    const sourceFields = await collectSourceFieldsForPage({
      admin: input.admin,
      websiteId: input.websiteId,
      accountId: input.accountId,
      pageType: job.page_type,
      sourceContentId: job.page_id,
      sourceLocale: job.source_locale,
    });
    const appliedFields = extractAppliedTargetFields(job.page_type, payload);
    for (const [field, targetText] of Object.entries(appliedFields)) {
      const sourceText = sourceFields[field];
      if (!sourceText || !targetText) continue;
      await upsertTM({
        websiteId: input.websiteId,
        sourceLocale: job.source_locale,
        targetLocale: job.target_locale,
        sourceText,
        targetText,
        context: job.page_type,
        createdBy: input.actorUserId,
      }).catch(() => undefined);
    }
  } catch {
    // swallow — TM is a non-critical augmentation
  }

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

// ---------------------------------------------------------------------------
// Translation Memory + Glossary helpers (Issue #135)
// ---------------------------------------------------------------------------

const TRANSCREATE_TEXT_FIELDS = ['title', 'seoTitle', 'seoDescription', 'body', 'seo_intro'] as const;

function pickStringField(row: Record<string, unknown> | null | undefined, key: string): string | undefined {
  if (!row) return undefined;
  const value = row[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Read the source-side text fields for a page so we can key TM lookups on
 * the *actual* source strings (not user-provided needles). Returns a map
 * keyed by the draft payload field name used in transcreation (`title`,
 * `seoTitle`, etc).
 */
export async function collectSourceFieldsForPage(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  websiteId: string;
  accountId?: string;
  pageType: TranscreatePageType;
  sourceContentId: string;
  sourceLocale: string;
}): Promise<Record<string, string | undefined>> {
  const { admin, websiteId, pageType, sourceContentId } = input;

  if (pageType === 'blog') {
    const { data } = await admin
      .from('website_blog_posts')
      .select('title,seo_title,seo_description,content')
      .eq('website_id', websiteId)
      .eq('id', sourceContentId)
      .maybeSingle();
    const row = (data ?? null) as Record<string, unknown> | null;
    return {
      title: pickStringField(row, 'title'),
      seoTitle: pickStringField(row, 'seo_title'),
      seoDescription: pickStringField(row, 'seo_description'),
      body: pickStringField(row, 'content'),
    };
  }

  if (pageType === 'page') {
    const { data } = await admin
      .from('website_pages')
      .select('title,seo_title,seo_description')
      .eq('website_id', websiteId)
      .eq('id', sourceContentId)
      .maybeSingle();
    const row = (data ?? null) as Record<string, unknown> | null;
    return {
      title: pickStringField(row, 'title'),
      seoTitle: pickStringField(row, 'seo_title'),
      seoDescription: pickStringField(row, 'seo_description'),
    };
  }

  if (pageType === 'destination') {
    const { data } = await admin
      .from('destinations')
      .select('name,seo_title,seo_description')
      .eq('id', sourceContentId)
      .is('deleted_at', null)
      .maybeSingle();
    const row = (data ?? null) as Record<string, unknown> | null;
    return {
      title: pickStringField(row, 'name'),
      seoTitle: pickStringField(row, 'seo_title'),
      seoDescription: pickStringField(row, 'seo_description'),
    };
  }

  // Product types — overlay lives in `website_product_pages`.
  const { data } = await admin
    .from('website_product_pages')
    .select('custom_seo_title,custom_seo_description,seo_intro,target_keyword,body_content')
    .eq('website_id', websiteId)
    .eq('product_type', pageType)
    .eq('product_id', sourceContentId)
    .eq('locale', input.sourceLocale)
    .limit(1)
    .maybeSingle();
  const row = (data ?? null) as Record<string, unknown> | null;
  return {
    seoTitle: pickStringField(row, 'custom_seo_title'),
    seoDescription: pickStringField(row, 'custom_seo_description'),
    seo_intro: pickStringField(row, 'seo_intro'),
    body: isRecord(row?.body_content) ? pickString(row.body_content.body) : undefined,
  };
}

function extractAppliedTargetFields(
  pageType: TranscreatePageType,
  payload: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of TRANSCREATE_TEXT_FIELDS) {
    const value = payload[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      out[field] = value;
    }
  }
  // `body` only makes sense for blog — strip it out for other page types so
  // we don't pollute TM with unrelated copy.
  if (pageType !== 'blog') delete out.body;
  return out;
}

export type TranscreateTMHit = TMHitEntry;

export interface PrepareDraftWithTMInput {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  websiteId: string;
  accountId?: string;
  pageType: TranscreatePageType;
  sourceContentId: string;
  sourceLocale: string;
  targetLocale: string;
  draft: Record<string, unknown>;
  /**
   * When true, exact TM hits pre-fill the draft so the downstream LLM call
   * only regenerates fields without a reliable TM match. Default true.
   */
  applyExactMatches?: boolean;
  exactMatchThreshold?: number;
}

export interface PrepareDraftWithTMResult {
  payload: Record<string, unknown>;
  tmHits: TranscreateTMHit[];
  glossaryPromptBlock: string;
}

/**
 * Pre-LLM TM lookup + glossary injection.
 *
 * 1. Reads source text for each transcreate segment (title, seoTitle, ...)
 * 2. Runs `findTMMatches` (exact + in-memory fuzzy) per segment.
 * 3. Applies exact hits directly into the draft payload.
 * 4. Loads glossary for (source, target) locales and returns a prompt
 *    block suitable for appending to any LLM system prompt.
 *
 * The returned `payload` is what we persist on `seo_transcreation_jobs.payload`.
 * `tmHits` should be stored on `job.metadata.tm_hits` (caller stashes it on
 * the job row — the current schema uses a free-form `metadata` jsonb on
 * seo_translation_memory only, so callers persist `tm_hits` in whatever
 * metadata field exists on their job row, or surface it in the API response).
 */
export async function prepareDraftWithTM(
  input: PrepareDraftWithTMInput,
): Promise<PrepareDraftWithTMResult> {
  const sourceFields = await collectSourceFieldsForPage({
    admin: input.admin,
    websiteId: input.websiteId,
    accountId: input.accountId,
    pageType: input.pageType,
    sourceContentId: input.sourceContentId,
    sourceLocale: input.sourceLocale,
  });

  const enriched = await enrichDraftWithTM({
    websiteId: input.websiteId,
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    pageType: input.pageType,
    draft: input.draft,
    sourceFields,
    threshold: input.exactMatchThreshold ?? 0.95,
  });

  const glossaryEntries = await loadGlossaryForLocales({
    websiteId: input.websiteId,
    locales: [input.sourceLocale, input.targetLocale],
  });
  const glossaryPromptBlock = buildGlossaryPromptBlock(glossaryEntries);

  // Persist tm_hits into payload.metadata so the route doesn't need a
  // separate column. The existing payload is free-form jsonb on the job row.
  const metadata =
    (enriched.payload.metadata && typeof enriched.payload.metadata === 'object' && !Array.isArray(enriched.payload.metadata)
      ? (enriched.payload.metadata as Record<string, unknown>)
      : {}) ?? {};
  enriched.payload.metadata = {
    ...metadata,
    tm_hits: enriched.hits,
    glossary_prompt: glossaryPromptBlock || null,
  };

  return {
    payload: enriched.payload,
    tmHits: enriched.hits,
    glossaryPromptBlock,
  };
}
