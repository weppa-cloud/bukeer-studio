import { notFound, redirect } from 'next/navigation';
import { PlannerWorkbenchPrototype } from '@/components/admin-next';
import { createPlannerAgentLedgerSnapshot } from '@/lib/admin-next/agent-ledger-source';
import {
  evolucionThemeMetadata,
  getEvolucionThemeStyle,
} from '@/lib/admin-next/evolucion-theme';
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

  const requestedDataSourceMode = getAdminNextDataSourceMode();
  const dataSourceMode =
    requestedDataSourceMode === 'readonly' && session.flags.adminNextBetaReadonly
      ? 'readonly'
      : 'fixture';
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
  const agentLedger = createPlannerAgentLedgerSnapshot(fixture, {
    sourceMode: dataSourceMode,
  });

  return (
    <PlannerWorkbenchPrototype
      session={session}
      fixture={fixture}
      agentLedger={agentLedger}
      dataSourceMode={dataSourceMode}
      evolucionTheme={{
        presetSlug: evolucionThemeMetadata.presetSlug,
        styles: {
          light: getEvolucionThemeStyle('light'),
          dark: getEvolucionThemeStyle('dark'),
        },
      }}
    />
  );
}
