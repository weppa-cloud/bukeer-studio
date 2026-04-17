/**
 * Cancellation policy + token Zod schemas — SPEC #166 Phase C (#170).
 *
 * `CancellationPolicySchema` validates the `products.cancellation_policy` JSONB.
 * `CancellationTokenPayloadSchema` validates decoded JWT payload for
 * self-serve cancellation links.
 */

import { z } from 'zod';

export const CancellationTierSchema = z.object({
  days_before: z.number().int().nonnegative(),
  refund_pct: z.number().min(0).max(100),
  label: z.string().min(1),
});

export const CancellationPolicySchema = z.object({
  tiers: z.array(CancellationTierSchema).min(1),
  cutoff_hours: z.number().int().nonnegative().default(0),
  notes_md: z.string().nullable().optional(),
});

export const CancellationTokenPayloadSchema = z.object({
  booking_id: z.string().uuid(),
  exp: z.number().int(),
  iat: z.number().int(),
  version: z.literal(1),
});

export type CancellationTier = z.infer<typeof CancellationTierSchema>;
export type CancellationPolicy = z.infer<typeof CancellationPolicySchema>;
export type CancellationTokenPayload = z.infer<typeof CancellationTokenPayloadSchema>;
