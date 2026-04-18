export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

export interface ModelPricing {
  input: number;
  output: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'anthropic/claude-sonnet-4-5': { input: 0.003, output: 0.015 },
  'anthropic/claude-haiku-4-5': { input: 0.0008, output: 0.004 },
  'claude-haiku-4-5-20251001': { input: 0.0008, output: 0.004 },
  'claude-sonnet-4-5-20251001': { input: 0.003, output: 0.015 },
  'mistralai/mistral-large': { input: 0.002, output: 0.006 },
  'openai/gpt-4o': { input: 0.0025, output: 0.01 },
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'google/gemini-2.0-flash-exp:free': { input: 0, output: 0 },
};

const FALLBACK_PRICING: ModelPricing = { input: 0.003, output: 0.015 };

export function calculateCost(model: string, usage: TokenUsage): number {
  const pricing = MODEL_PRICING[model] ?? FALLBACK_PRICING;
  const inputCost = (usage.inputTokens / 1000) * pricing.input;
  const outputCost = (usage.outputTokens / 1000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(6));
}

export function getPricingFor(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? FALLBACK_PRICING;
}
