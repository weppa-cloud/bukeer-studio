/**
 * System prompt for the Studio Chat AI assistant.
 *
 * The studio chat helps travel agencies edit their websites through
 * conversation + tool use (rewrite, create, remove, reorder sections).
 */

interface StudioChatContext {
  sections: Array<{
    id: string
    section_type: string
    content: Record<string, unknown> | null
  }>
  brandContext: Record<string, unknown> | null
  focusedSectionId?: string
}

export function buildStudioChatPrompt(ctx: StudioChatContext): string {
  const brandBlock = ctx.brandContext
    ? `Name: ${ctx.brandContext.brand_name ?? 'N/A'}, Tone: ${ctx.brandContext.tone ?? 'professional'}, Audience: ${ctx.brandContext.target_audience ?? 'travelers'}`
    : 'No brand kit configured. Use professional tone.'

  const sectionsBlock = ctx.sections
    .map(
      (s) =>
        `- ${s.section_type} (id: ${s.id})${ctx.focusedSectionId === s.id ? ' [FOCUSED]' : ''}: ${JSON.stringify(s.content ?? {}).slice(0, 200)}`
    )
    .join('\n')

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
- Always explain your reasoning briefly`
}
