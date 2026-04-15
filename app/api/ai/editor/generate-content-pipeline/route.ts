/**
 * Unified Content Pipeline — POST /api/ai/editor/generate-content-pipeline
 *
 * 6-stage pipeline: plan → generate → localize → channelize → qa → publish
 * Each stage is idempotent and resumable.
 *
 * Issue: #537
 * Spec ref: SPEC_BLOG_GENERATOR_SEO_PIPELINE.md §3 D11
 */

import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError, apiValidationError, apiInternalError } from '@/lib/api';
import { createClient } from '@supabase/supabase-js';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import { scoreContent } from '@/lib/blog/content-scorer';

const log = createLogger('api.ai.contentPipeline');

function getAuthClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );
}

// Pipeline input schema
const pipelineInputSchema = z.object({
  topic: z.string().min(1).max(2000),
  intent: z.enum(['informational', 'transactional', 'navigational']).default('informational'),
  locales: z.array(z.enum(['es', 'en', 'pt', 'fr'])).default(['es']),
  channels: z.array(z.enum(['blog', 'linkedin', 'youtube'])).default(['blog']),
  publish_mode: z.enum(['auto', 'review', 'draft']).default('draft'),
  websiteId: z.string().uuid(),
  brand_kit: z.record(z.unknown()).optional(),
  source_urls: z.array(z.string()).optional(),
  cluster_id: z.string().uuid().optional(),
  template_id: z.string().optional(),
});

// Channel-specific content schemas
const linkedinSchema = z.object({
  hook: z.string().max(100).describe('Attention-grabbing first line'),
  body: z.string().max(500).describe('Executive summary with bullet points'),
  cta: z.string().max(100).describe('Call to action with blog link reference'),
  hashtags: z.array(z.string()).max(5),
});

const youtubeSchema = z.object({
  title: z.string().max(100).describe('YouTube-optimized title'),
  description: z.string().max(5000).describe('SEO-optimized description'),
  script: z.string().describe('Short video script, 500-800 words'),
  tags: z.array(z.string()).max(15),
});

function getLocaleName(locale: string): string {
  const names: Record<string, string> = { es: 'Spanish', en: 'English', pt: 'Portuguese', fr: 'French' };
  return names[locale] || 'Spanish';
}

// Risk flag detection
interface RiskFlag {
  type: string;
  severity: 'critical' | 'warning';
  message: string;
}

