import { notFound, redirect } from 'next/navigation';
import { ConversationsModule } from '@/components/admin-next';
import {
  evolucionThemeMetadata,
  getEvolucionThemeStyle,
} from '@/lib/admin-next/evolucion-theme';
import { conversationsFixture } from '@/lib/admin-next/fixtures/conversations';
import {
  getAdminSessionContext,
  hasAdminPermission,
} from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Conversaciones | Bukeer Admin Next',
};

export default async function AdminNextConversationsPage() {
  const session = await getAdminSessionContext();

  if (!session.flags.adminNextPrototype) {
    notFound();
  }

  if (session.status === 'unauthenticated') {
    redirect('/login?next=/admin/conversations');
  }

  if (session.status !== 'authenticated') {
    notFound();
  }

  if (!hasAdminPermission(session, 'admin_next.view')) {
    notFound();
  }

  return (
    <ConversationsModule
      session={session}
      fixture={conversationsFixture}
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
