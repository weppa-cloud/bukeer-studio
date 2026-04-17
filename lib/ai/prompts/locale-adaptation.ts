import { z } from 'zod';

export const LocaleAdaptationOutputSchema = z.object({
  meta_title: z.string().min(1).max(70),
  meta_desc: z.string().min(1).max(160),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  h1: z.string().min(1).max(100),
  keywords: z.array(z.string()).max(10),
});

export type LocaleAdaptationOutput = z.infer<typeof LocaleAdaptationOutputSchema>;

export interface LocaleAdaptationPromptInput {
  sourceLocale: string;
  targetLocale: string;
  pageType: string;
  sourceFields: Record<string, string>;
  glossaryBlock: string;
  tmHints: Array<{ field: string; source: string; target: string }>;
}

export function buildLocaleAdaptationPrompt(
  input: LocaleAdaptationPromptInput,
): { system: string; user: string } {
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
    '- Never translate brand names when listed in glossary.',
    '- Do not add markdown fences or explanations.',
  ].join('\n');

  const userSections = [
    `source_locale: ${input.sourceLocale}`,
    `target_locale: ${input.targetLocale}`,
    `page_type: ${input.pageType}`,
    `source_fields: ${JSON.stringify(input.sourceFields, null, 2)}`,
    `tm_hints_exact: ${JSON.stringify(input.tmHints, null, 2)}`,
    `glossary:\n${input.glossaryBlock || '(empty)'}`,
    'Produce final JSON now.',
  ];

  return {
    system,
    user: userSections.join('\n\n'),
  };
}
