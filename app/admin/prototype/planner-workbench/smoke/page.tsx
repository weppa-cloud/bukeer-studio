import { notFound } from 'next/navigation';
import { PlannerWorkbenchPrototype } from '@/components/admin-next';
import { createPlannerAgentLedgerSnapshot } from '@/lib/admin-next/agent-ledger-source';
import {
  evolucionThemeMetadata,
  getEvolucionThemeStyle,
} from '@/lib/admin-next/evolucion-theme';
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
  },
};

export default function PlannerWorkbenchSmokePage() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ADMIN_NEXT_PROTOTYPE_SMOKE_ENABLED !== 'true'
  ) {
    notFound();
  }

  const agentLedger = createPlannerAgentLedgerSnapshot(plannerWorkbenchFixture, {
    sourceMode: 'fixture',
  });

  return (
    <PlannerWorkbenchPrototype
      session={smokeSession}
      fixture={plannerWorkbenchFixture}
      agentLedger={agentLedger}
      dataSourceMode="fixture"
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
