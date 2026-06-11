import { ConversationsModule } from '@/components/admin-next';
import { conversationsFixture } from '@/lib/admin-next/fixtures/conversations';
import {
  getAdminNextEvolucionTheme,
  requireAdminNextSession,
} from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Conversaciones | Bukeer Admin Next',
};

export default async function AdminNextConversationsPage() {
  const session = await requireAdminNextSession({ nextPath: '/admin/conversations' });

  return (
    <ConversationsModule
      session={session}
      fixture={conversationsFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
