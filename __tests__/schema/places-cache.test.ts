import {
  PlaceCacheRowSchema,
  PlaceCacheInsertSchema,
} from '@/packages/website-contract/src/schemas/places-cache';

describe('PlaceCacheRowSchema (ADR-003)', () => {
  const validRow = {
    normalized_name: 'cartagena',
    lat: 10.3910,
    lng: -75.4794,
    source: 'maptiler' as const,
    country_code: 'CO',
    updated_at: '2026-04-17T00:00:00.000Z',
  };

  it('accepts a valid row', () => {
    expect(PlaceCacheRowSchema.safeParse(validRow).success).toBe(true);
  });

  it('accepts null country_code', () => {
    expect(
      PlaceCacheRowSchema.safeParse({ ...validRow, country_code: null }).success,
    ).toBe(true);
  });

  it('rejects lat below -90', () => {
    expect(PlaceCacheRowSchema.safeParse({ ...validRow, lat: -90.1 }).success).toBe(false);
  });

  it('rejects lat above 90', () => {
    expect(PlaceCacheRowSchema.safeParse({ ...validRow, lat: 90.1 }).success).toBe(false);
  });

  it('rejects lng below -180', () => {
    expect(PlaceCacheRowSchema.safeParse({ ...validRow, lng: -180.1 }).success).toBe(false);
  });

  it('rejects lng above 180', () => {
    expect(PlaceCacheRowSchema.safeParse({ ...validRow, lng: 180.1 }).success).toBe(false);
  });

  it('rejects source not in enum', () => {
    expect(
      PlaceCacheRowSchema.safeParse({ ...validRow, source: 'google' }).success,
    ).toBe(false);
  });

  it('accepts each valid source variant', () => {
    for (const source of ['static', 'maptiler', 'manual'] as const) {
      expect(PlaceCacheRowSchema.safeParse({ ...validRow, source }).success).toBe(true);
    }
  });

  it('rejects country_code length != 2', () => {
    expect(
      PlaceCacheRowSchema.safeParse({ ...validRow, country_code: 'COL' }).success,
    ).toBe(false);
    expect(
      PlaceCacheRowSchema.safeParse({ ...validRow, country_code: 'C' }).success,
    ).toBe(false);
  });

  it('rejects empty normalized_name', () => {
    expect(
      PlaceCacheRowSchema.safeParse({ ...validRow, normalized_name: '' }).success,
    ).toBe(false);
  });

  it('rejects non-datetime updated_at', () => {
    expect(
      PlaceCacheRowSchema.safeParse({ ...validRow, updated_at: 'not-a-date' }).success,
    ).toBe(false);
  });
});

describe('PlaceCacheInsertSchema (ADR-003)', () => {
  it('accepts insert without updated_at', () => {
    expect(
      PlaceCacheInsertSchema.safeParse({
        normalized_name: 'bogota',
        lat: 4.711,
        lng: -74.0721,
        source: 'static',
        country_code: 'CO',
      }).success,
    ).toBe(true);
  });

  it('accepts insert with updated_at', () => {
    expect(
      PlaceCacheInsertSchema.safeParse({
        normalized_name: 'bogota',
        lat: 4.711,
        lng: -74.0721,
        source: 'static',
        country_code: 'CO',
        updated_at: '2026-04-17T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects insert with invalid lat', () => {
    expect(
      PlaceCacheInsertSchema.safeParse({
        normalized_name: 'bogota',
        lat: 100,
        lng: -74.0721,
        source: 'static',
        country_code: 'CO',
      }).success,
    ).toBe(false);
  });
});
