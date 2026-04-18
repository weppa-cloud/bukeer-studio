import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiUnauthorized, apiForbidden, apiError } from '@/lib/api';
import { getEditorModel, DEFAULT_MODEL } from '@/lib/ai/llm-provider';
import { generateText } from 'ai';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import { calculateCost } from '@/lib/ai/model-pricing';
import {
  getSeoSystemPrompt,
  buildSeoUserPrompt,
  type GenerateSeoRequest,
} from '@/lib/ai/seo-prompts';
import { scoreItemSeo, type SeoScoringInput, type SeoItemType } from '@/lib/seo/unified-scorer';
import { createClient } from '@supabase/supabase-js';

const log = createLogger('api.seo.generateBulk');

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

interface DestinationRow {
  id: string;
  name: string | null;
  slug: string | null;
  image: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  target_keyword: string | null;
}

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) return apiUnauthorized();
  if (!hasEditorRole(auth)) return apiForbidden();

  const rateCheck = await checkRateLimit(auth.accountId, 'editor');
  if (!rateCheck.allowed) {
    return apiError('RATE_LIMITED', rateCheck.reason ?? 'Rate limit exceeded', 429);
  }

  let parsed;
  try {
    const body = await request.json();
    parsed = bulkRequestSchema.parse(body);
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid input');
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

  // Fetch items from legacy tables (parallel)
  const items: BulkItem[] = [];

  const [hotelsRes, activitiesRes, transfersRes, packagesRes, overridesRes, blogRes, pagesRes] = await Promise.all([
    supabase
      .from('hotels')
      .select('id, name, slug, main_image, description')
      .eq('account_id', auth.accountId)
      .is('deleted_at', null),
    supabase
      .from('activities')
      .select('id, name, slug, main_image, description')
      .eq('account_id', auth.accountId)
      .is('deleted_at', null),
    supabase
      .from('transfers')
      .select('id, name, slug, main_image, description')
      .eq('account_id', auth.accountId)
      .is('deleted_at', null),
    supabase
      .from('package_kits')
      .select('id, name, description, cover_image_url')
      .eq('account_id', auth.accountId),
    supabase
      .from('website_product_pages')
      .select('product_id, product_type, custom_seo_title, custom_seo_description, target_keyword')
      .eq('website_id', websiteId),
    supabase
      .from('website_blog_posts')
      .select('id, title, slug, featured_image, excerpt, seo_title, seo_description')
      .eq('website_id', websiteId),
    supabase
      .from('website_pages')
      .select('id, title, slug, seo_title, seo_description, target_keyword')
      .eq('website_id', websiteId),
  ]);

  // Destinations (table may not exist in all environments)
  let destinationsRes: { data: DestinationRow[] | null; error: { message: string } | null } = { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('id, name, slug, image, description, seo_title, seo_description, target_keyword');
    destinationsRes = {
      data: (data as DestinationRow[] | null) ?? null,
      error: error ? { message: error.message } : null,
    };
  } catch (e) {
    log.warn('Destinations table may not exist', { error: e instanceof Error ? e.message : String(e) });
  }

  if (hotelsRes.error) log.error('Failed to fetch hotels', { error: hotelsRes.error.message });
  if (activitiesRes.error) log.error('Failed to fetch activities', { error: activitiesRes.error.message });
  if (transfersRes.error) log.error('Failed to fetch transfers', { error: transfersRes.error.message });
  if (packagesRes.error) log.error('Failed to fetch packages', { error: packagesRes.error.message });
  if (overridesRes.error) log.error('Failed to fetch overrides', { error: overridesRes.error.message });
  if (destinationsRes.error) log.warn('Failed to fetch destinations', { error: destinationsRes.error.message });

  // Build override map: "type:legacyId" → override
  const overrideMap = new Map(
    (overridesRes.data ?? []).map((o: { product_id: string; product_type: string; custom_seo_title?: string | null; custom_seo_description?: string | null; target_keyword?: string | null }) =>
      [`${o.product_type}:${o.product_id}`, o]
    )
  );

  function slugify(name: string): string {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Hotels
  for (const h of hotelsRes.data ?? []) {
    const ov = overrideMap.get(`hotel:${h.id}`);
    items.push({
      id: h.id, type: 'hotel', name: h.name ?? '', slug: h.slug || slugify(h.name ?? ''),
      description: h.description ?? undefined, image: h.main_image ?? undefined,
      seoTitle: ov?.custom_seo_title ?? undefined, seoDescription: ov?.custom_seo_description ?? undefined,
      targetKeyword: ov?.target_keyword ?? undefined,
    });
  }

  // Activities
  for (const a of activitiesRes.data ?? []) {
    const ov = overrideMap.get(`activity:${a.id}`);
    items.push({
      id: a.id, type: 'activity', name: a.name ?? '', slug: a.slug || slugify(a.name ?? ''),
      description: a.description ?? undefined, image: a.main_image ?? undefined,
      seoTitle: ov?.custom_seo_title ?? undefined, seoDescription: ov?.custom_seo_description ?? undefined,
      targetKeyword: ov?.target_keyword ?? undefined,
    });
  }

  // Transfers
  for (const t of transfersRes.data ?? []) {
    const ov = overrideMap.get(`transfer:${t.id}`);
    items.push({
      id: t.id, type: 'transfer', name: t.name ?? '', slug: t.slug || slugify(t.name ?? ''),
      description: t.description ?? undefined, image: t.main_image ?? undefined,
      seoTitle: ov?.custom_seo_title ?? undefined, seoDescription: ov?.custom_seo_description ?? undefined,
      targetKeyword: ov?.target_keyword ?? undefined,
    });
  }

  // Packages
  for (const pk of packagesRes.data ?? []) {
    const ov = overrideMap.get(`package:${pk.id}`);
    items.push({
      id: pk.id, type: 'package', name: pk.name ?? '', slug: slugify(pk.name ?? ''),
      description: pk.description ?? undefined, image: pk.cover_image_url ?? undefined,
      seoTitle: ov?.custom_seo_title ?? undefined, seoDescription: ov?.custom_seo_description ?? undefined,
      targetKeyword: ov?.target_keyword ?? undefined,
    });
  }

  // Destinations
  if (destinationsRes.data) {
    for (const d of destinationsRes.data) {
      items.push({
        id: d.id, type: 'destination', name: d.name ?? '', slug: d.slug ?? '',
        description: d.description ?? undefined, image: d.image ?? undefined,
        seoTitle: d.seo_title ?? undefined, seoDescription: d.seo_description ?? undefined,
        targetKeyword: d.target_keyword ?? undefined,
      });
    }
  }

  if (blogRes.data) {
    for (const b of blogRes.data) {
      items.push({
        id: b.id, type: 'blog', name: b.title ?? '', slug: b.slug ?? '',
        description: b.excerpt ?? undefined, seoTitle: b.seo_title ?? undefined,
        seoDescription: b.seo_description ?? undefined,
      });
    }
  }

  if (pagesRes.data) {
    for (const pg of pagesRes.data) {
      items.push({
        id: pg.id, type: 'page', name: pg.title ?? '', slug: pg.slug ?? '',
        seoTitle: pg.seo_title ?? undefined, seoDescription: pg.seo_description ?? undefined,
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

          const itemCost = calculateCost(DEFAULT_MODEL, {
            inputTokens: aiResult.usage?.inputTokens ?? 0,
            outputTokens: aiResult.usage?.outputTokens ?? 0,
          });
          await recordCost(auth.accountId, itemCost);
          totalCost += itemCost;
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
        } catch {
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
