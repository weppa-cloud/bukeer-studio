import { notFound, redirect } from 'next/navigation';
import { ContactsModule } from '@/components/admin-next';
import {
  evolucionThemeMetadata,
  getEvolucionThemeStyle,
} from '@/lib/admin-next/evolucion-theme';
import { contactsFixture } from '@/lib/admin-next/fixtures/contacts';
import {
  getAdminSessionContext,
  hasAdminPermission,
} from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contactos | Bukeer Admin Next',
};

export default async function AdminNextContactsPage() {
  const session = await getAdminSessionContext();

  if (!session.flags.adminNextPrototype) {
    notFound();
  }

  if (session.status === 'unauthenticated') {
    redirect('/login?next=/admin/contacts');
  }

  if (session.status !== 'authenticated') {
    notFound();
  }

  if (!hasAdminPermission(session, 'admin_next.view')) {
    notFound();
  }

  return (
    <ContactsModule
      session={session}
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
