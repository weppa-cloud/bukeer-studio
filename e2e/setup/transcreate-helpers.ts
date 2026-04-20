/**
 * EPIC #214 · W5 #219 — Transcreate lifecycle helpers.
 *
 * Parameterized helpers consumed by specs under `e2e/tests/pilot/transcreate/`.
 * All specs tag `test.describe` with `@pilot-w5` so the session-pool runner
 * narrows via `--grep "@pilot-w5"` (the `pilot` Playwright project accepts
 * `@pilot-w4` OR `@pilot-w5`).
 *
 * Design principles:
 *   - Consume W4 `seedPilot('translation-ready')` fixture (pkg + act + blog).
 *   - Seed a decision-grade `seo_keyword_candidates` row per test run so the
 *     transcreate route's TARGET_RERESEARCH_REQUIRED 409 gate is satisfied.
 *   - Use per-run unique `target_locale` keys so multiple test runs can
 *     coexist without FK / uniqueness collisions; DB cleanup is scoped to
 *     the exact locale the test seeded.
 *   - `executeTranscreate({...})` performs draft → reviewed → applied via
 *     `/api/seo/content-intelligence/transcreate` with `draftSource: 'manual'`
 *     — the same deterministic path used by `seo-transcreate-v2-lifecycle.spec.ts`
 *     which avoids flakiness from real LLM calls.
 *   - `readTranscreateJob(jobId)` + `assertLocalizedVariantsApplied(...)` are
 *     pure DB reads — no HTTP — so they work identically on chromium +
 *     firefox and are safe to call from SSR-assertion specs.
 *
 * ADR references:
 *   - ADR-020: hreflang gate (`appliedTranscreationJobIds` non-empty).
 *   - ADR-021: transcreate state machine + 409 semantics.
 *   - ADR-023: session pool — no :3000 direct.
 *   - ADR-025: hotel transcreate OUT OF SCOPE (Flutter-owner).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { APIRequestContext, Page } from '@playwright/test';

const TRANSCREATE_ROUTE = '/api/seo/content-intelligence/transcreate';
const BULK_ROUTE = '/api/seo/translations/bulk';
const STREAM_ROUTE = '/api/seo/content-intelligence/transcreate/stream';

// Shared tag so every W5 spec gets picked up by `--grep "@pilot-w5"`.
export const PILOT_W5_TAG = '@pilot-w5';

export type PilotContentType = 'pkg' | 'act' | 'blog';

export interface ContentTypeDescriptor {
  /** Shorthand for specs + test titles. */
  id: PilotContentType;
  /** Value stored in `seo_transcreation_jobs.page_type`. */
  pageType: 'package' | 'activity' | 'blog';
  /** Spanish URL segment on the public site (es-CO). */
  esSegment: 'paquetes' | 'actividades' | 'blog';
  /** Public URL segment under `/en/...`. Same `blog` on blog, different for products. */
  enSegment: 'paquetes' | 'actividades' | 'blog';
  /** Human-readable label for logs + playbook. */
  label: string;
}

export const CONTENT_TYPES: Record<PilotContentType, ContentTypeDescriptor> = {
  pkg: {
    id: 'pkg',
    pageType: 'package',
    esSegment: 'paquetes',
    enSegment: 'paquetes',
    label: 'Package',
  },
  act: {
    id: 'act',
    pageType: 'activity',
    esSegment: 'actividades',
    enSegment: 'actividades',
    label: 'Activity',
  },
  blog: {
    id: 'blog',
    pageType: 'blog',
    esSegment: 'blog',
    enSegment: 'blog',
    label: 'Blog post',
  },
};

export function allContentTypes(): PilotContentType[] {
  return ['pkg', 'act', 'blog'];
}

