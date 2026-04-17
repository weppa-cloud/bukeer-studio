/**
 * Leads Zod schemas — SPEC #166 Phase A (#168).
 *
 * All server-side writes to `leads` MUST parse with `LeadInputSchema`
 * (ADR-003 Contract-First). DB reads MUST parse with `LeadRowSchema`.
 */

import { z } from 'zod';

export const LeadSourceSchema = z.enum([
  'website_booking_form',
  'website_contact_form',
  'whatsapp_inbound',
  'manual',
]);

export const LeadInputSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
  product_id: z.string().uuid(),
  date: z.string().date(),
  pax: z.number().int().positive().max(50),
  option_id: z.string().uuid().nullable(),
  source: LeadSourceSchema,
  locale: z.string().length(5).nullable(),
  utm: z.record(z.string(), z.string()).optional(),
});

export const LeadRowSchema = LeadInputSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  tenant_id: z.string().uuid(),
});

export type LeadSource = z.infer<typeof LeadSourceSchema>;
export type LeadInput = z.infer<typeof LeadInputSchema>;
export type LeadRow = z.infer<typeof LeadRowSchema>;
