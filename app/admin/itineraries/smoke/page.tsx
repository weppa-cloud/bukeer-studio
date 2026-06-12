import { ItinerariesModule } from '@/components/admin-next';
import {
  assertAdminNextSmokeAccess,
  getAdminNextEvolucionTheme,
} from '@/lib/admin-next/route-boundary';
import { itinerariesFixture } from '@/lib/admin-next/fixtures/itineraries';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Itinerarios Smoke | Bukeer Admin Next',
};

const smokeSession: Extract<AdminNextSessionContext, { status: 'authenticated' }> = {
  status: 'authenticated',
  userId: 'itineraries-smoke-user',
  email: 'itineraries-smoke@bukeer.local',
  accountId: 'itineraries-smoke-account',
  role: 'admin',
  displayName: 'Itineraries Smoke',
  permissions: ['admin_next.view', 'planner.view', 'planner.suggest', 'trace.view'],
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

export default async function AdminNextItinerariesSmokePage() {
  await assertAdminNextSmokeAccess();

  return (
    <ItinerariesModule
      session={smokeSession}
      fixture={itinerariesFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
