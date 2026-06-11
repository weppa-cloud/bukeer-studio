import { ContactsModule } from '@/components/admin-next';
import { contactsFixture } from '@/lib/admin-next/fixtures/contacts';
import {
  getAdminNextEvolucionTheme,
  requireAdminNextSession,
} from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contactos | Bukeer Admin Next',
};

export default async function AdminNextContactsPage() {
  const session = await requireAdminNextSession({ nextPath: '/admin/contacts' });

  return (
    <ContactsModule
      session={session}
      fixture={contactsFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
