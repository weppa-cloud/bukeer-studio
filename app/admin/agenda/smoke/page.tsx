import { AgendaModule } from '@/components/admin-next';
import {
  assertAdminNextSmokeAccess,
  getAdminNextEvolucionTheme,
} from '@/lib/admin-next/route-boundary';
import { agendaFixture } from '@/lib/admin-next/fixtures/agenda';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Agenda Smoke | Bukeer Admin Next',
};

const smokeSession: Extract<AdminNextSessionContext, { status: 'authenticated' }> = {
  status: 'authenticated',
  userId: 'agenda-smoke-user',
  email: 'agenda-smoke@bukeer.local',
  accountId: 'agenda-smoke-account',
  role: 'admin',
  displayName: 'Agenda Smoke',
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

export default async function AdminNextAgendaSmokePage() {
  await assertAdminNextSmokeAccess();

  return (
    <AgendaModule
      session={smokeSession}
      fixture={agendaFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
