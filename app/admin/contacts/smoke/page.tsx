import { ContactsModule } from '@/components/admin-next';
import {
  assertAdminNextSmokeAccess,
  getAdminNextEvolucionTheme,
} from '@/lib/admin-next/route-boundary';
import { contactsFixture } from '@/lib/admin-next/fixtures/contacts';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contactos Smoke | Bukeer Admin Next',
};

const smokeSession: Extract<AdminNextSessionContext, { status: 'authenticated' }> = {
  status: 'authenticated',
  userId: 'contacts-smoke-user',
  email: 'contacts-smoke@bukeer.local',
  accountId: 'contacts-smoke-account',
  role: 'admin',
  displayName: 'Contacts Smoke',
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

export default async function AdminNextContactsSmokePage() {
  await assertAdminNextSmokeAccess();

  return (
    <ContactsModule
      session={smokeSession}
      fixture={contactsFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
