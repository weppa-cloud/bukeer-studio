import { z } from 'zod';

export const LOCALE_ADAPTATION_SCHEMA_VERSION_V2 = '2.0' as const;

export const LocaleAdaptationBodyFaqItemSchema = z.object({
  question: z.string().min(1).max(240),
  answer: z.string().min(1).max(2000),
});

export const LocaleAdaptationBodyContentSchema = z.object({
  body: z.string().min(1).max(20000).optional(),
  seo_intro: z.string().min(1).max(2000).optional(),
  seo_highlights: z.array(z.string().min(1).max(300)).max(20).optional(),
  seo_faq: z.array(LocaleAdaptationBodyFaqItemSchema).max(20).optional(),
});

export const LocaleAdaptationOutputSchemaV1 = z.object({
  meta_title: z.string().min(1).max(70),
  meta_desc: z.string().min(1).max(160),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  h1: z.string().min(1).max(100),
  keywords: z.array(z.string()).max(10),
});

export const LocaleAdaptationOutputSchemaV2 = LocaleAdaptationOutputSchemaV1.extend({
  body_content: LocaleAdaptationBodyContentSchema.optional(),
});

export const LocaleAdaptationOutputEnvelopeSchemaV2 = z.object({
  schema_version: z.literal(LOCALE_ADAPTATION_SCHEMA_VERSION_V2),
  payload_v2: LocaleAdaptationOutputSchemaV2,
});

// Backward-compatible alias used across current callers/tests.
export const LocaleAdaptationOutputSchema = LocaleAdaptationOutputSchemaV1;

export type LocaleAdaptationOutputV1 = z.infer<typeof LocaleAdaptationOutputSchemaV1>;
export type LocaleAdaptationOutputV2 = z.infer<typeof LocaleAdaptationOutputSchemaV2>;
export type LocaleAdaptationOutputEnvelopeV2 = z.infer<typeof LocaleAdaptationOutputEnvelopeSchemaV2>;
export type LocaleAdaptationOutput = LocaleAdaptationOutputV1;

export const SERP_META_TITLE_MAX = 60;
export const SERP_META_DESC_MAX = 155;

export interface LocaleAdaptationPromptInput {
  sourceLocale: string;
  targetLocale: string;
  pageType: string;
  sourceFields: Record<string, string>;
  glossaryBlock: string;
  tmHints: Array<{ field: string; source: string; target: string }>;
}

function extractNeverTranslateTerms(glossaryBlock: string): string[] {
  const line = glossaryBlock
    .split('\n')
    .find((entry) => entry.trim().toLowerCase().startsWith('- never translate:'));
  if (!line) return [];
  const [, rest = ''] = line.split(':', 2);
  return rest
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function normalizeKeywords(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  if (typeof input === 'string') {
    const parsed = input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    return parsed.slice(0, 10);
  }

  return [];
}

function normalizeBodyContent(input: unknown): z.infer<typeof LocaleAdaptationBodyContentSchema> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }

  const raw = input as Record<string, unknown>;
  const body = typeof raw.body === 'string' ? raw.body.trim() : '';
  const seoIntro = typeof raw.seo_intro === 'string' ? raw.seo_intro.trim() : '';
  const seoHighlights = Array.isArray(raw.seo_highlights)
    ? raw.seo_highlights
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];
  const seoFaq = Array.isArray(raw.seo_faq)
    ? raw.seo_faq
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
        .map((item) => ({
          question: typeof item.question === 'string' ? item.question.trim() : '',
          answer: typeof item.answer === 'string' ? item.answer.trim() : '',
        }))
        .filter((item) => item.question.length > 0 && item.answer.length > 0)
        .slice(0, 20)
    : [];

  if (!body && !seoIntro && seoHighlights.length === 0 && seoFaq.length === 0) {
    return undefined;
  }

  const normalized: z.infer<typeof LocaleAdaptationBodyContentSchema> = {};
  if (body) normalized.body = body;
  if (seoIntro) normalized.seo_intro = seoIntro;
  if (seoHighlights.length > 0) normalized.seo_highlights = seoHighlights;
  if (seoFaq.length > 0) normalized.seo_faq = seoFaq;

  const validated = LocaleAdaptationBodyContentSchema.safeParse(normalized);
  return validated.success ? validated.data : undefined;
}

function toEnvelopeV2(
  payload: LocaleAdaptationOutputV1,
  bodyContent?: z.infer<typeof LocaleAdaptationBodyContentSchema>,
): LocaleAdaptationOutputEnvelopeV2 {
  return {
    schema_version: LOCALE_ADAPTATION_SCHEMA_VERSION_V2,
    payload_v2: {
      ...payload,
      ...(bodyContent ? { body_content: bodyContent } : {}),
    },
  };
}

/**
 * Normalize raw model output into the transcreate contract shape.
 * Accepts slight schema drift (e.g. keywords as string) and enforces
 * SERP-safe limits before final schema validation.
 */
export function normalizeLocaleAdaptationOutput(
  input: unknown,
  fallbackKeyword?: string,
): LocaleAdaptationOutputV1 | null {
  const envelope = normalizeLocaleAdaptationOutputEnvelope(input, fallbackKeyword);
  if (!envelope) return null;
  const { payload_v2 } = envelope;
  return {
    meta_title: payload_v2.meta_title,
    meta_desc: payload_v2.meta_desc,
    slug: payload_v2.slug,
    h1: payload_v2.h1,
    keywords: payload_v2.keywords,
  };
}

