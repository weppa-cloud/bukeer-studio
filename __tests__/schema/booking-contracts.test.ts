/**
 * Booking contract tests — SPEC #166 schemas (ADR-003).
 *
 * Covers per schema: happy path accept, 1 required-field reject,
 * 1 out-of-range / invalid-value reject. Kept tight (≤12 tests).
 */

import {
  LeadInputSchema,
} from '@/packages/website-contract/src/schemas/leads';
import {
  BookingRowSchema,
  BookingEventSchema,
  ProductAvailabilityRowSchema,
} from '@/packages/website-contract/src/schemas/bookings';
import { WompiEventSchema } from '@/packages/website-contract/src/schemas/wompi';
import {
  CancellationPolicySchema,
  CancellationTokenPayloadSchema,
} from '@/packages/website-contract/src/schemas/cancellation';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';

const baseLead = {
  name: 'Ana Torres',
  email: 'ana@example.com',
  phone: '+573001234567',
  product_id: UUID_A,
  date: '2026-05-01',
  pax: 2,
  option_id: null,
  source: 'website_booking_form' as const,
  locale: 'es-CO',
  consent_tos: true as const,
  consent_privacy: true as const,
};

const baseBooking = {
  id: UUID_A,
  product_id: UUID_B,
  tenant_id: UUID_C,
  user_email: 'ana@example.com',
  user_phone: null,
  pax: 2,
  option_id: null,
  date: '2026-05-01',
  status: 'pending' as const,
  deposit_amount: 20000,
  deposit_currency: 'COP',
  total_amount: 100000,
  wompi_payment_id: null,
  idempotency_key: 'idem-abc',
  created_at: '2026-04-17T10:00:00.000Z',
  expires_at: '2026-04-17T10:30:00.000Z',
  confirmed_at: null,
  cancelled_at: null,
};

const baseWompi = {
  event: 'transaction.updated' as const,
  data: {
    transaction: {
      id: 'txn_1',
      reference: 'ref_1',
      status: 'APPROVED' as const,
      amount_in_cents: 2000000,
      currency: 'COP',
    },
  },
  sent_at: '2026-04-17T10:00:00.000Z',
  signature: { properties: ['id', 'status'], checksum: 'abc123' },
  timestamp: 1713355200,
};

describe('LeadInputSchema (ADR-003)', () => {
  it('accepts a valid booking form lead', () => {
    expect(LeadInputSchema.safeParse(baseLead).success).toBe(true);
  });

  it('rejects when email is missing', () => {
    const { email, ...noEmail } = baseLead;
    expect(LeadInputSchema.safeParse(noEmail).success).toBe(false);
  });

  it('rejects pax above 50', () => {
    expect(LeadInputSchema.safeParse({ ...baseLead, pax: 51 }).success).toBe(false);
  });
});

describe('BookingRowSchema (ADR-003)', () => {
  it('accepts a well-formed booking row', () => {
    expect(BookingRowSchema.safeParse(baseBooking).success).toBe(true);
  });

  it('rejects when idempotency_key is missing', () => {
    const { idempotency_key, ...noKey } = baseBooking;
    expect(BookingRowSchema.safeParse(noKey).success).toBe(false);
  });

  it('rejects negative deposit_amount', () => {
    expect(
      BookingRowSchema.safeParse({ ...baseBooking, deposit_amount: -1 }).success,
    ).toBe(false);
  });
});

describe('ProductAvailabilityRowSchema + BookingEventSchema (ADR-003)', () => {
  it('accepts availability row with zero reserved', () => {
    expect(
      ProductAvailabilityRowSchema.safeParse({
        product_id: UUID_A,
        date: '2026-05-01',
        capacity: 10,
        reserved: 0,
        version: 0,
      }).success,
    ).toBe(true);
  });

  it('rejects booking event with invalid enum value', () => {
    expect(
      BookingEventSchema.safeParse({
        booking_id: UUID_A,
        event: 'not_a_real_event',
        payload: {},
        created_at: '2026-04-17T10:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('WompiEventSchema (ADR-003)', () => {
  it('accepts an APPROVED transaction payload', () => {
    expect(WompiEventSchema.safeParse(baseWompi).success).toBe(true);
  });

  it('rejects when data.transaction is missing', () => {
    const { data, ...rest } = baseWompi;
    expect(WompiEventSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects currency with length != 3', () => {
    const broken = {
      ...baseWompi,
      data: {
        transaction: { ...baseWompi.data.transaction, currency: 'USDX' },
      },
    };
    expect(WompiEventSchema.safeParse(broken).success).toBe(false);
  });
});

describe('Cancellation schemas (ADR-003)', () => {
  it('accepts a valid policy + token payload', () => {
    expect(
      CancellationPolicySchema.safeParse({
        tiers: [{ days_before: 7, refund_pct: 50, label: '7+ days' }],
        cutoff_hours: 24,
      }).success,
    ).toBe(true);

    expect(
      CancellationTokenPayloadSchema.safeParse({
        booking_id: UUID_A,
        exp: 1713355200,
        iat: 1712750400,
        version: 1,
      }).success,
    ).toBe(true);
  });

  it('rejects policy with empty tiers array', () => {
    expect(
      CancellationPolicySchema.safeParse({ tiers: [], cutoff_hours: 0 }).success,
    ).toBe(false);
  });

  it('rejects refund_pct above 100', () => {
    expect(
      CancellationPolicySchema.safeParse({
        tiers: [{ days_before: 0, refund_pct: 150, label: 'bad' }],
      }).success,
    ).toBe(false);
  });
});
