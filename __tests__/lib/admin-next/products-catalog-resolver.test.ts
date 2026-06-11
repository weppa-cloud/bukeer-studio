import {
  resolveProductCatalogRows,
  resolveProductCatalogRowsReadonly,
} from '@/lib/admin-next/products-catalog-resolver';

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

  it('resolves readonly rows through the master catalog RPC contract', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'master-hotel-1',
          name: 'Hotel Las Islas',
          data_completeness: 0.96,
        },
      ],
      error: null,
    });

    const result = await resolveProductCatalogRowsReadonly(
      { rpc },
      [
        {
          id: 'row-1',
          sourceName: 'Hotel Las Islas',
          type: 'Hotel',
        },
      ],
    );

    expect(rpc).toHaveBeenCalledWith('search_master_hotels', {
      p_query: 'Hotel Las Islas',
      p_limit: 1,
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'row-1',
        masterName: 'Hotel Las Islas · master master-hotel-1',
        confidence: '96%',
        action: 'link',
        reason: 'readonly_master_match',
      }),
    ]);
  });
});
