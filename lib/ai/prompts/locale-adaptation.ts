import { z } from 'zod';

export const LOCALE_ADAPTATION_SCHEMA_VERSION_V2 = '2.0' as const;
export const LOCALE_ADAPTATION_SCHEMA_VERSION_V2_1 = '2.1' as const;
const SUPPORTED_SCHEMA_VERSIONS = [
  LOCALE_ADAPTATION_SCHEMA_VERSION_V2,
  LOCALE_ADAPTATION_SCHEMA_VERSION_V2_1,
] as const;

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

const LocaleAdaptationTimelineItemSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(1000).optional(),
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

export const LocaleAdaptationOutputSchemaV2_1 = LocaleAdaptationOutputSchemaV2.extend({
  description_long: z.string().min(1).max(20000),
  highlights: z.array(z.string().min(1).max(300)).max(20),
  faq: z.array(LocaleAdaptationBodyFaqItemSchema).max(20),
  recommendations: z.array(z.string().min(1).max(300)).max(20),
  cta_final_text: z.string().min(1).max(320),
  program_timeline: z.array(LocaleAdaptationTimelineItemSchema).max(30),
  inclusions: z.array(z.string().min(1).max(300)).max(30),
  exclusions: z.array(z.string().min(1).max(300)).max(30),
  hero_subtitle: z.string().min(1).max(200),
  category_label: z.string().min(1).max(120),
});

export const LocaleAdaptationOutputEnvelopeSchemaV2 = z.object({
  schema_version: z.literal(LOCALE_ADAPTATION_SCHEMA_VERSION_V2),
  payload_v2: LocaleAdaptationOutputSchemaV2,
});

export const LocaleAdaptationOutputEnvelopeSchemaV2_1 = z.object({
  schema_version: z.literal(LOCALE_ADAPTATION_SCHEMA_VERSION_V2_1),
  payload_v2: LocaleAdaptationOutputSchemaV2_1,
});

export const LocaleAdaptationOutputEnvelopeSchema = z.union([
  LocaleAdaptationOutputEnvelopeSchemaV2,
  LocaleAdaptationOutputEnvelopeSchemaV2_1,
]);

// Backward-compatible alias used across current callers/tests.
export const LocaleAdaptationOutputSchema = LocaleAdaptationOutputSchemaV1;

export type LocaleAdaptationOutputV1 = z.infer<typeof LocaleAdaptationOutputSchemaV1>;
export type LocaleAdaptationOutputV2 = z.infer<typeof LocaleAdaptationOutputSchemaV2>;
export type LocaleAdaptationOutputV2_1 = z.infer<typeof LocaleAdaptationOutputSchemaV2_1>;
export type LocaleAdaptationOutputEnvelopeV2 = z.infer<typeof LocaleAdaptationOutputEnvelopeSchemaV2>;
export type LocaleAdaptationOutputEnvelopeV2_1 = z.infer<typeof LocaleAdaptationOutputEnvelopeSchemaV2_1>;
export type LocaleAdaptationOutputEnvelope = z.infer<typeof LocaleAdaptationOutputEnvelopeSchema>;
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
  requireFullContract?: boolean;
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

function normalizeStringArray(input: unknown, max = 20): string[] {
  if (Array.isArray(input)) {
    return input
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, max);
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, max);
  }

  return [];
}

function normalizeKeywords(input: unknown): string[] {
  return normalizeStringArray(input, 10);
}

function normalizeFaqItems(input: unknown, max = 20): z.infer<typeof LocaleAdaptationBodyFaqItemSchema>[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      question: typeof item.question === 'string' ? item.question.trim() : '',
      answer: typeof item.answer === 'string' ? item.answer.trim() : '',
    }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0)
    .slice(0, max);
}

function normalizeBodyContent(input: unknown): z.infer<typeof LocaleAdaptationBodyContentSchema> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }

  const raw = input as Record<string, unknown>;
  const body = typeof raw.body === 'string' ? raw.body.trim() : '';
  const seoIntro = typeof raw.seo_intro === 'string' ? raw.seo_intro.trim() : '';
  const seoHighlights = normalizeStringArray(raw.seo_highlights, 20);
  const seoFaq = normalizeFaqItems(raw.seo_faq, 20);

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

