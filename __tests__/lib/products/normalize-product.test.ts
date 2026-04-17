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
});
