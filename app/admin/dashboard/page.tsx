import { EvoShell } from '@/components/admin-next/evolucion/evo-shell';
import { EvoDashboard } from '@/components/admin-next/evolucion/evo-dashboard';
import { dashboardFixture } from '@/lib/admin-next/fixtures/dashboard';
import { requireAdminNextSession } from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard | Bukeer Admin Next',
};

export default async function AdminNextDashboardPage() {
  const session = await requireAdminNextSession({ nextPath: '/admin/dashboard' });
  const period = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
    new Date(),
  );
  const subtitle = `Resumen operativo · ${period.charAt(0).toUpperCase()}${period.slice(1)}`;

  return (
    <EvoShell userName={session.displayName} accountLabel={session.email} activeKey="dash">
      <EvoDashboard fixture={dashboardFixture} subtitle={subtitle} />
    </EvoShell>
  );
}
