import { resolveProductCatalogRows } from '@/lib/admin-next/products-catalog-resolver';

describe('products catalog resolver', () => {
  it('resolves known CSV rows against the catalog fixture contract', () => {
    const result = resolveProductCatalogRows([
      {
        id: 'row-1',
        sourceName: 'Hotel Las Islas',
        type: 'Hotel',
        city: 'Baru, Cartagena',
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'row-1',
        sourceName: 'Hotel Las Islas',
        masterName: 'Hotel Las Islas · master PRD-0148',
        confidence: '96%',
        action: 'link',
        reason: 'exact_fixture_match',
      }),
    ]);
  });

  it('falls back to creating an owned record when no master match exists', () => {
    const result = resolveProductCatalogRows([
      {
        id: 'row-new',
        sourceName: 'Tour privado Getsemani nocturno',
      },
    ]);

    expect(result).toEqual([
      {
        id: 'row-new',
        sourceName: 'Tour privado Getsemani nocturno',
        masterName: 'Sin coincidencia segura',
        confidence: '0%',
        action: 'create',
        reason: 'no_match_fixture_fallback',
      },
    ]);
  });
});