function deriveV2FromLooseInput(input: Record<string, unknown>, fallbackKeyword?: string): LocaleAdaptationOutputV2 | null {
  const fallback = typeof fallbackKeyword === 'string' ? fallbackKeyword.trim() : '';
  const keywords = normalizeKeywords(input.keywords);
  if (keywords.length === 0 && fallback) keywords.push(fallback);

  const metaTitle = typeof input.meta_title === 'string' ? input.meta_title.trim() : '';
  const metaDesc = typeof input.meta_desc === 'string' ? input.meta_desc.trim() : '';
  const h1 = typeof input.h1 === 'string' ? input.h1.trim() : '';
  const slug = typeof input.slug === 'string' ? input.slug.trim() : '';
  const bodyContent = normalizeBodyContent(input.body_content);

  const candidate: LocaleAdaptationOutputV2 = {
    meta_title: (metaTitle || h1 || 'Localized SEO title').slice(0, SERP_META_TITLE_MAX),
    meta_desc: (metaDesc || 'Localized SEO description').slice(0, SERP_META_DESC_MAX),
    slug: normalizeSlug(slug || h1 || metaTitle || 'localized-content'),
    h1: (h1 || metaTitle || 'Localized heading').slice(0, 100),
    keywords,
    ...(bodyContent ? { body_content: bodyContent } : {}),
  };

  const parsed = LocaleAdaptationOutputSchemaV2.safeParse(candidate);
  return parsed.success ? parsed.data : null;
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
): LocaleAdaptationOutputEnvelope | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const schemaVersion = typeof raw.schema_version === 'string' ? raw.schema_version.trim() : null;

  if (schemaVersion && !SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion as (typeof SUPPORTED_SCHEMA_VERSIONS)[number])) {
    return null;
  }

  const envelopePayload = raw.payload_v2 && typeof raw.payload_v2 === 'object' && !Array.isArray(raw.payload_v2)
    ? (raw.payload_v2 as Record<string, unknown>)
    : null;
  const source = envelopePayload ?? raw;

  if (schemaVersion === LOCALE_ADAPTATION_SCHEMA_VERSION_V2) {
    const payloadCandidate = {
      meta_title: typeof source.meta_title === 'string' ? source.meta_title.trim().slice(0, SERP_META_TITLE_MAX) : '',
      meta_desc: typeof source.meta_desc === 'string' ? source.meta_desc.trim().slice(0, SERP_META_DESC_MAX) : '',
      slug: normalizeSlug(typeof source.slug === 'string' ? source.slug : ''),
      h1: typeof source.h1 === 'string' ? source.h1.trim().slice(0, 100) : '',
      keywords: normalizeKeywords(source.keywords),
      ...(normalizeBodyContent(source.body_content) ? { body_content: normalizeBodyContent(source.body_content) } : {}),
    };

    const parsed = LocaleAdaptationOutputSchemaV2.safeParse(payloadCandidate);
    if (!parsed.success) return null;
    return {
      schema_version: LOCALE_ADAPTATION_SCHEMA_VERSION_V2,
      payload_v2: parsed.data,
    };
  }

  if (schemaVersion === LOCALE_ADAPTATION_SCHEMA_VERSION_V2_1) {
    const parsed = LocaleAdaptationOutputSchemaV2_1.safeParse(source);
    if (!parsed.success) return null;
    return {
      schema_version: LOCALE_ADAPTATION_SCHEMA_VERSION_V2_1,
      payload_v2: parsed.data,
    };
  }

  // Legacy/no-version outputs are normalized into the backward-compatible v2.0 envelope.
  const normalizedV2 = deriveV2FromLooseInput(source, fallbackKeyword);
  if (!normalizedV2) return null;

  return {
    schema_version: LOCALE_ADAPTATION_SCHEMA_VERSION_V2,
    payload_v2: normalizedV2,
  };
}

export function buildLocaleAdaptationPrompt(
  input: LocaleAdaptationPromptInput,
): { system: string; user: string } {
  const neverTranslateTerms = extractNeverTranslateTerms(input.glossaryBlock);
  const sourceCorpus = Object.values(input.sourceFields).join('\n');
  const requiredBrandTerms = neverTranslateTerms.filter((term) =>
    sourceCorpus.toLowerCase().includes(term.toLowerCase()),
  );

  const requireFullContract = input.requireFullContract !== false;
  const schemaVersion = requireFullContract
    ? LOCALE_ADAPTATION_SCHEMA_VERSION_V2_1
    : LOCALE_ADAPTATION_SCHEMA_VERSION_V2;

  const payloadRequirements = requireFullContract
    ? [
        'payload_v2 must include: meta_title, meta_desc, slug, h1, keywords, description_long, highlights, faq, recommendations, cta_final_text, program_timeline, inclusions, exclusions, hero_subtitle, category_label.',
        'payload_v2 may include optional body_content with keys: body, seo_intro, seo_highlights, seo_faq.',
      ]
    : [
        'payload_v2 must include: meta_title, meta_desc, slug, h1, keywords.',
        'payload_v2 may include optional body_content with keys: body, seo_intro, seo_highlights, seo_faq.',
      ];

  const fullContractRules = requireFullContract
    ? [
        '- description_long must preserve the complete localized narrative body.',
        '- highlights, recommendations, inclusions, exclusions are arrays of concise bullet strings.',
        '- faq is an array of {question, answer} objects.',
        '- program_timeline is an array of {title, description?} objects representing ordered itinerary steps.',
        '- cta_final_text should be a direct conversion CTA in target locale.',
        '- hero_subtitle and category_label must be localized and market-appropriate.',
      ]
    : [];

  const system = [
    'You are a senior multilingual SEO transcreation specialist for travel websites.',
    `Convert content from ${input.sourceLocale} to ${input.targetLocale} for page type "${input.pageType}".`,
    'Return JSON envelope only with keys: schema_version, payload_v2.',
    ...payloadRequirements,
    'Rules:',
    '- Glossary terms are non-negotiable: use the exact translation provided.',
    '- TM pre-filled fields are already correct: do not change them.',
    '- Slug must be lowercase, url-safe, hyphen-separated (a-z0-9- only).',
    '- meta_title must stay <= 60 chars for SERP display.',
    '- meta_desc must stay <= 155 chars for SERP display.',
    '- keywords MUST be a JSON array of strings, never a single string.',
    '- If you only have one keyword, return it as one-element array.',
    '- Never translate brand names when listed in glossary.',
    ...fullContractRules,
    ...(requiredBrandTerms.length > 0
      ? [
          `- Required brand tokens: ${requiredBrandTerms.join(', ')}`,
          '- Keep every required brand token verbatim (exact casing) in meta_title or h1.',
        ]
      : []),
    '- Do not add markdown fences or explanations.',
    `Strict output example:\n{"schema_version":"${schemaVersion}","payload_v2":{"meta_title":"...","meta_desc":"...","slug":"...","h1":"...","keywords":["keyword 1","keyword 2"]}}`,
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
