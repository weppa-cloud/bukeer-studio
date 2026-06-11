import { EvoShell } from '@/components/admin-next/evolucion/evo-shell';
import { EvoItineraries } from '@/components/admin-next/evolucion/evo-itineraries';
import { itinerariesFixture } from '@/lib/admin-next/fixtures/itineraries';
import { requireAdminNextSession } from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Itinerarios | Bukeer Admin Next',
};

export default async function AdminNextItinerariesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireAdminNextSession({
    nextPath: '/admin/itineraries',
    permission: 'planner.view',
  });
  const { view } = await searchParams;
  const active = itinerariesFixture.itineraries.filter(
    (itinerary) => itinerary.status !== 'closed',
  ).length;
  const quoted = itinerariesFixture.itineraries.filter(
    (itinerary) => itinerary.status === 'quoted',
  ).length;
  const subtitle = `${active} activos · ${quoted} por confirmar`;

  return (
    <EvoShell userName={session.displayName} accountLabel={session.email} activeKey="itis">
      <EvoItineraries
        fixture={itinerariesFixture}
        subtitle={subtitle}
        view={view === 'kanban' ? 'kanban' : 'list'}
      />
    </EvoShell>
  );
}
