import { AccountModule } from '@/components/admin-next';
import {
  assertAdminNextSmokeAccess,
  getAdminNextEvolucionTheme,
} from '@/lib/admin-next/route-boundary';
import { accountFixture } from '@/lib/admin-next/fixtures/account';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Mi cuenta Smoke | Bukeer Admin Next',
};

const smokeSession: Extract<AdminNextSessionContext, { status: 'authenticated' }> = {
  status: 'authenticated',
  userId: 'account-smoke-user',
  email: 'account-smoke@bukeer.local',
  accountId: 'account-smoke-account',
  role: 'admin',
  displayName: 'Account Smoke',
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

export default async function AdminNextAccountSmokePage() {
  await assertAdminNextSmokeAccess();

  return (
    <AccountModule
      session={smokeSession}
      fixture={accountFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
