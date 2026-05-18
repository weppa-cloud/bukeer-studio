import { notFound, redirect } from 'next/navigation';
import { PlannerWorkbenchPrototype } from '@/components/admin-next';
import { plannerWorkbenchFixture } from '@/lib/admin-next/fixtures/planner-workbench';
import { getAdminSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Planner Workbench Prototype | Bukeer Admin Next',
};

export default async function PlannerWorkbenchPrototypePage() {
  const session = await getAdminSessionContext();

  if (!session.flags.adminNextPrototype) {
    notFound();
  }

  if (session.status === 'unauthenticated') {
    redirect('/login?next=/admin/prototype/planner-workbench');
  }

  if (session.status !== 'authenticated') {
    notFound();
  }

  return (
    <PlannerWorkbenchPrototype
      session={session}
      fixture={plannerWorkbenchFixture}
    />
  );
}