// --- Admin client ----------------------------------------------------------

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('W5: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// --- Decision-grade keyword candidate seed ---------------------------------

export interface DecisionGradeSeedInput {
  admin: SupabaseClient;
  websiteId: string;
  contentType: PilotContentType;
  targetLocale: string;
  country?: string;
  language?: string;
  targetKeyword: string;
}

export interface DecisionGradeSeedResult {
  runId: string;
  candidateId: string;
}

/**
 * Seeds one `seo_keyword_candidates` row with `confidence='live'` +
 * `decision_grade_ready=true` so the transcreate route does NOT reject with
 * `TARGET_RERESEARCH_REQUIRED`. Mirrors the pattern in
 * `e2e/tests/seo-transcreate-v2-lifecycle.spec.ts`.
 */
export async function seedDecisionGradeCandidate(
  input: DecisionGradeSeedInput,
): Promise<DecisionGradeSeedResult> {
  const country = input.country ?? 'US';
  const language = input.language ?? 'en';
  const runId = crypto.randomUUID();
  const candidateId = crypto.randomUUID();
  const pageType = CONTENT_TYPES[input.contentType].pageType;

  const { error: runError } = await input.admin
    .from('seo_keyword_research_runs')
    .insert({
      id: runId,
      website_id: input.websiteId,
      content_type: pageType,
      country,
      language,
      locale: input.targetLocale,
      seeds: [input.targetKeyword],
      source: 'dataforseo',
      confidence: 'live',
      decision_grade_ready: true,
    });
  if (runError) {
    throw new Error(
      `W5: seedDecisionGradeCandidate research_run insert failed: ${runError.message}`,
    );
  }

  const { error: candidateError } = await input.admin
    .from('seo_keyword_candidates')
    .insert({
      id: candidateId,
      research_run_id: runId,
      website_id: input.websiteId,
      content_type: pageType,
      country,
      language,
      locale: input.targetLocale,
      keyword: input.targetKeyword,
      source: 'dataforseo',
      confidence: 'live',
      decision_grade_ready: true,
      seasonality_status: 'available',
      serp_top_competitors: [{ domain: 'example.com' }],
    });
  if (candidateError) {
    throw new Error(
      `W5: seedDecisionGradeCandidate candidate insert failed: ${candidateError.message}`,
    );
  }

  return { runId, candidateId };
}

export async function cleanupDecisionGradeCandidate(
  admin: SupabaseClient,
  seed: DecisionGradeSeedResult,
): Promise<void> {
  await admin.from('seo_keyword_candidates').delete().eq('id', seed.candidateId);
  await admin.from('seo_keyword_research_runs').delete().eq('id', seed.runId);
}

// --- Transcreate workflow helpers ------------------------------------------

export interface ExecuteTranscreateInput {
  page: Page;
  websiteId: string;
  contentType: PilotContentType;
  sourceContentId: string;
  targetLocale: string;
  targetKeyword: string;
  sourceKeyword: string;
  country?: string;
  language?: string;
  /** Optional payload override; defaults to a deterministic v2 payload. */
  payloadV2?: Record<string, unknown>;
  /** When true, stops after `draft` — useful for abort / 409 specs. */
  stopAfter?: 'draft' | 'reviewed' | 'applied';
}

export interface ExecuteTranscreateResult {
  jobId: string;
  status: 'draft' | 'reviewed' | 'applied';
  targetLocale: string;
  targetKeyword: string;
  payloadV2: Record<string, unknown>;
  /** The last API response body — useful for 409 / error assertions. */
  lastBody: Record<string, unknown> | null;
}

function defaultPayloadV2(input: {
  contentType: PilotContentType;
  targetKeyword: string;
}): Record<string, unknown> {
  const stamp = Date.now().toString().slice(-8);
  const body_content = {
    body:
      input.contentType === 'blog'
        ? `W5 blog body ${stamp}. Cartagena travel guide in English — manual correction line inserted by pilot transcreate lifecycle spec.`
        : `W5 body ${stamp}. Colombia experience with bilingual narration.`,
    seo_intro: `W5 intro ${stamp}. Plan your trip with a bilingual travel designer.`,
    seo_highlights: [
      `W5 highlight one ${stamp}`,
      `W5 highlight two ${stamp}`,
      `W5 highlight three ${stamp}`,
    ],
    seo_faq: [
      {
        question: `What is included? (${stamp})`,
        answer: `W5 manual correction — authoritative EN answer ${stamp}.`,
      },
    ],
  };
  return {
    meta_title: `W5 EN title ${input.contentType} ${stamp}`.slice(0, 70),
    meta_desc: `W5 EN description — pilot transcreate ${input.contentType} ${stamp}. Manual correction persisted.`
      .slice(0, 160),
    slug: `w5-${input.contentType}-${stamp}`,
    h1: `W5 EN heading ${input.contentType} ${stamp}`.slice(0, 100),
    keywords: [input.targetKeyword, `w5 pilot ${input.contentType}`],
    body_content,
  };
}

async function postTranscreate(
  page: Page,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> | null }> {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await page.request.post(TRANSCREATE_ROUTE, { data: payload });
    const status = response.status();
    const text = await response.text();
    let body: Record<string, unknown> | null = null;
    if (text) {
      try {
        body = JSON.parse(text) as Record<string, unknown>;
      } catch {
        body = { parseError: true, rawText: text };
      }
    }
    const bodyCode =
      typeof body?.code === 'string'
        ? (body.code as string)
        : typeof (body as { error?: { code?: string } } | null)?.error?.code === 'string'
          ? ((body as { error: { code: string } }).error.code)
          : '';
    const retryable =
      status === 401 || status === 429 || bodyCode === 'AUTH_EXPIRED' || bodyCode === 'RATE_LIMITED';
    if (!retryable || attempt === maxAttempts - 1) {
      return { ok: response.ok(), status, body };
    }
    await page.waitForTimeout(200 * (attempt + 1));
  }
  return { ok: false, status: 0, body: null };
}

