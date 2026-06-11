import { ProductsModule } from '@/components/admin-next';
import { getAdminNextDataSourceMode } from '@/lib/admin-next/flags';
import {
  createProductsAdapter,
  type AdminNextProductsReadonlySupabaseClient,
} from '@/lib/admin-next/products-adapter';
import {
  getAdminNextEvolucionTheme,
  requireAdminNextSession,
} from '@/lib/admin-next/route-boundary';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Productos | Bukeer Admin Next',
};

export default async function AdminNextProductsPage() {
  const session = await requireAdminNextSession({ nextPath: '/admin/products' });

  const requestedDataSourceMode = getAdminNextDataSourceMode();
  const dataSourceMode =
    requestedDataSourceMode === 'readonly' &&
    session.flags.adminNextBetaReadonly
      ? 'readonly'
      : 'fixture';
  const adapter =
    dataSourceMode === 'readonly'
      ? createProductsAdapter({
          mode: 'readonly',
          supabase:
            (await createSupabaseServerClient()) as unknown as AdminNextProductsReadonlySupabaseClient,
          accountId: session.accountId,
        })
      : createProductsAdapter(dataSourceMode);
  const fixture = await adapter.getProducts();

  return (
    <ProductsModule
      session={session}
      fixture={fixture}
      dataSourceMode={dataSourceMode}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
