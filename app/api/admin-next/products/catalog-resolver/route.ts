import { NextRequest } from 'next/server';

import { apiForbidden, apiSuccess, apiUnauthorized, apiValidationError } from '@/lib/api';
import { getAdminNextDataSourceMode } from '@/lib/admin-next/flags';
import {
  ProductCatalogResolverRequestSchema,
  resolveProductCatalogRows,
} from '@/lib/admin-next/products-catalog-resolver';
import {
  getAdminSessionContext,
  hasAdminPermission,
} from '@/lib/admin-next/session/get-admin-session-context';

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

  return apiSuccess({
    mode,
    accountId: session.accountId,
    resolverVersion: 'catalog_resolver_v1',
    items: resolveProductCatalogRows(parsedBody.data.rows),
  });
}
