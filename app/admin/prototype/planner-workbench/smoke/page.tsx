import { PlannerWorkbenchPrototype } from '@/components/admin-next';
import { createPlannerAgentLedgerSnapshot } from '@/lib/admin-next/agent-ledger-source';
import {
  assertAdminNextSmokeAccess,
  getAdminNextEvolucionTheme,
} from '@/lib/admin-next/route-boundary';
import { plannerWorkbenchFixture } from '@/lib/admin-next/fixtures/planner-workbench';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Planner Workbench Smoke | Bukeer Admin Next',
};

const smokeSession: Extract<AdminNextSessionContext, { status: 'authenticated' }> = {
  status: 'authenticated',
  userId: 'agent-smoke-user',
  email: 'agent-smoke@bukeer.local',
  accountId: 'agent-smoke-account',
  role: 'admin',
  displayName: 'Agent Smoke',
  permissions: [
    'admin_next.view',
    'planner.view',
    'planner.suggest',
    'planner.approve',
    'trace.view',
    'manager.view',
  ],
  flags: {
    adminNextPrototype: true,
    adminNextBetaReadonlyEnabled: false,
    adminNextBetaAccountAllowed: false,
    adminNextBetaRoleAllowed: false,
    adminNextBetaReadonly: false,
    adminNextExternalHandoff: false,
    adminNextItineraryWrites: false,
  },
};

export default async function PlannerWorkbenchSmokePage() {
  await assertAdminNextSmokeAccess();

  const agentLedger = createPlannerAgentLedgerSnapshot(plannerWorkbenchFixture, {
    sourceMode: 'fixture',
  });

  return (
    <PlannerWorkbenchPrototype
      session={smokeSession}
      fixture={plannerWorkbenchFixture}
      agentLedger={agentLedger}
      dataSourceMode="fixture"
      evolucionTheme={getAdminNextEvolucionTheme()}
    />
  );
}
