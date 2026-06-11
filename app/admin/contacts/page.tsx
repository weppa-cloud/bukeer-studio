import { EvoShell } from '@/components/admin-next/evolucion/evo-shell';
import { EvoContacts } from '@/components/admin-next/evolucion/evo-contacts';
import { contactsFixture } from '@/lib/admin-next/fixtures/contacts';
import { requireAdminNextSession } from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contactos | Bukeer Admin Next',
};

export default async function AdminNextContactsPage() {
  const session = await requireAdminNextSession({ nextPath: '/admin/contacts' });
  const total = contactsFixture.contacts.length;
  const clients = contactsFixture.contacts.filter((contact) =>
    contact.badges.includes('Cliente'),
  ).length;
  const providers = contactsFixture.contacts.filter((contact) =>
    contact.badges.includes('Proveedor'),
  ).length;
  const subtitle = `${total} contactos · ${clients} clientes, ${providers} proveedores`;

  return (
    <EvoShell userName={session.displayName} accountLabel={session.email} activeKey="contacts">
      <EvoContacts fixture={contactsFixture} subtitle={subtitle} />
    </EvoShell>
  );
}
