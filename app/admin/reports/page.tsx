import { ReportsModule } from '@/components/admin-next';
import { reportsFixture } from '@/lib/admin-next/fixtures/reports';
import {
  getAdminNextEvolucionTheme,
  requireAdminNextSession,
} from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reportes | Bukeer Admin Next',
};

export default async function AdminNextReportsPage() {
  const session = await requireAdminNextSession({ nextPath: '/admin/reports' });

  return (
    <ReportsModule
      session={session}
      fixture={reportsFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
