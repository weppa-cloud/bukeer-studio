import { z } from 'zod';

export const LocaleAdaptationOutputSchema = z.object({
  meta_title: z.string().min(1).max(70),
  meta_desc: z.string().min(1).max(160),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  h1: z.string().min(1).max(100),
  keywords: z.array(z.string()).max(10),
});

export type LocaleAdaptationOutput = z.infer<typeof LocaleAdaptationOutputSchema>;

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

/**
 * Normalize raw model output into the transcreate contract shape.
 * Accepts slight schema drift (e.g. keywords as string) and enforces
 * SERP-safe limits before final schema validation.
 */
export function normalizeLocaleAdaptationOutput(
  input: unknown,
  fallbackKeyword?: string,
): LocaleAdaptationOutput | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const metaTitleRaw = typeof raw.meta_title === 'string' ? raw.meta_title.trim() : '';
  const metaDescRaw = typeof raw.meta_desc === 'string' ? raw.meta_desc.trim() : '';
  const h1Raw = typeof raw.h1 === 'string' ? raw.h1.trim() : '';
  const slugRaw = typeof raw.slug === 'string' ? raw.slug.trim() : '';
  const fallback = typeof fallbackKeyword === 'string' ? fallbackKeyword.trim() : '';

  const keywords = normalizeKeywords(raw.keywords);
  if (keywords.length === 0 && fallback) {
    keywords.push(fallback);
  }

  const normalized = {
    meta_title: metaTitleRaw.slice(0, SERP_META_TITLE_MAX),
    meta_desc: metaDescRaw.slice(0, SERP_META_DESC_MAX),
    slug: normalizeSlug(slugRaw || h1Raw || metaTitleRaw || 'localized-content'),
    h1: h1Raw.slice(0, 100),
    keywords,
  };

  const validated = LocaleAdaptationOutputSchema.safeParse(normalized);
  return validated.success ? validated.data : null;
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
    'Return JSON only with keys: meta_title, meta_desc, slug, h1, keywords.',
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
    '{"meta_title":"...","meta_desc":"...","slug":"...","h1":"...","keywords":["keyword 1","keyword 2"]}',
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
