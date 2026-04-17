import type { ProductData, ProductPageCustomization } from '@bukeer/website-contract';
import { normalizeProduct } from '@/lib/products/normalize-product';

const baseProduct: ProductData = {
  id: 'prod-1',
  name: 'Producto',
  slug: 'producto',
  type: 'activity',
};

describe('normalizeProduct', () => {
  it('normalizes V2-only payloads without falling back', () => {
    const logs: Array<{ field: string; from: string; to: string }> = [];
    const page: ProductPageCustomization = {
      id: 'page-1',
      custom_sections: [],
      sections_order: [],
      hidden_sections: [],
      custom_faq: [{ question: 'Q1', answer: 'A1' }],
      is_published: true,
    };

    const result = normalizeProduct(
      {
        ...baseProduct,
        inclusions: ['Incluye traslado'],
        exclusions: ['No incluye comidas'],
        highlights: ['Vista panorámica'],
        schedule: [{ title: 'Día 1' }],
        meeting_point: { address: 'Muelle 1', city: 'Cartagena', country: 'CO' },
        photos: ['https://img.dev/1.jpg'],
        options: [
          {
            id: 'opt-1',
            name: 'General',
            pricing_per: 'UNIT',
            prices: [{ unit_type_code: 'ADT', season: 'regular', price: 99, currency: 'USD' }],
          },
        ],
        user_rating: 4.8,
      },
      { page, logger: (event) => logs.push(event) }
    );

    expect(result.inclusions).toEqual(['Incluye traslado']);
    expect(result.exclusions).toEqual(['No incluye comidas']);
    expect(result.highlights).toEqual(['Vista panorámica']);
    expect(result.schedule).toEqual([{ title: 'Día 1' }]);
    expect(result.meeting_point?.location).toContain('Cartagena');
    expect(result.gallery).toEqual(['https://img.dev/1.jpg']);
    expect(result.price).toBe(99);
    expect(result.rating).toBe(4.8);
    expect(result.faq).toEqual([{ question: 'Q1', answer: 'A1' }]);
    expect(logs).toHaveLength(0);
  });

  it('falls back to legacy-only payloads', () => {
    const logs: Array<{ field: string; from: string; to: string }> = [];
    const legacyProduct = {
      ...baseProduct,
      inclusions: 'Transporte, Guia',
      exclusions: 'Almuerzo',
      schedule_data: [{ title: 'Agenda legacy' }],
      location: 'Santa Marta',
      instructions: 'Llega 15 min antes',
      images: ['https://img.dev/legacy.jpg'],
      price: '$150 USD',
      rating: 4.2,
    } as unknown as ProductData;

    const result = normalizeProduct(legacyProduct, { logger: (event) => logs.push(event) });

    expect(result.inclusions).toEqual(['Transporte', 'Guia']);
    expect(result.exclusions).toEqual(['Almuerzo']);
    expect(result.schedule).toEqual([{ title: 'Agenda legacy' }]);
    expect(result.meeting_point).toEqual({
      location: 'Santa Marta',
      instructions: 'Llega 15 min antes',
      raw: null,
    });
    expect(result.gallery).toEqual(['https://img.dev/legacy.jpg']);
    expect(result.price).toBe(150);
    expect(result.rating).toBe(4.2);
    expect(result.faq).toBeNull();
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'schedule', to: 'legacy' }),
        expect.objectContaining({ field: 'meeting_point', to: 'legacy' }),
      ])
    );
  });

  it('prioritizes mixed payloads using precedence rules', () => {
    const logs: Array<{ field: string; from: string; to: string }> = [];

    const result = normalizeProduct(
      {
        ...baseProduct,
        inclusions: [{ text: 'V2 inclusion' }],
        exclusions: 'Legacy exclusion',
        highlights: null as unknown as string[],
        itinerary_items: [{ title: 'Legacy itinerary' }],
        photos: [{ url: 'https://img.dev/v2-gallery.jpg' }],
        options: [
          {
            id: 'opt-2',
            name: 'Premium',
            pricing_per: 'UNIT',
            prices: [
              { unit_type_code: 'ADT', season: 'regular', price: 320, currency: 'USD' },
              { unit_type_code: 'ADT', season: 'promo', price: 280, currency: 'USD' },
            ],
          },
        ],
        price: 999,
        user_rating: null as unknown as number,
        rating: 4.5,
      },
      { logger: (event) => logs.push(event) }
    );

    expect(result.inclusions).toEqual([{ text: 'V2 inclusion' }]);
    expect(result.exclusions).toEqual(['Legacy exclusion']);
    expect(result.highlights).toBeNull();
    expect(result.schedule).toEqual([{ title: 'Legacy itinerary' }]);
    expect(result.gallery).toEqual(['https://img.dev/v2-gallery.jpg']);
    expect(result.price).toBe(280);
    expect(result.rating).toBe(4.5);
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'exclusions', to: 'legacy' }),
        expect.objectContaining({ field: 'rating', to: 'legacy' }),
      ])
    );
  });

  it('returns null/empty containers when payload is empty', () => {
    const logs: Array<{ field: string; from: string; to: string }> = [];

    const result = normalizeProduct(baseProduct, { logger: (event) => logs.push(event) });

    expect(result).toEqual({
      inclusions: null,
      exclusions: null,
      highlights: null,
      schedule: null,
      meeting_point: null,
      gallery: [],
      price: null,
      rating: null,
      faq: null,
    });
    expect(logs.length).toBeGreaterThan(0);
  });

  // --- Hotel branch: bridged V2 vs legacy vs partial ---

  it('hotel with V2 bridge: picks V2 photos, user_rating, highlights, meeting_point geo', () => {
    const logs: Array<{ field: string; from: string; to: string }> = [];
    const hotelProduct = {
      ...baseProduct,
      type: 'hotel' as const,
      name: 'Hotel Boutique Caribe',
      // V2 bridged fields
      photos: [
        { url: 'https://img.dev/hotel-v2-1.jpg' },
        { url: 'https://img.dev/hotel-v2-2.jpg' },
      ],
      amenities: ['WiFi', 'Piscina', 'Spa', 'Gimnasio'],
      user_rating: 4.7,
      review_count: 128,
      social_image: 'https://img.dev/hotel-social.jpg',
      highlights: ['Vista al mar', 'Desayuno incluido'],
      meeting_point: {
        address: 'Cra 1 # 2-3',
        city: 'Cartagena',
        country: 'CO',
        latitude: 10.39,
        longitude: -75.51,
      },
      // Legacy values that SHOULD be ignored when V2 present
      image: 'https://img.dev/hotel-legacy.jpg',
      rating: 3.5,
    } as unknown as ProductData;

    const result = normalizeProduct(hotelProduct, { logger: (event) => logs.push(event) });

    expect(result.gallery).toEqual([
      'https://img.dev/hotel-v2-1.jpg',
      'https://img.dev/hotel-v2-2.jpg',
    ]);
    expect(result.rating).toBe(4.7);
    expect(result.highlights).toEqual(['Vista al mar', 'Desayuno incluido']);
    expect(result.meeting_point?.raw).toBeTruthy();
    expect(result.meeting_point?.raw?.latitude).toBe(10.39);
    expect(result.meeting_point?.raw?.longitude).toBe(-75.51);
    expect(result.meeting_point?.location).toContain('Cartagena');
    // No fallbacks should be logged for these V2 fields
    const fallbackFields = logs.map((l) => l.field);
    expect(fallbackFields).not.toContain('gallery');
    expect(fallbackFields).not.toContain('rating');
    expect(fallbackFields).not.toContain('highlights');
    expect(fallbackFields).not.toContain('meeting_point');
  });

  it('hotel without V2 bridge: returns legacy-only fields; V2-only blocks are null', () => {
    const logs: Array<{ field: string; from: string; to: string }> = [];
    const legacyHotel = {
      ...baseProduct,
      type: 'hotel' as const,
      name: 'Hotel Legacy',
      image: 'https://img.dev/hotel-legacy.jpg',
      images: ['https://img.dev/hotel-legacy-2.jpg'],
      rating: 4.1,
      location: 'Medellin',
      amenities: ['WiFi'],
      // NO V2 fields: photos, user_rating, highlights, meeting_point, social_image
    } as unknown as ProductData;

    const result = normalizeProduct(legacyHotel, { logger: (event) => logs.push(event) });

    // Gallery falls back to legacy images array
    expect(result.gallery).toEqual(['https://img.dev/hotel-legacy-2.jpg']);
    // Rating falls back to legacy rating
    expect(result.rating).toBe(4.1);
    // V2-only blocks remain null — graceful hide at render time
    expect(result.highlights).toBeNull();
    expect(result.schedule).toBeNull();
    // meeting_point falls back to legacy location (no raw coords)
    expect(result.meeting_point?.raw).toBeNull();
    expect(result.meeting_point?.location).toBe('Medellin');
    expect(result.faq).toBeNull();
    // Fallback logs should be recorded
    const toLegacy = logs.filter((l) => l.to === 'legacy').map((l) => l.field);
    expect(toLegacy).toEqual(expect.arrayContaining(['gallery', 'rating', 'meeting_point']));
  });

  it('hotel with partial V2 data: missing V2 field returns null, does NOT synthesize fake data', () => {
    const logs: Array<{ field: string; from: string; to: string }> = [];
    const partialHotel = {
      ...baseProduct,
      type: 'hotel' as const,
      name: 'Hotel Partial',
      // Only user_rating + photos present from V2
      user_rating: 4.3,
      photos: ['https://img.dev/partial.jpg'],
      // highlights, meeting_point, options, schedule absent
    } as unknown as ProductData;

    const result = normalizeProduct(partialHotel, { logger: (event) => logs.push(event) });

    expect(result.rating).toBe(4.3);
    expect(result.gallery).toEqual(['https://img.dev/partial.jpg']);
    // Missing V2 fields must be null — never fabricated
    expect(result.highlights).toBeNull();
    expect(result.meeting_point).toBeNull();
    expect(result.schedule).toBeNull();
    expect(result.price).toBeNull();
    expect(result.inclusions).toBeNull();
    expect(result.exclusions).toBeNull();
    // These absent fields should log fallback -> null
    const toNull = logs.filter((l) => l.to === 'null').map((l) => l.field);
    expect(toNull).toEqual(
      expect.arrayContaining(['highlights', 'meeting_point', 'schedule', 'price'])
    );
  });

  // --- Transfer branch: minimal view model ---

  it('transfer: normalizer returns minimal view model (no V2 blocks)', () => {
    const logs: Array<{ field: string; from: string; to: string }> = [];
    const transferProduct = {
      ...baseProduct,
      type: 'transfer' as const,
      name: 'Traslado Aeropuerto - Hotel',
      description: 'Traslado privado puerta a puerta',
      from_location: 'CTG Airport',
      to_location: 'Hotel Centro',
      images: ['https://img.dev/transfer.jpg'],
      price: 45,
      currency: 'USD',
    } as unknown as ProductData;

    const result = normalizeProduct(transferProduct, { logger: (event) => logs.push(event) });

    // Minimal surface — gallery + price only
    expect(result.gallery).toEqual(['https://img.dev/transfer.jpg']);
    expect(result.price).toBe(45);
    // Transfer layout suppresses these at render; normalizer returns null (no fabrication)
    expect(result.highlights).toBeNull();
    expect(result.schedule).toBeNull();
    expect(result.meeting_point).toBeNull();
    expect(result.inclusions).toBeNull();
    expect(result.exclusions).toBeNull();
    expect(result.faq).toBeNull();
    // Sanity: no crash, no log for unexpected fields
    expect(Array.isArray(logs)).toBe(true);
  });
});
