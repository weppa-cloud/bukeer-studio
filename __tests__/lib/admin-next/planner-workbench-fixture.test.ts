import { plannerWorkbenchFixture } from '@/lib/admin-next/fixtures/planner-workbench';

describe('planner workbench fixture', () => {
  it('keeps sensitive actions approval-gated', () => {
    expect(plannerWorkbenchFixture.approvals).toHaveLength(1);
    expect(plannerWorkbenchFixture.approvals[0]?.requiredPermission).toBe('planner.approve');
    expect(plannerWorkbenchFixture.approvals[0]?.riskFlags).toEqual(
      expect.arrayContaining(['Margin below target']),
    );
  });

  it('provides trace access for suggestions, blocked states and itinerary segments', () => {
    const traceIds = [
      ...plannerWorkbenchFixture.suggestions.map((item) => item.traceId),
      ...plannerWorkbenchFixture.blockedStates.map((item) => item.traceId),
      ...plannerWorkbenchFixture.itinerarySegments.map((item) => item.traceId),
    ];

    expect(traceIds.every((traceId) => traceId.startsWith('trace-'))).toBe(true);
  });

  it('contains the no-write prototype safety data users need to understand the state', () => {
    expect(plannerWorkbenchFixture.missingData).toEqual(
      expect.arrayContaining(['Children ages', 'Full passport names']),
    );
    expect(plannerWorkbenchFixture.traceSummary.permissionResult).toBe('requires_approval');
    expect(plannerWorkbenchFixture.traceSummary.policyResult).toBe('warning');
  });
});
