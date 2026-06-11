import { SettingsModule } from '@/components/admin-next';
import { settingsFixture } from '@/lib/admin-next/fixtures/settings';
import {
  getAdminNextEvolucionTheme,
  requireAdminNextSession,
} from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Configuracion | Bukeer Admin Next',
};

export default async function AdminNextSettingsPage() {
  const session = await requireAdminNextSession({ nextPath: '/admin/settings' });

  return (
    <SettingsModule
      session={session}
      fixture={settingsFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
