import { notFound, redirect } from 'next/navigation';
import { ProductsModule } from '@/components/admin-next';
import {
  evolucionThemeMetadata,
  getEvolucionThemeStyle,
} from '@/lib/admin-next/evolucion-theme';
import { getAdminNextDataSourceMode } from '@/lib/admin-next/flags';
import {
  createProductsAdapter,
  type AdminNextProductsReadonlySupabaseClient,
} from '@/lib/admin-next/products-adapter';
import {
  getAdminSessionContext,
  hasAdminPermission,
} from '@/lib/admin-next/session/get-admin-session-context';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Productos | Bukeer Admin Next',
};

export default async function AdminNextProductsPage() {
  const session = await getAdminSessionContext();

  if (!session.flags.adminNextPrototype) {
    notFound();
  }

  if (session.status === 'unauthenticated') {
    redirect('/login?next=/admin/products');
  }

  if (session.status !== 'authenticated') {
    notFound();
  }

  if (!hasAdminPermission(session, 'admin_next.view')) {
    notFound();
  }

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
      evolucionTheme={{
        presetSlug: evolucionThemeMetadata.presetSlug,
        styles: {
          light: getEvolucionThemeStyle('light'),
          dark: getEvolucionThemeStyle('dark'),
        },
      }}
    />
  );
}
