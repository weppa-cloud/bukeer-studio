import { notFound, redirect } from 'next/navigation';
import { ProductsModule } from '@/components/admin-next';
import {
  evolucionThemeMetadata,
  getEvolucionThemeStyle,
} from '@/lib/admin-next/evolucion-theme';
import { productsFixture } from '@/lib/admin-next/fixtures/products';
import {
  getAdminSessionContext,
  hasAdminPermission,
} from '@/lib/admin-next/session/get-admin-session-context';

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

  return (
    <ProductsModule
      session={session}
      fixture={productsFixture}
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
