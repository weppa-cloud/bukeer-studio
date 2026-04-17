/**
 * Bookings Zod schemas — SPEC #166 Phase B (#169).
 *
 * All server-side reads/writes to `bookings`, `product_availability`,
 * and `booking_events` MUST parse with these schemas (ADR-003).
 */

import { z } from 'zod';

export const BookingStatusSchema = z.enum([
  'pending',
  'holding',
  'confirmed',
  'expired',
  'cancelled',
]);

export const ProductAvailabilityRowSchema = z.object({
  product_id: z.string().uuid(),
  date: z.string().date(),
  capacity: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
});

export const BookingRowSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  user_email: z.string().email(),
  user_phone: z.string().nullable(),
  pax: z.number().int().positive(),
  option_id: z.string().uuid().nullable(),
  date: z.string().date(),
  status: BookingStatusSchema,
  deposit_amount: z.number().nonnegative(),
  deposit_currency: z.string().length(3),
  total_amount: z.number().nonnegative(),
  wompi_payment_id: z.string().nullable(),
  idempotency_key: z.string().min(1),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  confirmed_at: z.string().datetime().nullable(),
  cancelled_at: z.string().datetime().nullable(),
});

export const BookingEventSchema = z.object({
  booking_id: z.string().uuid(),
  event: z.enum([
    'created',
    'hold_placed',
    'payment_initiated',
    'payment_confirmed',
    'payment_failed',
    'expired',
    'cancelled',
    'refund_initiated',
    'refund_completed',
  ]),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
});

export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type ProductAvailabilityRow = z.infer<typeof ProductAvailabilityRowSchema>;
export type BookingRow = z.infer<typeof BookingRowSchema>;
export type BookingEvent = z.infer<typeof BookingEventSchema>;
