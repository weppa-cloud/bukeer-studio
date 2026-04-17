/**
 * AI-generated package content schemas.
 *
 * Used by /api/ai/generate-package-content to validate structured output
 * from the LLM before persisting to package_kits.
 */

import { z } from 'zod';

export const PackageAiHighlightsSchema = z.object({
  highlights: z.array(z.string().max(60)).min(3).max(5),
  description: z.string().max(500),
});

export type PackageAiHighlights = z.infer<typeof PackageAiHighlightsSchema>;