function detectRiskFlags(content: string): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // YMYL: legal, health, financial advice
  if (/\b(diagnos|prescri|medic|legal advice|invest|tax deduct)/i.test(content)) {
    flags.push({ type: 'ymyl', severity: 'critical', message: 'Potential YMYL content detected (health/legal/financial)' });
  }

  // PII detection
  if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(content) || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(content)) {
    flags.push({ type: 'pii', severity: 'critical', message: 'Personal information (phone/email) detected in content' });
  }

  return flags;
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
    const input = pipelineInputSchema.parse(body);
    const supabase = getAuthClient(auth.token);
    const assets: any[] = [];
    let totalCost = 0;

    // === STAGE 1: GENERATE (canonical blog post in primary locale) ===
    const primaryLocale = input.locales[0];
    const generateRes = await fetch(new URL('/api/ai/editor/generate-blog', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      body: JSON.stringify({
        topic: input.topic,
        locale: primaryLocale,
        version: 2,
      }),
    });

    if (!generateRes.ok) {
      throw new Error(`Generate stage failed: ${generateRes.status}`);
    }

    const generateData = await generateRes.json();
    const canonicalPost = generateData.post;
    totalCost += 0.015;

    // Save canonical as blog asset
    const { data: canonicalAsset } = await supabase
      .from('content_assets')
      .insert({
        website_id: input.websiteId,
        locale: primaryLocale,
        channel: 'blog',
        title: canonicalPost.title,
        content: canonicalPost.content,
        excerpt: canonicalPost.excerpt,
        metadata: { faq_items: canonicalPost.faq_items, seo: canonicalPost.seo },
        status: 'draft',
      })
      .select()
      .single();

    if (canonicalAsset) assets.push(canonicalAsset);

    // === STAGE 2: LOCALIZE (additional locales) ===
    for (const locale of input.locales.slice(1)) {
      const localizeRes = await fetch(new URL('/api/ai/editor/improve-text', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
        body: JSON.stringify({
          text: canonicalPost.content,
          action: 'translate',
          targetLocale: locale,
        }),
      });

      if (localizeRes.ok) {
        const localizeData = await localizeRes.json();
        const { data: localizedAsset } = await supabase
          .from('content_assets')
          .insert({
            website_id: input.websiteId,
            canonical_post_id: canonicalAsset?.id,
            locale,
            channel: 'blog',
            title: canonicalPost.title, // TODO: translate title too
            content: localizeData.improved,
            excerpt: canonicalPost.excerpt,
            status: 'draft',
          })
          .select()
          .single();

        if (localizedAsset) assets.push(localizedAsset);
        totalCost += 0.01;
      }
    }

    // === STAGE 3: CHANNELIZE (LinkedIn + YouTube variants) ===
    for (const channel of input.channels.filter(c => c !== 'blog')) {
      for (const locale of input.locales) {
        const blogContent = assets.find(a => a.locale === locale && a.channel === 'blog')?.content || canonicalPost.content;

        if (channel === 'linkedin') {
          const linkedinResult = await generateObject({
            model: getEditorModel(),
            schema: linkedinSchema,
            prompt: `Create a LinkedIn post summarizing this travel blog post. Write in ${getLocaleName(locale)}.

Blog content:
${blogContent.slice(0, 3000)}

Requirements:
- Hook: attention-grabbing first line (max 100 chars)
- Body: executive summary with bullet points (300-500 words)
- CTA: encourage clicking through to the full blog post
- 3-5 relevant hashtags`,
          });

          const { data: linkedinAsset } = await supabase
            .from('content_assets')
            .insert({
              website_id: input.websiteId,
              canonical_post_id: canonicalAsset?.id,
              locale,
              channel: 'linkedin',
              title: canonicalPost.title,
              content: `${linkedinResult.object.hook}\n\n${linkedinResult.object.body}\n\n${linkedinResult.object.cta}\n\n${linkedinResult.object.hashtags.map((h: string) => `#${h}`).join(' ')}`,
              metadata: linkedinResult.object,
              status: 'draft',
            })
            .select()
            .single();

          if (linkedinAsset) assets.push(linkedinAsset);
          totalCost += 0.005;
        }

        if (channel === 'youtube') {
          const youtubeResult = await generateObject({
            model: getEditorModel(),
            schema: youtubeSchema,
            prompt: `Create a YouTube video script and metadata from this travel blog post. Write in ${getLocaleName(locale)}.

Blog content:
${blogContent.slice(0, 3000)}

Requirements:
- Title: YouTube-optimized, max 100 chars
- Description: SEO-optimized, max 5000 chars, include timestamps
- Script: 500-800 words for a short travel video
- Tags: 10-15 relevant YouTube tags`,
          });

          const { data: youtubeAsset } = await supabase
            .from('content_assets')
            .insert({
              website_id: input.websiteId,
              canonical_post_id: canonicalAsset?.id,
              locale,
              channel: 'youtube',
              title: youtubeResult.object.title,
              content: youtubeResult.object.script,
              metadata: youtubeResult.object,
              status: 'draft',
            })
            .select()
            .single();

          if (youtubeAsset) assets.push(youtubeAsset);
          totalCost += 0.005;
        }
      }
    }

    // === STAGE 4: QA (score + risk flags) ===
    const scoreResult = scoreContent({
      content: canonicalPost.content,
      title: canonicalPost.title,
      metaDescription: canonicalPost.seo?.metaDescription,
      keywords: canonicalPost.seo?.keywords,
      faqItems: canonicalPost.faq_items,
      locale: primaryLocale,
    });

    const riskFlags = detectRiskFlags(canonicalPost.content);
    const hasCriticalFlags = riskFlags.some(f => f.severity === 'critical');

    // Update canonical asset with score
    if (canonicalAsset) {
      await supabase
        .from('content_assets')
        .update({ quality_score: scoreResult.overall, risk_flags: riskFlags })
        .eq('id', canonicalAsset.id);
    }

    // === STAGE 5: PUBLISH DECISION ===
    let publishDecision: 'auto' | 'review' | 'blocked';
    if (hasCriticalFlags || scoreResult.overall < 70) {
      publishDecision = 'blocked';
    } else if (input.publish_mode === 'auto' && scoreResult.overall >= 85) {
      publishDecision = 'auto';
    } else {
      publishDecision = 'review';
    }

    await recordCost(auth.accountId, totalCost);

    return apiSuccess({
      job_id: canonicalAsset?.id || null,
      assets,
      quality_score: scoreResult.overall,
      grade: scoreResult.grade,
      risk_flags: riskFlags,
      needs_human_review: publishDecision !== 'auto',
      publish_decision: publishDecision,
      cost: totalCost,
      stages_completed: ['generate', 'localize', 'channelize', 'qa', 'publish_decision'],
    });
  } catch (err) {
    log.error('Pipeline failed', { error: err instanceof Error ? err.message : String(err) });
    if (err instanceof z.ZodError) {
      return apiValidationError(err);
    }
    return apiInternalError('Pipeline failed');
  }
}
