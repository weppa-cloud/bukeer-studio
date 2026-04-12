/**
 * Prompt for AI section content generation.
 *
 * Used by the generate-section endpoint to create content
 * for specific section types (hero, features, testimonials, etc.).
 */

interface SectionGeneratorContext {
  sectionType: string
  websiteContext?: Record<string, unknown>
  prompt?: string
  locale?: string
}

export function buildSectionGeneratorPrompt(ctx: SectionGeneratorContext): string {
  return `Generate content for a "${ctx.sectionType}" website section.
Website context: ${JSON.stringify(ctx.websiteContext ?? {})}
User instructions: ${ctx.prompt ?? 'Generate engaging content for a travel agency website.'}
Language: ${ctx.locale ?? 'es'}

Generate professional, engaging content appropriate for the section type.
For items arrays, generate 3-6 items with descriptive titles and descriptions.
Keep text concise and action-oriented.`
}
