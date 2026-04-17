/**
 * Wompi webhook Zod schema — SPEC #166 Phase B (#169).
 *
 * Incoming webhook payloads MUST parse with `WompiEventSchema` BEFORE
 * any signature check or state transition (ADR-003 + ADR-017 candidate).
 */

import { z } from 'zod';

export const WompiEventSchema = z.object({
  event: z.enum(['transaction.updated']),
  data: z.object({
    transaction: z.object({
      id: z.string(),
      reference: z.string(),
      status: z.enum(['APPROVED', 'DECLINED', 'VOIDED', 'ERROR', 'PENDING']),
      amount_in_cents: z.number().int().nonnegative(),
      currency: z.string().length(3),
    }),
  }),
  sent_at: z.string().datetime(),
  signature: z.object({
    properties: z.array(z.string()),
    checksum: z.string(),
  }),
  timestamp: z.number().int(),
});

export type WompiEvent = z.infer<typeof WompiEventSchema>;
