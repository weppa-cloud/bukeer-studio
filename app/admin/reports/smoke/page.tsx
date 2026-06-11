import { ReportsModule } from '@/components/admin-next';
import {
  assertAdminNextSmokeAccess,
  getAdminNextEvolucionTheme,
} from '@/lib/admin-next/route-boundary';
import { reportsFixture } from '@/lib/admin-next/fixtures/reports';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reportes Smoke | Bukeer Admin Next',
};

const smokeSession: Extract<AdminNextSessionContext, { status: 'authenticated' }> = {
  status: 'authenticated',
  userId: 'reports-smoke-user',
  email: 'reports-smoke@bukeer.local',
  accountId: 'reports-smoke-account',
  role: 'admin',
  displayName: 'Reports Smoke',
  permissions: ['admin_next.view', 'planner.view', 'trace.view'],
  flags: {
    adminNextPrototype: true,
    adminNextBetaReadonlyEnabled: false,
    adminNextBetaAccountAllowed: false,
    adminNextBetaRoleAllowed: false,
    adminNextBetaReadonly: false,
    adminNextExternalHandoff: false,
  },
};

export default async function AdminNextReportsSmokePage() {
  await assertAdminNextSmokeAccess();

  return (
    <ReportsModule
      session={smokeSession}
      fixture={reportsFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
