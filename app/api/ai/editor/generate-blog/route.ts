import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError, apiInternalError } from '@/lib/api';
import { DEFAULT_MODEL, getEditorModel } from '@/lib/ai/llm-provider';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';

const log = createLogger('api.ai.generateBlog');

// === V1 SCHEMA (backward compatible) ===
const blogPostSchemaV1 = z.object({
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  content: z.string().describe('Blog post body in Markdown format'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  seo: z.object({
    metaTitle: z.string(),
    metaDescription: z.string().max(160),
    keywords: z.array(z.string()),
  }),
});

// === V2 SCHEMA (SEO pipeline — answer-first, FAQs, multi-lang) ===
const blogPostSchemaV2 = z.object({
  title: z.string().max(70).describe('SEO title, ≤70 chars'),
  slug: z.string().describe('URL-friendly slug'),
  excerpt: z.string().max(300).describe('Meta description, 150-160 chars ideal'),
  content: z.string().describe('Full blog post in Markdown, answer-first structure'),
  tldr: z.string().describe('TL;DR summary, 50-70 words'),
  category: z.string().optional(),
  tags: z.array(z.string()).max(10),
  faq_items: z.array(z.object({
    question: z.string(),
    answer: z.string().max(300),
  })).min(3).max(7).describe('FAQ items for FAQPage schema'),
  seo: z.object({
    metaTitle: z.string().max(70),
    metaDescription: z.string().max(160),
    keywords: z.array(z.string()).max(10),
  }),
  internal_link_suggestions: z.array(z.object({
    topic: z.string(),
    anchor_text: z.string(),
    context: z.string().describe('Why this link is relevant here'),
  })).optional(),
});

function getLocaleName(locale: string): string {
  switch (locale) {
    case 'es': return 'Spanish';
    case 'en': return 'English';
    case 'pt': return 'Portuguese';
    case 'fr': return 'French';
    default: return 'Spanish';
  }
}

function buildV1Prompt(topic: string, locale: string, tone: string, websiteContext: Record<string, unknown>, productLinks: { slug: string; title: string }[]): string {
  return `Write a complete blog post for a travel agency website.

Topic: ${topic}
Language: ${locale}
Tone: ${tone}
Website context: ${JSON.stringify(websiteContext ?? {})}
${productLinks ? `Include CTAs to these products: ${JSON.stringify(productLinks)}` : ''}

Requirements:
- Write in ${getLocaleName(locale)}
- 800-1200 words
- Include a compelling introduction
- Use H2 and H3 headings for structure
- Include practical travel tips
- End with a CTA encouraging readers to explore travel packages
- SEO-optimized meta title and description
- Generate a URL-friendly slug
- Content in Markdown format`;
}

function buildV2Prompt(
  topic: string,
  locale: string,
  tone: string,
  websiteContext: Record<string, unknown>,
  productLinks: { slug: string; title: string }[],
  clusterContext?: string,
  targetWordCount: number = 2200,
): string {
  const localeName = getLocaleName(locale);

  return `You are an expert travel content writer optimizing for both human readers and AI search engines (Google AI Overviews, ChatGPT, Perplexity).

## Content Structure Rules (MANDATORY)

1. **TL;DR first**: Start with a 50-70 word summary box answering the main question.

2. **Answer-first H2 sections**: Each H2 must have the direct answer in the first 60 words.
   Format:
   ## [Question or Topic Phrase]
   [Direct answer in ≤60 words — factual, self-contained, extractable by AI]

   [Supporting paragraph 1: 40-60 words with statistics/data]

   [Supporting paragraph 2: 40-60 words with examples/experience]

3. **Section length**: Each H2 section should be 134-167 words (optimal AI extraction).

4. **Data density**: Include at least 1 statistic, date, or percentage per H2 section.

5. **Total length**: Target ${targetWordCount} words (range: 2,100-2,400).

6. **FAQ section**: End with 3-5 FAQ items that travelers commonly ask about this topic.

7. **Internal linking**: Include [INTERNAL_LINK:topic] placeholders where related posts should be linked. The system will resolve these to actual URLs.

8. **No filler**: Every sentence must add information value. No "In this article, we will explore..." or "Let's dive in!" patterns.

## Travel Content E-E-A-T Signals

- Include specific place names, addresses, and practical details
- Reference seasons, weather, and timing (shows real experience)
- Mention prices, durations, and logistics (shows practical knowledge)
- Include local tips that only someone who has visited would know
- Reference recent events or changes (shows content freshness)

## Language: Write in ${localeName}
## Tone: ${tone}

## Topic: ${topic}

Website context: ${JSON.stringify(websiteContext ?? {})}
${productLinks ? `\n## Products to reference:\n${JSON.stringify(productLinks)}` : ''}
${clusterContext ? `\n## Related posts in this topic cluster:\n${clusterContext}` : ''}`;
}

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) return apiUnauthorized();
  if (!hasEditorRole(auth)) return apiForbidden();

  const rateCheck = await checkRateLimit(auth.accountId, 'editor');
  if (!rateCheck.allowed) {
    return apiError('RATE_LIMITED', rateCheck.reason ?? 'Rate limit exceeded', 429);
  }

  try {
    const body = await request.json();
    const {
      topic,
      locale = 'es',
      tone = 'professional',
      websiteContext,
      productLinks,
      version = 1,
      clusterContext,
      targetWordCount,
    } = body;

    if (!topic || typeof topic !== 'string') {
      return apiError('VALIDATION_ERROR', 'topic is required');
    }

    if (topic.length > 2000) {
      return apiError('VALIDATION_ERROR', 'Topic too long (max 2000 chars)');
    }

    const isV2 = version === 2;
    const schema = isV2 ? blogPostSchemaV2 : blogPostSchemaV1;
    const prompt = isV2
      ? buildV2Prompt(topic, locale, tone, websiteContext, productLinks, clusterContext, targetWordCount)
      : buildV1Prompt(topic, locale, tone, websiteContext, productLinks);

    const result = await generateObject({
      model: getEditorModel(),
      schema,
      prompt,
    });

    // V2 costs ~$0.015 (longer output), V1 costs ~$0.01
    await recordCost(auth.accountId, isV2 ? 0.015 : 0.01);

    return apiSuccess({
      post: result.object,
      usage: result.usage,
      meta: {
        version: isV2 ? 2 : 1,
        locale,
        ai_generated: true,
        ai_model: DEFAULT_MODEL,
      },
    });
  } catch (err) {
    log.error('Generate blog failed', { error: err instanceof Error ? err.message : String(err) });
    return apiInternalError('Failed to generate blog post');
  }
}
