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
  reason:
    | 'exact_fixture_match'
    | 'no_match_fixture_fallback'
    | 'readonly_master_match'
    | 'readonly_no_match';
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

type CatalogResolverRpcClient = {
  rpc: (
    fn: 'search_master_hotels' | 'search_master_activities',
    args: { p_query: string; p_limit: number },
  ) => PromiseLike<{ data: unknown[] | null; error: { message?: string } | null }>;
};

type MasterCatalogRow = {
  id?: unknown;
  name?: unknown;
  data_completeness?: unknown;
  rank?: unknown;
};

export async function resolveProductCatalogRowsReadonly(
  supabase: CatalogResolverRpcClient,
  rows: ProductCatalogResolverRow[],
): Promise<ProductCatalogResolverResult[]> {
  return Promise.all(
    rows.map(async (row) => {
      const rpcNames = rpcNamesForRow(row);

      for (const rpcName of rpcNames) {
        const { data, error } = await supabase.rpc(rpcName, {
          p_query: row.sourceName,
          p_limit: 1,
        });

        if (error) {
          throw new Error(error.message || `Unable to read ${rpcName}`);
        }

        const candidate = data?.[0] as MasterCatalogRow | undefined;
        if (candidate?.id && candidate.name) {
          return {
            id: row.id,
            sourceName: row.sourceName,
            masterName: `${String(candidate.name)} · master ${String(candidate.id)}`,
            confidence: formatCompleteness(candidate.data_completeness ?? candidate.rank),
            action: 'link',
            reason: 'readonly_master_match',
          };
        }
      }

      return {
        id: row.id,
        sourceName: row.sourceName,
        masterName: 'Sin coincidencia segura',
        confidence: '0%',
        action: 'create',
        reason: 'readonly_no_match',
      };
    }),
  );
}

function normalizeCatalogName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function rpcNamesForRow(row: ProductCatalogResolverRow): Array<'search_master_hotels' | 'search_master_activities'> {
  const normalizedType = normalizeCatalogName(row.type ?? row.sourceName);

  if (normalizedType.includes('hotel')) return ['search_master_hotels'];
  if (normalizedType.includes('actividad') || normalizedType.includes('tour')) return ['search_master_activities'];

  return ['search_master_hotels', 'search_master_activities'];
}

function formatCompleteness(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0%';
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
}
