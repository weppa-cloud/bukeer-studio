import { z } from 'zod';
import type { ProductCatalogResolution } from '@/lib/admin-next/fixtures/products';
import { productsFixture } from '@/lib/admin-next/fixtures/products';

export const ProductCatalogResolverRowSchema = z.object({
  id: z.string().min(1).max(120),
  sourceName: z.string().min(1).max(180),
  type: z.string().min(1).max(80).optional(),
  city: z.string().min(1).max(120).optional(),
  provider: z.string().min(1).max(160).optional(),
});

export const ProductCatalogResolverRequestSchema = z.object({
  rows: z.array(ProductCatalogResolverRowSchema).min(1).max(50),
});

export type ProductCatalogResolverRow = z.infer<typeof ProductCatalogResolverRowSchema>;

export type ProductCatalogResolverResult = ProductCatalogResolution & {
  reason: 'exact_fixture_match' | 'no_match_fixture_fallback';
};

export type ProductCatalogResolverResponse = {
  mode: 'fixture' | 'readonly';
  accountId: string;
  resolverVersion: 'catalog_resolver_v1';
  items: ProductCatalogResolverResult[];
};

export function resolveProductCatalogRows(
  rows: ProductCatalogResolverRow[],
  fixtureResolutions: ProductCatalogResolution[] = productsFixture.catalogResolutions,
): ProductCatalogResolverResult[] {
  const fixtureByName = new Map(
    fixtureResolutions.map((resolution) => [normalizeCatalogName(resolution.sourceName), resolution]),
  );

  return rows.map((row) => {
    const fixtureResolution = fixtureByName.get(normalizeCatalogName(row.sourceName));

    if (fixtureResolution) {
      return {
        ...fixtureResolution,
        id: row.id,
        sourceName: row.sourceName,
        reason: 'exact_fixture_match',
      };
    }

    return {
      id: row.id,
      sourceName: row.sourceName,
      masterName: 'Sin coincidencia segura',
      confidence: '0%',
      action: 'create',
      reason: 'no_match_fixture_fallback',
    };
  });
}

function normalizeCatalogName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}
