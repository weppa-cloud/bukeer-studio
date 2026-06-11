import { AccountModule } from '@/components/admin-next';
import { accountFixture } from '@/lib/admin-next/fixtures/account';
import {
  getAdminNextEvolucionTheme,
  requireAdminNextSession,
} from '@/lib/admin-next/route-boundary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Mi cuenta | Bukeer Admin Next',
};

export default async function AdminNextAccountPage() {
  const session = await requireAdminNextSession({ nextPath: '/admin/account' });

  return (
    <AccountModule
      session={session}
      fixture={accountFixture}
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
