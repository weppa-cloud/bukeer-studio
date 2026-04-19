const mockRpc = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: jest.fn(),
  }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

import { getProductPage } from '@/lib/supabase/get-pages';

const basePackageProduct = {
  id: 'pkg-1',
  name: 'Tour Cartagena 5 días',
  slug: 'tour-cartagena-5-dias',
  type: 'package',
};

const validPage = {
  id: 'page-1',
  custom_sections: [],
  sections_order: [],
  hidden_sections: [],
  is_published: true,
};

describe('getProductPage — Gate B package aggregation (#172)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges aggregated inclusions/exclusions/gallery when kit fields are empty', async () => {
    // First call: main product RPC
    mockRpc.mockResolvedValueOnce({
      data: { product: { ...basePackageProduct }, page: validPage },
      error: null,
    });
    // Second call: get_package_aggregated_data
    mockRpc.mockResolvedValueOnce({
      data: {
        inclusions: ['Guía bilingüe', 'Transporte A/R'],
        exclusions: ['Comidas', 'Entradas'],
        gallery: ['https://img.dev/agg-1.jpg', 'https://img.dev/agg-2.jpg'],
      },
      error: null,
    });

    const result = await getProductPage('demo-agg-1', 'package', 'tour-cartagena-5-dias');

    expect(result).not.toBeNull();
    const prod = result!.product as NonNullable<typeof result>["product"] & {
      program_inclusions?: string[];
      program_exclusions?: string[];
      program_gallery?: string[];
    };
    expect(prod.program_inclusions).toEqual(['Guía bilingüe', 'Transporte A/R']);
    expect(prod.program_exclusions).toEqual(['Comidas', 'Entradas']);
    expect(prod.program_gallery).toEqual(['https://img.dev/agg-1.jpg', 'https://img.dev/agg-2.jpg']);

    // Verify the aggregated RPC was called with the correct package id
    expect(mockRpc).toHaveBeenCalledWith('get_package_aggregated_data', { p_package_id: 'pkg-1' });
  });

  it('does NOT call aggregated RPC when kit already has program_inclusions', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        product: {
          ...basePackageProduct,
          program_inclusions: ['Kit inclusion'],
          program_exclusions: ['Kit exclusion'],
          program_gallery: ['https://img.dev/kit.jpg'],
        },
        page: validPage,
      },
      error: null,
    });

    const result = await getProductPage('demo-agg-2', 'package', 'tour-cartagena-5-dias');

    expect(result).not.toBeNull();
    // Only one RPC call (main product) — aggregated not called
    expect(mockRpc).toHaveBeenCalledTimes(1);
    const prod = result!.product as NonNullable<typeof result>["product"] & {
      program_inclusions?: string[];
    };
    expect(prod.program_inclusions).toEqual(['Kit inclusion']);
  });

  it('falls back to kit raw data when aggregated RPC returns empty arrays', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { product: { ...basePackageProduct }, page: validPage },
      error: null,
    });
    // Aggregated RPC returns empty arrays
    mockRpc.mockResolvedValueOnce({
      data: { inclusions: [], exclusions: [], gallery: [] },
      error: null,
    });

    const result = await getProductPage('demo-agg-3', 'package', 'tour-cartagena-5-dias');

    expect(result).not.toBeNull();
    const prod = result!.product as NonNullable<typeof result>["product"] & {
      program_inclusions?: string[];
      program_exclusions?: string[];
      program_gallery?: string[];
    };
    // Empty arrays from aggregated → fields set to empty arrays (not undefined)
    expect(prod.program_inclusions).toEqual([]);
    expect(prod.program_exclusions).toEqual([]);
    expect(prod.program_gallery).toEqual([]);
  });

  it('degrades gracefully when aggregated RPC throws — no 500', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { product: { ...basePackageProduct }, page: validPage },
      error: null,
    });
    // Aggregated RPC throws a network error
    mockRpc.mockRejectedValueOnce(new Error('Network timeout'));

    const result = await getProductPage('demo-agg-4', 'package', 'tour-cartagena-5-dias');

    // Must NOT crash — returns product with no aggregated fields
    expect(result).not.toBeNull();
    expect(result!.product.name).toBe('Tour Cartagena 5 días');
    const prod = result!.product as NonNullable<typeof result>["product"] & {
      program_inclusions?: string[];
    };
    expect(prod.program_inclusions).toBeUndefined();
  });

  it('degrades gracefully when aggregated RPC returns an error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { product: { ...basePackageProduct }, page: validPage },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'function does not exist', code: '42883' },
    });

    const result = await getProductPage('demo-agg-5', 'package', 'tour-cartagena-5-dias');

    expect(result).not.toBeNull();
    const prod = result!.product as NonNullable<typeof result>["product"] & {
      program_inclusions?: string[];
    };
    expect(prod.program_inclusions).toBeUndefined();
  });

  it('Zod parse of malformed aggData falls back gracefully — no crash', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { product: { ...basePackageProduct }, page: validPage },
      error: null,
    });
    // Return structurally invalid data — inclusions is a string instead of array
    mockRpc.mockResolvedValueOnce({
      data: {
        inclusions: 'not-an-array',
        exclusions: 42,
        gallery: null,
      },
      error: null,
    });

    const result = await getProductPage('demo-agg-6', 'package', 'tour-cartagena-5-dias');

    // Must not crash — Zod safeParse fails silently, product returned without agg fields
    expect(result).not.toBeNull();
    expect(result!.product.name).toBe('Tour Cartagena 5 días');
    const prod = result!.product as NonNullable<typeof result>["product"] & {
      program_inclusions?: string[];
    };
    expect(prod.program_inclusions).toBeUndefined();
  });

  it('does not call aggregated RPC for non-package product types', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        product: {
          id: 'act-1',
          name: 'Buceo',
          slug: 'buceo',
          type: 'activity',
        },
        page: validPage,
      },
      error: null,
    });

    const result = await getProductPage('demo-agg-7', 'activity', 'buceo');

    expect(result).not.toBeNull();
    // Only one RPC call — no aggregation for non-packages
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});
