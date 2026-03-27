import { NextRequest } from 'next/server';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import { SECTION_TYPES } from '@bukeer/website-contract';

// ── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(
  sections: Array<{ id: string; section_type: string; content: Record<string, unknown> | null }>,
  brandContext: Record<string, unknown> | null,
  focusedSectionId?: string
): string {
  const brandBlock = brandContext
    ? `Name: ${brandContext.brand_name ?? 'N/A'}, Tone: ${brandContext.tone ?? 'professional'}, Audience: ${brandContext.target_audience ?? 'travelers'}`
    : 'No brand kit configured. Use professional tone.';

  const sectionsBlock = sections
    .map(
      (s) =>
        `- ${s.section_type} (id: ${s.id})${focusedSectionId === s.id ? ' [FOCUSED]' : ''}: ${JSON.stringify(s.content ?? {}).slice(0, 200)}`
    )
    .join('\n');

  return `You are a travel website editor AI assistant for Bukeer. You help travel agencies improve their websites through conversation and direct actions.

BRAND CONTEXT:
${brandBlock}

CURRENT WEBSITE SECTIONS:
${sectionsBlock}

You have tools to modify sections directly. When the user asks to change something:
1. Use the appropriate tool to make the change
2. Explain what you did in natural language
3. If the request is ambiguous, ask for clarification before acting

RULES:
- Respond in the same language as the user
- Be concise and actionable
- When rewriting text, maintain the brand tone
- When creating sections, generate complete, production-ready content
- For travel agencies: focus on destinations, experiences, trust signals
- Always explain your reasoning briefly`;
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (!hasEditorRole(auth)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const rateCheck = await checkRateLimit(auth.accountId, 'copilot');
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: rateCheck.reason }), {
      status: 429,
      headers: { 'Retry-After': Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000).toString() },
    });
  }

  try {
    const body = await request.json();
    const { messages, websiteId, focusedSectionId, pageId } = body;

    if (!messages || !Array.isArray(messages) || !websiteId) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
    }

    // Load context
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${auth.token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    let sections: Array<{ id: string; section_type: string; content: Record<string, unknown> | null }> = [];

    if (!pageId || pageId === 'home') {
      const { data: snapshot } = await supabase.rpc('get_website_editor_snapshot', {
        p_website_id: websiteId,
      });
      if (snapshot) {
        const typed = snapshot as { sections: Array<{ id: string; sectionType: string; content: Record<string, unknown> | null }> };
        sections = typed.sections.map((s) => ({
          id: s.id,
          section_type: s.sectionType,
          content: s.content,
        }));
      }
    } else {
      const { data: page } = await supabase
        .from('website_pages')
        .select('sections')
        .eq('id', pageId)
        .single();
      if (page?.sections) {
        const rawSections = page.sections as Array<Record<string, unknown>>;
        sections = rawSections.map((s, i) => ({
          id: (s.id as string) ?? `section-${i}`,
          section_type: (s.type as string) ?? (s.section_type as string) ?? 'text',
          content: (s.content as Record<string, unknown>) ?? {},
        }));
      }
    }

    let brandContext: Record<string, unknown> | null = null;
    try {
      const { data: brandData } = await supabase.rpc('get_brand_context', {
        p_website_id: websiteId,
      });
      if (brandData) brandContext = brandData as Record<string, unknown>;
    } catch {
      // optional
    }

    const systemPrompt = buildSystemPrompt(sections, brandContext, focusedSectionId);

    const result = streamText({
      model: getEditorModel(),
      system: systemPrompt,
      messages,
      tools: {
        rewrite_section: tool({
          description: 'Rewrite the text content of an existing section.',
          inputSchema: z.object({
            sectionId: z.string().describe('The section ID to modify'),
            content: z.record(z.string(), z.unknown()).describe('The new content fields'),
            description: z.string().describe('Brief description of the change'),
          }),
        }),

        create_section: tool({
          description: 'Add a new section to the page.',
          inputSchema: z.object({
            sectionType: z.string().describe('Section type'),
            content: z.record(z.string(), z.unknown()).describe('The section content fields'),
            position: z.object({
              relativeTo: z.string().optional(),
              placement: z.enum(['before', 'after']).optional(),
            }).optional(),
            description: z.string().describe('Brief description'),
          }),
        }),

        remove_section: tool({
          description: 'Remove a section from the page.',
          inputSchema: z.object({
            sectionId: z.string().describe('The section ID to remove'),
            description: z.string().describe('Brief reason'),
          }),
        }),

        reorder_sections: tool({
          description: 'Change the order of sections.',
          inputSchema: z.object({
            order: z.array(z.string()).describe('New order of section IDs'),
            description: z.string().describe('Brief description'),
          }),
        }),

        toggle_visibility: tool({
          description: 'Show or hide a section.',
          inputSchema: z.object({
            sectionId: z.string().describe('The section ID'),
            description: z.string().describe('Brief description'),
          }),
        }),

        duplicate_section: tool({
          description: 'Duplicate an existing section.',
          inputSchema: z.object({
            sectionId: z.string().describe('The section ID'),
            description: z.string().describe('Brief description'),
          }),
        }),

        update_seo: tool({
          description: 'Update SEO meta fields.',
          inputSchema: z.object({
            sectionId: z.string().describe('The section ID'),
            seoTitle: z.string().optional(),
            seoDescription: z.string().optional(),
            description: z.string().describe('Brief description'),
          }),
        }),

        suggest_images: tool({
          description: 'Suggest images for a section.',
          inputSchema: z.object({
            sectionId: z.string().describe('The section ID'),
            images: z.array(z.object({
              url: z.string(),
              alt: z.string(),
            })),
            description: z.string().describe('Brief description'),
          }),
        }),

        translate_section: tool({
          description: 'Translate a section to another language.',
          inputSchema: z.object({
            sectionId: z.string().describe('The section ID'),
            targetLocale: z.string().describe('Target locale'),
            translatedContent: z.record(z.string(), z.unknown()).describe('Translated content'),
            description: z.string().describe('Brief description'),
          }),
        }),

        generate_content: tool({
          description: 'Generate content for a section type.',
          inputSchema: z.object({
            sectionType: z.string().describe('Section type'),
            prompt: z.string().describe('Content generation prompt'),
            description: z.string().describe('Brief description'),
          }),
        }),
      },
      onFinish: async () => {
        await recordCost(auth.accountId, 0.01);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error('[AI] studio-chat error:', err);
    return new Response(JSON.stringify({ error: 'Failed to process chat' }), { status: 500 });
  }
}
