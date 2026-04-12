import { NextRequest, NextResponse } from 'next/server';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { generateText } from 'ai';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import {
  getSeoSystemPrompt,
  buildSeoUserPrompt,
  type GenerateSeoRequest,
} from '@/lib/ai/seo-prompts';
import { scoreItemSeo, type SeoScoringInput, type SeoItemType } from '@/lib/seo/unified-scorer';
import { createClient } from '@supabase/supabase-js';

const bulkRequestSchema = z.object({
  websiteId: z.string().uuid(),
  filter: z.enum(['missing_title', 'missing_description', 'low_score']),
  scoreThreshold: z.number().min(0).max(100).default(60),
  dryRun: z.boolean().default(true),
});

interface BulkItem {
  id: string;
  type: SeoItemType;
  name: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  targetKeyword?: string;
  image?: string;
}

function mapProductType(pt: string): SeoItemType {
  const lower = pt?.toLowerCase() || '';
  if (lower.includes('hotel')) return 'hotel';
  if (lower.includes('servicio') || lower.includes('actividad')) return 'activity';
  if (lower.includes('transporte') || lower.includes('traslado')) return 'transfer';
  if (lower.includes('paquete')) return 'package';
  return 'activity';
}

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasEditorRole(auth)) {
    return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
  }

  const rateCheck = await checkRateLimit(auth.accountId, 'editor');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.reason },
      { status: 429, headers: { 'Retry-After': Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000).toString() } }
    );
  }

  let parsed;
  try {
    const body = await request.json();
    parsed = bulkRequestSchema.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { websiteId, filter, scoreThreshold } = parsed;

  // Use authenticated client (same RLS as the user)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${auth.token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  // Fetch items from all tables
  const items: BulkItem[] = [];

  const [productsRes, destinationsRes, blogRes, pagesRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, slug, main_image, description, seo_title, seo_description, target_keyword, product_type')
      .eq('account_id', auth.accountId),
    supabase
      .from('destinations')
      .select('id, name, slug, image, description, seo_title, seo_description, target_keyword'),
    supabase
      .from('website_blog_posts')
      .select('id, title, slug, featured_image, excerpt, seo_title, seo_description')
      .eq('website_id', websiteId),
    supabase
      .from('website_pages')
      .select('id, title, slug, seo_title, seo_description, target_keyword')
      .eq('website_id', websiteId),
  ]);

  if (productsRes.data) {
    for (const p of productsRes.data) {
      items.push({
        id: p.id,
        type: mapProductType(p.product_type),
        name: p.name ?? '',
        slug: p.slug ?? '',
        description: p.description ?? undefined,
        seoTitle: p.seo_title ?? undefined,
        seoDescription: p.seo_description ?? undefined,
        targetKeyword: p.target_keyword ?? undefined,
        image: p.main_image ?? undefined,
      });
    }
  }

  if (destinationsRes.data) {
    for (const d of destinationsRes.data) {
      items.push({
        id: d.id,
        type: 'destination',
        name: d.name ?? '',
        slug: d.slug ?? '',
        description: d.description ?? undefined,
        seoTitle: d.seo_title ?? undefined,
        seoDescription: d.seo_description ?? undefined,
        targetKeyword: d.target_keyword ?? undefined,
        image: d.image ?? undefined,
      });
    }
  }

  if (blogRes.data) {
    for (const b of blogRes.data) {
      items.push({
        id: b.id,
        type: 'blog',
        name: b.title ?? '',
        slug: b.slug ?? '',
        description: b.excerpt ?? undefined,
        seoTitle: b.seo_title ?? undefined,
        seoDescription: b.seo_description ?? undefined,
      });
    }
  }

  if (pagesRes.data) {
    for (const pg of pagesRes.data) {
      items.push({
        id: pg.id,
        type: 'page',
        name: pg.title ?? '',
        slug: pg.slug ?? '',
        seoTitle: pg.seo_title ?? undefined,
        seoDescription: pg.seo_description ?? undefined,
        targetKeyword: pg.target_keyword ?? undefined,
      });
    }
  }

  // Filter items based on criteria, always skip items already scoring A or B
  const filtered = items.filter((item) => {
    // AC-9: Skip items with score A/B
    const quickInput: SeoScoringInput = {
      type: item.type, name: item.name, slug: item.slug,
      description: item.description, image: item.image,
      seoTitle: item.seoTitle, seoDescription: item.seoDescription,
      targetKeyword: item.targetKeyword,
      hasJsonLd: true, hasCanonical: true, hasHreflang: true, hasOgTags: true, hasTwitterCard: true,
    };
    const quickScore = scoreItemSeo(quickInput);
    if (quickScore.grade === 'A' || quickScore.grade === 'B') return false;

    if (filter === 'missing_title') return !item.seoTitle;
    if (filter === 'missing_description') return !item.seoDescription;
    if (filter === 'low_score') {
      const input: SeoScoringInput = {
        type: item.type,
        name: item.name,
        slug: item.slug,
        description: item.description,
        image: item.image,
        seoTitle: item.seoTitle,
        seoDescription: item.seoDescription,
        targetKeyword: item.targetKeyword,
        hasJsonLd: true,
        hasCanonical: true,
        hasHreflang: true,
        hasOgTags: true,
        hasTwitterCard: true,
      };
      const result = scoreItemSeo(input);
      return result.overall < scoreThreshold;
    }
    return false;
  });

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let processed = 0;
      let totalCost = 0;
      let totalScoreBefore = 0;
      let totalScoreAfter = 0;

      for (const item of filtered) {
        if (request.signal.aborted) {
          send({ type: 'error', message: 'Cancelled' });
          break;
        }

        // Rate limit check per item
        const itemRateCheck = await checkRateLimit(auth.accountId, 'editor');
        if (!itemRateCheck.allowed) {
          const waitMs = Math.max(itemRateCheck.resetAt.getTime() - Date.now(), 1000);
          send({ type: 'progress', current: processed, total: filtered.length, waiting: true });
          await new Promise((r) => setTimeout(r, waitMs));
        }

        send({ type: 'progress', current: processed + 1, total: filtered.length });

        try {
          const reqData: GenerateSeoRequest = {
            itemType: item.type,
            name: item.name,
            slug: item.slug,
            description: item.description,
            existingTitle: item.seoTitle,
            existingDescription: item.seoDescription,
            targetKeyword: item.targetKeyword,
            locale: 'es',
          };

          const aiResult = await generateText({
            model: getEditorModel(),
            system: getSeoSystemPrompt(item.type, 'es'),
            prompt: buildSeoUserPrompt(reqData) +
              '\n\nResponde SOLO con un JSON valido: {"seoTitle":"...","seoDescription":"...","targetKeyword":"...","reasoning":"..."}',
          });

          const jsonMatch = aiResult.text.trim().match(/\{[\s\S]*\}/);
          const result = { object: jsonMatch ? JSON.parse(jsonMatch[0]) : { seoTitle: '', seoDescription: '', targetKeyword: '', reasoning: '' } };

          await recordCost(auth.accountId, 0.003);
          totalCost += 0.003;
          processed++;

          // Score before/after
          const inputBefore: SeoScoringInput = {
            type: item.type, name: item.name, slug: item.slug,
            description: item.description, image: item.image,
            seoTitle: item.seoTitle, seoDescription: item.seoDescription,
            targetKeyword: item.targetKeyword,
            hasJsonLd: true, hasCanonical: true, hasHreflang: true, hasOgTags: true, hasTwitterCard: true,
          };
          const inputAfter: SeoScoringInput = {
            ...inputBefore,
            seoTitle: result.object.seoTitle,
            seoDescription: result.object.seoDescription,
            targetKeyword: result.object.targetKeyword,
          };

          const scoreBefore = scoreItemSeo(inputBefore).overall;
          const scoreAfter = scoreItemSeo(inputAfter).overall;
          totalScoreBefore += scoreBefore;
          totalScoreAfter += scoreAfter;

          send({
            type: 'item_complete',
            current: processed,
            total: filtered.length,
            item: {
              id: item.id,
              type: item.type,
              name: item.name,
              before: { seoTitle: item.seoTitle, seoDescription: item.seoDescription, score: scoreBefore },
              after: { ...result.object, score: scoreAfter },
            },
          });
        } catch (err) {
          processed++;
          send({
            type: 'item_error',
            current: processed,
            total: filtered.length,
            item: { id: item.id, name: item.name, error: 'Generation failed' },
          });
        }

        // 500ms delay between requests
        await new Promise((r) => setTimeout(r, 500));
      }

      send({
        type: 'done',
        summary: {
          processed,
          total: filtered.length,
          avgScoreBefore: processed > 0 ? Math.round(totalScoreBefore / processed) : 0,
          avgScoreAfter: processed > 0 ? Math.round(totalScoreAfter / processed) : 0,
          totalCost: Math.round(totalCost * 1000) / 1000,
        },
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
