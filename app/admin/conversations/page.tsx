import { EvoShell } from '@/components/admin-next/evolucion/evo-shell';
import { EvoConversations } from '@/components/admin-next/evolucion/evo-conversations';
import { conversationsFixture } from '@/lib/admin-next/fixtures/conversations';
import { requireAdminNextSession } from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Conversaciones | Bukeer Admin Next',
};

export default async function AdminNextConversationsPage() {
  const session = await requireAdminNextSession({ nextPath: '/admin/conversations' });
  const open = conversationsFixture.conversations.filter(
    (conversation) => conversation.status === 'open',
  ).length;
  const waiting = conversationsFixture.conversations.filter(
    (conversation) => conversation.status === 'waiting',
  ).length;
  const subtitle = `CRM · ${open} abiertas, ${waiting} en espera`;

  return (
    <EvoShell userName={session.displayName} accountLabel={session.email} activeKey="conv">
      <EvoConversations fixture={conversationsFixture} subtitle={subtitle} />
    </EvoShell>
  );
}
