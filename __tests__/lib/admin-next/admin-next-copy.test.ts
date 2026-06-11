import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';

describe('adminNextCopy', () => {
  it('keeps stable shell navigation keys for agent selectors', () => {
    expect(adminNextCopy.shell.nav.map((item) => item.key)).toEqual([
      'planner',
      'conversations',
      'itineraries',
      'manager',
      'agent-control',
    ]);
  });

  it('formats derived labels through the copy contract', () => {
    expect(adminNextCopy.tripRail.paxLabel(4)).toBe('4 pax');
    expect(adminNextCopy.tripRail.marginLabel('18%')).toBe('18% margin');
    expect(adminNextCopy.liveFeed.marginLabel('22%')).toBe('22% margin');
  });

  it('keeps prototype actions and runtime fallback messages in the copy contract', () => {
    expect(adminNextCopy.planningCanvas.traceAction).toBe('Trace');
    expect(adminNextCopy.prototype.lightModeAction).toBe('Light');
    expect(adminNextCopy.prototype.darkModeAction).toBe('Dark');
    expect(adminNextCopy.prototype.whatsappHandoffFallbackError).toContain('WhatsApp handoff');
  });

  it('keeps signature UI copy and formatters centralized', () => {
    expect(adminNextCopy.signature.statusLabels.approval_required).toBe('Approval required');
    expect(adminNextCopy.signature.blockedBanner.missingFieldsPill(3)).toBe('3 fields missing');
    expect(adminNextCopy.signature.manifest.marginLabel('18%')).toBe('18% margin');
    expect(adminNextCopy.signature.approvalBar.permissionLabel('itineraries.approve')).toBe(
      'Permission: itineraries.approve',
    );
  });
});
