/**
 * AI Cluster Plan Generation — POST /api/ai/editor/generate-cluster-plan
 *
 * Generates a hub-and-spoke content plan: pillar post + supporting posts.
 * Cost: ~$0.015 per call.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';

const log = createLogger('api.ai.clusterPlan');

const clusterPlanSchema = z.object({
  pillar: z.object({
    title: z.string().max(80),
    slug: z.string(),
    outline: z.array(z.string()).describe('H2 section titles for the pillar post'),
    targetWords: z.number().min(2500).max(5000),
  }),
  supporting: z.array(z.object({
    title: z.string().max(80),
    slug: z.string(),
    angle: z.string().describe('Unique angle or perspective for this supporting post'),
    targetWords: z.number().min(2000).max(2500),
    linksToPillar: z.string().describe('How this post links back to the pillar'),
    linksToSiblings: z.array(z.string()).describe('Related supporting posts to cross-link'),
  })).min(3).max(15),
});

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasEditorRole(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rateCheck = await checkRateLimit(auth.accountId, 'editor');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.reason },
      { status: 429, headers: { 'Retry-After': Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000).toString() } }
    );
  }

  try {
    const body = await request.json();
    const { keyword, locale = 'es', existingPosts = [], targetPostCount = 8 } = body;

    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
    }

    const localeName = locale === 'es' ? 'Spanish' : locale === 'pt' ? 'Portuguese' : locale === 'fr' ? 'French' : 'English';

    const result = await generateObject({
      model: getEditorModel(),
      schema: clusterPlanSchema,
      prompt: `You are an expert travel content strategist. Create a topic cluster plan for a travel agency blog.

## Target Keyword: "${keyword}"
## Language: ${localeName}
## Target: 1 pillar post + ${targetPostCount - 1} supporting posts

## Requirements:
1. **Pillar post**: Comprehensive guide (3,000-5,000 words) that covers the topic broadly
2. **Supporting posts**: Each covers a specific sub-topic (2,000-2,500 words)
3. Each supporting post has a unique angle that doesn't overlap with siblings
4. Define how each supporting post links back to the pillar
5. Define cross-links between related supporting posts
6. All slugs should be URL-friendly (lowercase, hyphens)
7. Titles should be SEO-optimized (include keyword variations)

${existingPosts.length > 0 ? `## Existing posts (don't duplicate these):\n${existingPosts.map((p: string) => `- ${p}`).join('\n')}` : ''}

Think about what travelers actually search for when planning trips to this destination.
Focus on practical, experience-driven topics that demonstrate E-E-A-T.`,
    });

    await recordCost(auth.accountId, 0.015);

    return NextResponse.json({
      plan: result.object,
      usage: result.usage,
    });
  } catch (err) {
    log.error('Generate cluster plan failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to generate cluster plan' }, { status: 500 });
  }
}