export function normalizeLocaleAdaptationOutputEnvelope(
  input: unknown,
  fallbackKeyword?: string,
): LocaleAdaptationOutputEnvelopeV2 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const raw = input as Record<string, unknown>;
  if (typeof raw.schema_version === 'string' && raw.schema_version !== LOCALE_ADAPTATION_SCHEMA_VERSION_V2) {
    return null;
  }
  const envelopeCandidate = raw.payload_v2 && typeof raw.payload_v2 === 'object' && !Array.isArray(raw.payload_v2)
    ? (raw.payload_v2 as Record<string, unknown>)
    : null;
  const source = envelopeCandidate ?? raw;
  const metaTitleRaw = typeof raw.meta_title === 'string' ? raw.meta_title.trim() : '';
  const metaDescRaw = typeof raw.meta_desc === 'string' ? raw.meta_desc.trim() : '';
  const h1Raw = typeof raw.h1 === 'string' ? raw.h1.trim() : '';
  const slugRaw = typeof raw.slug === 'string' ? raw.slug.trim() : '';
  const fallback = typeof fallbackKeyword === 'string' ? fallbackKeyword.trim() : '';
  const payloadMetaTitle = typeof source.meta_title === 'string' ? source.meta_title.trim() : metaTitleRaw;
  const payloadMetaDesc = typeof source.meta_desc === 'string' ? source.meta_desc.trim() : metaDescRaw;
  const payloadH1 = typeof source.h1 === 'string' ? source.h1.trim() : h1Raw;
  const payloadSlug = typeof source.slug === 'string' ? source.slug.trim() : slugRaw;

  const keywords = normalizeKeywords(source.keywords);
  if (keywords.length === 0 && fallback) {
    keywords.push(fallback);
  }

  const normalizedV1: LocaleAdaptationOutputV1 = {
    meta_title: payloadMetaTitle.slice(0, SERP_META_TITLE_MAX),
    meta_desc: payloadMetaDesc.slice(0, SERP_META_DESC_MAX),
    slug: normalizeSlug(payloadSlug || payloadH1 || payloadMetaTitle || 'localized-content'),
    h1: payloadH1.slice(0, 100),
    keywords,
  };

  const validatedV1 = LocaleAdaptationOutputSchemaV1.safeParse(normalizedV1);
  if (!validatedV1.success) return null;

  const bodyContent = normalizeBodyContent(source.body_content);
  const envelope = toEnvelopeV2(validatedV1.data, bodyContent);
  const validatedEnvelope = LocaleAdaptationOutputEnvelopeSchemaV2.safeParse(envelope);
  return validatedEnvelope.success ? validatedEnvelope.data : null;
}

export function buildLocaleAdaptationPrompt(
  input: LocaleAdaptationPromptInput,
): { system: string; user: string } {
  const neverTranslateTerms = extractNeverTranslateTerms(input.glossaryBlock);
  const sourceCorpus = Object.values(input.sourceFields).join('\n');
  const requiredBrandTerms = neverTranslateTerms.filter((term) =>
    sourceCorpus.toLowerCase().includes(term.toLowerCase()),
  );

  const system = [
    'You are a senior multilingual SEO transcreation specialist for travel websites.',
    `Convert content from ${input.sourceLocale} to ${input.targetLocale} for page type "${input.pageType}".`,
    'Return JSON envelope only with keys: schema_version, payload_v2.',
    'payload_v2 must include: meta_title, meta_desc, slug, h1, keywords.',
    'payload_v2 may include optional body_content with keys: body, seo_intro, seo_highlights, seo_faq.',
    'Rules:',
    '- Glossary terms are non-negotiable: use the exact translation provided.',
    '- TM pre-filled fields are already correct: do not change them.',
    '- Slug must be lowercase, url-safe, hyphen-separated (a-z0-9- only).',
    '- meta_title must stay <= 60 chars for SERP display.',
    '- meta_desc must stay <= 155 chars for SERP display.',
    '- keywords MUST be a JSON array of strings, never a single string.',
    '- If you only have one keyword, return it as one-element array.',
    '- Never translate brand names when listed in glossary.',
    ...(requiredBrandTerms.length > 0
      ? [
          `- Required brand tokens: ${requiredBrandTerms.join(', ')}`,
          '- Keep every required brand token verbatim (exact casing) in meta_title or h1.',
        ]
      : []),
    '- Do not add markdown fences or explanations.',
    'Strict output example:',
    '{"schema_version":"2.0","payload_v2":{"meta_title":"...","meta_desc":"...","slug":"...","h1":"...","keywords":["keyword 1","keyword 2"]}}',
  ].join('\n');

  const userSections = [
    `source_locale: ${input.sourceLocale}`,
    `target_locale: ${input.targetLocale}`,
    `page_type: ${input.pageType}`,
    `source_fields: ${JSON.stringify(input.sourceFields, null, 2)}`,
    `tm_hints_exact: ${JSON.stringify(input.tmHints, null, 2)}`,
    `required_brand_terms: ${JSON.stringify(requiredBrandTerms)}`,
    `glossary:\n${input.glossaryBlock || '(empty)'}`,
    'Produce final JSON now.',
  ];

  return {
    system,
    user: userSections.join('\n\n'),
  };
}
