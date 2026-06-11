import { PaymentsModule } from '@/components/admin-next';
import { paymentsFixture } from '@/lib/admin-next/fixtures/payments';
import {
  getAdminNextEvolucionTheme,
  requireAdminNextSession,
} from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pagos | Bukeer Admin Next',
};

export default async function AdminNextPaymentsPage() {
  const session = await requireAdminNextSession({
    nextPath: '/admin/payments',
  });

  return (
    <PaymentsModule
      session={session}
      fixture={paymentsFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
