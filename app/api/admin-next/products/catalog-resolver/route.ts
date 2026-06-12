import { NextRequest } from 'next/server';

import { apiError, apiForbidden, apiSuccess, apiUnauthorized, apiValidationError } from '@/lib/api';
import { getAdminNextDataSourceMode } from '@/lib/admin-next/flags';
import {
  ProductCatalogResolverRequestSchema,
  type ProductCatalogResolverRow,
  resolveProductCatalogRows,
  resolveProductCatalogRowsReadonly,
} from '@/lib/admin-next/products-catalog-resolver';
import {
  getAdminSessionContext,
  hasAdminPermission,
} from '@/lib/admin-next/session/get-admin-session-context';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export async function POST(request: NextRequest) {
  const parsedBody = ProductCatalogResolverRequestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedBody.success) {
    return apiValidationError(parsedBody.error);
  }

  const session = await getAdminSessionContext();

  if (session.status === 'unauthenticated') {
    return apiUnauthorized('Authentication is required for Admin Next catalog resolver');
  }

  if (session.status !== 'authenticated') {
    return apiForbidden('An authenticated Admin Next role is required for catalog resolver');
  }

  if (!session.flags.adminNextPrototype) {
    return apiForbidden('Admin Next prototype is not enabled for this account');
  }

  if (!hasAdminPermission(session, 'admin_next.view')) {
    return apiForbidden('admin_next.view permission is required for catalog resolver');
  }

  const requestedDataSourceMode = getAdminNextDataSourceMode();
  const mode =
    requestedDataSourceMode === 'readonly' && session.flags.adminNextBetaReadonly
      ? 'readonly'
      : 'fixture';
  let items;

  try {
    items =
      mode === 'readonly'
        ? await resolveReadonlyRows(parsedBody.data.rows)
        : resolveProductCatalogRows(parsedBody.data.rows);
  } catch (error) {
    return apiError(
      'CATALOG_RESOLVER_READ_FAILED',
      error instanceof Error ? error.message : 'Unable to read catalog resolver data',
      500,
    );
  }

  return apiSuccess({
    mode,
    accountId: session.accountId,
    resolverVersion: 'catalog_resolver_v1',
    items,
  });
}

async function resolveReadonlyRows(rows: ProductCatalogResolverRow[]) {
  const supabase = await createSupabaseServerClient();
  return resolveProductCatalogRowsReadonly(supabase, rows);
}
