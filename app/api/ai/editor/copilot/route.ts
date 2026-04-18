import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError, apiValidationError, apiInternalError } from '@/lib/api';
import { getEditorModel, DEFAULT_MODEL } from '@/lib/ai/llm-provider';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import { calculateCost } from '@/lib/ai/model-pricing';
// crypto.randomUUID() is available globally in Workers + Node 19+

const log = createLogger('api.ai.copilot');

// ── Request schema ──────────────────────────────────────────────────────────

const CopilotRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  websiteId: z.string().uuid(),
  focusedSectionId: z.string().uuid().optional(),
  focusedSectionType: z.string().optional(),
  locale: z.string().default('es'),
});

// ── Response schemas ────────────────────────────────────────────────────────

const CopilotActionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'rewrite_text',
    'create_section',
    'remove_section',
    'reorder_sections',
    'update_seo',
    'suggest_images',
    'translate',
    'update_theme',
  ]),
  targetSectionId: z.string().optional(),
  targetSectionType: z.string().optional(),
  description: z.string(),
  preview: z.object({
    before: z.unknown().optional(),
    after: z.unknown(),
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  position: z
    .object({
      relativeTo: z.string().optional(),
      placement: z.enum(['before', 'after']).optional(),
    })
    .optional(),
});

const CopilotPlanSchema = z.object({
  reasoning: z.string(),
  actions: z.array(CopilotActionSchema).min(1).max(10),
  promptTemplateUsed: z.string().optional(),
});

// ── Prompt templates ────────────────────────────────────────────────────────

const PROMPT_TEMPLATES: Record<
  string,
  { label: string; icon: string; prompt: string }
> = {
  increase_leads: {
    label: 'Aumentar leads',
    icon: 'trending_up',
    prompt:
      'Optimiza el sitio para generar mas solicitudes de cotizacion. Mejora los CTAs, agrega urgencia y destaca testimonios.',
  },
  improve_seo: {
    label: 'Mejorar SEO',
    icon: 'search',
    prompt:
      'Mejora el SEO del sitio: optimiza meta titulo, descripcion y textos de secciones con palabras clave relevantes para turismo.',
  },
  summer_campaign: {
    label: 'Campaña de verano',
    icon: 'wb_sunny',
    prompt:
      'Adapta el sitio para una campaña de verano: cambia textos, agrega secciones de destinos de playa y promociones de temporada.',
  },
  translate_en: {
    label: 'Traducir a ingles',
    icon: 'translate',
    prompt:
      'Traduce todo el contenido visible del sitio al ingles, manteniendo el tono y estilo de la marca.',
  },
};

// ── Helper: build system prompt ─────────────────────────────────────────────

