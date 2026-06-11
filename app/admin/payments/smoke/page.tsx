import { PaymentsModule } from '@/components/admin-next';
import {
  assertAdminNextSmokeAccess,
  getAdminNextEvolucionTheme,
} from '@/lib/admin-next/route-boundary';
import { paymentsFixture } from '@/lib/admin-next/fixtures/payments';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pagos Smoke | Bukeer Admin Next',
};

const smokeSession: Extract<AdminNextSessionContext, { status: 'authenticated' }> = {
  status: 'authenticated',
  userId: 'payments-smoke-user',
  email: 'payments-smoke@bukeer.local',
  accountId: 'payments-smoke-account',
  role: 'accounting',
  displayName: 'Payments Smoke',
  permissions: ['admin_next.view', 'planner.view', 'payments.manage', 'trace.view'],
  flags: {
    adminNextPrototype: true,
    adminNextBetaReadonlyEnabled: false,
    adminNextBetaAccountAllowed: false,
    adminNextBetaRoleAllowed: false,
    adminNextBetaReadonly: false,
    adminNextExternalHandoff: false,
  },
};

export default async function AdminNextPaymentsSmokePage() {
  await assertAdminNextSmokeAccess();

  return (
    <PaymentsModule
      session={smokeSession}
      fixture={paymentsFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
