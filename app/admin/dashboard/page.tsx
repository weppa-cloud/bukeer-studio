import { DashboardModule } from '@/components/admin-next';
import { dashboardFixture } from '@/lib/admin-next/fixtures/dashboard';
import {
  getAdminNextEvolucionTheme,
  requireAdminNextSession,
} from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard | Bukeer Admin Next',
};

export default async function AdminNextDashboardPage() {
  const session = await requireAdminNextSession({ nextPath: '/admin/dashboard' });

  return (
    <DashboardModule
      session={session}
      fixture={dashboardFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