/**
 * Drives the full transcreate workflow via HTTP:
 *   create_draft → review → apply  (with `draftSource: 'manual'`).
 *
 * Returns the job id + last status + the exact payload so specs can assert
 * public-render content parity later.
 */
export async function executeTranscreate(
  input: ExecuteTranscreateInput,
): Promise<ExecuteTranscreateResult> {
  const country = input.country ?? 'US';
  const language = input.language ?? 'en';
  const payloadV2 = input.payloadV2 ?? defaultPayloadV2({
    contentType: input.contentType,
    targetKeyword: input.targetKeyword,
  });
  const pageType = CONTENT_TYPES[input.contentType].pageType;

  const base = {
    websiteId: input.websiteId,
    sourceContentId: input.sourceContentId,
    pageType,
    sourceLocale: 'es-CO',
    targetLocale: input.targetLocale,
    country,
    language,
    sourceKeyword: input.sourceKeyword,
    targetKeyword: input.targetKeyword,
  };

  // 1. create_draft
  const draft = await postTranscreate(input.page, {
    ...base,
    action: 'create_draft',
    draftSource: 'manual',
    schemaVersion: '2.0',
    payloadV2,
    draft: {},
  });
  if (!draft.ok) {
    throw new Error(
      `W5: create_draft failed status=${draft.status} body=${JSON.stringify(draft.body)}`,
    );
  }
  const jobId = String(
    (draft.body as { data?: { job?: { id?: string } } })?.data?.job?.id ?? '',
  );
  if (!jobId) {
    throw new Error(`W5: create_draft response missing data.job.id: ${JSON.stringify(draft.body)}`);
  }
  if (input.stopAfter === 'draft') {
    return { jobId, status: 'draft', targetLocale: input.targetLocale, targetKeyword: input.targetKeyword, payloadV2, lastBody: draft.body };
  }

  // 2. review
  const review = await postTranscreate(input.page, { ...base, action: 'review', jobId });
  if (!review.ok) {
    throw new Error(
      `W5: review failed status=${review.status} body=${JSON.stringify(review.body)}`,
    );
  }
  if (input.stopAfter === 'reviewed') {
    return { jobId, status: 'reviewed', targetLocale: input.targetLocale, targetKeyword: input.targetKeyword, payloadV2, lastBody: review.body };
  }

  // 3. apply
  const apply = await postTranscreate(input.page, { ...base, action: 'apply', jobId });
  if (!apply.ok) {
    throw new Error(
      `W5: apply failed status=${apply.status} body=${JSON.stringify(apply.body)}`,
    );
  }
  return {
    jobId,
    status: 'applied',
    targetLocale: input.targetLocale,
    targetKeyword: input.targetKeyword,
    payloadV2,
    lastBody: apply.body,
  };
}

