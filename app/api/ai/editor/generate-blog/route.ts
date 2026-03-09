import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getEditorAuth } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';

const blogPostSchema = z.object({
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

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateCheck = await checkRateLimit(auth.accountId, 'editor');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.reason },
      { status: 429, headers: { 'Retry-After': Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000).toString() } }
    );
  }

  try {
    const body = await request.json();
    const { topic, locale = 'es', tone = 'professional', websiteContext, productLinks } = body;

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const result = await generateObject({
      model: anthropic('claude-sonnet-4-5-20250514'),
      schema: blogPostSchema,
      prompt: `Write a complete blog post for a travel agency website.

Topic: ${topic}
Language: ${locale}
Tone: ${tone}
Website context: ${JSON.stringify(websiteContext ?? {})}
${productLinks ? `Include CTAs to these products: ${JSON.stringify(productLinks)}` : ''}

Requirements:
- Write in ${locale === 'es' ? 'Spanish' : locale === 'pt' ? 'Portuguese' : locale === 'fr' ? 'French' : 'English'}
- 800-1200 words
- Include a compelling introduction
- Use H2 and H3 headings for structure
- Include practical travel tips
- End with a CTA encouraging readers to explore travel packages
- SEO-optimized meta title and description
- Generate a URL-friendly slug
- Content in Markdown format`,
    });

    // Blog posts are more expensive (~$0.01 per call)
    await recordCost(auth.accountId, 0.01);

    return NextResponse.json({
      post: result.object,
      usage: result.usage,
    });
  } catch (err) {
    console.error('[AI] generate-blog error:', err);
    return NextResponse.json(
      { error: 'Failed to generate blog post' },
      { status: 500 }
    );
  }
}