function buildSystemPrompt(
  brandContext: Record<string, unknown> | null,
  sections: Array<{ id: string; section_type: string; content: Record<string, unknown> | null }>,
  focusedSectionId?: string
): string {
  const brandBlock = brandContext
    ? `Name: ${brandContext.brand_name ?? 'N/A'}, Tone: ${brandContext.tone ?? 'professional'}, Audience: ${brandContext.target_audience ?? 'travelers'}, Keywords: ${(brandContext.keywords as string[] | undefined)?.join(', ') ?? 'N/A'}, CTA Style: ${brandContext.cta_style ?? 'N/A'}`
    : 'No brand kit configured. Use professional tone.';

  const sectionsBlock = sections
    .map(
      (s) =>
        `- ${s.section_type} (id: ${s.id})${focusedSectionId === s.id ? ' [FOCUSED]' : ''}: ${JSON.stringify(s.content ?? {}).slice(0, 200)}`
    )
    .join('\n');

  return `You are a travel website editor copilot for Bukeer. You help travel agencies improve their websites through structured, actionable changes.

BRAND CONTEXT:
${brandBlock}

CURRENT WEBSITE SECTIONS:
${sectionsBlock}

AVAILABLE ACTION TYPES:
- rewrite_text: Rewrite text content of an existing section
- create_section: Add a new section (types: hero, about, features, testimonials, stats, faq, cta, contact, destinations, hotels, activities, gallery)
- remove_section: Hide/disable an existing section
- reorder_sections: Change section display order
- update_seo: Update meta title/description of a section (preview.after: { seo_title, seo_description, meta_keywords })
- suggest_images: Suggest Unsplash images for a section (preview.after: { image, imageAlt } or { images: [...] })
- translate: Translate section content to another language (preview.after: full translated props)
- update_theme: Suggest theme changes (preview.after: { preset_slug } for preset, or { tokens, profile } for custom). Available presets: adventure, luxury, tropical, corporate, boutique, cultural, eco, romantic

CONSTRAINTS:
- Maximum 10 actions per plan
- Each action must target an existing section ID or specify a new section type
- Always include a human-readable description for each action
- Set confidence based on how certain you are the change improves the site
- For rewrite_text, include both before (current) and after (proposed) in preview
- For create_section, include the full proposed content in preview.after
- For update_theme, prefer preset_slug when a tourism preset matches the brand mood
- Respond in the same language as the user's prompt
- Generate a unique id for each action (use short descriptive slugs like "rewrite-hero-title")`;
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) return apiUnauthorized();
  if (!hasEditorRole(auth)) return apiForbidden();

  const rateCheck = await checkRateLimit(auth.accountId, 'copilot');
  if (!rateCheck.allowed) {
    return apiError('RATE_LIMITED', rateCheck.reason ?? 'Rate limit exceeded', 429);
  }

  try {
    const body = await request.json();
    const parsed = CopilotRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { prompt, websiteId, focusedSectionId, focusedSectionType, locale } = parsed.data;

    // Authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${auth.token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    // 1. Load website sections via existing RPC
    const { data: snapshot, error: snapshotError } = await supabase.rpc(
      'get_website_editor_snapshot',
      { p_website_id: websiteId }
    );

    if (snapshotError || !snapshot) {
      log.error('Failed to load website snapshot', { error: snapshotError?.message ?? 'unknown' });
      return apiInternalError('Failed to load website data');
    }

    const typedSnapshot = snapshot as {
      website: Record<string, unknown>;
      sections: Array<{
        id: string;
        sectionType: string;
        content: Record<string, unknown> | null;
      }>;
    };

    const sections = typedSnapshot.sections.map((s) => ({
      id: s.id,
      section_type: s.sectionType,
      content: s.content,
    }));

    // 2. Load brand context (best-effort — may not exist)
    let brandContext: Record<string, unknown> | null = null;
    try {
      const { data: brandData } = await supabase.rpc('get_brand_context', {
        p_website_id: websiteId,
      });
      if (brandData) {
        brandContext = brandData as Record<string, unknown>;
      }
    } catch {
      // Brand context is optional — continue without it
    }

    // 3. Load AI context (best-effort — recent cross-system activity)
    let aiContextHint = '';
    try {
      const { data: aiRows } = await supabase
        .from('ai_context')
        .select('context_type, context_data, created_at')
        .eq('account_id', auth.accountId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (aiRows && aiRows.length > 0) {
        aiContextHint = `\n\nRECENT ACTIVITY:\n${aiRows
          .map(
            (r: { context_type: string; context_data: unknown }) =>
              `- ${r.context_type}: ${JSON.stringify(r.context_data).slice(0, 150)}`
          )
          .join('\n')}`;
      }
    } catch {
      // AI context is optional — continue without it
    }

    // 4. Build system prompt
    const systemPrompt =
      buildSystemPrompt(brandContext, sections, focusedSectionId) + aiContextHint;

    // 5. Build user prompt with focus context
    let userPrompt = prompt;
    if (focusedSectionId && focusedSectionType) {
      userPrompt = `[User is focused on section: ${focusedSectionType} (id: ${focusedSectionId})]\n\n${prompt}`;
    }
    if (locale !== 'es') {
      userPrompt += `\n\n[Respond in locale: ${locale}]`;
    }

    // 6. Call Claude
    const result = await generateObject({
      model: getEditorModel(),
      schema: CopilotPlanSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    // 7. Record cost (token-driven — model pricing × usage)
    await recordCost(
      auth.accountId,
      calculateCost(DEFAULT_MODEL, {
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      }),
    );

    // 8. Generate session ID
    const sessionId = crypto.randomUUID();

    return apiSuccess({
      plan: result.object,
      usage: result.usage,
      sessionId,
      templates: PROMPT_TEMPLATES,
    });
  } catch (err) {
    log.error('Copilot failed', { error: err instanceof Error ? err.message : String(err) });
    return apiInternalError('Failed to generate copilot plan');
  }
}
