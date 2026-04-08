/**
 * Quote request Zod schema
 */

import { z } from 'zod';

export const QuoteRequestSchema = z.object({
  subdomain: z.string().min(1),
  productType: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  travelDates: z.object({
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
  }).optional(),
  adults: z.number().int().min(1).max(20).optional(),
  children: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(2000).optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;
