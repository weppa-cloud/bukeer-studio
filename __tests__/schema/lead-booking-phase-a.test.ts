/**
 * Contract tests — SPEC #168 Phase A schemas.
 *
 * Guards the wire shape between `/api/leads` (Agent B), the booking UI
 * (Agent C), and the DB migration `20260422000000_leads_booking_phase_a.sql`.
 */

import {
  LeadInputSchema,
  LeadSourceSchema,
  ProductAvailabilityRowSchema,
} from '@bukeer/website-contract';

// Real v4-shaped UUIDs (Zod v4 rejects the nil UUID for strict format).
const validProductId = 'b4d2f6a8-4c1e-4b2a-9f1d-3e8c7a5b9d12';

const baseInput = {
  name: 'Jane Traveler',
  email: 'jane@example.com',
  phone: '+57 300 123 4567',
  product_id: validProductId,
  date: '2026-05-10',
  pax: 2,
  source: 'website_booking_form' as const,
  locale: 'es-CO',
  utm: {
    source: 'google',
    medium: 'cpc',
    campaign: 'summer-2026',
  },
  option_id: null,
  consent_tos: true,
  consent_privacy: true,
} as const;

describe('LeadInputSchema', () => {
  it('accepts a full valid payload', () => {
    const result = LeadInputSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const { email: _email, ...rest } = baseInput;
    void _email;
    const result = LeadInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects pax = 0', () => {
    const result = LeadInputSchema.safeParse({ ...baseInput, pax: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects pax = 51', () => {
    const result = LeadInputSchema.safeParse({ ...baseInput, pax: 51 });
    expect(result.success).toBe(false);
  });

  it('rejects malformed date', () => {
    const result = LeadInputSchema.safeParse({ ...baseInput, date: '10/05/2026' });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid product_id', () => {
    const result = LeadInputSchema.safeParse({ ...baseInput, product_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('LeadSourceSchema', () => {
  it.each([
    'website_booking_form',
    'website_contact_form',
    'whatsapp_inbound',
    'manual',
  ])('accepts known value %s', (source) => {
    expect(LeadSourceSchema.safeParse(source).success).toBe(true);
  });

  it('rejects unknown source', () => {
    expect(LeadSourceSchema.safeParse('facebook_ad').success).toBe(false);
  });
});

describe('ProductAvailabilityRowSchema', () => {
  const validRow = {
    product_id: validProductId,
    date: '2026-05-10',
    capacity: 20,
    reserved: 3,
    version: 0,
    updated_at: '2026-04-17T10:00:00.000Z',
  };

  it('accepts a valid row', () => {
    expect(ProductAvailabilityRowSchema.safeParse(validRow).success).toBe(true);
  });

  it('rejects negative reserved', () => {
    const result = ProductAvailabilityRowSchema.safeParse({ ...validRow, reserved: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects negative capacity', () => {
    const result = ProductAvailabilityRowSchema.safeParse({ ...validRow, capacity: -5 });
    expect(result.success).toBe(false);
  });
});