export interface BulkApplyInput {
  page: Page;
  websiteId: string;
  jobIds: string[];
  action: 'review' | 'apply';
}

export async function bulkTranslationAction(
  input: BulkApplyInput,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> | null }> {
  const response = await input.page.request.post(BULK_ROUTE, {
    data: {
      websiteId: input.websiteId,
      jobIds: input.jobIds,
      action: input.action,
    },
  });
  const status = response.status();
  let body: Record<string, unknown> | null = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      body = { parseError: true, rawText: text };
    }
  }
  return { ok: response.ok(), status, body };
}

// --- DB assertions ---------------------------------------------------------

export interface TranscreateJobRow {
  id: string;
  status: string;
  page_type: string;
  page_id: string | null;
  target_locale: string;
  source_locale: string;
  updated_at: string;
  created_at: string;
}

export async function readTranscreateJob(
  admin: SupabaseClient,
  jobId: string,
): Promise<TranscreateJobRow | null> {
  const { data, error } = await admin
    .from('seo_transcreation_jobs')
    .select('id,status,page_type,page_id,target_locale,source_locale,updated_at,created_at')
    .eq('id', jobId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as TranscreateJobRow;
}

export interface LocalizedVariantRow {
  status: string;
  source_entity_id: string;
  target_entity_id: string | null;
  target_locale: string;
  updated_at: string;
}

export async function readLocalizedVariant(input: {
  admin: SupabaseClient;
  websiteId: string;
  contentType: PilotContentType;
  sourceEntityId: string;
  targetLocale: string;
}): Promise<LocalizedVariantRow | null> {
  const { data } = await input.admin
    .from('seo_localized_variants')
    .select('status,source_entity_id,target_entity_id,target_locale,updated_at')
    .eq('website_id', input.websiteId)
    .eq('page_type', CONTENT_TYPES[input.contentType].pageType)
    .eq('source_entity_id', input.sourceEntityId)
    .eq('target_locale', input.targetLocale)
    .maybeSingle();
  return (data as unknown as LocalizedVariantRow | null) ?? null;
}

/**
 * Assert the overlay row is present post-apply and contains the localized
 * fields the test expects. Pkg + act overlays land in `website_product_pages`;
 * blog overlays mutate `website_blog_posts.content` directly.
 */
export async function assertLocalizedVariantsApplied(input: {
  admin: SupabaseClient;
  websiteId: string;
  contentType: PilotContentType;
  sourceEntityId: string;
  targetLocale: string;
  expected: { metaTitle: string; metaDesc: string };
}): Promise<{ ok: boolean; reason?: string; row?: unknown }> {
  if (input.contentType === 'blog') {
    const variant = await readLocalizedVariant({
      admin: input.admin,
      websiteId: input.websiteId,
      contentType: 'blog',
      sourceEntityId: input.sourceEntityId,
      targetLocale: input.targetLocale,
    });
    const targetId = variant?.target_entity_id ?? null;
    if (!targetId) {
      return { ok: false, reason: 'blog variant missing target_entity_id' };
    }
    const { data } = await input.admin
      .from('website_blog_posts')
      .select('id,seo_title,seo_description,locale')
      .eq('id', targetId)
      .maybeSingle();
    if (!data) return { ok: false, reason: 'blog target row not found', row: { targetId } };
    if (data.seo_title !== input.expected.metaTitle) {
      return { ok: false, reason: `blog seo_title mismatch: got ${data.seo_title}`, row: data };
    }
    return { ok: true, row: data };
  }

  const pageType = CONTENT_TYPES[input.contentType].pageType;
  const { data } = await input.admin
    .from('website_product_pages')
    .select('id,custom_seo_title,custom_seo_description,locale,product_type,product_id')
    .eq('website_id', input.websiteId)
    .eq('product_type', pageType)
    .eq('product_id', input.sourceEntityId)
    .eq('locale', input.targetLocale)
    .maybeSingle();
  if (!data) return { ok: false, reason: 'overlay row missing' };
  if (data.custom_seo_title !== input.expected.metaTitle) {
    return {
      ok: false,
      reason: `custom_seo_title mismatch: got ${data.custom_seo_title}`,
      row: data,
    };
  }
  return { ok: true, row: data };
}

// --- Cleanup ---------------------------------------------------------------

export interface TranscreateCleanupInput {
  admin: SupabaseClient;
  websiteId: string;
  contentType: PilotContentType;
  sourceEntityId: string;
  targetLocale: string;
  jobId?: string;
  seed?: DecisionGradeSeedResult;
}

/**
 * Narrow cleanup: deletes the overlay + variant + job + decision-grade rows
 * for one (contentType, source, targetLocale) tuple. Never truncates.
 */
export async function cleanupTranscreateRun(
  input: TranscreateCleanupInput,
): Promise<void> {
  const pageType = CONTENT_TYPES[input.contentType].pageType;

  // 1. Variant (read target_entity_id for blog cleanup before delete).
  const variant = await readLocalizedVariant({
    admin: input.admin,
    websiteId: input.websiteId,
    contentType: input.contentType,
    sourceEntityId: input.sourceEntityId,
    targetLocale: input.targetLocale,
  });

  // 2. Overlay (pkg + act) / en-US blog target row cleanup.
  if (input.contentType === 'blog' && variant?.target_entity_id) {
    await input.admin
      .from('website_blog_posts')
      .delete()
      .eq('id', variant.target_entity_id);
  } else {
    await input.admin
      .from('website_product_pages')
      .delete()
      .eq('website_id', input.websiteId)
      .eq('product_type', pageType)
      .eq('product_id', input.sourceEntityId)
      .eq('locale', input.targetLocale);
  }

  // 3. Variant
  await input.admin
    .from('seo_localized_variants')
    .delete()
    .eq('website_id', input.websiteId)
    .eq('page_type', pageType)
    .eq('source_entity_id', input.sourceEntityId)
    .eq('target_locale', input.targetLocale);

  // 4. Jobs (the explicit one + any stragglers for this tuple).
  if (input.jobId) {
    await input.admin.from('seo_transcreation_jobs').delete().eq('id', input.jobId);
  }
  await input.admin
    .from('seo_transcreation_jobs')
    .delete()
    .eq('website_id', input.websiteId)
    .eq('page_type', pageType)
    .eq('page_id', input.sourceEntityId)
    .eq('target_locale', input.targetLocale);

  // 5. Decision-grade candidate + research run.
  if (input.seed) {
    await cleanupDecisionGradeCandidate(input.admin, input.seed);
  }
}

// --- Unique target locale --------------------------------------------------

/**
 * Returns a unique target_locale token scoped to a test run so multiple
 * parallel projects (chromium + firefox) don't collide on the
 * `(website_id, page_type, source_entity_id, target_locale)` unique index.
 *
 * Format: `en-w5<cc>-<stamp>` where cc is the content-type code. Length fits
 * within the 16-char `LocaleSchema` cap.
 */
export function uniqueTargetLocale(contentType: PilotContentType): string {
  const stamp = Date.now().toString().slice(-6);
  const cc = contentType;
  return `en-w5${cc}-${stamp}`;
}

// --- ISR revalidate --------------------------------------------------------

export interface RevalidateInput {
  request: APIRequestContext;
  subdomain: string;
  type?: 'package' | 'activity';
  slug?: string;
  path?: string;
}

/**
 * Calls `/api/revalidate`. Mirrors `pilot/helpers.ts::waitForRevalidate` but
 * kept here so W5 specs can import from one surface. Returns skip info when
 * `E2E_REVALIDATE_SECRET` (or `REVALIDATE_SECRET`) is absent.
 */
export async function triggerRevalidate(input: RevalidateInput): Promise<{
  paths: string[];
  status: number;
  skipped: boolean;
  reason?: string;
}> {
  const secret =
    process.env.E2E_REVALIDATE_SECRET?.trim() || process.env.REVALIDATE_SECRET?.trim() || '';
  if (!secret) {
    return {
      paths: [],
      status: 0,
      skipped: true,
      reason: 'E2E_REVALIDATE_SECRET / REVALIDATE_SECRET not set — ISR revalidate contract not exercised.',
    };
  }
  const response = await input.request.post('/api/revalidate', {
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    data: {
      subdomain: input.subdomain,
      ...(input.type ? { type: input.type } : {}),
      ...(input.slug ? { slug: input.slug } : {}),
      ...(input.path ? { path: input.path } : {}),
    },
  });
  const status = response.status();
  if (status >= 500) {
    return {
      paths: [],
      status,
      skipped: true,
      reason: `/api/revalidate returned ${status} — likely missing server-side secret.`,
    };
  }
  const body = (await response.json().catch(() => null)) as {
    data?: { paths?: string[] };
  } | null;
  const paths = Array.isArray(body?.data?.paths) ? (body!.data!.paths as string[]) : [];
  return { paths, status, skipped: false };
}

// --- Public URL helper -----------------------------------------------------

export interface PublicUrlInput {
  subdomain: string;
  contentType: PilotContentType;
  slug: string;
  locale: 'es-CO' | 'en-US';
}

/**
 * Builds the deterministic public URL for a seeded fixture. Mirrors the
 * authority at `lib/seo/locale-routing.ts::buildPublicLocalizedPath` — en-US
 * inserts `/en` prefix; es-CO (default tenant locale) stays flat.
 */
export function buildPublicUrl(input: PublicUrlInput): string {
  const desc = CONTENT_TYPES[input.contentType];
  const isEn = input.locale === 'en-US';
  const seg = isEn ? desc.enSegment : desc.esSegment;
  const prefix = isEn ? '/en' : '';
  return `/site/${input.subdomain}${prefix}/${seg}/${input.slug}`;
}

// --- Stream helper ---------------------------------------------------------

/**
 * Thin wrapper over the streaming transcreate endpoint. Specs that want to
 * verify the stream surface (AC-W5-2) call this; the helper does NOT drive
 * the full lifecycle — for end-to-end state transitions use `executeTranscreate`.
 *
 * Returns the raw response + body so specs can assert status + payload.
 */
export async function postTranscreateStream(input: {
  page: Page;
  websiteId: string;
  contentType: PilotContentType;
  sourceContentId: string;
  targetLocale: string;
  targetKeyword: string;
  sourceKeyword: string;
  country?: string;
  language?: string;
}): Promise<{ status: number; body: string }> {
  const response = await input.page.request.post(STREAM_ROUTE, {
    data: {
      websiteId: input.websiteId,
      sourceContentId: input.sourceContentId,
      pageType: CONTENT_TYPES[input.contentType].pageType,
      sourceLocale: 'es-CO',
      targetLocale: input.targetLocale,
      country: input.country ?? 'US',
      language: input.language ?? 'en',
      sourceKeyword: input.sourceKeyword,
      targetKeyword: input.targetKeyword,
      draft: {},
    },
  });
  const status = response.status();
  const body = await response.text();
  return { status, body };
}

// --- Export admin factory --------------------------------------------------

export { adminClient as createAdminClient };
