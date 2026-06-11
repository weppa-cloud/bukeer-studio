import { notFound, redirect } from 'next/navigation';
import { SettingsModule } from '@/components/admin-next';
import {
  evolucionThemeMetadata,
  getEvolucionThemeStyle,
} from '@/lib/admin-next/evolucion-theme';
import { settingsFixture } from '@/lib/admin-next/fixtures/settings';
import {
  getAdminSessionContext,
  hasAdminPermission,
} from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Configuracion | Bukeer Admin Next',
};

export default async function AdminNextSettingsPage() {
  const session = await getAdminSessionContext();

  if (!session.flags.adminNextPrototype) {
    notFound();
  }

  if (session.status === 'unauthenticated') {
    redirect('/login?next=/admin/settings');
  }

  if (session.status !== 'authenticated') {
    notFound();
  }

  if (!hasAdminPermission(session, 'admin_next.view')) {
    notFound();
  }

  return (
    <SettingsModule
      session={session}
      fixture={settingsFixture}
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
