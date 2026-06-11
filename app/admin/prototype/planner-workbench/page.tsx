import { PlannerWorkbenchPrototype } from '@/components/admin-next';
import { createPlannerAgentLedgerSnapshot } from '@/lib/admin-next/agent-ledger-source';
import { getAdminNextDataSourceMode } from '@/lib/admin-next/flags';
import {
  createPlannerWorkbenchAdapter,
  type AdminNextReadonlySupabaseClient,
} from '@/lib/admin-next/planner-workbench-adapter';
import {
  getAdminNextEvolucionTheme,
  requireAdminNextSession,
} from '@/lib/admin-next/route-boundary';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Planner Workbench Prototype | Bukeer Admin Next',
};

export default async function PlannerWorkbenchPrototypePage() {
  const session = await requireAdminNextSession({
    nextPath: '/admin/prototype/planner-workbench',
  });

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
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
