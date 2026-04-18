import { calculateCost, getPricingFor, MODEL_PRICING } from '@/lib/ai/model-pricing';

describe('calculateCost', () => {
  it('Claude Sonnet 4.5 — 1k input + 500 output tokens', () => {
    const cost = calculateCost('anthropic/claude-sonnet-4-5', {
      inputTokens: 1000,
      outputTokens: 500,
    });
    // (1 * 0.003) + (0.5 * 0.015) = 0.003 + 0.0075 = 0.0105
    expect(cost).toBeCloseTo(0.0105, 5);
  });

  it('Claude Haiku 4.5 — 2k input + 200 output', () => {
    const cost = calculateCost('anthropic/claude-haiku-4-5', {
      inputTokens: 2000,
      outputTokens: 200,
    });
    // (2 * 0.0008) + (0.2 * 0.004) = 0.0016 + 0.0008 = 0.0024
    expect(cost).toBeCloseTo(0.0024, 5);
  });

  it('falls back when model unknown', () => {
    const cost = calculateCost('unknown/model-x', { inputTokens: 1000, outputTokens: 1000 });
    // fallback = sonnet pricing: 0.003 + 0.015 = 0.018
    expect(cost).toBeCloseTo(0.018, 5);
  });

  it('free model returns 0', () => {
    const cost = calculateCost('google/gemini-2.0-flash-exp:free', {
      inputTokens: 10000,
      outputTokens: 10000,
    });
    expect(cost).toBe(0);
  });

  it('zero usage returns 0', () => {
    const cost = calculateCost('anthropic/claude-sonnet-4-5', {
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(cost).toBe(0);
  });

  it('getPricingFor returns fallback for unknown model', () => {
    const p = getPricingFor('unknown');
    expect(p.input).toBeGreaterThan(0);
    expect(p.output).toBeGreaterThan(0);
  });

  it('MODEL_PRICING has all 8 expected models', () => {
    const models = Object.keys(MODEL_PRICING);
    expect(models).toHaveLength(8);
    expect(models).toContain('anthropic/claude-sonnet-4-5');
    expect(models).toContain('anthropic/claude-haiku-4-5');
  });
});
