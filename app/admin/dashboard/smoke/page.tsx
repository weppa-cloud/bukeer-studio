import { DashboardModule } from '@/components/admin-next';
import {
  assertAdminNextSmokeAccess,
  getAdminNextEvolucionTheme,
} from '@/lib/admin-next/route-boundary';
import { dashboardFixture } from '@/lib/admin-next/fixtures/dashboard';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard Smoke | Bukeer Admin Next',
};

const smokeSession: Extract<AdminNextSessionContext, { status: 'authenticated' }> = {
  status: 'authenticated',
  userId: 'dashboard-smoke-user',
  email: 'dashboard-smoke@bukeer.local',
  accountId: 'dashboard-smoke-account',
  role: 'admin',
  displayName: 'Dashboard Smoke',
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

export default async function AdminNextDashboardSmokePage() {
  await assertAdminNextSmokeAccess();

  return (
    <DashboardModule
      session={smokeSession}
      fixture={dashboardFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
