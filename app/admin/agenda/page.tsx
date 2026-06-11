import { AgendaModule } from '@/components/admin-next';
import { agendaFixture } from '@/lib/admin-next/fixtures/agenda';
import {
  getAdminNextEvolucionTheme,
  requireAdminNextSession,
} from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Agenda | Bukeer Admin Next',
};

export default async function AdminNextAgendaPage() {
  const session = await requireAdminNextSession({ nextPath: '/admin/agenda' });

  return (
    <AgendaModule
      session={session}
      fixture={agendaFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
