import { createOpenAI } from '@ai-sdk/openai';

/**
 * LLM Provider for website editor AI routes.
 *
 * Uses OpenRouter (OpenAI-compatible API) by default.
 * Same provider as agent-server for unified billing and model access.
 *
 * Environment variables:
 * - OPENROUTER_AUTH_TOKEN: API key for OpenRouter
 * - OPENROUTER_BASE_URL: Base URL (default: https://openrouter.ai/api/v1)
 * - OPENROUTER_MODEL: Model ID (default: anthropic/claude-sonnet-4-5-20250514)
 */

const openrouter = createOpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_AUTH_TOKEN || '',
  // OpenRouter-specific headers
  headers: {
    'HTTP-Referer': 'https://app.bukeer.com',
    'X-Title': 'Bukeer Website Editor',
  },
});

/** Default model for editor AI routes */
export const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4.6';

/** Get the configured LLM model for editor routes */
export function getEditorModel() {
  return openrouter(DEFAULT_MODEL);
}

/** Get a specific model (e.g., cheaper model for simpler tasks) */
export function getModel(modelId: string) {
  return openrouter(modelId);
}
