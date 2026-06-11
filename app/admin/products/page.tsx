import { EvoShell } from '@/components/admin-next/evolucion/evo-shell';
import { EvoProducts } from '@/components/admin-next/evolucion/evo-products';
import { getAdminNextDataSourceMode } from '@/lib/admin-next/flags';
import {
  createProductsAdapter,
  type AdminNextProductsReadonlySupabaseClient,
} from '@/lib/admin-next/products-adapter';
import { requireAdminNextSession } from '@/lib/admin-next/route-boundary';
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

  const total = fixture.categories.find((category) => category.key === 'all')?.count ??
    fixture.products.length;
  const categories = fixture.categories.filter((category) => category.key !== 'all').length;
  const subtitle = `Catálogo · ${total} productos en ${categories} categorías`;

  return (
    <EvoShell userName={session.displayName} accountLabel={session.email} activeKey="products">
      <EvoProducts fixture={fixture} subtitle={subtitle} />
    </EvoShell>
  );
}
