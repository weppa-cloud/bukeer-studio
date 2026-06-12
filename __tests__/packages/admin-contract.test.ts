import {
  AgentSuggestionSchema,
  AdminSessionContextSchema,
  HumanAgentUiStateSchema,
  PlannerWorkbenchFixtureSchema,
} from '@bukeer/admin-contract';
import { plannerWorkbenchFixture } from '@/lib/admin-next/fixtures/planner-workbench';

describe('@bukeer/admin-contract', () => {
  it('contains the required human-agent UI states', () => {
    expect(HumanAgentUiStateSchema.options).toEqual(
      expect.arrayContaining([
        'normal',
        'loading',
        'empty',
        'error',
        'no_permission',
        'ai_suggestion',
        'ai_blocked',
        'approval_required',
        'approved',
        'rejected',
        'executing',
        'executed',
        'trace_available',
      ]),
    );
  });

  it('validates an authenticated admin session context', () => {
    const parsed = AdminSessionContextSchema.parse({
      status: 'authenticated',
      userId: 'user-1',
      email: 'planner@example.com',
      accountId: 'account-1',
      role: 'agent',
      displayName: 'Planner One',
      permissions: ['admin_next.view', 'planner.view', 'trace.view'],
      flags: { adminNextPrototype: true },
    });

    expect(parsed.status).toBe('authenticated');
  });

  it('requires suggestions to declare trace, risk and autonomy', () => {
    const parsed = AgentSuggestionSchema.parse(plannerWorkbenchFixture.suggestions[0]);

    expect(parsed.traceId).toMatch(/^trace-/);
    expect(parsed.autonomyLevel).toBe('A1_suggest');
  });

  it('validates the planner fixture as a complete prototype payload', () => {
    const parsed = PlannerWorkbenchFixtureSchema.parse(plannerWorkbenchFixture);

    expect(parsed.approvals[0]?.state).toBe('approval_required');
    expect(parsed.blockedStates[0]?.missingData?.length).toBeGreaterThan(0);
  });
});
