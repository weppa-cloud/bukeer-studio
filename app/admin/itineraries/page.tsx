import { ItinerariesModule } from '@/components/admin-next';
import { itinerariesFixture } from '@/lib/admin-next/fixtures/itineraries';
import {
  getAdminNextEvolucionTheme,
  requireAdminNextSession,
} from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Itinerarios | Bukeer Admin Next',
};

export default async function AdminNextItinerariesPage() {
  const session = await requireAdminNextSession({
    nextPath: '/admin/itineraries',
    permission: 'planner.view',
  });

  return (
    <ItinerariesModule
      session={session}
      fixture={itinerariesFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
