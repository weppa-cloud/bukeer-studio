import { notFound, redirect } from 'next/navigation';
import { PlannerWorkbenchPrototype } from '@/components/admin-next';
import { getAdminNextDataSourceMode } from '@/lib/admin-next/flags';
import {
  createPlannerWorkbenchAdapter,
  type AdminNextReadonlySupabaseClient,
} from '@/lib/admin-next/planner-workbench-adapter';
import { getAdminSessionContext } from '@/lib/admin-next/session/get-admin-session-context';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

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

  const dataSourceMode = getAdminNextDataSourceMode();
  const adapter =
    dataSourceMode === 'readonly'
      ? createPlannerWorkbenchAdapter({
          mode: 'readonly',
          supabase:
            (await createSupabaseServerClient()) as unknown as AdminNextReadonlySupabaseClient,
          accountId: session.accountId,
        })
      : createPlannerWorkbenchAdapter(dataSourceMode);
  const fixture = await adapter.getWorkbench();

  return (
    <PlannerWorkbenchPrototype
      session={session}
      fixture={fixture}
    />
  );
}
