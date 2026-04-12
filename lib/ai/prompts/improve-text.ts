/**
 * Prompts for text improvement actions.
 *
 * Each action maps to a system prompt that guides the LLM
 * to transform the input text in a specific way.
 */

export const IMPROVEMENT_ACTIONS = [
  'rewrite',
  'shorten',
  'expand',
  'formal',
  'casual',
  'translate',
] as const

export type ImprovementAction = (typeof IMPROVEMENT_ACTIONS)[number]

export const ACTION_PROMPTS: Record<ImprovementAction, string> = {
  rewrite:
    'Rewrite this text to be more engaging and professional, keeping the same meaning.',
  shorten:
    'Shorten this text significantly while preserving the key message. Be concise.',
  expand:
    'Expand this text with more detail and engaging language. Add supporting points.',
  formal: 'Rewrite this text in a more formal, professional tone.',
  casual: 'Rewrite this text in a friendly, conversational tone.',
  translate:
    'Translate this text to the target language while preserving tone and meaning.',
}

export function buildImproveTextPrompt(
  action: ImprovementAction,
  targetLocale?: string
): string {
  let prompt = ACTION_PROMPTS[action]
  if (action === 'translate' && targetLocale) {
    prompt += ` Target language: ${targetLocale}`
  }
  return prompt
}
