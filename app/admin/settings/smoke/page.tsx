import { SettingsModule } from '@/components/admin-next';
import {
  assertAdminNextSmokeAccess,
  getAdminNextEvolucionTheme,
} from '@/lib/admin-next/route-boundary';
import { settingsFixture } from '@/lib/admin-next/fixtures/settings';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Configuracion Smoke | Bukeer Admin Next',
};

const smokeSession: Extract<AdminNextSessionContext, { status: 'authenticated' }> = {
  status: 'authenticated',
  userId: 'settings-smoke-user',
  email: 'settings-smoke@bukeer.local',
  accountId: 'settings-smoke-account',
  role: 'admin',
  displayName: 'Settings Smoke',
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

export default async function AdminNextSettingsSmokePage() {
  await assertAdminNextSmokeAccess();

  return (
    <SettingsModule
      session={smokeSession}
      fixture={settingsFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
