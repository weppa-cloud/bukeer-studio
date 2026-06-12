import { ProductsModule } from '@/components/admin-next';
import {
  assertAdminNextSmokeAccess,
  getAdminNextEvolucionTheme,
} from '@/lib/admin-next/route-boundary';
import { productsFixture } from '@/lib/admin-next/fixtures/products';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Productos Smoke | Bukeer Admin Next',
};

const smokeSession: Extract<AdminNextSessionContext, { status: 'authenticated' }> = {
  status: 'authenticated',
  userId: 'products-smoke-user',
  email: 'products-smoke@bukeer.local',
  accountId: 'products-smoke-account',
  role: 'admin',
  displayName: 'Products Smoke',
  permissions: ['admin_next.view', 'planner.view', 'trace.view'],
  flags: {
    adminNextPrototype: true,
    adminNextBetaReadonlyEnabled: false,
    adminNextBetaAccountAllowed: false,
    adminNextBetaRoleAllowed: false,
    adminNextBetaReadonly: false,
    adminNextExternalHandoff: false,
    adminNextItineraryWrites: false,
  },
};

export default async function AdminNextProductsSmokePage() {
  await assertAdminNextSmokeAccess();

  return (
    <ProductsModule
      session={smokeSession}
      fixture={productsFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
