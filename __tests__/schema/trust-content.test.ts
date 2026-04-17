import { TrustContentSchema } from '@/packages/website-contract/src/schemas/trust';

describe('TrustContentSchema (ADR-003)', () => {
  it('accepts empty object', () => {
    expect(TrustContentSchema.safeParse({}).success).toBe(true);
  });

  it('accepts full payload', () => {
    const result = TrustContentSchema.safeParse({
      rnt_number: '12345',
      years_active: 8,
      travelers_count: 12000,
      insurance_provider: 'Sura Colombia',
      certifications: [
        { code: 'anato', label: 'ANATO' },
        { code: 'iata', label: 'IATA' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero travelers_count', () => {
    expect(TrustContentSchema.safeParse({ travelers_count: 0 }).success).toBe(false);
  });

  it('rejects negative years_active', () => {
    expect(TrustContentSchema.safeParse({ years_active: -1 }).success).toBe(false);
  });

  it('rejects years_active beyond 200', () => {
    expect(TrustContentSchema.safeParse({ years_active: 201 }).success).toBe(false);
  });

  it('rejects empty certification code', () => {
    expect(
      TrustContentSchema.safeParse({ certifications: [{ code: '', label: 'ANATO' }] }).success,
    ).toBe(false);
  });

  it('rejects more than 20 certifications', () => {
    const certs = Array.from({ length: 21 }, (_, i) => ({
      code: `c${i}`,
      label: `Cert ${i}`,
    }));
    expect(TrustContentSchema.safeParse({ certifications: certs }).success).toBe(false);
  });

  it('rejects empty rnt_number string', () => {
    expect(TrustContentSchema.safeParse({ rnt_number: '' }).success).toBe(false);
  });
});
