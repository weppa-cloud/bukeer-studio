import { notFound } from 'next/navigation';
import { ContactsModule } from '@/components/admin-next';
import {
  evolucionThemeMetadata,
  getEvolucionThemeStyle,
} from '@/lib/admin-next/evolucion-theme';
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

export default function AdminNextContactsSmokePage() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ADMIN_NEXT_PROTOTYPE_SMOKE_ENABLED !== 'true'
  ) {
    notFound();
  }

  return (
    <ContactsModule
      session={smokeSession}
      fixture={contactsFixture}
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
